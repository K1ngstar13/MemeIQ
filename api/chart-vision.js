export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const { imageDataUrl } = req.body || {};
  if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
    return res.status(400).json({ ok: false, error: "Invalid imageDataUrl" });
  }

  try {
    const out = await hfJsonCall(
      "facebook/detr-resnet-50",
      { inputs: imageDataUrl },
      { cacheSeconds: 120 }
    );

    return res.status(200).json({ ok: true, data: out });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || "chart-vision failed" });
  }
}

async function hfJsonCall(model, body, { cacheSeconds = 120 } = {}) {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("Missing HF_TOKEN env var");

  const url = `https://api-inference.huggingface.co/models/${model}`;
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
