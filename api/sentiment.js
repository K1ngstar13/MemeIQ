export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { text } = req.body || {};
  if (!text || typeof text !== "string") return res.status(400).json({ ok: false, error: "Invalid text" });

  try {
    const out = await hfJsonCall(
      "cardiffnlp/twitter-roberta-base-sentiment-latest",
      { inputs: text },
      { cacheSeconds: 60 }
    );

    // Normalize HF response: [[{label,score}...]] OR [{label,score}...]
    const arr = Array.isArray(out) ? out : [];
    const preds = Array.isArray(arr[0]) ? arr[0] : arr;

    const mapped = (preds || []).map((p) => ({
      label: normalizeSentimentLabel(p?.label),
      score: typeof p?.score === "number" ? p.score : 0,
    }));

    return res.status(200).json({ ok: true, preds: mapped });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || "sentiment failed" });
  }
}

function normalizeSentimentLabel(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("positive") || l.includes("label_2")) return "positive";
  if (l.includes("neutral") || l.includes("label_1")) return "neutral";
  if (l.includes("negative") || l.includes("label_0")) return "negative";
  return label || "unknown";
}

async function hfJsonCall(model, body, { cacheSeconds = 60 } = {}) {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("Missing HF_TOKEN env var");

  const url = `https://api-inference.huggingface.co/models/${model}`;

  // Simple retry/backoff for 503/429
  const maxRetries = 3;
  let lastErr = null;

  for (let i = 0; i <= maxRetries; i++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 503 || resp.status === 429) {
      lastErr = new Error(`HF temporary ${resp.status}`);
      if (i < maxRetries) {
        await sleep(350 * (2 ** i) + Math.floor(Math.random() * 200));
        continue;
      }
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(data?.error || data?.message || `HF error ${resp.status}`);

    return data;
  }

  throw lastErr || new Error("HF call failed");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
