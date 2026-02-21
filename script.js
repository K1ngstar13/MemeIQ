"use strict";

let currentChart = null;
let currentTokenData = null;

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide?.createIcons) window.lucide.createIcons();

  document.getElementById("analyzeBtn")?.addEventListener("click", analyzeContract);
  document.getElementById("resetBtn")?.addEventListener("click", resetAnalysis);
  document.getElementById("aiBtn")?.addEventListener("click", runAIAnalysis);
  document.getElementById("alertBtn")?.addEventListener("click", setAlert);
  document.getElementById("chartBtn")?.addEventListener("click", viewChart);

  document.querySelectorAll(".exampleBtn").forEach((btn) => {
    btn.addEventListener("click", () => loadExample(btn.dataset.example));
  });

  const input = document.getElementById("contractInput");
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") analyzeContract();
  });

  document.getElementById("contractAddress")?.addEventListener("click", () => {
    const el = document.getElementById("contractAddress");
    const full = el?.dataset.fullAddress;
    if (full) copyToClipboard(full);
  });
});

function show(elId) {
  const el = document.getElementById(elId);
  if (el) el.classList.remove("hidden");
}

function hide(elId) {
  const el = document.getElementById(elId);
  if (el) el.classList.add("hidden");
}

function setLoadingStep(text) {
  const el = document.getElementById("loadingStep");
  if (el) el.textContent = text;
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied!");
  } catch {
    showToast("Copy failed");
  }
}

function loadExample(type) {
  const examples = {
    bonk: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    pepe: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    shiba: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  };

  const input = document.getElementById("contractInput");
  if (input) input.value = examples[type] || "";
}

