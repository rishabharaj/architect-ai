import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Config ───────────────────────────────────────────────────────────
const GROQ_MODEL = "qwen/qwen3.8-27b";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Fallback API key — must be set through environment variables
const FALLBACK_GROQ_KEY = "";

// ── Concurrency: Allow up to 50 simultaneous API calls ───────────────
const MAX_CONCURRENT = 50;
let activeRequests = 0;
const requestQueue: Array<{ resolve: () => void }> = [];

async function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return;
  }
  return new Promise<void>((resolve) => {
    requestQueue.push({ resolve });
  });
}

function releaseSlot(): void {
  activeRequests--;
  if (requestQueue.length > 0) {
    const next = requestQueue.shift()!;
    activeRequests++;
    next.resolve();
  }
}

// ── Per-User Rate Limiting (Token Bucket per IP) ─────────────────────
// Allow 5 requests per 10 seconds per IP to prevent one user hogging all capacity
interface RateBucket {
  tokens: number;
  lastRefill: number;
}

const rateLimitMap = new Map<string, RateBucket>();
const RATE_LIMIT_TOKENS = 8;       // max burst per user
const RATE_LIMIT_REFILL = 8;       // tokens refilled per window
const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const RATE_LIMIT_CLEANUP_INTERVAL = 60000; // cleanup old entries every 60s
let lastRateLimitCleanup = Date.now();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Periodic cleanup of stale entries
  if (now - lastRateLimitCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
    lastRateLimitCleanup = now;
    for (const [key, bucket] of rateLimitMap) {
      if (now - bucket.lastRefill > RATE_LIMIT_WINDOW_MS * 6) {
        rateLimitMap.delete(key);
      }
    }
  }

  let bucket = rateLimitMap.get(ip);
  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_TOKENS, lastRefill: now };
    rateLimitMap.set(ip, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= RATE_LIMIT_WINDOW_MS) {
    const refills = Math.floor(elapsed / RATE_LIMIT_WINDOW_MS);
    bucket.tokens = Math.min(RATE_LIMIT_TOKENS, bucket.tokens + refills * RATE_LIMIT_REFILL);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    return false; // rate limited
  }

  bucket.tokens--;
  return true;
}

// ── In-memory cache (1000 entries, 60 min TTL) ───────────────────────
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes
const CACHE_MAX_SIZE = 1000;

function getCacheKey(action: string, payload: string): string {
  return `${action}:${payload.toLowerCase().trim()}`;
}

