// /api/sentiment.js (Vercel Serverless Function)
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing "text"' });
    }

    const HF_API_KEY = process.env.HF_API_KEY;
    if (!HF_API_KEY) {
      return res.status(500).json({ ok: false, error: 'Server missing HF_API_KEY env var' });
    }

    const model = 'cardiffnlp/twitter-roberta-base-sentiment-latest';

    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    const data = await r.json();

    // HF returns [[{label,score},...]] for this model
    const arr = Array.isArray(data) ? (data[0] || []) : [];
    const normalized = normalizeSentiment(arr);

    return res.status(200).json({ ok: true, preds: normalized });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Unknown error' });
  }
}

function normalizeSentiment(items) {
  // Ensure we always return labels: positive/neutral/negative
  const map = {};
  for (const it of items || []) {
    const label = String(it.label || '').toLowerCase();
    map[label] = it.score || 0;
  }

  // Some models return "LABEL_0/1/2" — this one typically returns words,
  // but just in case, fall back gracefully.
  let positive = map.positive ?? 0;
  let neutral  = map.neutral  ?? 0;
  let negative = map.negative ?? 0;

  const total = positive + neutral + negative;
  if (total > 0) {
    positive /= total; neutral /= total; negative /= total;
  }

  return [
    { label: 'positive', score: positive },
    { label: 'neutral',  score: neutral },
    { label: 'negative', score: negative },
  ];
}