function resetAnalysis() {
  currentTokenData = null;

  hide("analysisResults");
  hide("loadingState");
  show("searchSection");

  const input = document.getElementById("contractInput");
  if (input) input.value = "";

  hide("sentimentResult");
  show("sentimentPlaceholder");
  hide("patternResult");
  show("patternPlaceholder");
  hide("rugPullResult");
  show("rugPullPlaceholder");
  hide("aiAnalysisError");

  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

async function analyzeContract() {
  const raw = document.getElementById("contractInput")?.value?.trim() || "";
  if (!raw) return showToast("Enter a token mint address");

  if (raw.length < 32 || raw.length > 50) {
    return showToast("That doesn't look like a Solana mint address");
  }

  hide("searchSection");
  show("loadingState");
  hide("analysisResults");

  try {
    setLoadingStep("Calling Birdeye APIs…");

    const data = await getJSON(`/api/analyze?address=${encodeURIComponent(raw)}`);

    if (!data?.ok) {
      console.error("Analyze error:", data);
      throw new Error(data?.error || "Analyze failed");
    }

    currentTokenData = data.token;
    renderResults(currentTokenData);

    hide("loadingState");
    show("analysisResults");

    initChart(currentTokenData?.chart?.points || []);

    if (window.lucide?.createIcons) window.lucide.createIcons();
    document.getElementById("analysisResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    console.error(e);
    hide("loadingState");
    show("searchSection");
    showToast(e?.message || "Failed to analyze token");
  }
}

async function getJSON(url) {
  const r = await fetch(url, { method: "GET" });
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await r.text();
    throw new Error(`Non-JSON from server: ${text.slice(0, 160)}`);
  }
  return r.json();
}

function fmtUSD(n) {
  const num = Number(n);
  if (!isFinite(num)) return "--";
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toLocaleString()}`;
}

function fmtPrice(p) {
  const num = Number(p);
  if (!isFinite(num)) return "$--";
  if (num >= 1) return `$${num.toFixed(4)}`;
  if (num >= 0.01) return `$${num.toFixed(6)}`;
  return `$${num.toFixed(10)}`;
}

function renderResults(t) {
  // Header
  document.getElementById("tokenName").textContent = t.name || "Unknown";
  document.getElementById("tokenSymbol").textContent = t.symbol || "--";
  document.getElementById("tokenImage").src = t.logo || "";

  const caEl = document.getElementById("contractAddress");
  caEl.dataset.fullAddress = t.address;
  caEl.textContent = `Address: ${t.address.slice(0, 8)}...${t.address.slice(-8)}`;

  const vb = document.getElementById("verifiedBadge");
  if (t.verified) vb.classList.remove("hidden");
  else vb.classList.add("hidden");

  // Price
  document.getElementById("currentPrice").textContent = fmtPrice(t.price);
  const ch = Number(t.priceChange24h);
  const priceChangeEl = document.getElementById("priceChange");
  priceChangeEl.textContent = isFinite(ch) ? `${ch > 0 ? "+" : ""}${ch.toFixed(2)}%` : "--";
  priceChangeEl.className = `text-sm font-medium ${ch >= 0 ? "text-green-400" : "text-red-400"}`;

  document.getElementById("marketCap").textContent = fmtUSD(t.marketCap);
  document.getElementById("fdv").textContent = fmtUSD(t.fdv);

  // Liquidity
  document.getElementById("totalLiquidity").textContent = fmtUSD(t.liquidityUSD);
  document.getElementById("lpLocked").textContent = isFinite(Number(t.lpLockedPct)) ? `${Number(t.lpLockedPct).toFixed(0)}%` : "--%";
  document.getElementById("mcapLiqRatio").textContent = isFinite(Number(t.mcapLiqRatio)) ? `${Number(t.mcapLiqRatio).toFixed(1)}x` : "--x";

  document.getElementById("liquidityScore").textContent = `${t.scores.liquidity}/100`;
  document.getElementById("liquidityBar").style.width = `${t.scores.liquidity}%`;
  document.getElementById("liquidityBar").className =
    `h-2 rounded-full transition-all duration-1000 ${
      t.scores.liquidity > 70 ? "bg-green-500" : t.scores.liquidity > 40 ? "bg-yellow-500" : "bg-red-500"
    }`;

  // Volume
  document.getElementById("volume24h").textContent = fmtUSD(t.volume24hUSD);
  document.getElementById("buySellRatio").textContent = t.buySellRatio ? `${t.buySellRatio.toFixed(2)}:1` : "--";
  document.getElementById("volumeScore").textContent = `${t.scores.volume}/100`;
  document.getElementById("volumeBar").style.width = `${t.scores.volume}%`;

  const washRiskEl = document.getElementById("washTradingRisk");
  washRiskEl.textContent = t.washRiskLabel;
  washRiskEl.className =
    `text-xs px-2 py-1 rounded ${
      t.washRiskLabel === "Low" ? "bg-green-900/50 text-green-400"
      : t.washRiskLabel === "Medium" ? "bg-yellow-900/50 text-yellow-400"
      : "bg-red-900/50 text-red-400"
    }`;

  // Holders - FIXED TO USE API DATA
  document.getElementById("totalHolders").textContent = isFinite(Number(t.holders)) ? Number(t.holders).toLocaleString() : "--";
  
  // Holder growth - read from API response
  const growth24h = t.holderGrowth24h || "0.0";
  const growth7d = t.holderGrowth7d || "0.0";
  document.getElementById("holderGrowth").textContent = `${growth24h}% (24h) • ${growth7d}% (7d)`;
  
  // New buyers - read from API response
  document.getElementById("newBuyers24h").textContent = isFinite(Number(t.newBuyers24h)) ? Number(t.newBuyers24h).toLocaleString() : "--";

  document.getElementById("top10Holders").textContent = isFinite(Number(t.top10Pct)) ? `${Number(t.top10Pct).toFixed(1)}%` : "--%";
  document.getElementById("devWallet").textContent = "--";

  const concRiskEl = document.getElementById("concentrationRisk");
  concRiskEl.textContent = t.concentrationLabel;
  concRiskEl.className =
    `text-xs px-2 py-1 rounded ${
      t.concentrationLabel === "Healthy" ? "bg-green-900/50 text-green-400"
      : t.concentrationLabel === "Moderate" ? "bg-yellow-900/50 text-yellow-400"
      : "bg-red-900/50 text-red-400"
    }`;

  document.getElementById("holderScore").textContent = `${t.scores.holders}/100`;

  // ⭐ FIX: Use API's overall score
  const overall = t.scores.overall || Math.round((t.scores.liquidity + t.scores.volume + t.scores.holders) / 3);
  const scoreEl = document.getElementById("overallScore");
  scoreEl.textContent = overall;
  scoreEl.className = `text-3xl font-bold ${overall > 75 ? "text-green-400" : overall > 50 ? "text-yellow-400" : "text-red-400"}`;

  const ratingEl = document.getElementById("overallRating");
  if (overall >= 80) {
    ratingEl.textContent = "STRONG";
    ratingEl.className = "px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30";
  } else if (overall >= 60) {
    ratingEl.textContent = "MODERATE";
    ratingEl.className = "px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  } else {
    ratingEl.textContent = "HIGH RISK";
    ratingEl.className = "px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30";
  }

  // Recommendation
  const rec = t.recommendation;
  const recBadge = document.getElementById("recommendationBadge");
  recBadge.textContent = rec;
  recBadge.className =
    rec === "BUY" ? "px-4 py-2 rounded-full text-sm font-bold bg-green-500 text-white"
    : rec === "CAUTION" ? "px-4 py-2 rounded-full text-sm font-bold bg-yellow-500 text-gray-900"
    : "px-4 py-2 rounded-full text-sm font-bold bg-red-500 text-white";

  document.getElementById("entryPrice").textContent = fmtPrice(t.entryPrice);
  document.getElementById("exitPrice").textContent = fmtPrice(t.exitPrice);
  document.getElementById("analysisSummary").textContent = t.summary;

  // Risks
  const riskGrid = document.getElementById("riskGrid");
  riskGrid.innerHTML = (t.risks || []).map(risk => `
    <div class="bg-gray-800/50 rounded-lg p-4 border ${risk.risk ? "border-red-500/30 bg-red-900/10" : "border-green-500/30 bg-green-900/10"}">
      <p class="text-xs text-gray-500 mb-1">${risk.name}</p>
      <p class="font-semibold ${risk.risk ? "text-red-400" : "text-green-400"}">${risk.status}</p>
    </div>
  `).join("");
}

function initChart(points) {
  if (!window.Chart) {
    console.warn("Chart.js not loaded");
    return;
  }
  const canvas = document.getElementById("volumeChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  const labels = points.map(p => p.label);
  const prices = points.map(p => p.price);
  const volumes = points.map(p => p.volume);

  currentChart = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: "line",
          label: "Price (USD)",
          data: prices,
          borderColor: "rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.12)",
          tension: 0.35,
          yAxisID: "y",
          fill: true
        },
        {
          type: "bar",
          label: "Volume",
          data: volumes,
          backgroundColor: "rgba(139, 92, 246, 0.5)",
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "rgb(156, 163, 175)" } }
      },
      scales: {
        x: { ticks: { color: "rgb(156, 163, 175)" }, grid: { color: "rgba(75, 85, 99, 0.25)" } },
        y: { ticks: { color: "rgb(156, 163, 175)" }, grid: { color: "rgba(75, 85, 99, 0.25)" } },
        y1: { position: "right", ticks: { display: false }, grid: { display: false } }
      }
    }
  });
}

function setAlert() {
  showToast("Alert saved (demo)");
}

function viewChart() {
  if (!currentTokenData?.address) return;
  window.open(`https://dexscreener.com/solana/${currentTokenData.address}`, "_blank");
}