function getFromCache(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
  // LRU-style eviction: remove oldest when oversized
  if (cache.size > CACHE_MAX_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

// ── Request deduplication ────────────────────────────────────────────
const inflightRequests = new Map<string, Promise<any>>();

async function deduplicatedCall(key: string, fn: () => Promise<any>): Promise<any> {
  const existing = inflightRequests.get(key);
  if (existing) return existing;

  const promise = fn().finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, promise);
  return promise;
}

// ── API Key Management: Least Connections + Cooldown ─────────────────
type KeyState = {
  key: string;
  activeRequests: number;
  lastUsedAt: number;
  cooldownUntil: number;
  consecutiveFailures: number;
  proxyUrl?: string;
};

let keyStates: KeyState[] = [];

function initializeKeys() {
  if (keyStates.length === 0) {
    const rawGroq = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
    const rawOr = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || "";
    const rawOai = process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || "";
    const groqKeys = rawGroq.split(",").map((k) => k.trim()).filter(Boolean);
    const orKeys = rawOr.split(",").map((k) => k.trim()).filter(Boolean);
    const oaiKeys = rawOai.split(",").map((k) => k.trim()).filter(Boolean);

    let splitKeys = [...groqKeys, ...orKeys, ...oaiKeys];

    // Map keys to custom proxy URLs if configured (comma-separated URLs corresponding to keys)
    const rawProxies = process.env.GROQ_PROXY_URLS || "";
    const proxyUrls = rawProxies.split(",").map((p) => p.trim()).filter(Boolean);

    // If no keys from env, use the fallback
    if (splitKeys.length === 0 && FALLBACK_GROQ_KEY) {
      splitKeys = [FALLBACK_GROQ_KEY];
    }

    keyStates = splitKeys
      .filter((k) => k.trim().length > 0)
      .map((k, idx) => ({
        key: k,
        activeRequests: 0,
        lastUsedAt: 0,
        cooldownUntil: 0,
        consecutiveFailures: 0,
        proxyUrl: proxyUrls[idx] || undefined,
      }));
  }
}

function acquireBestKey(): KeyState | null {
  initializeKeys();
  if (keyStates.length === 0) return null;
  const now = Date.now();

  // Filter out keys that are currently in cooldown
  let available = keyStates.filter((k) => now >= k.cooldownUntil);

  if (available.length === 0) {
    // All keys in cooldown — pick the one that unlocks soonest
    available = [...keyStates].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  } else {
    // Sort by: fewest active requests → least recently used
    available.sort((a, b) => {
      if (a.activeRequests !== b.activeRequests) {
        return a.activeRequests - b.activeRequests;
      }
      return a.lastUsedAt - b.lastUsedAt;
    });
  }

  const bestKey = available[0];
  bestKey.activeRequests++;
  bestKey.lastUsedAt = now;
  return bestKey;
}

function releaseKey(state: KeyState, isRateLimited: boolean) {
  state.activeRequests = Math.max(0, state.activeRequests - 1);
  if (isRateLimited) {
    state.consecutiveFailures++;
    // Progressive cooldown: 10s, 20s, 40s based on consecutive failures
    const cooldownMs = Math.min(10000 * Math.pow(2, state.consecutiveFailures - 1), 60000);
    state.cooldownUntil = Date.now() + cooldownMs;
  } else {
    state.consecutiveFailures = 0;
  }
}

// ── Retry with key rotation + exponential backoff ────────────────────
const RETRY_DELAYS_MS = [800, 2000, 5000];
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout per API call

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function withRetry<T>(fn: (apiKey: string, proxyUrl?: string) => Promise<T>, maxRetries = 3): Promise<T> {
  initializeKeys();
  if (keyStates.length === 0) {
    throw new Error("No API keys configured. Please configure at least one API key (e.g. GROQ_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY) in the environment variables.");
  }
  let lastError: Error | null = null;
  const totalAttempts = Math.max(maxRetries, keyStates.length * 2);

  for (let attempt = 0; attempt <= totalAttempts; attempt++) {
    const keyState = acquireBestKey();
    if (!keyState) {
      throw new Error("No API keys available in pool.");
    }
    const now = Date.now();

    // If the best key is still in cooldown, wait for it
    if (keyState.cooldownUntil > now) {
      const waitTime = keyState.cooldownUntil - now;
      console.log(`All API keys in cooldown. Waiting ${Math.round(waitTime / 1000)}s...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    try {
      const result = await fn(keyState.key, keyState.proxyUrl);
      releaseKey(keyState, false);
      return result;
    } catch (err: any) {
      lastError = err;
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes("429") ||
        err?.message?.includes("rate_limit") ||
        err?.message?.includes("Too Many Requests");

      releaseKey(keyState, isRateLimit);

      if (isRateLimit) {
        console.log(`Rate limit on key (attempt ${attempt + 1}/${totalAttempts + 1}). Rotating...`);
        if (attempt < totalAttempts) {
          const nowTime = Date.now();
          const healthyKeys = keyStates.filter((k) => nowTime >= k.cooldownUntil).length;
          
          if (healthyKeys > 0) {
            console.log(`Healthy keys available in pool. Switching immediately with 0ms delay...`);
            continue;
          }

          const jitter = Math.random() * 500;
          const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] + jitter;
          console.log(`All keys rate-limited. Backing off for ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error("All API keys are rate limited. Please wait a moment and try again.");
      }

      // Server errors: standard backoff
      if (attempt < maxRetries) {
        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    }
  }
  throw lastError;
}

// ── CORS headers ─────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

// ── JSON schemas (embedded in prompts for Llama JSON mode) ───────────

const ANALYZE_SCHEMA = `{
  "categories": ["string array of relevant architecture categories"],
  "question": {
    "id": "string",
    "category": "string",
    "question": "string",
    "options": [{"label": "string", "description": "string"}],
    "suggestions": ["string array of additional features/categories"]
  }
}`;

const NEXT_QUESTION_SCHEMA = `{
  "question": {
    "id": "string",
    "category": "string",
    "question": "string",
    "options": [{"label": "string", "description": "string"}],
    "suggestions": ["string array of additional categories/features"]
  },
  "details": {
    "credentials": ["string array"],
    "apis": ["string array"],
    "libraries": ["string array"],
    "services": ["string array"]
  }
}`;

const GUIDE_SCHEMA = `{
  "guide": {
    "projectStructure": ["string array of file/folder paths"],
    "implementationSteps": [{"step": 1, "title": "string", "description": "string"}],
    "deploymentSteps": ["string array"],
    "envVars": ["string array"]
  }
}`;

// ── Groq JSON-mode helper ────────────────────────────────────────────
async function callGroqWithTools(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: string,
): Promise<any> {
  const fullSystemPrompt = `${systemPrompt}

You MUST respond with valid JSON matching this exact schema:
${jsonSchema}

Do NOT include any text outside the JSON object. Do NOT wrap in markdown code fences.`;

  await acquireSlot();
  try {
    const result = await withRetry(async (apiKey, proxyUrl) => {
      let apiUrl = proxyUrl ? `${proxyUrl}/chat/completions` : GROQ_API_URL;
      let model = GROQ_MODEL;
      if (apiKey.startsWith("sk-or")) {
        apiUrl = proxyUrl ? `${proxyUrl}/chat/completions` : OPENROUTER_API_URL;
        model = OPENROUTER_MODEL;
      } else if (apiKey.startsWith("sk-")) {
        apiUrl = proxyUrl ? `${proxyUrl}/chat/completions` : OPENAI_API_URL;
        model = OPENAI_MODEL;
      }
      const response = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        const err = new Error(`Groq API error ${response.status}: ${errBody}`);
        (err as any).status = response.status;
        throw err;
      }

      return response.json();
    });

    const text = result.choices?.[0]?.message?.content;
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    }
  } finally {
    releaseSlot();
  }
}

