// Chart Vision API - Analyzes chart images using HuggingFace DETR model
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { imageDataUrl } = req.body || {};
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ ok: false, error: 'Missing "imageDataUrl"' });
    }

    const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_KEY;
    if (!HF_API_KEY) {
      return res.status(500).json({ ok: false, error: "Server missing HUGGINGFACE_API_KEY env var" });
    }

    // Use DETR for object detection in charts
    const model = "facebook/detr-resnet-50";
    
    // FIX: Remove template literal syntax error
    const url = `https://api-inference.huggingface.co/models/${model}`;
    
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: imageDataUrl }),
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error('HuggingFace error:', r.status, errorText);
      return res.status(500).json({ 
        ok: false, 
        error: `HuggingFace API error: ${r.status}` 
      });
    }

    const data = await r.json();
    return res.status(200).json({ ok: true, data });
    
  } catch (e) {
    console.error('Chart vision error:', e);
    return res.status(500).json({ 
      ok: false, 
      error: e?.message || "Unknown error" 
    });
  }
}
