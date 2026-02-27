// Rug Pull Risk Analysis API
// Uses zero-shot classification

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { summary } = req.body;

    if (!summary) {
      return res.status(400).json({ ok: false, error: 'Missing summary parameter' });
    }

    const hfKey = process.env.HUGGINGFACE_API_KEY;

    // No key → tell client to use its coin-specific fallback
    if (!hfKey) {
      return res.json({ ok: false, error: 'No HUGGINGFACE_API_KEY configured' });
    }

    // Use HuggingFace zero-shot classification
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: summary,
          parameters: {
            candidate_labels: ['safe investment', 'suspicious activity', 'rug pull scam']
          },
          options: { wait_for_model: true }
        })
      }
    );

    if (!response.ok) {
      console.error('HuggingFace error:', response.status);
      return res.json({ ok: false, error: `HuggingFace returned ${response.status}` });
    }

    const result = await response.json();

    // Sanity check
    if (!result.labels || !result.scores) {
      return res.json({ ok: false, error: 'Model returned unexpected format' });
    }

    return res.json({
      ok: true,
      data: {
        labels: result.labels,
        scores: result.scores
      }
    });

  } catch (e) {
    console.error('Rug risk API error:', e);
    return res.json({ ok: false, error: e.message });
  }
}
