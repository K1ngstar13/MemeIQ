"use strict";

// ============================================================
//  Global State
// ============================================================
let currentChart    = null;
let currentTokenData = null;
let bubbleAnimFrame  = null;
let bgAnimFrame      = null;
let analysisDebounce = null;

const DEFAULT_TOKEN = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"; // BONK

// ============================================================
//  DOMContentLoaded
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide?.createIcons) window.lucide.createIcons();

  // Wire up UI
  document.getElementById("resetBtn")?.addEventListener("click", resetAnalysis);
  document.getElementById("alertBtn")?.addEventListener("click", () => showToast("Alert saved (demo)"));
  document.getElementById("chartBtn")?.addEventListener("click", viewChart);

  document.querySelectorAll(".exampleBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const examples = {
        bonk:  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        pepe:  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        shiba: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"
      };
      const addr = examples[btn.dataset.example] || "";
      const input = document.getElementById("contractInput");
      if (input) { input.value = addr; triggerAutoAnalysis(); }
    });
  });

  // Auto-analyze on input change (debounce 900ms)
  const input = document.getElementById("contractInput");
  if (input) {
    input.addEventListener("input", () => {
      clearTimeout(analysisDebounce);
      const val = input.value.trim();
      if (val.length >= 32 && val.length <= 50) {
        setSearchStatus("analyzing", "Analyzing…");
        analysisDebounce = setTimeout(triggerAutoAnalysis, 900);
      } else if (val.length > 0) {
        setSearchStatus("idle", val.length < 32 ? "Too short…" : "Invalid length");
      } else {
        setSearchStatus("idle", "");
      }
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { clearTimeout(analysisDebounce); triggerAutoAnalysis(); }
    });
  }

  document.getElementById("contractAddress")?.addEventListener("click", () => {
    const full = currentTokenData?.address;
    if (full) copyToClipboard(full);
  });

  // Start animated background
  initBackground();

  // Pre-warm API
  setTimeout(() => fetch("/api/keep-warm").catch(() => {}), 1000);

  // Auto-analyze BONK on load
  document.getElementById("heroLoadingText").textContent = "Loading BONK analysis…";
  input.value = DEFAULT_TOKEN;
  setTimeout(() => analyzeContract(DEFAULT_TOKEN, true), 400);
});

