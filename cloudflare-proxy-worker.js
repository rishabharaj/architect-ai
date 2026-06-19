/**
 * Cloudflare Worker: Transparent API Reverse Proxy
 * Routes incoming fetch requests directly to Groq (or OpenRouter/OpenAI) 
 * while egressing from Cloudflare's rotating edge IPs.
 */

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const url = new URL(request.url);
  
  // Target API base URL (Default to Groq)
  let targetBaseUrl = "https://api.groq.com/openai/v1";
  
  // Dynamically determine target based on authorization or pathname if needed
  const authHeader = request.headers.get("Authorization") || "";
  if (authHeader.startsWith("Bearer sk-or-")) {
    targetBaseUrl = "https://openrouter.ai/api/v1";
  } else if (authHeader.startsWith("Bearer sk-")) {
    targetBaseUrl = "https://api.openai.com/v1";
  }

  // Construct target URL
  // e.g. worker.dev/chat/completions -> api.groq.com/openai/v1/chat/completions
  const targetUrl = `${targetBaseUrl}${url.pathname}`;

  // Clone headers
  const newHeaders = new Headers(request.headers);
  newHeaders.set("Host", new URL(targetBaseUrl).host);

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "follow",
    });

    // Clone response to add CORS headers
    const corsResponse = new Response(response.body, response);
    corsResponse.headers.set("Access-Control-Allow-Origin", "*");
    corsResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    corsResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return corsResponse;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
