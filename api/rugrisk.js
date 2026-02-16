// /api/rugrisk.js (Vercel Serverless Function)
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const { summary } = req.body || {};
    if (!summary || typeof summary !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing "summary"' });
    }

    const HF_API_KEY = process.env.HF_API_KEY;
    if (!HF_API_KEY) {
      return res.status(500).json({ ok: false, error: 'Server missing HF_API_KEY env var' });
    }

    const model = 'facebook/bart-large-mnli';
    const candidate_labels = ['rug pull', 'legitimate', 'high risk', 'safe'];

    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: summary,
        parameters: { candidate_labels },
      }),
    });

    const data = await r.json();
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Unknown error' });
  }
}
