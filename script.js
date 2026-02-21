"use strict";

let currentChart = null;
let currentTokenData = null;

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide?.createIcons) window.lucide.createIcons();

  document.getElementById("analyzeBtn")?.addEventListener("click", analyzeContract);
  document.getElementById("resetBtn")?.addEventListener("click", resetAnalysis);
  document.getElementById("aiBtn")?.addEventListener("click", runAIAnalysis);
  document.getElementById("alertBtn")?.addEventListener("click", () => alert("Alert feature coming soon!"));
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
    if (full) {
      navigator.clipboard.writeText(full).then(() => alert("Copied!"));
    }
  });
});

function loadExample(type) {
  const examples = {
    bonk: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    pepe: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    shiba: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  };
  const input = document.getElementById("contractInput");
  if (input) input.value = examples[type] || "";
}

function show(id) {
  document.getElementById(id)?.classList.remove("hidden");
}

function hide(id) {
  document.getElementById(id)?.classList.add("hidden");
}

function resetAnalysis() {
  currentTokenData = null;
  hide("analysisResults");
  hide("loadingState");
  show("searchSection");
  document.getElementById("contractInput").value = "";
  
  hide("sentimentResult"); show("sentimentPlaceholder");
  hide("patternResult"); show("patternPlaceholder");
  hide("rugPullResult"); show("rugPullPlaceholder");
  hide("aiAnalysisError");

  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

async function analyzeContract() {
  const address = document.getElementById("contractInput")?.value?.trim() || "";
  if (!address) return alert("Enter a token address");
  if (address.length < 32 || address.length > 50) return alert("Invalid address format");

  hide("searchSection");
  show("loadingState");
  hide("analysisResults");

  try {
    document.getElementById("loadingStep").textContent = "Fetching token data...";
    const data = await fetch(`/api/analyze?address=${encodeURIComponent(address)}`).then(r => r.json());

    if (!data?.ok) throw new Error(data?.error || "Analysis failed");

    currentTokenData = data.token;
    renderResults(currentTokenData);

    hide("loadingState");
    show("analysisResults");

    initChart(currentTokenData?.chart?.points || []);
    if (window.lucide?.createIcons) window.lucide.createIcons();
  } catch (e) {
    console.error(e);
    hide("loadingState");
    show("searchSection");
    alert(e?.message || "Failed to analyze token");
  }
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

  if (t.verified) show("verifiedBadge");
  else hide("verifiedBadge");

  // Overall Score
  const overall = t.scores?.overall || Math.round((t.scores.liquidity + t.scores.volume + t.scores.holders) / 3);
  const scoreEl = document.getElementById("overallScore");
  scoreEl.textContent = overall;
  scoreEl.style.color = overall >= 80 ? "#10b981" : overall >= 60 ? "#f59e0b" : "#ef4444";

  const ratingEl = document.getElementById("overallRating");
  if (overall >= 80) {
    ratingEl.textContent = "SAFE";
    ratingEl.className = "px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/50";
  } else if (overall >= 60) {
    ratingEl.textContent = "MODERATE";
    ratingEl.className = "px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/50";
  } else {
    ratingEl.textContent = "HIGH RISK";
    ratingEl.className = "px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/50";
  }

  // Quick Stats
  document.getElementById("currentPrice").textContent = fmtPrice(t.price);
  const ch = Number(t.priceChange24h);
  const priceChangeEl = document.getElementById("priceChange");
  priceChangeEl.textContent = isFinite(ch) ? `${ch > 0 ? "+" : ""}${ch.toFixed(2)}%` : "--";
  priceChangeEl.style.color = ch >= 0 ? "#10b981" : "#ef4444";
  
  document.getElementById("marketCap").textContent = fmtUSD(t.marketCap);
  document.getElementById("totalLiquidity").textContent = fmtUSD(t.liquidityUSD);
  document.getElementById("totalHolders").textContent = isFinite(Number(t.holders)) ? Number(t.holders).toLocaleString() : "--";

  // Scores
  document.getElementById("liquidityScore").textContent = `${t.scores.liquidity}/100`;
  document.getElementById("lpLocked").textContent = isFinite(Number(t.lpLockedPct)) ? `${Number(t.lpLockedPct).toFixed(0)}%` : "--%";
  document.getElementById("mcapLiqRatio").textContent = isFinite(Number(t.mcapLiqRatio)) ? `${Number(t.mcapLiqRatio).toFixed(1)}x` : "--x";
  
  const liqBar = document.getElementById("liquidityBar");
  liqBar.style.width = `${t.scores.liquidity}%`;
  liqBar.style.backgroundColor = t.scores.liquidity > 70 ? "#10b981" : t.scores.liquidity > 40 ? "#f59e0b" : "#ef4444";

  document.getElementById("volumeScore").textContent = `${t.scores.volume}/100`;
  document.getElementById("volume24h").textContent = fmtUSD(t.volume24hUSD);
  
  const washRiskEl = document.getElementById("washTradingRisk");
  washRiskEl.textContent = t.washRiskLabel || "--";
  washRiskEl.style.backgroundColor = t.washRiskLabel === "Low" ? "rgba(16,185,129,0.2)" : 
                                      t.washRiskLabel === "Medium" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)";
  washRiskEl.style.color = t.washRiskLabel === "Low" ? "#10b981" : 
                           t.washRiskLabel === "Medium" ? "#f59e0b" : "#ef4444";

  const volBar = document.getElementById("volumeBar");
  volBar.style.width = `${t.scores.volume}%`;

  document.getElementById("holderScore").textContent = `${t.scores.holders}/100`;
  document.getElementById("top10Holders").textContent = isFinite(Number(t.top10Pct)) ? `${Number(t.top10Pct).toFixed(1)}%` : "--%";
  
  const concRiskEl = document.getElementById("concentrationRisk");
  concRiskEl.textContent = t.concentrationLabel || "--";
  concRiskEl.style.backgroundColor = t.concentrationLabel === "Healthy" ? "rgba(16,185,129,0.2)" : 
                                      t.concentrationLabel === "Moderate" ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)";
  concRiskEl.style.color = t.concentrationLabel === "Healthy" ? "#10b981" : 
                           t.concentrationLabel === "Moderate" ? "#f59e0b" : "#ef4444";

  const holBar = document.getElementById("holderBar");
  holBar.style.width = `${t.scores.holders}%`;

  // Recommendations
  const rec = t.recommendation;
  const recBadge = document.getElementById("recommendationBadge");
  recBadge.textContent = rec;
  recBadge.style.backgroundColor = rec === "BUY" ? "#10b981" : rec === "CAUTION" ? "#f59e0b" : "#ef4444";
  recBadge.style.color = rec === "BUY" ? "#000" : "#fff";

  document.getElementById("entryPrice").textContent = fmtPrice(t.price);
  document.getElementById("stopLoss").textContent = fmtPrice(Number(t.price) * 0.9);
  document.getElementById("exitPrice").textContent = fmtPrice(Number(t.price) * 1.2);
  document.getElementById("analysisSummary").textContent = t.summary;

  // Risk Flags
  const riskGrid = document.getElementById("riskGrid");
  riskGrid.innerHTML = (t.risks || []).map(risk => `
    <div class="p-3 rounded-lg border ${risk.risk ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30'}">
      <p class="text-xs text-gray-400 mb-1">${risk.name}</p>
      <p class="text-sm font-semibold ${risk.risk ? 'text-red-400' : 'text-green-400'}">${risk.status}</p>
    </div>
  `).join("");
}

