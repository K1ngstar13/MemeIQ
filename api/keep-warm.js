// Keeps the serverless function warm to avoid cold starts
export default async function handler(req, res) {
  return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
}