// ── Streaming chat with Groq (OpenAI-compatible SSE) ─────────────────
async function streamGroqChat(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  message: string,
): Promise<ReadableStream> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  await acquireSlot();
  try {
    const res = await withRetry(async (apiKey, proxyUrl) => {
      let apiUrl = proxyUrl ? `${proxyUrl}/chat/completions` : GROQ_API_URL;
      let model = GROQ_MODEL;
      if (apiKey.startsWith("sk-or")) {
        apiUrl = proxyUrl ? `${proxyUrl}/chat/completions` : OPENROUTER_API_URL;
        model = OPENROUTER_MODEL;
      } else if (apiKey.startsWith("sk-")) {
        apiUrl = proxyUrl ? `${proxyUrl}/chat/completions` : OPENAI_API_URL;
        model = OPENAI_MODEL;
      }
      const response = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages,
          stream: true,
          temperature: 0.5,
          max_tokens: 1024,
        }),
      }, 60000); // 60s timeout for streaming

      if (!response.ok) {
        const errBody = await response.text();
        const err = new Error(`Groq API error ${response.status}: ${errBody}`);
        (err as any).status = response.status;
        throw err;
      }
      return response;
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    return new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  // Groq already uses OpenAI format, forward as-is
                  const chunk = JSON.stringify({
                    choices: [{ delta: { content: text } }],
                  });
                  controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  } finally {
    releaseSlot();
  }
}

// ── Error response helper ────────────────────────────────────────────
function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders });
}

// ── OPTIONS handler (CORS preflight) ─────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