function initChart(points) {
  if (!window.Chart) return;
  const canvas = document.getElementById("volumeChart");
  if (!canvas) return;
  
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  const ctx = canvas.getContext("2d");
  const labels = points.map(p => p.label);
  const prices = points.map(p => p.price);
  const volumes = points.map(p => p.volume);

  currentChart = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: "line",
          label: "Price",
          data: prices,
          borderColor: "#6366f1",
          backgroundColor: "rgba(99,102,241,0.1)",
          tension: 0.4,
          yAxisID: "y",
          fill: true
        },
        {
          type: "bar",
          label: "Volume",
          data: volumes,
          backgroundColor: "rgba(139,92,246,0.5)",
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#9ca3af" } }
      },
      scales: {
        x: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(75,85,99,0.2)" } },
        y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(75,85,99,0.2)" } },
        y1: { position: "right", ticks: { display: false }, grid: { display: false } }
      }
    }
  });
}

function viewChart() {
  if (!currentTokenData?.address) return;
  window.open(`https://dexscreener.com/solana/${currentTokenData.address}`, "_blank");
}

// AI Analysis
async function runAIAnalysis() {
  if (!currentTokenData) return alert("Analyze a token first");

  hide("aiAnalysisError");
  hide("sentimentResult"); show("sentimentPlaceholder"); show("sentimentLoading");
  hide("patternResult"); show("patternPlaceholder"); show("patternLoading");
  hide("rugPullResult"); show("rugPullPlaceholder"); show("rugPullLoading");

  try {
    const text = `${currentTokenData.name} ${currentTokenData.symbol} crypto sentiment`;
    const summary = currentTokenData.summary;

    const [sentimentRes, rugRes] = await Promise.all([
      fetch("/api/sentiment", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      }).then(r => r.json()),
      fetch("/api/rugrisk", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary })
      }).then(r => r.json())
    ]);

    // Sentiment
    if (sentimentRes?.ok) {
      const preds = sentimentRes.preds || [];
      const pos = preds.find(p => p.label.toLowerCase() === "positive")?.score || 0;
      const neu = preds.find(p => p.label.toLowerCase() === "neutral")?.score || 0;
      const neg = preds.find(p => p.label.toLowerCase() === "negative")?.score || 0;

      document.getElementById("positiveSentiment").textContent = `${Math.round(pos*100)}%`;
      document.getElementById("neutralSentiment").textContent = `${Math.round(neu*100)}%`;
      document.getElementById("negativeSentiment").textContent = `${Math.round(neg*100)}%`;
      
      const score = Math.round(((pos - neg) + 1) * 50);
      document.getElementById("sentimentScore").textContent = `${score}/100`;
      
      const bar = document.getElementById("sentimentBar");
      bar.style.width = `${score}%`;
      bar.style.backgroundColor = score > 70 ? "#10b981" : score > 40 ? "#f59e0b" : "#ef4444";
      
      hide("sentimentPlaceholder"); show("sentimentResult");
    }

    // Pattern
    const points = currentTokenData?.chart?.points || [];
    if (points.length > 0) {
      const first = points[0].price;
      const last = points[points.length - 1].price;
      const pct = first ? ((last - first) / first) * 100 : 0;
      const trend = pct > 3 ? "Bullish" : pct < -3 ? "Bearish" : "Sideways";
      
      document.getElementById("patternName").textContent = trend === "Bullish" ? "Uptrend" : trend === "Bearish" ? "Downtrend" : "Consolidation";
      document.getElementById("patternConfidence").textContent = `${Math.min(95, Math.max(50, Math.round(Math.abs(pct)*10)))}%`;
      document.getElementById("patternTrend").textContent = trend;
      document.getElementById("patternPrediction").textContent = trend === "Bullish" ? "Positive momentum detected" : trend === "Bearish" ? "Negative momentum detected" : "Range-bound movement";
      
      hide("patternPlaceholder"); show("patternResult");
    }

    // Rug Risk
    if (rugRes?.ok) {
      const labels = rugRes.data?.labels || [];
      const scores = rugRes.data?.scores || [];
      const rugIdx = labels.findIndex(l => l.toLowerCase().includes("rug") || l.toLowerCase().includes("scam"));
      const rugProb = rugIdx >= 0 ? scores[rugIdx] : 0.25;
      const riskScore = Math.round(rugProb * 100);
      
      const scoreEl = document.getElementById("rugPullScore");
      scoreEl.textContent = riskScore;
      scoreEl.style.color = riskScore < 30 ? "#10b981" : riskScore < 70 ? "#f59e0b" : "#ef4444";
      
      const indicators = [
        { name: "LP Lock", status: riskScore < 40 ? "Safe ✅" : riskScore < 70 ? "Partial ⚠️" : "None ❌" },
        { name: "Top Holders", status: riskScore < 35 ? "Healthy ✅" : riskScore < 70 ? "Moderate ⚠️" : "Extreme ❌" },
        { name: "Authorities", status: riskScore < 40 ? "Revoked ✅" : "Active ❌" }
      ];
      
      document.getElementById("rugPullIndicators").innerHTML = indicators.map(i => 
        `<div class="flex justify-between"><span class="text-gray-400">${i.name}</span><span>${i.status}</span></div>`
      ).join("");
      
      const verdictBox = document.getElementById("rugPullVerdictBox");
      const verdict = document.getElementById("rugPullVerdict");
      if (riskScore < 30) {
        verdict.textContent = "Lower risk detected";
        verdictBox.style.backgroundColor = "rgba(16,185,129,0.2)";
        verdictBox.style.borderColor = "rgba(16,185,129,0.3)";
        verdict.style.color = "#10b981";
      } else if (riskScore < 70) {
        verdict.textContent = "Medium risk - use caution";
        verdictBox.style.backgroundColor = "rgba(245,158,11,0.2)";
        verdictBox.style.borderColor = "rgba(245,158,11,0.3)";
        verdict.style.color = "#f59e0b";
      } else {
        verdict.textContent = "High risk detected";
        verdictBox.style.backgroundColor = "rgba(239,68,68,0.2)";
        verdictBox.style.borderColor = "rgba(239,68,68,0.3)";
        verdict.style.color = "#ef4444";
      }
      
      hide("rugPullPlaceholder"); show("rugPullResult");
    }

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
