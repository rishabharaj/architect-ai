import { NextRequest, NextResponse } from "next/server";

// ── Config ───────────────────────────────────────────────────────────
const GROQ_MODEL = "llama-3.1-8b-instant";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── Reliability: Global request pacer ────────────────────────────────
// Groq has generous rate limits, but we still pace to be safe
const MIN_REQUEST_GAP_MS = 500;
let lastRequestTime = 0;

async function paceRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_GAP_MS) {
    const waitMs = MIN_REQUEST_GAP_MS - elapsed;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  lastRequestTime = Date.now();
}

// ── Reliability: Serialize requests (max 2 concurrent) ──────────────
const MAX_CONCURRENT = 2;
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

// ── Reliability: In-memory cache ─────────────────────────────────────
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

// ── Reliability: Request deduplication ───────────────────────────────
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

// ── Reliability: Retry with exponential backoff ──────────────────────
const RETRY_DELAYS_MS = [1000, 2000, 4000];

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRateLimit =
        err?.status === 429 ||
        err?.message?.includes("429") ||
        err?.message?.includes("rate_limit") ||
        err?.message?.includes("Too Many Requests");
      if (!isRateLimit || attempt === maxRetries) {
        throw err;
      }
      const baseDelay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      console.log(`Rate limited. Waiting ${Math.round(delay / 1000)}s before retry ${attempt + 1}/${maxRetries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const fullSystemPrompt = `${systemPrompt}

You MUST respond with valid JSON matching this exact schema:
${jsonSchema}

Do NOT include any text outside the JSON object. Do NOT wrap in markdown code fences.`;

  await acquireSlot();
  try {
    await paceRequest();
    const result = await withRetry(async () => {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: fullSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_tokens: 4096,
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

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
    await paceRequest();
    const res = await withRetry(async () => {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          stream: true,
          temperature: 0.5,
          max_tokens: 2048,
        }),
      });

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