// ── POST handler ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Per-user rate limiting by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (!checkRateLimit(ip)) {
    return errorResponse("Too many requests. Please slow down and try again in a few seconds.", 429);
  }

  try {
    const { action, idea, decisions, completedCategories, remainingCategories, message, history } = await request.json();

    // ── ANALYZE ──
    if (action === "analyze") {
      const cacheKey = getCacheKey("analyze", idea);
      const cached = getFromCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached, { headers: corsHeaders });
      }

      const result = await deduplicatedCall(cacheKey, async () => {
        const systemPrompt = `You are a product architect AI. Given a startup idea, determine which architecture categories are RELEVANT (typically 5-10 from: Platform, Frontend, Backend, Database, Authentication, Payments, Notifications, Search, Analytics, Deployment, Infrastructure, File Storage, CI/CD, Caching, Messaging/Queue, CDN, Monitoring, Email Service, etc. or custom ones). Generate the first architecture decision question for the first category. Each question should have between 2 and 6 options depending on how many meaningful choices exist for that category. Simple binary decisions can have 2 options; complex ones can have up to 6. The "suggestions" should be additional features/categories the user might want to consider.`;

        const parsed = await callGroqWithTools(
          systemPrompt,
          `Startup idea: ${idea}`,
          ANALYZE_SCHEMA,
        );

        return parsed || { question: null, categories: [] };
      });

      setCache(cacheKey, result);
      return NextResponse.json(result, { headers: corsHeaders });
    }

    // ── NEXT QUESTION ──
    if (action === "next_question") {
      const remaining = remainingCategories || [];
      if (remaining.length === 0) {
        return NextResponse.json({ complete: true }, { headers: corsHeaders });
      }

      const nextCategory = remaining[0];
      const decisionsStr = (decisions || []).map((d: any) => `${d.category}: ${d.selection}`).join(", ");

      const cacheKey = getCacheKey("next_question", `${idea}|${decisionsStr}|${nextCategory}`);
      const cached = getFromCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached, { headers: corsHeaders });
      }

      const result = await deduplicatedCall(cacheKey, async () => {
        const systemPrompt = `You are a product architect AI. Based on the startup idea and previous decisions, generate the next architecture decision question for the "${nextCategory}" category. Each question should have between 2 and 6 options depending on how many meaningful choices exist. Simple binary decisions can have 2 options; complex ones can have up to 6. Make options contextually relevant. The "details" field describes what's needed for the PREVIOUS selection. The "suggestions" should be additional categories/features not yet covered.`;

        const parsed = await callGroqWithTools(
          systemPrompt,
          `Idea: ${idea}\nPrevious decisions: ${decisionsStr}`,
          NEXT_QUESTION_SCHEMA,
        );

        if (parsed) {
          return {
            question: parsed.question,
            details: parsed.details,
            complete: false,
          };
        }
        return { question: null, complete: true };
      });

      setCache(cacheKey, result);
      return NextResponse.json(result, { headers: corsHeaders });
    }

    // ── GENERATE GUIDE ──
    if (action === "generate_guide") {
      const decisionsStr = (decisions || []).map((d: any) => `${d.category}: ${d.selection}`).join("\n");

      const cacheKey = getCacheKey("guide", `${idea}|${decisionsStr}`);
      const cached = getFromCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached, { headers: corsHeaders });
      }

      const result = await deduplicatedCall(cacheKey, async () => {
        const systemPrompt = `You are a product architect. Generate a complete implementation guide based on the architecture decisions.`;

        const parsed = await callGroqWithTools(
          systemPrompt,
          `Idea: ${idea}\nArchitecture:\n${decisionsStr}`,
          GUIDE_SCHEMA,
        );

        return parsed || { guide: null };
      });

      setCache(cacheKey, result);
      return NextResponse.json(result, { headers: corsHeaders });
    }

    // ── CHAT (STREAMING) ──
    if (action === "chat") {
      const decisionsStr = (decisions || []).map((d: any) => `${d.category}: ${d.selection}`).join(", ");
      const historyMessages = (history || []).map((m: any) => ({ role: m.role, content: m.content }));

      const systemPrompt = `You are an AI architect assistant. The user is building: "${idea}". Their architecture decisions so far: ${decisionsStr}. Help them with technical questions about APIs, databases, deployment, authentication, libraries, and implementation. Be concise and practical. Keep answers short (3-5 sentences max unless asked for detail).`;

      const stream = await streamGroqChat(systemPrompt, historyMessages, message);

      return new NextResponse(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return errorResponse("Unknown action", 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API route error:", msg);
    if (msg.includes("429") || msg.includes("rate_limit") || msg.includes("Too Many Requests")) {
      return errorResponse("Rate limit exceeded. Please wait a moment and try again.", 429);
    }
    return errorResponse(msg, 500);
  }
}
