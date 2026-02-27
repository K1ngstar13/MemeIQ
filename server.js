// MemeIQ — Express server for Railway deployment
// Serves static files + all API routes in a single persistent process.
// No cold starts. No cron restrictions. Keep-warm runs as a setInterval.

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Import API handlers (Vercel-style handlers work directly with Express)
import analyzeHandler    from "./api/analyze.js";
import sentimentHandler  from "./api/sentiment.js";
import rugRiskHandler    from "./api/rugrisk.js";
import chartVisionHandler from "./api/chart-vision.js";
import keepWarmHandler   from "./api/keep-warm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

const app = express();

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json({ limit: "15mb" }));   // needed for /api/chart-vision (base64 image)
app.use(express.urlencoded({ extended: true }));

// ── Static files (index.html, style.css, script.js) ──────────
app.use(express.static(__dirname, {
  // Don't let express.static try to serve api/ or node_modules/
  index: "index.html",
  dotfiles: "ignore"
}));

// ── API Routes ────────────────────────────────────────────────
app.get( "/api/analyze",      analyzeHandler);
app.post("/api/sentiment",     sentimentHandler);
app.post("/api/rugrisk",       rugRiskHandler);
app.post("/api/chart-vision",  chartVisionHandler);
app.get( "/api/keep-warm",     keepWarmHandler);

// ── SPA fallback — always serve index.html for unknown routes ─
app.get("*", (_req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MemeIQ running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "production"}`);

  const keys = [
    "BIRDEYE_API_KEY",
    "HUGGINGFACE_API_KEY",
    "HELIUS_API_KEY"
  ];
  keys.forEach(k => {
    const set = !!process.env[k];
    console.log(`  ${set ? "✅" : "⚠️ "} ${k} ${set ? "configured" : "NOT SET (some features degraded)"}`);
  });
});

// ── Keep-warm: ping ourselves every 10 minutes ───────────────
// Replaces the Vercel cron job. Railway keeps the process alive
// permanently so this is just a health-check/log heartbeat.
setInterval(async () => {
  try {
    const res = await fetch(`http://localhost:${PORT}/api/keep-warm`);
    if (res.ok) console.log(`[keep-warm] ${new Date().toISOString()} OK`);
  } catch {
    // Server not ready yet on first tick — ignore
  }
}, 10 * 60 * 1000); // every 10 minutes
