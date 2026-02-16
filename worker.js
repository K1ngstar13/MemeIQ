export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Basic CORS (optional but helpful)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(request),
      });
    }

    // Route mapping
    if (path === "/api/sentiment") return handleSentiment(request, env, ctx);
    if (path === "/api/rugrisk") return handleRugRisk(request, env, ctx);
    if (path === "/api/chart-vision") return handleChartVision(request, env, ctx);

    return new Response("Not Found", { status: 404, headers: corsHeaders(request) });
  },
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(obj, request, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}

async function hfCall(model, body, env, ctx, cacheKey, cacheTtlSeconds = 60) {
  // Cache to reduce HF free-tier pain
  const cache = caches.default;

  const cacheReq = new Request("https://cache.local/" + cacheKey);
  const cached = await cache.match(cacheReq);
  if (cached) return cached;

  const hfUrl = `https://api-inference.huggingface.co/models/${model}`;

  // Retries for 503/429 (model loading / throttling)
  const maxRetries = 3;
  let last;

  for (let i = 0; i <= maxRetries; i++) {
    const res = await fetch(hfUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Hugging Face serverless can return 503 while loading, or 429 if limited
    if (res.status === 503 || res.status === 429) {
      last = res;
      if (i < maxRetries) {
        await sleep(350 * (2 ** i) + Math.floor(Math.random() * 200));
        continue;
      }
    }

    // If non-ok, still return JSON error payload to frontend
    const text = await res.text();
    const out = new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Cache only successful results
    if (res.ok) {
      ctx.waitUntil(
        cache.put(
          cacheReq,
          new Response(text, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${cacheTtlSeconds}`,
            },
          })
        )
      );
      return jsonResponse({ ok: true, data: safeJson(text) }, new Request("https://x"), 200);
    }

    return jsonResponse({ ok: false, error: safeJson(text), status: res.status }, new Request("https://x"), res.status);
  }

  const msg = last ? await last.text() : '{"message":"unknown error"}';
  return jsonResponse({ ok: false, error: safeJson(msg) }, new Request("https://x"), 500);
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Routes ----------

async function handleSentiment(request, env, ctx) {
  const { text } = await request.json();
  if (!text || typeof text !== "string") return jsonResponse({ ok: false, error: "Invalid text" }, request, 400);

  const model = "cardiffnlp/twitter-roberta-base-sentiment-latest";
  const body = { inputs: text };

  const cacheKey = `sentiment:${hash(text)}`;
  const res = await hfCall(model, body, env, ctx, cacheKey, 60);

  // normalize response in-worker so frontend is simple
  const payload = await res.json();
  if (!payload.ok) return jsonResponse(payload, request, 200);

  const raw = payload.data;
  const arr = Array.isArray(raw) ? raw : [];
  const preds = Array.isArray(arr[0]) ? arr[0] : arr;

  // labels usually: LABEL_0 / LABEL_1 / LABEL_2 or "negative/neutral/positive"
  // We'll map by best guess
  const mapped = preds.map((p) => ({
    label: normalizeSentimentLabel(p.label),
    score: p.score,
  }));

  return jsonResponse({ ok: true, preds: mapped }, request, 200);
}

function normalizeSentimentLabel(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("positive") || l.includes("label_2")) return "positive";
  if (l.includes("neutral") || l.includes("label_1")) return "neutral";
  if (l.includes("negative") || l.includes("label_0")) return "negative";
  return label;
}

async function handleRugRisk(request, env, ctx) {
  const { summary } = await request.json();
  if (!summary || typeof summary !== "string") return jsonResponse({ ok: false, error: "Invalid summary" }, request, 400);

  const model = "facebook/bart-large-mnli";
  const body = {
    inputs: summary,
    parameters: {
      candidate_labels: ["rug pull", "legitimate", "high risk", "safe"],
    },
  };

  const cacheKey = `rugrisk:${hash(summary)}`;
  const res = await hfCall(model, body, env, ctx, cacheKey, 120);
  const payload = await res.json();
  return jsonResponse(payload, request, 200);
}

async function handleChartVision(request, env, ctx) {
  const { imageDataUrl } = await request.json();
  if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return jsonResponse({ ok: false, error: "Invalid imageDataUrl" }, request, 400);
  }

  // NOTE: This is a placeholder pipeline using DETR object detection.
  // For true chart-pattern recognition, we'd switch to a chart-trained model later.
  const model = "facebook/detr-resnet-50";

  // HF vision endpoints usually want raw bytes, but to keep Worker simple we’ll send base64-in-json.
  // Many HF models accept this style: { inputs: "data:image/png;base64,..." }
  const body = { inputs: imageDataUrl };

  const cacheKey = `chart:${hash(imageDataUrl.slice(0, 200))}`; // partial hash
  const res = await hfCall(model, body, env, ctx, cacheKey, 120);
  const payload = await res.json();
  return jsonResponse(payload, request, 200);
}

// Simple fast hash for cache keys
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