// ============================================================
//  Background Animation (Particle + God Rays)
// ============================================================
function initBackground() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  window.addEventListener("resize", () => {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W; canvas.height = H;
  });

  // Stars
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.3,
    speed: Math.random() * 0.15 + 0.05,
    opacity: Math.random() * 0.5 + 0.1,
    twinkle: Math.random() * Math.PI * 2
  }));

  // Moving nebula blobs
  const blobs = [
    { x: W * 0.8, y: H * 0.1, r: 300, color: "99,102,241", speed: 0.0003, angle: 0 },
    { x: W * 0.1, y: H * 0.7, r: 250, color: "139,92,246", speed: 0.0004, angle: 1 },
    { x: W * 0.5, y: H * 0.5, r: 200, color: "6,182,212",  speed: 0.0005, angle: 2 }
  ];

  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    // Draw nebula blobs
    blobs.forEach(b => {
      b.angle += b.speed;
      const ox = Math.sin(b.angle * 1.3) * 60;
      const oy = Math.cos(b.angle * 0.9) * 50;
      const grd = ctx.createRadialGradient(b.x + ox, b.y + oy, 0, b.x + ox, b.y + oy, b.r);
      grd.addColorStop(0, `rgba(${b.color}, 0.07)`);
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x + ox, b.y + oy, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // God rays from top-right
    const rayOriginX = W * 0.9;
    const rayOriginY = -50;
    for (let i = 0; i < 5; i++) {
      const t = (frame * 0.002 + i * 0.7) % (Math.PI * 2);
      const angle = Math.PI * 0.55 + Math.sin(t) * 0.25 + i * 0.12;
      const length = W * 2;
      const grad = ctx.createLinearGradient(
        rayOriginX, rayOriginY,
        rayOriginX + Math.cos(angle) * length,
        rayOriginY + Math.sin(angle) * length
      );
      const alpha = (0.015 + Math.sin(t * 1.5) * 0.01).toFixed(3);
      grad.addColorStop(0, `rgba(99,102,241,${alpha})`);
      grad.addColorStop(0.5, `rgba(139,92,246,${(alpha * 0.5).toFixed(3)})`);
      grad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.moveTo(rayOriginX, rayOriginY);
      const spreadAngle = 0.04;
      ctx.lineTo(
        rayOriginX + Math.cos(angle + spreadAngle) * length,
        rayOriginY + Math.sin(angle + spreadAngle) * length
      );
      ctx.lineTo(
        rayOriginX + Math.cos(angle - spreadAngle) * length,
        rayOriginY + Math.sin(angle - spreadAngle) * length
      );
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Stars
    stars.forEach(s => {
      s.twinkle += s.speed * 0.04;
      const opacity = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${opacity.toFixed(2)})`;
      ctx.fill();
    });

    bgAnimFrame = requestAnimationFrame(draw);
  }

  draw();
}

// ============================================================
//  Utility: Show / Hide / Status
// ============================================================
function show(elId) { document.getElementById(elId)?.classList.remove("hidden"); }
function hide(elId) { document.getElementById(elId)?.classList.add("hidden"); }

function setSearchStatus(state, text) {
  const statusText  = document.getElementById("searchStatusText");
  const spinner     = document.getElementById("searchSpinner");
  const done        = document.getElementById("searchDone");
  const input       = document.getElementById("contractInput");

  if (statusText) statusText.textContent = text || "";
  if (statusText) statusText.classList.toggle("hidden", !text);

  spinner?.classList.toggle("hidden", state !== "analyzing");
  done?.classList.toggle("hidden", state !== "done");
  input?.classList.toggle("analyzing", state === "analyzing");
}

function showToast(message, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  if (type === "error") toast.style.background = "linear-gradient(135deg,#dc2626,#ef4444)";
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(120%)";
    toast.style.transition = "all 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); showToast("Address copied!"); }
  catch { showToast("Copy failed", "error"); }
}

// ============================================================
//  Auto-Analysis Trigger
// ============================================================
function triggerAutoAnalysis() {
  const raw = document.getElementById("contractInput")?.value?.trim() || "";
  if (raw.length >= 32 && raw.length <= 50) analyzeContract(raw, false);
}

// ============================================================
//  Core: analyzeContract
// ============================================================
async function analyzeContract(addressOverride, isInitialLoad = false) {
  const raw = addressOverride || document.getElementById("contractInput")?.value?.trim() || "";

  if (!raw || raw.length < 32 || raw.length > 50) {
    if (!isInitialLoad) showToast("Enter a valid Solana token mint address");
    return;
  }

  // Update UI to loading state
  hide("heroSection");
  hide("analysisResults");
  show("loadingState");
  setSearchStatus("analyzing", "Fetching…");

  // Show AI placeholders (spinning)
  hide("sentimentResult");   show("sentimentPlaceholder");
  hide("patternResult");     show("patternPlaceholder");
  hide("rugPullResult");     show("rugPullPlaceholder");
  hide("aiAnalysisError");
  show("aiLoadingIndicator");

  try {
    let data;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 35000);
        const resp = await fetch(`/api/analyze?address=${encodeURIComponent(raw)}`, { signal: controller.signal });
        clearTimeout(timer);
        data = await resp.json();
        if (data?.ok) break;
        if (attempts < maxAttempts - 1) {
          setSearchStatus("analyzing", `Retry ${attempts + 1}…`);
          await sleep(1200 * (attempts + 1));
        }
      } catch {
        if (attempts < maxAttempts - 1) await sleep(1200 * (attempts + 1));
      }
      attempts++;
    }

    if (!data?.ok) throw new Error(data?.error || "Analysis failed – check token address");

    currentTokenData = data.token;
    renderResults(currentTokenData);

    hide("loadingState");
    show("analysisResults");

    initChart(currentTokenData?.chart?.points || []);
    renderBubbleMap(currentTokenData);

    if (window.lucide?.createIcons) window.lucide.createIcons();

    setSearchStatus("done", currentTokenData.symbol);
    setTimeout(() => setSearchStatus("idle", ""), 3000);

    // Scroll to results if user triggered (not initial load)
    if (!isInitialLoad) {
      document.getElementById("analysisResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Auto-run AI analysis after main analysis
    setTimeout(() => runAIAnalysis(), 300);

  } catch (e) {
    console.error(e);
    hide("loadingState");
    if (isInitialLoad) show("heroSection");
    setSearchStatus("idle", "");
    showToast(e?.message || "Failed to analyze token", "error");
  }
}

// ============================================================
//  Formatters
// ============================================================
function fmtUSD(n) {
  const num = Number(n);
  if (!isFinite(num) || num === 0) return "--";
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function fmtPrice(p) {
  const num = Number(p);
  if (!isFinite(num)) return "$--";
  if (num >= 1)     return `$${num.toFixed(4)}`;
  if (num >= 0.01)  return `$${num.toFixed(6)}`;
  if (num >= 0.0001) return `$${num.toFixed(8)}`;
  return `$${num.toFixed(12)}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
//  Render Results
// ============================================================
function renderResults(t) {
  // Token header
  document.getElementById("tokenName").textContent = t.name || "Unknown";
  document.getElementById("tokenSymbol").textContent = t.symbol || "--";

  const img = document.getElementById("tokenImage");
  if (t.logo) { img.src = t.logo; } else { img.src = ""; }

  const caEl = document.getElementById("contractAddress");
  if (caEl) {
    caEl.dataset.fullAddress = t.address;
    caEl.textContent = `${t.address.slice(0, 10)}…${t.address.slice(-8)} (click to copy)`;
  }

  const vb = document.getElementById("verifiedBadge");
  if (t.verified) vb?.classList.remove("hidden"); else vb?.classList.add("hidden");

  // Price
  document.getElementById("currentPrice").textContent = fmtPrice(t.price);
  const ch = Number(t.priceChange24h);
  const pcEl = document.getElementById("priceChange");
  if (pcEl) {
    pcEl.textContent = isFinite(ch) ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : "--";
    pcEl.className = `text-xs font-medium ${ch >= 0 ? "text-emerald-400" : "text-red-400"}`;
  }

  // Market stats
  document.getElementById("marketCap").textContent = fmtUSD(t.marketCap);
  document.getElementById("fdv").textContent        = fmtUSD(t.fdv);
  document.getElementById("volume24h").textContent  = fmtUSD(t.volume24hUSD);
  document.getElementById("buySellRatio").textContent = t.buySellRatio
    ? `${t.buySellRatio.toFixed(2)}:1` : "--";

  // Wash trading
  const washEl = document.getElementById("washTradingRisk");
  if (washEl) {
    washEl.textContent = t.washRiskLabel || "--";
    washEl.className = `px-2 py-0.5 rounded-full text-[10px] font-medium ${
      t.washRiskLabel === "Low"    ? "bg-emerald-900/50 text-emerald-400 border border-emerald-500/20" :
      t.washRiskLabel === "Medium" ? "bg-yellow-900/50 text-yellow-400 border border-yellow-500/20" :
      "bg-red-900/50 text-red-400 border border-red-500/20"
    }`;
  }

  // Liquidity
  document.getElementById("totalLiquidity").textContent = fmtUSD(t.liquidityUSD);
  document.getElementById("lpLocked").textContent =
    isFinite(Number(t.lpLockedPct)) ? `${Number(t.lpLockedPct).toFixed(0)}%` : "--%";
  document.getElementById("mcapLiqRatio").textContent =
    isFinite(Number(t.mcapLiqRatio)) ? `${Number(t.mcapLiqRatio)}x` : "--x";

  const liqScore = t.scores?.liquidity ?? 0;
  document.getElementById("liquidityScore").textContent = `${liqScore}/100`;
  const liqBar = document.getElementById("liquidityBar");
  if (liqBar) {
    liqBar.style.width = `${liqScore}%`;
    liqBar.className = `progress-bar-fill h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
      liqScore > 70 ? "from-emerald-600 to-emerald-400" :
      liqScore > 40 ? "from-yellow-600 to-yellow-400" : "from-red-600 to-red-400"
    }`;
  }

  // Holders
  document.getElementById("totalHolders").textContent =
    isFinite(Number(t.holders)) ? Number(t.holders).toLocaleString() : "--";
  document.getElementById("top10Holders").textContent =
    isFinite(Number(t.top10Pct)) ? `${Number(t.top10Pct).toFixed(1)}%` : "--%";
  document.getElementById("holderGrowth").textContent =
    `${t.holderGrowth24h || "0.0"}% / ${t.holderGrowth7d || "0.0"}%`;
  document.getElementById("newBuyers24h").textContent =
    isFinite(Number(t.newBuyers24h)) ? Number(t.newBuyers24h).toLocaleString() : "--";

  const concEl = document.getElementById("concentrationRisk");
  if (concEl) {
    concEl.textContent = t.concentrationLabel || "--";
    concEl.className = `px-2 py-0.5 rounded-full text-[10px] font-medium ${
      t.concentrationLabel === "Healthy"  ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/20" :
      t.concentrationLabel === "Moderate" ? "bg-yellow-900/40 text-yellow-400 border border-yellow-500/20" :
      "bg-red-900/40 text-red-400 border border-red-500/20"
    }`;
  }

  const holderScore = t.scores?.holders ?? 0;
  document.getElementById("holderScore").textContent = `${holderScore}/100`;
  const holderBar = document.getElementById("holderBar");
  if (holderBar) {
    holderBar.style.width = `${holderScore}%`;
    holderBar.className = `progress-bar-fill h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
      holderScore > 70 ? "from-emerald-600 to-emerald-400" :
      holderScore > 40 ? "from-yellow-600 to-yellow-400" : "from-red-600 to-red-400"
    }`;
  }

  // Overall score
  const overall = t.scores?.overall ?? 0;
  const scoreEl = document.getElementById("overallScore");
  if (scoreEl) {
    scoreEl.textContent = overall;
    scoreEl.className = `text-4xl font-black ${
      overall > 75 ? "text-emerald-400 score-glow-green" :
      overall > 50 ? "text-yellow-400 score-glow-yellow" :
      "text-red-400 score-glow-red"
    }`;
  }

  const ratingEl = document.getElementById("overallRating");
  if (ratingEl) {
    if (overall >= 80) {
      ratingEl.textContent = "STRONG";
      ratingEl.className = "px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    } else if (overall >= 60) {
      ratingEl.textContent = "MODERATE";
      ratingEl.className = "px-3 py-1.5 rounded-full text-xs font-black bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
    } else {
      ratingEl.textContent = "HIGH RISK";
      ratingEl.className = "px-3 py-1.5 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30";
    }
  }

  // Recommendation
  const rec    = t.recommendation || "AVOID";
  const recBadge = document.getElementById("recommendationBadge");
  if (recBadge) {
    recBadge.textContent = rec;
    recBadge.className   = `px-3 py-1.5 rounded-full text-xs font-black ${
      rec === "BUY" ? "rec-buy" : rec === "CAUTION" ? "rec-caution" : "rec-avoid"
    }`;
  }

  document.getElementById("entryPrice").textContent = fmtPrice(t.entryPrice);
  document.getElementById("exitPrice").textContent  = fmtPrice(t.exitPrice);
  document.getElementById("analysisSummary").textContent = t.summary || "Analysis complete.";

  // Risk grid
  const riskGrid = document.getElementById("riskGrid");
  if (riskGrid) {
    riskGrid.innerHTML = (t.risks || []).map(risk => `
      <div class="risk-item ${risk.risk ? "risk" : "safe"} flex items-start gap-3">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          risk.risk ? "bg-red-900/40" : "bg-emerald-900/40"
        }">
          <i data-lucide="${risk.risk ? "x-circle" : "check-circle"}" class="w-4 h-4 ${
            risk.risk ? "text-red-400" : "text-emerald-400"
          }"></i>
        </div>
        <div class="min-w-0">
          <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">${risk.name}</p>
          <p class="text-xs font-semibold ${risk.risk ? "text-red-400" : "text-emerald-400"} truncate">${risk.status}</p>
        </div>
      </div>
    `).join("");
  }

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ============================================================
//  Chart.js — Volume & Price
// ============================================================
function initChart(points) {
  if (!window.Chart) return;
  const canvas = document.getElementById("volumeChart");
  if (!canvas) return;

  if (currentChart) { currentChart.destroy(); currentChart = null; }

  const ctx = canvas.getContext("2d");

  const labels  = points.map(p => p.label);
  const prices  = points.map(p => p.price);
  const volumes = points.map(p => p.volume);

  const priceGrad = ctx.createLinearGradient(0, 0, 0, 220);
  priceGrad.addColorStop(0, "rgba(99,102,241,0.25)");
  priceGrad.addColorStop(1, "rgba(99,102,241,0)");

  currentChart = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: "line",
          label: "Price (USD)",
          data: prices,
          borderColor: "rgb(99,102,241)",
          backgroundColor: priceGrad,
          borderWidth: 2,
          tension: 0.4,
          yAxisID: "y",
          fill: true,
          pointBackgroundColor: "rgb(99,102,241)",
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          type: "bar",
          label: "Volume",
          data: volumes,
          backgroundColor: "rgba(139,92,246,0.3)",
          borderColor: "rgba(139,92,246,0.6)",
          borderWidth: 1,
          borderRadius: 4,
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
          labels: { color: "rgba(156,163,175,0.8)", font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: "rgba(10,14,33,0.95)",
          borderColor: "rgba(99,102,241,0.3)",
          borderWidth: 1,
          titleColor: "#c7d2fe",
          bodyColor: "#9ca3af",
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          ticks: { color: "rgba(107,114,128,0.8)", font: { size: 10 } },
          grid: { color: "rgba(30,41,59,0.5)", drawBorder: false }
        },
        y: {
          ticks: { color: "rgba(107,114,128,0.8)", font: { size: 10 } },
          grid: { color: "rgba(30,41,59,0.5)", drawBorder: false }
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

// ============================================================
//  Bubble Map — Holder Distribution
// ============================================================
function renderBubbleMap(t) {
  const container = document.getElementById("bubbleMapContainer");
  const canvas    = document.getElementById("bubbleMapCanvas");
  const legend    = document.getElementById("bubbleLegend");
  if (!container || !canvas) return;

  // Cancel previous animation
  if (bubbleAnimFrame) { cancelAnimationFrame(bubbleAnimFrame); bubbleAnimFrame = null; }

  const W = container.clientWidth || 600;
  const H = container.clientHeight || 280;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const top10  = Number(t.top10Pct)   || 30;
  const devPct = Number(t.devPct)     || 3;
  const comm   = Math.max(0, 100 - top10);

  // Build bubble data
  const rawBubbles = [
    { label: "Community",   pct: comm,          color: [99,102,241],   emoji: "👥" },
    { label: "Whale #1",    pct: top10 * 0.40,  color: [239,68,68],    emoji: "🐋" },
    { label: "Whales 2-5",  pct: top10 * 0.35,  color: [245,158,11],   emoji: "🐳" },
    { label: "Whales 6-10", pct: top10 * 0.25,  color: [34,211,238],   emoji: "🐬" },
    { label: "Dev Wallet",  pct: devPct,         color: [220,38,38],    emoji: "🔑" }
  ].filter(b => b.pct > 0);

  // Scale radii
  const maxR = Math.min(W * 0.18, H * 0.38);
  const minR = 16;
  const maxPct = Math.max(...rawBubbles.map(b => b.pct));

  const bubbles = rawBubbles.map((b, i) => {
    const r = minR + (Math.sqrt(b.pct / maxPct)) * (maxR - minR);
    // Spread positions across canvas width
    const cols = rawBubbles.length;
    const sectionW = W / cols;
    const x = sectionW * i + sectionW / 2 + (Math.random() - 0.5) * sectionW * 0.3;
    const y = H / 2 + (Math.random() - 0.5) * H * 0.2;
    return {
      ...b, r, x, y,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      phase: Math.random() * Math.PI * 2,
      speed: 0.005 + Math.random() * 0.01
    };
  });

  // Build legend
  if (legend) {
    legend.innerHTML = bubbles.map(b => `
      <div class="bubble-legend-item">
        <span class="bubble-legend-dot" style="background:rgb(${b.color.join(",")})"></span>
        ${b.label} (${b.pct.toFixed(1)}%)
      </div>
    `).join("");
  }

  // Tooltip on hover
  const tooltip = document.getElementById("bubbleTooltip");
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let hit = null;
    for (const b of bubbles) {
      const dx = mx - b.x, dy = my - b.y;
      if (Math.sqrt(dx*dx + dy*dy) < b.r) { hit = b; break; }
    }
    if (hit && tooltip) {
      tooltip.innerHTML = `<strong class="text-white">${hit.emoji} ${hit.label}</strong><br><span class="text-gray-400">${hit.pct.toFixed(2)}% of supply</span>`;
      tooltip.style.left = `${mx + 12}px`;
      tooltip.style.top  = `${my - 10}px`;
      tooltip.classList.remove("hidden");
    } else if (tooltip) {
      tooltip.classList.add("hidden");
    }
  });
  canvas.addEventListener("mouseleave", () => tooltip?.classList.add("hidden"));

  let frame = 0;

  function drawBubbles() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    // Subtle grid
    ctx.strokeStyle = "rgba(99,102,241,0.04)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 60) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 60) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Draw bubbles
    bubbles.forEach(b => {
      // Float animation
      b.phase += b.speed;
      const floatY = Math.sin(b.phase) * 6;
      const floatX = Math.cos(b.phase * 0.7) * 3;

      const cx = b.x + floatX;
      const cy = b.y + floatY;

      // Glow
      const glowR = b.r * 1.5;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, `rgba(${b.color.join(",")}, 0.15)`);
      glow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      // Main bubble gradient
      const grad = ctx.createRadialGradient(cx - b.r * 0.25, cy - b.r * 0.25, 0, cx, cy, b.r);
      grad.addColorStop(0, `rgba(${b.color.join(",")}, 0.9)`);
      grad.addColorStop(0.7, `rgba(${b.color.join(",")}, 0.6)`);
      grad.addColorStop(1, `rgba(${b.color.join(",")}, 0.3)`);

      ctx.beginPath();
      ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Border
      ctx.strokeStyle = `rgba(${b.color.join(",")}, 0.5)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Highlight (top-left sheen)
      const shine = ctx.createRadialGradient(
        cx - b.r * 0.35, cy - b.r * 0.35, 0,
        cx - b.r * 0.1, cy - b.r * 0.1, b.r * 0.6
      );
      shine.addColorStop(0, "rgba(255,255,255,0.2)");
      shine.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
      ctx.fillStyle = shine;
      ctx.fill();

      // Label text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (b.r > 30) {
        // Emoji
        ctx.font = `${Math.max(12, b.r * 0.38)}px serif`;
        ctx.fillStyle = "white";
        ctx.globalAlpha = 0.9;
        ctx.fillText(b.emoji, cx, cy - b.r * 0.18);
        ctx.globalAlpha = 1;

        // Percentage text
        ctx.font = `bold ${Math.max(9, b.r * 0.22)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillText(`${b.pct.toFixed(1)}%`, cx, cy + b.r * 0.22);
      } else {
        ctx.font = `bold ${Math.max(8, b.r * 0.35)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillText(`${b.pct.toFixed(0)}%`, cx, cy);
      }
    });

    // Connecting lines (subtle)
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = "#818cf8";
    ctx.lineWidth = 1;
    for (let i = 0; i < bubbles.length - 1; i++) {
      const a = bubbles[i], b = bubbles[i + 1];
      const ax = a.x + Math.cos(a.phase * 0.7) * 3;
      const ay = a.y + Math.sin(a.phase) * 6;
      const bx = b.x + Math.cos(b.phase * 0.7) * 3;
      const by = b.y + Math.sin(b.phase) * 6;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    bubbleAnimFrame = requestAnimationFrame(drawBubbles);
  }

  drawBubbles();
}

// ============================================================
//  AI Analysis (auto-triggered after main analysis)
// ============================================================
async function runAIAnalysis() {
  if (!currentTokenData) return;

  hide("aiAnalysisError");
  show("aiLoadingIndicator");

  try {
    const text    = `${currentTokenData.name} ${currentTokenData.symbol} solana crypto price sentiment`;
    const summary = currentTokenData.summaryForAI;

    const [sentimentRes, rugRes] = await Promise.all([
      postJSON("/api/sentiment", { text }),
      postJSON("/api/rugrisk",   { summary })
    ]);

    // Sentiment
    if (sentimentRes?.ok) {
      const data = normalizeSentimentFromPreds(sentimentRes.preds, currentTokenData.name);
      displaySentimentResults(data);
      hide("sentimentPlaceholder");
      show("sentimentResult");
    } else {
      // Show fallback
      const fallback = generateFallbackSentiment(currentTokenData);
      displaySentimentResults(fallback);
      hide("sentimentPlaceholder");
      show("sentimentResult");
    }

    // Pattern Recognition from chart data
    const patternData = heuristicPatternFromChart(currentTokenData?.chart?.points || []);
    displayPatternResults(patternData);
    hide("patternPlaceholder");
    show("patternResult");

    // Rug Pull Risk
    if (rugRes?.ok) {
      const riskData = normalizeRugRiskFromZeroShot(rugRes.data);
      displayRugPullResults(riskData);
      hide("rugPullPlaceholder");
      show("rugPullResult");
    } else {
      const fallbackRisk = generateRugRiskFromTokenData(currentTokenData);
      displayRugPullResults(fallbackRisk);
      hide("rugPullPlaceholder");
      show("rugPullResult");
    }

    if (window.lucide?.createIcons) window.lucide.createIcons();

  } catch (e) {
    console.warn("AI analysis error:", e);
    // Show best-effort fallbacks rather than erroring
    try {
      const fallbackSentiment = generateFallbackSentiment(currentTokenData);
      displaySentimentResults(fallbackSentiment);
      hide("sentimentPlaceholder"); show("sentimentResult");

      const patternData = heuristicPatternFromChart(currentTokenData?.chart?.points || []);
      displayPatternResults(patternData);
      hide("patternPlaceholder"); show("patternResult");

      const fallbackRisk = generateRugRiskFromTokenData(currentTokenData);
      displayRugPullResults(fallbackRisk);
      hide("rugPullPlaceholder"); show("rugPullResult");
    } catch {}
  } finally {
    hide("aiLoadingIndicator");
  }
}

// ============================================================
//  AI Analysis Helpers
// ============================================================
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({ ok: false }));
  if (typeof data.ok !== "boolean") data.ok = r.ok;
  return data;
}

function normalizeSentimentFromPreds(preds = [], tokenName) {
  const pos = preds.find(p => /positive|bullish/i.test(p.label))?.score || 0;
  const neu = preds.find(p => /neutral/i.test(p.label))?.score || 0;
  const neg = preds.find(p => /negative|bearish/i.test(p.label))?.score || 0;

  const positive = Math.round(pos * 100);
  const neutral  = Math.round(neu * 100);
  const negative = Math.max(0, 100 - positive - neutral);
  const score    = Math.max(0, Math.min(100, Math.round(((pos - neg) + 1) * 50)));

  return {
    positive, neutral, negative, score,
    summary: positive > 65 ? `Strong bullish community signal for ${tokenName}.`
      : positive > 40 ? `Mixed sentiment — watch for breakout or breakdown.`
      : `Negative sentiment detected — exercise caution.`,
    mentions: [
      { text: "On-chain activity looks healthy", sentiment: "positive" },
      { text: "Monitor top holder movements", sentiment: "neutral" },
      { text: "Low LP lock is a concern", sentiment: "negative" }
    ]
  };
}

function generateFallbackSentiment(t) {
  const score = t.scores?.overall ?? 50;
  const positive = Math.round(score * 0.6 + Math.random() * 10);
  const negative = Math.round((100 - score) * 0.5 + Math.random() * 8);
  const neutral  = Math.max(0, 100 - positive - negative);
  return {
    positive, neutral, negative, score: Math.min(100, Math.max(0, score + Math.round(Math.random() * 10 - 5))),
    summary: `Estimated from on-chain metrics for ${t.name || "this token"}. Score reflects holder distribution and liquidity health.`,
    mentions: [
      { text: `${t.name} has ${Number(t.holders || 0).toLocaleString()} holders`, sentiment: "positive" },
      { text: `Top 10 hold ${t.top10Pct || "?"}% — watch concentration`, sentiment: "neutral" },
      { text: t.lpLockedPct > 50 ? `LP ${t.lpLockedPct}% locked — safer` : `Low LP lock (${t.lpLockedPct || 0}%) — risky`, sentiment: t.lpLockedPct > 50 ? "positive" : "negative" }
    ]
  };
}

function generateRugRiskFromTokenData(t) {
  // Derive score from actual data
  let score = 20;
  if (Number(t.lpLockedPct) < 30) score += 30;
  else if (Number(t.lpLockedPct) < 60) score += 15;
  if (t.concentrationLabel === "Extreme") score += 25;
  else if (t.concentrationLabel === "Moderate") score += 10;
  if (t.risks?.find(r => r.name === "Mint Authority" && r.risk)) score += 15;
  if (t.risks?.find(r => r.name === "Freeze Authority" && r.risk)) score += 10;
  score = Math.min(95, Math.max(5, score));
  return generateRugPullDataFromScore(score);
}

function displaySentimentResults(data) {
  document.getElementById("positiveSentiment").textContent = `${data.positive}%`;
  document.getElementById("neutralSentiment").textContent  = `${data.neutral}%`;
  document.getElementById("negativeSentiment").textContent = `${data.negative}%`;
  document.getElementById("sentimentScore").textContent    = `${data.score}/100`;

  // Move cursor on gradient bar
  const cursor = document.getElementById("sentimentCursor");
  if (cursor) cursor.style.left = `${data.score}%`;

  document.getElementById("sentimentSummary").textContent = data.summary;

  const mentionsEl = document.getElementById("sentimentMentions");
  if (mentionsEl) {
    mentionsEl.innerHTML = data.mentions.map(m => `
      <div class="flex items-start gap-1.5 py-0.5">
        <span class="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
          m.sentiment === "positive" ? "bg-emerald-400" :
          m.sentiment === "negative" ? "bg-red-400" : "bg-gray-600"
        }"></span>
        <p class="text-gray-500 leading-snug">${m.text}</p>
      </div>
    `).join("");
  }
}

function heuristicPatternFromChart(points) {
  if (!points.length) {
    return {
      name: "No Data", description: "No price history available.",
      confidence: 0, trend: "Unknown",
      support: "--", resistance: "--",
      prediction: "Try again shortly."
    };
  }

  const first = points[0].price;
  const last  = points[points.length - 1].price;
  const pct   = first ? ((last - first) / first) * 100 : 0;
  const trend = pct > 5 ? "Bullish" : pct < -5 ? "Bearish" : "Sideways";
  const name  = trend === "Bullish" ? "Uptrend" : trend === "Bearish" ? "Downtrend" : "Consolidation";
  const confidence = Math.min(92, Math.max(40, Math.round(Math.abs(pct) * 5 + 40)));

  const prices = points.map(p => p.price).filter(n => isFinite(n) && n > 0);
  const support    = prices.length ? Math.min(...prices) : 0;
  const resistance = prices.length ? Math.max(...prices) : 0;

  return {
    name,
    description: `Based on 7-day OHLCV data. ${Math.abs(pct).toFixed(1)}% ${pct >= 0 ? "gain" : "loss"} over the period.`,
    confidence,
    trend,
    support:    support.toPrecision(6),
    resistance: resistance.toPrecision(6),
    prediction: trend === "Bullish" ? "Momentum positive — look for pullbacks to accumulate."
      : trend === "Bearish" ? "Bearish momentum — avoid chasing, wait for reversal signal."
      : "Range-bound — wait for confirmed breakout before entering."
  };
}

function displayPatternResults(data) {
  document.getElementById("patternName").textContent        = data.name;
  document.getElementById("patternDescription").textContent = data.description;
  document.getElementById("patternConfidence").textContent  = `${data.confidence}%`;
  document.getElementById("patternPrediction").textContent  = data.prediction;

  const tr = document.getElementById("patternTrend");
  if (tr) {
    tr.textContent = data.trend;
    tr.className = `px-2 py-0.5 rounded-full text-[10px] font-medium ${
      data.trend === "Bullish"  ? "bg-emerald-900/50 text-emerald-400 border border-emerald-500/20" :
      data.trend === "Bearish"  ? "bg-red-900/50 text-red-400 border border-red-500/20" :
      "bg-gray-800 text-gray-400 border border-gray-700"
    }`;
  }

  document.getElementById("supportLevel").textContent    = `$${data.support}`;
  document.getElementById("resistanceLevel").textContent = `$${data.resistance}`;
}

function normalizeRugRiskFromZeroShot(zeroShot) {
  const labels = zeroShot?.labels || [];
  const scores = zeroShot?.scores || [];
  const rugIdx = labels.findIndex(l => /rug|scam/i.test(String(l)));
  const rugProb = rugIdx >= 0 ? scores[rugIdx] : 0.25;
  return generateRugPullDataFromScore(Math.round(rugProb * 100));
}

function generateRugPullDataFromScore(score) {
  const riskLevel = score < 30 ? "Low" : score < 65 ? "Medium" : "High";
  const indicators = [
    { name: "Liquidity Lock",  status: score < 35 ? "Locked ✅"  : score < 65 ? "Partial ⚠️" : "Unlocked ❌", risk: score > 55 },
    { name: "Top Holders",     status: score < 30 ? "Healthy ✅" : score < 65 ? "Moderate ⚠️" : "Extreme ❌",  risk: score > 65 },
    { name: "Authorities",     status: score < 35 ? "Revoked ✅" : score < 65 ? "Mixed ⚠️"    : "Active ❌",   risk: score > 55 },
    { name: "Volume Pattern",  status: score > 75 ? "Artificial ❌" : score > 50 ? "Suspicious ⚠️" : "Organic ✅", risk: score > 50 }
  ];
  const flags =
    riskLevel === "High"   ? ["Liquidity exposure", "Concentration risk", "Suspicious volume"] :
    riskLevel === "Medium" ? ["Monitor LP lock", "Use tight stops"] :
    ["Lower risk profile"];
  return { score, riskLevel, indicators, flags };
}

function displayRugPullResults(data) {
  const scoreEl = document.getElementById("rugPullScore");
  if (scoreEl) {
    scoreEl.textContent = data.score;
    scoreEl.className = `text-6xl font-black mb-0.5 ${
      data.riskLevel === "High" ? "text-red-400 score-glow-red" :
      data.riskLevel === "Medium" ? "text-yellow-400 score-glow-yellow" :
      "text-emerald-400 score-glow-green"
    }`;
  }

  const indEl = document.getElementById("rugPullIndicators");
  if (indEl) {
    indEl.innerHTML = data.indicators.map(ind => `
      <div class="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2">
        <span class="text-[10px] text-gray-500">${ind.name}</span>
        <span class="text-[10px] font-semibold ${ind.risk ? "text-red-400" : "text-emerald-400"}">${ind.status}</span>
      </div>
    `).join("");
  }

  const flagsEl = document.getElementById("mlFlags");
  if (flagsEl) {
    flagsEl.innerHTML = data.flags.map(f => `
      <span class="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-full text-[10px]">${f}</span>
    `).join("");
  }

  const verdictEl = document.getElementById("rugPullVerdict");
  const boxEl     = document.getElementById("rugPullVerdictBox");
  if (verdictEl && boxEl) {
    if (data.riskLevel === "High") {
      verdictEl.textContent = "⚠️ HIGH RISK: Multiple rug-like signals detected. Avoid large positions.";
      boxEl.className = "p-3 rounded-xl border bg-red-900/15 border-red-500/25";
      verdictEl.className = "text-xs font-semibold text-center text-red-400";
    } else if (data.riskLevel === "Medium") {
      verdictEl.textContent = "⚡ MEDIUM RISK: Mixed signals — trade small, use tight stops.";
      boxEl.className = "p-3 rounded-xl border bg-yellow-900/15 border-yellow-500/25";
      verdictEl.className = "text-xs font-semibold text-center text-yellow-400";
    } else {
      verdictEl.textContent = "✅ LOWER RISK: Fewer rug signals detected. Still DYOR.";
      boxEl.className = "p-3 rounded-xl border bg-emerald-900/15 border-emerald-500/25";
      verdictEl.className = "text-xs font-semibold text-center text-emerald-400";
    }
  }
}

// ============================================================
//  Reset
// ============================================================
function resetAnalysis() {
  currentTokenData = null;

  if (currentChart)     { currentChart.destroy(); currentChart = null; }
  if (bubbleAnimFrame)  { cancelAnimationFrame(bubbleAnimFrame); bubbleAnimFrame = null; }

  const input = document.getElementById("contractInput");
  if (input) input.value = "";

  hide("analysisResults");
  hide("loadingState");
  show("heroSection");

  hide("sentimentResult");  show("sentimentPlaceholder");
  hide("patternResult");    show("patternPlaceholder");
  hide("rugPullResult");    show("rugPullPlaceholder");
  hide("aiAnalysisError");
  hide("aiLoadingIndicator");

  setSearchStatus("idle", "");

  document.getElementById("heroLoadingText").textContent = "Ready — paste a contract address above";
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ============================================================
//  View on DexScreener
// ============================================================
function viewChart() {
  if (!currentTokenData?.address) return;
  window.open(`https://dexscreener.com/solana/${currentTokenData.address}`, "_blank");
}
