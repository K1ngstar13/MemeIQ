// Sentiment Analysis API
// Uses HuggingFace's sentiment model

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ ok: false, error: 'Missing text parameter' });
    }

    const hfKey = process.env.HUGGINGFACE_API_KEY;

    // No key → tell the client to use its coin-specific fallback
    if (!hfKey) {
      return res.json({ ok: false, error: 'No HUGGINGFACE_API_KEY configured' });
    }

    // Call HuggingFace sentiment model
    const response = await fetch(
      'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true }
        })
      }
    );

    if (!response.ok) {
      console.error('HuggingFace error:', response.status);
      return res.json({ ok: false, error: `HuggingFace returned ${response.status}` });
    }

    const result = await response.json();

    // HF returns array like: [[{label: "positive", score: 0.9}]]
    const predictions = Array.isArray(result[0]) ? result[0] : result;

    // Sanity check — if the model returned an error object instead of predictions
    if (!Array.isArray(predictions) || predictions.length === 0) {
      return res.json({ ok: false, error: 'Model returned unexpected format' });
    }

    return res.json({ ok: true, preds: predictions });

  } catch (e) {
    console.error('Sentiment API error:', e);
    return res.json({ ok: false, error: e.message });
  }
}
