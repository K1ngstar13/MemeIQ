export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

    const { imageDataUrl } = req.body || {};
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ ok: false, error: 'Missing "imageDataUrl"' });
    }

    const HF_API_KEY = process.env.HF_API_KEY;
    if (!HF_API_KEY) return res.status(500).json({ ok: false, error: "Server missing HF_API_KEY env var" });

    const model = "facebook/detr-resnet-50";

    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: imageDataUrl }),
    });

    const data = await r.json();
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
}