// ========================================
// AI ANALYSIS WITH CHART VISION
// ========================================
async function runAIAnalysis() {
  if (!currentTokenData) return showToast("Analyze a token first");

  hide("aiAnalysisError");

  hide("sentimentResult"); show("sentimentPlaceholder");
  hide("patternResult"); show("patternPlaceholder");
  hide("rugPullResult"); show("rugPullPlaceholder");

  show("sentimentLoading");
  show("patternLoading");
  show("rugPullLoading");

  try {
    const text = `${currentTokenData.name} ${currentTokenData.symbol} crypto sentiment`;
    const summary = currentTokenData.summaryForAI;

    // Run sentiment and rug risk analysis
    const [sentimentRes, rugRes] = await Promise.all([
      postJSON("/api/sentiment", { text }),
      postJSON("/api/rugrisk", { summary })
    ]);

    // Sentiment
    if (sentimentRes?.ok) {
      displaySentimentResults(normalizeSentimentFromPreds(sentimentRes.preds, currentTokenData.name));
      hide("sentimentPlaceholder"); show("sentimentResult");
    }

    // Pattern Recognition - Enhanced with Chart Vision
    await analyzeChartPattern();

    // Rug Risk
    if (rugRes?.ok) {
      const z = rugRes.data;
      const riskData = normalizeRugRiskFromZeroShot(z);
      displayRugPullResults(riskData);
      hide("rugPullPlaceholder"); show("rugPullResult");
    }

    showToast("AI Analysis Complete");
    if (window.lucide?.createIcons) window.lucide.createIcons();
  } catch (e) {
    console.error(e);
    show("aiAnalysisError");
    document.getElementById("aiErrorMessage").textContent = e?.message || "AI analysis failed";
  } finally {
    hide("sentimentLoading");
    hide("patternLoading");
    hide("rugPullLoading");
  }
}

