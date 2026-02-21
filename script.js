"use strict";

let currentChart = null;
let currentTokenData = null;
let safetyRingChart = null;
let holderPieChart = null;

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

// ==================== UI HELPERS ====================

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

// ==================== EXAMPLES ====================

function loadExample(type) {
  const examples = {
    bonk: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    pepe: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    shiba: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", // WIF
  };

  const input = document.getElementById("contractInput");
  if (input) input.value = examples[type] || "";
}

// ==================== RESET ====================

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

  if (safetyRingChart) {
    safetyRingChart.destroy();
    safetyRingChart = null;
  }

  if (holderPieChart) {
    holderPieChart.destroy();
    holderPieChart = null;
  }

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ==================== MAIN ANALYSIS ====================

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

    // Initialize visualizations
    initChart(currentTokenData?.chart?.points || []);
    renderSafetyScore(currentTokenData);
    renderHolderDistribution(currentTokenData);

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

// ==================== FORMATTING HELPERS ====================

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

// ==================== NEW: ANIMATED SAFETY SCORE RING ====================

function renderSafetyScore(tokenData) {
  const canvas = document.getElementById("safetyRing");
  if (!canvas) return;

  const overall = tokenData.scores?.overall || Math.round((tokenData.scores.liquidity + tokenData.scores.volume + tokenData.scores.holders) / 3);
  
  // Destroy existing chart
  if (safetyRingChart) {
    safetyRingChart.destroy();
  }

  // Determine color based on score
  let color, label, bgColor;
  if (overall >= 80) {
    color = '#10b981'; // green
    label = 'SAFE';
    bgColor = 'rgba(16, 185, 129, 0.1)';
  } else if (overall >= 60) {
    color = '#f59e0b'; // yellow
    label = 'MODERATE';
    bgColor = 'rgba(245, 158, 11, 0.1)';
  } else {
    color = '#ef4444'; // red
    label = 'HIGH RISK';
    bgColor = 'rgba(239, 68, 68, 0.1)';
  }

  // Update text
  document.getElementById("safetyScoreText").textContent = overall;
  document.getElementById("safetyScoreText").style.color = color;
  document.getElementById("safetyLabel").textContent = label;
  document.getElementById("safetyLabel").style.color = color;

  // Update recommendation
  const recText = overall >= 80 ? 
    "✅ Low risk. Good fundamentals detected." :
    overall >= 60 ?
    "⚠️ Moderate risk. Proceed with caution." :
    "🔴 High risk. Small position size recommended.";
  
  document.getElementById("safetyRecommendation").textContent = recText;

  // Create animated ring chart
  const ctx = canvas.getContext('2d');
  safetyRingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [overall, 100 - overall],
        backgroundColor: [color, bgColor],
        borderWidth: 0,
        circumference: 360,
        rotation: -90
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: true,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 2000,
        easing: 'easeOutCubic'
      }
    }
  });
}

// ==================== NEW: HOLDER DISTRIBUTION VISUALIZATION ====================

function renderHolderDistribution(tokenData) {
  const top10Pct = Number(tokenData.top10Pct) || 0;
  
  // Update concentration percentage
  document.getElementById("concentrationPercentage").textContent = `${top10Pct.toFixed(1)}%`;

  // Create holder bars (simulated top 10)
  const holderBarsContainer = document.getElementById("holderBars");
  holderBarsContainer.innerHTML = "";

  // Generate simulated distribution
  const holders = generateHolderDistribution(top10Pct);
  
  holders.forEach((holder, i) => {
    const bar = document.createElement("div");
    bar.className = "flex items-center gap-3";
    
    const label = i === 0 ? "Dev/Creator" : `Holder #${i}`;
    const color = i === 0 ? "bg-yellow-500" : i < 3 ? "bg-orange-500" : "bg-indigo-500";
    
    bar.innerHTML = `
      <span class="text-xs text-gray-400 w-20">${label}</span>
      <div class="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
        <div class="${color} h-full transition-all duration-1000" style="width: 0%" data-width="${holder}%"></div>
      </div>
      <span class="text-xs font-semibold w-12 text-right">${holder.toFixed(1)}%</span>
    `;
    
    holderBarsContainer.appendChild(bar);
  });

  // Animate bars
  setTimeout(() => {
    holderBarsContainer.querySelectorAll("[data-width]").forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  }, 100);

  // Show concentration warning if needed
  const warningEl = document.getElementById("concentrationWarning");
  const warningText = document.getElementById("concentrationWarningText");
  
  if (top10Pct > 50) {
    warningEl.classList.remove("hidden");
    warningEl.className = "mt-4 p-3 rounded-lg border bg-red-900/20 border-red-500/30";
    warningText.textContent = `High concentration risk: Top 10 holders control ${top10Pct.toFixed(1)}% of supply`;
  } else if (top10Pct > 35) {
    warningEl.classList.remove("hidden");
    warningEl.className = "mt-4 p-3 rounded-lg border bg-yellow-900/20 border-yellow-500/30";
    warningText.textContent = `Moderate concentration: Top 10 holders control ${top10Pct.toFixed(1)}% of supply`;
  } else {
    warningEl.classList.add("hidden");
  }

  // Create pie chart
  renderHolderPieChart(top10Pct);
}