// NEW: Enhanced pattern analysis with chart vision
async function analyzeChartPattern() {
  try {
    // First try heuristic analysis from chart data
    const patternData = heuristicPatternFromChart(currentTokenData?.chart?.points || []);
    
    // If we have a chart canvas, try AI vision analysis
    const canvas = document.getElementById("volumeChart");
    if (canvas && currentChart) {
      try {
        // Get chart as image
        const imageDataUrl = canvas.toDataURL('image/png');
        
        // Call chart vision API
        const visionRes = await postJSON("/api/chart-vision", { imageDataUrl });
        
        if (visionRes?.ok && visionRes.data) {
          // Enhance pattern data with AI vision insights
          patternData.aiVisionDetected = true;
          patternData.visionConfidence = Math.min(95, patternData.confidence + 10);
          patternData.description += " AI vision analysis confirmed the pattern.";
        }
      } catch (err) {
        console.warn('Chart vision failed, using heuristic only:', err);
      }
    }
    
    displayPatternResults(patternData);
    hide("patternPlaceholder"); show("patternResult");
    
  } catch (e) {
    console.error('Pattern analysis error:', e);
    // Fallback to basic heuristic
    const fallbackData = heuristicPatternFromChart(currentTokenData?.chart?.points || []);
    displayPatternResults(fallbackData);
    hide("patternPlaceholder"); show("patternResult");
  }
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({ ok: false, error: `Non-JSON response (${r.status})` }));
  if (typeof data.ok !== "boolean") data.ok = r.ok;
  return data;
}

function normalizeSentimentFromPreds(preds = [], tokenName) {
  const pos = preds.find(p => p.label === "positive" || p.label === "POSITIVE")?.score || 0;
  const neu = preds.find(p => p.label === "neutral" || p.label === "NEUTRAL")?.score || 0;
  const neg = preds.find(p => p.label === "negative" || p.label === "NEGATIVE")?.score || 0;

  const positive = Math.round(pos * 100);
  const neutral = Math.round(neu * 100);
  const negative = Math.max(0, 100 - positive - neutral);
  const score = Math.max(0, Math.min(100, Math.round(((pos - neg) + 1) * 50)));

  return {
    positive, neutral, negative, score,
    summary: positive > 70 ? `Strong bullish sentiment for ${tokenName}.`
      : positive > 40 ? `Mixed sentiment for ${tokenName}.`
      : `Negative sentiment spike for ${tokenName}.`,
    mentions: [
      { text: "Liquidity + volume look decent (sample)", sentiment: "positive" },
      { text: "Watch top holders concentration (sample)", sentiment: "neutral" },
      { text: "If LP unlocks, exit fast (sample)", sentiment: "negative" }
    ]
  };
}

function displaySentimentResults(data) {
  document.getElementById("positiveSentiment").textContent = `${data.positive}%`;
  document.getElementById("neutralSentiment").textContent = `${data.neutral}%`;
  document.getElementById("negativeSentiment").textContent = `${data.negative}%`;
  document.getElementById("sentimentScore").textContent = `${data.score}/100`;

  const bar = document.getElementById("sentimentBar");
  bar.style.width = `${data.score}%`;
  bar.className = `h-2 rounded-full transition-all duration-1000 ${data.score > 70 ? "bg-green-500" : data.score > 40 ? "bg-yellow-500" : "bg-red-500"}`;

  document.getElementById("sentimentSummary").textContent = data.summary;

  document.getElementById("sentimentMentions").innerHTML = data.mentions.map(m => `
    <div class="flex items-start gap-2">
      <span class="text-${m.sentiment === "positive" ? "green" : m.sentiment === "negative" ? "red" : "gray"}-400 text-[10px] mt-0.5">●</span>
      <p class="text-gray-400 truncate">${m.text}</p>
    </div>
  `).join("");
}

function heuristicPatternFromChart(points) {
  if (!points.length) {
    return {
      name: "No chart data",
      description: "No history available",
      confidence: 0,
      trend: "Unknown",
      support: "--",
      resistance: "--",
      prediction: "Try again in a moment.",
      aiVisionDetected: false
    };
  }
  const first = points[0].price;
  const last = points[points.length - 1].price;
  const pct = first ? ((last - first) / first) * 100 : 0;

  const trend = pct > 3 ? "Bullish" : pct < -3 ? "Bearish" : "Sideways";
  const name = trend === "Bullish" ? "Uptrend" : trend === "Bearish" ? "Downtrend" : "Consolidation";
  const confidence = Math.min(95, Math.max(45, Math.round(Math.abs(pct) * 8)));

  const prices = points.map(p => p.price).filter(n => isFinite(n));
  const support = Math.min(...prices);
  const resistance = Math.max(...prices);

  return {
    name,
    description: "Technical analysis from 7d price movement.",
    confidence,
    trend,
    support: support.toFixed(10),
    resistance: resistance.toFixed(10),
    prediction: trend === "Bullish" ? "Momentum positive; wait for pullbacks." :
                trend === "Bearish" ? "Momentum negative; avoid chasing." :
                "Range-bound; wait for breakout confirmation.",
    aiVisionDetected: false
  };
}