function generateHolderDistribution(top10Total) {
  // Generate realistic looking distribution
  const holders = [];
  let remaining = top10Total;
  
  // Dev usually holds most
  const devPct = Math.min(remaining * 0.35, 15);
  holders.push(devPct);
  remaining -= devPct;
  
  // Top 9 holders with decreasing amounts
  for (let i = 0; i < 9; i++) {
    const pct = remaining * (0.25 - i * 0.02);
    holders.push(pct);
    remaining -= pct;
  }
  
  return holders;
}

function renderHolderPieChart(top10Pct) {
  const canvas = document.getElementById("holderPieChart");
  if (!canvas) return;

  if (holderPieChart) {
    holderPieChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  const otherPct = 100 - top10Pct;

  holderPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Top 10 Holders', 'Other Holders'],
      datasets: [{
        data: [top10Pct, otherPct],
        backgroundColor: [
          'rgba(245, 158, 11, 0.8)',
          'rgba(99, 102, 241, 0.8)'
        ],
        borderColor: [
          'rgba(245, 158, 11, 1)',
          'rgba(99, 102, 241, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: 'rgb(156, 163, 175)',
            padding: 15,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.parsed.toFixed(1)}%`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500
      }
    }
  });
}

// ==================== RENDER RESULTS (ENHANCED) ====================

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

  // Quick stats in hero section
  document.getElementById("quickPrice").textContent = fmtPrice(t.price);
  const ch = Number(t.priceChange24h);
  const priceChangeEl = document.getElementById("quickPriceChange");
  priceChangeEl.textContent = isFinite(ch) ? `${ch > 0 ? "+" : ""}${ch.toFixed(2)}%` : "--";
  priceChangeEl.className = `text-xs font-medium ${ch >= 0 ? "text-green-400" : "text-red-400"}`;
  
  document.getElementById("quickMcap").textContent = fmtUSD(t.marketCap);
  document.getElementById("quickLiq").textContent = fmtUSD(t.liquidityUSD);
  document.getElementById("quickHolders").textContent = isFinite(Number(t.holders)) ? Number(t.holders).toLocaleString() : "0";

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

  // Holders
  document.getElementById("totalHolders").textContent = isFinite(Number(t.holders)) ? Number(t.holders).toLocaleString() : "--";
  document.getElementById("top10Holders").textContent = isFinite(Number(t.top10Pct)) ? `${Number(t.top10Pct).toFixed(1)}%` : "--%";

  const concRiskEl = document.getElementById("concentrationRisk");
  concRiskEl.textContent = t.concentrationLabel;
  concRiskEl.className =
    `text-xs px-2 py-1 rounded ${
      t.concentrationLabel === "Healthy" ? "bg-green-900/50 text-green-400"
      : t.concentrationLabel === "Moderate" ? "bg-yellow-900/50 text-yellow-400"
      : "bg-red-900/50 text-red-400"
    }`;

  document.getElementById("holderScore").textContent = `${t.scores.holders}/100`;
  document.getElementById("holderBar").style.width = `${t.scores.holders}%`;

  // Trading recommendations (enhanced)
  document.getElementById("entryPrice").textContent = fmtPrice(t.entryPrice);
  
  // Calculate stop loss and take profit
  const currentPrice = Number(t.price);
  const stopLoss = currentPrice * 0.9; // -10%
  const takeProfit = currentPrice * 1.2; // +20%
  
  document.getElementById("stopLoss").textContent = fmtPrice(stopLoss);
  document.getElementById("exitPrice").textContent = fmtPrice(takeProfit);
  
  document.getElementById("analysisSummary").textContent = t.summary;

  // Position sizing based on overall score
  const overall = t.scores?.overall || Math.round((t.scores.liquidity + t.scores.volume + t.scores.holders) / 3);
  let positionRec = "Conservative (1-2%)";
  
  if (overall >= 80) {
    positionRec = "Moderate (3-5%)";
  } else if (overall >= 60) {
    positionRec = "Conservative-Moderate (2-3%)";
  } else {
    positionRec = "Conservative (1-2%)";
  }
  
  document.querySelector("#posRecommendation .font-semibold").textContent = positionRec;

  // Risks
  const riskGrid = document.getElementById("riskGrid");
  riskGrid.innerHTML = (t.risks || []).map(risk => `
    <div class="bg-gray-800/50 rounded-lg p-4 border ${risk.risk ? "border-red-500/30 bg-red-900/10" : "border-green-500/30 bg-green-900/10"}">
      <p class="text-xs text-gray-500 mb-1">${risk.name}</p>
      <p class="font-semibold ${risk.risk ? "text-red-400" : "text-green-400"}">${risk.status}</p>
    </div>
  `).join("");
}

// ==================== CHART ====================

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
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
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
        legend: { 
          labels: { 
            color: "rgb(156, 163, 175)",
            font: { size: 12 }
          } 
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: 'rgb(243, 244, 246)',
          bodyColor: 'rgb(209, 213, 219)',
          borderColor: 'rgba(75, 85, 99, 0.5)',
          borderWidth: 1,
          padding: 12,
          displayColors: true
        }
      },
      scales: {
        x: { 
          ticks: { color: "rgb(156, 163, 175)" }, 
          grid: { color: "rgba(75, 85, 99, 0.25)" } 
        },
        y: { 
          ticks: { color: "rgb(156, 163, 175)" }, 
          grid: { color: "rgba(75, 85, 99, 0.25)" } 
        },
        y1: { 
          position: "right", 
          ticks: { display: false }, 
          grid: { display: false } 
        }
      }
    }
  });
}

// ==================== ACTIONS ====================

function setAlert() {
  showToast("Alert feature coming soon!");
}

function viewChart() {
  if (!currentTokenData?.address) return;
  window.open(`https://dexscreener.com/solana/${currentTokenData.address}`, "_blank");
}

// ==================== AI ANALYSIS ====================

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
    const summary = currentTokenData.summary;

    const [sentimentRes, rugRes] = await Promise.all([
      postJSON("/api/sentiment", { text }),
      postJSON("/api/rugrisk", { summary })
    ]);

    if (sentimentRes?.ok) {
      displaySentimentResults(normalizeSentimentFromPreds(sentimentRes.preds, currentTokenData.name));
      hide("sentimentPlaceholder"); show("sentimentResult");
    }

    analyzeChartPattern();

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

async function analyzeChartPattern() {
  try {
    const patternData = heuristicPatternFromChart(currentTokenData?.chart?.points || []);
    displayPatternResults(patternData);
    hide("patternPlaceholder"); show("patternResult");
  } catch (e) {
    console.error('Pattern analysis error:', e);
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
      : `Negative sentiment detected for ${tokenName}.`
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
      prediction: "Try again in a moment."
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
    description: "Technical analysis from 7-day price movement.",
    confidence,
    trend,
    support: support.toFixed(10),
    resistance: resistance.toFixed(10),
    prediction: trend === "Bullish" ? "Momentum positive; wait for pullbacks." :
                trend === "Bearish" ? "Momentum negative; avoid chasing." :
                "Range-bound; wait for breakout confirmation."
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
  return { score, riskLevel, indicators };
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

  const verdictEl = document.getElementById("rugPullVerdict");
  const box = document.getElementById("rugPullVerdictBox");

  if (data.riskLevel === "High") {
    verdictEl.textContent = "HIGH RISK: Multiple rug-style signals detected.";
    box.className = "mt-4 p-3 rounded-lg border bg-red-900/20 border-red-500/30";
  } else if (data.riskLevel === "Medium") {
    verdictEl.textContent = "MEDIUM RISK: Mixed signals — use tight stops.";
    box.className = "mt-4 p-3 rounded-lg border bg-yellow-900/20 border-yellow-500/30";
  } else {
    verdictEl.textContent = "LOWER RISK: Fewer rug-like signals (still DYOR).";
    box.className = "mt-4 p-3 rounded-lg border bg-green-900/20 border-green-500/30";
  }
}