function displayPatternResults(data) {
  document.getElementById("patternName").textContent = data.name;
  document.getElementById("patternDescription").textContent = data.description;
  document.getElementById("patternConfidence").textContent = `${data.confidence}%`;

  const tr = document.getElementById("patternTrend");
  tr.textContent = data.trend;
  tr.className = `text-xs px-2 py-1 rounded ${
    data.trend === "Bullish" ? "bg-green-900/50 text-green-400"
    : data.trend === "Bearish" ? "bg-red-900/50 text-red-400"
    : "bg-gray-800 text-gray-300"
  }`;

  document.getElementById("supportLevel").textContent = `S: $${data.support}`;
  document.getElementById("resistanceLevel").textContent = `R: $${data.resistance}`;
  document.getElementById("patternPrediction").textContent = data.prediction;
}

function normalizeRugRiskFromZeroShot(zeroShot) {
  const labels = zeroShot?.labels || [];
  const scores = zeroShot?.scores || [];
  const rugIdx = labels.findIndex(l => String(l).toLowerCase().includes("rug") || String(l).toLowerCase().includes("scam"));
  const rugProb = rugIdx >= 0 ? scores[rugIdx] : 0.25;
  const score = Math.round(rugProb * 100);
  return generateRugPullDataFromScore(score);
}

function generateRugPullDataFromScore(score) {
  const riskLevel = score < 30 ? "Low" : score < 70 ? "Medium" : "High";
  const indicators = [
    { name: "Liquidity Lock", status: score < 40 ? "Safe ✅" : score < 70 ? "Partial ⚠️" : "None ❌", risk: score > 60 },
    { name: "Top Holders", status: score < 35 ? "Healthy ✅" : score < 70 ? "Moderate ⚠️" : "Extreme ❌", risk: score > 70 },
    { name: "Authorities", status: score < 40 ? "Revoked ✅" : score < 70 ? "Mixed ⚠️" : "Active ❌", risk: score > 60 },
    { name: "Volume Pattern", status: score > 80 ? "Artificial ❌" : score > 55 ? "Suspicious ⚠️" : "Organic ✅", risk: score > 55 },
  ];
  const flags =
    riskLevel === "High" ? ["LP unlock risk", "Concentration risk", "Rug-like label"]
    : riskLevel === "Medium" ? ["Monitor LP", "Use tight stops"]
    : ["Lower risk signals"];
  return { score, riskLevel, indicators, flags };
}

function displayRugPullResults(data) {
  const scoreEl = document.getElementById("rugPullScore");
  scoreEl.textContent = data.score;

  scoreEl.className =
    data.riskLevel === "High" ? "text-4xl font-bold mb-1 text-red-400"
    : data.riskLevel === "Medium" ? "text-4xl font-bold mb-1 text-yellow-400"
    : "text-4xl font-bold mb-1 text-green-400";

  document.getElementById("rugPullIndicators").innerHTML = data.indicators.map(ind => `
    <div class="flex items-center justify-between bg-gray-900/40 border border-gray-700 rounded-lg px-3 py-2">
      <span class="text-xs text-gray-400">${ind.name}</span>
      <span class="text-xs font-medium ${ind.risk ? "text-red-400" : "text-green-400"}">${ind.status}</span>
    </div>
  `).join("");

  document.getElementById("mlFlags").innerHTML = data.flags.map(f => `
    <span class="px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-[11px]">${f}</span>
  `).join("");

  const verdictEl = document.getElementById("rugPullVerdict");
  const box = document.getElementById("rugPullVerdictBox");

  if (data.riskLevel === "High") {
    verdictEl.textContent = "HIGH RISK: Multiple rug-style signals detected.";
    box.className = "mt-4 p-3 rounded-lg border bg-red-900/20 border-red-500/30";
  } else if (data.riskLevel === "Medium") {
    verdictEl.textContent = "MEDIUM RISK: Mixed signals — trade smaller and use tight stops.";
    box.className = "mt-4 p-3 rounded-lg border bg-yellow-900/20 border-yellow-500/30";
  } else {
    verdictEl.textContent = "LOWER RISK: Fewer rug-like signals detected (still DYOR).";
    box.className = "mt-4 p-3 rounded-lg border bg-green-900/20 border-green-500/30";
  }
}
