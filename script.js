"use strict";

// ============================================================
//  Global State
// ============================================================
let currentChart     = null;
let currentTokenData = null;
let bubbleAnimFrame  = null;
let bgAnimFrame      = null;
let analysisDebounce = null;
let analysisId       = 0;   // incremented on every new analysis — prevents stale renders

const DEFAULT_TOKEN = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"; // BONK

// ============================================================
//  DOMContentLoaded
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide?.createIcons) window.lucide.createIcons();

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
      if (input) {
        input.value = addr;
        clearTimeout(analysisDebounce);
        // Hide hero immediately on example click
        hide("heroSection");
        triggerAutoAnalysis();
      }
    });
  });

  const input = document.getElementById("contractInput");
  if (input) {
    input.addEventListener("input", () => {
      clearTimeout(analysisDebounce);
      const val = input.value.trim();
      // Immediately collapse hero as soon as user starts typing
      if (val.length > 0) hide("heroSection");
      if (val.length >= 32 && val.length <= 50) {
        setSearchStatus("analyzing", "Ready…");
        analysisDebounce = setTimeout(triggerAutoAnalysis, 900);
      } else if (val.length > 0) {
        setSearchStatus("idle", val.length < 32 ? "Keep typing…" : "Too long");
      } else {
        setSearchStatus("idle", "");
      }
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { clearTimeout(analysisDebounce); triggerAutoAnalysis(); }
    });
  }

  document.getElementById("contractAddress")?.addEventListener("click", () => {
    if (currentTokenData?.address) copyToClipboard(currentTokenData.address);
  });

  initBackground();
  setTimeout(() => fetch("/api/keep-warm").catch(() => {}), 1000);

  // Auto-analyze BONK on load
  input.value = DEFAULT_TOKEN;
  setTimeout(() => analyzeContract(DEFAULT_TOKEN, true), 400);
});

// ============================================================
//  Background Canvas (Stars + God Rays + Nebula Blobs)
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

  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.4 + 0.3,
    speed: Math.random() * 0.12 + 0.04,
    opacity: Math.random() * 0.45 + 0.1,
    twinkle: Math.random() * Math.PI * 2
  }));

  const blobs = [
    { x: W * 0.82, y: H * 0.12, r: 320, color: "99,102,241", angle: 0, speed: 0.00025 },
    { x: W * 0.08, y: H * 0.72, r: 270, color: "139,92,246", angle: 1.0, speed: 0.00033 },
    { x: W * 0.48, y: H * 0.52, r: 210, color: "6,182,212",  angle: 2.1, speed: 0.00042 }
  ];

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    // Nebula blobs
    blobs.forEach(b => {
      b.angle += b.speed;
      const ox = Math.sin(b.angle * 1.3) * 55;
      const oy = Math.cos(b.angle * 0.9) * 48;
      const g = ctx.createRadialGradient(b.x + ox, b.y + oy, 0, b.x + ox, b.y + oy, b.r);
      g.addColorStop(0, `rgba(${b.color},0.07)`);
      g.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(b.x + ox, b.y + oy, b.r, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
    });

    // God rays from top-right
    const ox = W * 0.88, oy = -60;
    for (let i = 0; i < 5; i++) {
      const t = (frame * 0.0018 + i * 0.65) % (Math.PI * 2);
      const angle = Math.PI * 0.56 + Math.sin(t) * 0.22 + i * 0.11;
      const len = W * 2.2;
      const alpha = (0.012 + Math.sin(t * 1.4) * 0.008).toFixed(4);
      const g = ctx.createLinearGradient(ox, oy,
        ox + Math.cos(angle) * len, oy + Math.sin(angle) * len);
      g.addColorStop(0, `rgba(99,102,241,${alpha})`);
      g.addColorStop(0.5, `rgba(139,92,246,${(alpha * 0.5).toFixed(4)})`);
      g.addColorStop(1, "transparent");
      const spread = 0.035;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(angle + spread) * len, oy + Math.sin(angle + spread) * len);
      ctx.lineTo(ox + Math.cos(angle - spread) * len, oy + Math.sin(angle - spread) * len);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
    }

    // Stars
    stars.forEach(s => {
      s.twinkle += s.speed * 0.04;
      const op = s.opacity * (0.6 + 0.4 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${op.toFixed(2)})`; ctx.fill();
    });

    bgAnimFrame = requestAnimationFrame(draw);
  }
  draw();
}

// ============================================================
//  Helpers
// ============================================================
function show(id) { document.getElementById(id)?.classList.remove("hidden"); }
function hide(id) { document.getElementById(id)?.classList.add("hidden"); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function setSearchStatus(state, text) {
  const txt  = document.getElementById("searchStatusText");
  const spin = document.getElementById("searchSpinner");
  const done = document.getElementById("searchDone");
  const inp  = document.getElementById("contractInput");
  if (txt)  { txt.textContent = text || ""; txt.classList.toggle("hidden", !text); }
  spin?.classList.toggle("hidden", state !== "analyzing");
  done?.classList.toggle("hidden", state !== "done");
  inp?.classList.toggle("analyzing", state === "analyzing");
}

function showToast(message, type = "info") {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = message;
  if (type === "error") t.style.background = "linear-gradient(135deg,#dc2626,#ef4444)";
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0"; t.style.transform = "translateX(120%)";
    t.style.transition = "all 0.3s ease-out";
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); showToast("Address copied!"); }
  catch { showToast("Copy failed", "error"); }
}

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
  if (num >= 1)      return `$${num.toFixed(4)}`;
  if (num >= 0.01)   return `$${num.toFixed(6)}`;
  if (num >= 0.0001) return `$${num.toFixed(8)}`;
  return `$${num.toFixed(12)}`;
}

// ============================================================
//  Auto-Analysis Trigger
// ============================================================
function triggerAutoAnalysis() {
  const raw = document.getElementById("contractInput")?.value?.trim() || "";
  if (raw.length >= 32 && raw.length <= 50) analyzeContract(raw, false);
}

// ============================================================
//  Core: analyzeContract — with race-condition guard
// ============================================================
async function analyzeContract(addressOverride, isInitialLoad = false) {
  const myId = ++analysisId;  // Every call gets a unique ID

  const raw = (addressOverride || document.getElementById("contractInput")?.value?.trim() || "").trim();
  if (!raw || raw.length < 32 || raw.length > 50) {
    if (!isInitialLoad) showToast("Enter a valid Solana token mint address");
    return;
  }

  // ── Immediately collapse hero, show skeleton ──
  hide("heroSection");
  hide("analysisResults");
  show("loadingState");
  setSearchStatus("analyzing", "Fetching…");

  // ── Reset all AI panels to loading spinners for this fresh coin ──
  hide("sentimentResult");  show("sentimentPlaceholder");
  hide("patternResult");    show("patternPlaceholder");
  hide("rugPullResult");    show("rugPullPlaceholder");
  hide("aiAnalysisError");
  show("aiLoadingIndicator");

  try {
    let data;
    let attempts = 0;
    while (attempts < 3) {
      try {
        const ctrl = new AbortController();
        const tid  = setTimeout(() => ctrl.abort(), 35000);
        const resp = await fetch(`/api/analyze?address=${encodeURIComponent(raw)}`, { signal: ctrl.signal });
        clearTimeout(tid);
        data = await resp.json();
        if (data?.ok) break;
        if (attempts < 2) { setSearchStatus("analyzing", `Retry ${attempts + 1}…`); await sleep(1500 * (attempts + 1)); }
      } catch {
        if (attempts < 2) await sleep(1500 * (attempts + 1));
      }
      attempts++;
    }

    // ── Bail if a newer analysis already started ──
    if (myId !== analysisId) return;

    if (!data?.ok) throw new Error(data?.error || "Analysis failed — check the token address");

    currentTokenData = data.token;
    renderResults(currentTokenData);

    // ── Always hide hero in the success path ──
    hide("heroSection");
    hide("loadingState");
    show("analysisResults");

    // Wait two frames so the container has real dimensions before drawing
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (myId !== analysisId) return;
      initChart(currentTokenData?.chart?.points || []);
      renderBubbleMap(currentTokenData);
    }));

    if (window.lucide?.createIcons) window.lucide.createIcons();

    setSearchStatus("done", currentTokenData.symbol || "✓");
    setTimeout(() => setSearchStatus("idle", ""), 3000);

    if (!isInitialLoad) {
      document.getElementById("analysisResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Auto-run AI analysis — pass myId so stale results never render
    const capturedId = myId;
    setTimeout(() => { if (capturedId === analysisId) runAIAnalysis(capturedId); }, 350);

  } catch (e) {
    // Bail silently if superseded
    if (myId !== analysisId) return;

    hide("loadingState");
    hide("aiLoadingIndicator");
    // Only restore hero on the very first load failure
    if (isInitialLoad) show("heroSection");
    setSearchStatus("idle", "");
    showToast(e?.message || "Failed to analyze token", "error");
  }
}

// ============================================================
//  Render Results
// ============================================================
function renderResults(t) {
  // Header
  document.getElementById("tokenName").textContent    = t.name   || "Unknown";
  document.getElementById("tokenSymbol").textContent  = t.symbol || "--";
  const img = document.getElementById("tokenImage");
  img.src = t.logo || "";

  const ca = document.getElementById("contractAddress");
  if (ca) {
    ca.dataset.fullAddress = t.address;
    ca.textContent = `${t.address.slice(0,10)}…${t.address.slice(-8)}  (click to copy)`;
  }

  const vb = document.getElementById("verifiedBadge");
  if (vb) t.verified ? vb.classList.remove("hidden") : vb.classList.add("hidden");

  // Price
  document.getElementById("currentPrice").textContent = fmtPrice(t.price);
  const ch = Number(t.priceChange24h);
  const pc = document.getElementById("priceChange");
  if (pc) {
    pc.textContent = isFinite(ch) ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : "--";
    pc.className   = `text-xs font-medium ${ch >= 0 ? "text-emerald-400" : "text-red-400"}`;
  }

  // Market stats
  document.getElementById("marketCap").textContent  = fmtUSD(t.marketCap);
  document.getElementById("fdv").textContent         = fmtUSD(t.fdv);
  document.getElementById("volume24h").textContent   = fmtUSD(t.volume24hUSD);
  document.getElementById("buySellRatio").textContent = t.buySellRatio ? `${Number(t.buySellRatio).toFixed(2)}:1` : "--";

  // Volume score + bar + color
  const vs = t.scores?.volume ?? 0;
  const vsEl = document.getElementById("volumeScore");
  if (vsEl) {
    vsEl.textContent = `${vs}/100`;
    vsEl.className = `text-base font-black ${vs > 70 ? "text-emerald-400" : vs > 40 ? "text-yellow-400" : "text-red-400"}`;
  }
  const vb = document.getElementById("volumeBar");
  if (vb) {
    vb.style.width = `${vs}%`;
    vb.className   = `progress-bar-fill h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
      vs > 70 ? "from-emerald-600 to-emerald-400" :
      vs > 40 ? "from-yellow-600 to-yellow-400" : "from-red-600 to-red-400"
    }`;
  }

  // Wash trading
  const wash = document.getElementById("washTradingRisk");
  if (wash) {
    wash.textContent = t.washRiskLabel || "--";
    wash.className   = `px-2 py-0.5 rounded-full text-[10px] font-medium border ${
      t.washRiskLabel === "Low"    ? "bg-emerald-900/50 text-emerald-400 border-emerald-500/20" :
      t.washRiskLabel === "Medium" ? "bg-yellow-900/50 text-yellow-400 border-yellow-500/20" :
      "bg-red-900/50 text-red-400 border-red-500/20"
    }`;
  }

  // Liquidity
  document.getElementById("totalLiquidity").textContent = fmtUSD(t.liquidityUSD);
  document.getElementById("lpLocked").textContent       = isFinite(Number(t.lpLockedPct)) ? `${Number(t.lpLockedPct).toFixed(0)}%` : "--%";
  document.getElementById("mcapLiqRatio").textContent   = isFinite(Number(t.mcapLiqRatio)) ? `${Number(t.mcapLiqRatio)}x` : "--x";

  const liq = t.scores?.liquidity ?? 0;
  const liqEl = document.getElementById("liquidityScore");
  if (liqEl) {
    liqEl.textContent = `${liq}/100`;
    liqEl.className = `text-base font-black ${liq > 70 ? "text-emerald-400" : liq > 40 ? "text-yellow-400" : "text-red-400"}`;
  }
  const lb = document.getElementById("liquidityBar");
  if (lb) {
    lb.style.width = `${liq}%`;
    lb.className   = `progress-bar-fill h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
      liq > 70 ? "from-emerald-600 to-emerald-400" :
      liq > 40 ? "from-yellow-600 to-yellow-400" : "from-red-600 to-red-400"
    }`;
  }

  // Holders
  document.getElementById("totalHolders").textContent = isFinite(Number(t.holders)) ? Number(t.holders).toLocaleString() : "--";
  document.getElementById("top10Holders").textContent  = isFinite(Number(t.top10Pct)) ? `${Number(t.top10Pct).toFixed(1)}%` : "--%";
  document.getElementById("holderGrowth").textContent  = `${t.holderGrowth24h || "0.0"}% / ${t.holderGrowth7d || "0.0"}%`;
  document.getElementById("newBuyers24h").textContent  = isFinite(Number(t.newBuyers24h)) ? Number(t.newBuyers24h).toLocaleString() : "--";

  const conc = document.getElementById("concentrationRisk");
  if (conc) {
    conc.textContent = t.concentrationLabel || "--";
    conc.className   = `px-2 py-0.5 rounded-full text-[10px] font-medium border ${
      t.concentrationLabel === "Healthy"  ? "bg-emerald-900/40 text-emerald-400 border-emerald-500/20" :
      t.concentrationLabel === "Moderate" ? "bg-yellow-900/40 text-yellow-400 border-yellow-500/20" :
      "bg-red-900/40 text-red-400 border-red-500/20"
    }`;
  }

  const hs = t.scores?.holders ?? 0;
  const hsEl = document.getElementById("holderScore");
  if (hsEl) {
    hsEl.textContent = `${hs}/100`;
    hsEl.className = `text-base font-black ${hs > 70 ? "text-emerald-400" : hs > 40 ? "text-yellow-400" : "text-red-400"}`;
  }
  const hb = document.getElementById("holderBar");
  if (hb) {
    hb.style.width = `${hs}%`;
    hb.className   = `progress-bar-fill h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${
      hs > 70 ? "from-emerald-600 to-emerald-400" :
      hs > 40 ? "from-yellow-600 to-yellow-400" : "from-red-600 to-red-400"
    }`;
  }

  // Overall score
  const overall = t.scores?.overall ?? 0;
  const se = document.getElementById("overallScore");
  if (se) {
    se.textContent = overall;
    se.className   = `text-4xl font-black ${
      overall > 75 ? "text-emerald-400 score-glow-green" :
      overall > 50 ? "text-yellow-400 score-glow-yellow" :
      "text-red-400 score-glow-red"
    }`;
  }

  const re = document.getElementById("overallRating");
  if (re) {
    if (overall >= 80)      { re.textContent = "STRONG";    re.className = "px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"; }
    else if (overall >= 60) { re.textContent = "MODERATE";  re.className = "px-3 py-1.5 rounded-full text-xs font-black bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"; }
    else                    { re.textContent = "HIGH RISK"; re.className = "px-3 py-1.5 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/30"; }
  }

  // Recommendation
  const rec = t.recommendation || "AVOID";
  const rb  = document.getElementById("recommendationBadge");
  if (rb) {
    rb.textContent = rec;
    rb.className   = `px-3 py-1.5 rounded-full text-xs font-black ${
      rec === "BUY" ? "rec-buy" : rec === "CAUTION" ? "rec-caution" : "rec-avoid"
    }`;
  }

  document.getElementById("entryPrice").textContent      = fmtPrice(t.entryPrice);
  document.getElementById("exitPrice").textContent       = fmtPrice(t.exitPrice);
  document.getElementById("analysisSummary").textContent = t.summary || "Analysis complete.";

  // Risk grid
  const rg = document.getElementById("riskGrid");
  if (rg) {
    rg.innerHTML = (t.risks || []).map(r => `
      <div class="risk-item ${r.risk ? "risk" : "safe"} flex items-start gap-2.5">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.risk ? "bg-red-900/40" : "bg-emerald-900/40"}">
          <i data-lucide="${r.risk ? "x-circle" : "check-circle"}" class="w-4 h-4 ${r.risk ? "text-red-400" : "text-emerald-400"}"></i>
        </div>
        <div class="min-w-0">
          <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">${r.name}</p>
          <p class="text-xs font-semibold ${r.risk ? "text-red-400" : "text-emerald-400"} truncate">${r.status}</p>
        </div>
      </div>`).join("");
  }

  if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ============================================================
//  Chart.js — 7d Price + Volume
// ============================================================
function initChart(points) {
  if (!window.Chart) return;
  const canvas = document.getElementById("volumeChart");
  if (!canvas) return;
  if (currentChart) { currentChart.destroy(); currentChart = null; }

  const ctx    = canvas.getContext("2d");
  const labels  = points.map(p => p.label);
  const prices  = points.map(p => p.price);
  const volumes = points.map(p => p.volume);

  const priceGrad = ctx.createLinearGradient(0, 0, 0, 220);
  priceGrad.addColorStop(0, "rgba(99,102,241,0.28)");
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
          borderWidth: 2.5,
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
          backgroundColor: "rgba(139,92,246,0.28)",
          borderColor: "rgba(139,92,246,0.55)",
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
        legend: { labels: { color: "rgba(156,163,175,0.8)", font: { size: 11 }, boxWidth: 12 } },
        tooltip: {
          backgroundColor: "rgba(10,14,33,0.95)",
          borderColor: "rgba(99,102,241,0.3)",
          borderWidth: 1,
          titleColor: "#c7d2fe",
          bodyColor: "#9ca3af",
          padding: 10,
          cornerRadius: 10
        }
      },
      scales: {
        x:  { ticks: { color: "rgba(107,114,128,0.8)", font: { size: 10 } }, grid: { color: "rgba(30,41,59,0.5)" } },
        y:  { ticks: { color: "rgba(107,114,128,0.8)", font: { size: 10 } }, grid: { color: "rgba(30,41,59,0.5)" } },
        y1: { position: "right", ticks: { display: false }, grid: { display: false } }
      }
    }
  });
}

// ============================================================
//  Bubble Map — iNSIGHTX-Style: hollow = holder, filled = cluster
// ============================================================
function renderBubbleMap(t) {
  if (bubbleAnimFrame) { cancelAnimationFrame(bubbleAnimFrame); bubbleAnimFrame = null; }
  // Close any open holder detail modal from previous coin
  document.getElementById("holderDetailModal")?.remove();

  const container = document.getElementById("bubbleMapContainer");
  const canvas    = document.getElementById("bubbleMapCanvas");
  const listEl    = document.getElementById("holderList");
  if (!container || !canvas) return;

  const W = container.clientWidth  || 400;
  const H = container.clientHeight || 300;
  canvas.width  = W;
  canvas.height = H;

  // ── Cluster color palette (iNSIGHTX style) ──────────────────
  const CLUSTER_COLORS = [
    [ 52, 211, 153],   // emerald
    [251, 191,  36],   // amber
    [236,  72, 153]    // pink
  ];

  // ── Build holder list from real API data or synthetic ────────
  const rawHolders = (t.topHolders && t.topHolders.length > 0)
    ? t.topHolders.slice(0, 20)
    : buildSyntheticHolders(t);

  // Assign visual roles: top 2 = whale hollow, 3-5 = top hollow,
  // 6-8 = cluster A filled, 9-11 = cluster B filled, 12-14 = cluster C filled,
  // 15+ = community hollow
  const holders = rawHolders.map((h, i) => {
    const rank = h.rank || (i + 1);
    let type, clusterGroup, style, color;

    if (rank <= 2) {
      type = "whale"; style = "hollow"; clusterGroup = null;
      color = [220, 225, 255];
    } else if (rank <= 5) {
      type = "top"; style = "hollow"; clusterGroup = null;
      color = [160, 175, 230];
    } else if (rank <= 8) {
      type = "cluster"; style = "filled"; clusterGroup = 0;
      color = CLUSTER_COLORS[0];
    } else if (rank <= 11) {
      type = "cluster"; style = "filled"; clusterGroup = 1;
      color = CLUSTER_COLORS[1];
    } else if (rank <= 14) {
      type = "cluster"; style = "filled"; clusterGroup = 2;
      color = CLUSTER_COLORS[2];
    } else {
      type = "community"; style = "hollow"; clusterGroup = null;
      color = [80, 95, 130];
    }

    const addr = h.address || "";
    const shortAddr = addr.length > 12
      ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
      : (addr || `#${rank}`);

    return {
      rank, pct: h.pct, uiAmount: h.uiAmount || 0,
      address: addr, shortAddr,
      type, clusterGroup, style, color,
      r: 0, ox: 0, oy: 0, cx: 0, cy: 0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.005,
      amp:   style === "filled" ? 0.6 : 1.2 + Math.random() * 2
    };
  });

  // Add community scatter bubbles to fill canvas visually
  const top10sum = holders.reduce((s, h) => s + h.pct, 0);
  const commPct  = Math.max(0, 100 - top10sum);
  const numComm  = 18;
  for (let i = 0; i < numComm; i++) {
    const pct = (commPct / numComm) * (0.4 + Math.random() * 1.2);
    holders.push({
      rank: holders.length + 1, pct, uiAmount: 0,
      address: "", shortAddr: "holder…",
      type: "community", clusterGroup: null, style: "hollow",
      color: [65, 80, 115],
      r: 0, ox: 0, oy: 0, cx: 0, cy: 0,
      phase: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.004,
      amp: 1 + Math.random() * 1.8
    });
  }

  // ── Assign radii ─────────────────────────────────────────────
  const maxPct     = Math.max(...holders.map(h => h.pct), 1);
  const hollowMaxR = Math.min(W * 0.13, H * 0.22, 55);
  holders.forEach(h => {
    h.r = h.style === "filled"
      ? 4 + Math.sqrt(h.pct / maxPct) * 9            // cluster: 4–13 px
      : 7 + Math.sqrt(h.pct / maxPct) * (hollowMaxR - 7); // hollow: 7–55 px
  });

  // ── Pack bubbles (largest first, collision avoidance) ────────
  const PAD = 3;
  const placed = [];
  [...holders].sort((a, b) => b.r - a.r).forEach(b => {
    let ok = false;
    for (let t_ = 0; t_ < 600; t_++) {
      const x = b.r + PAD + Math.random() * (W - 2 * b.r - 2 * PAD);
      const y = b.r + PAD + Math.random() * (H - 2 * b.r - 2 * PAD);
      if (!placed.some(p => {
        const dx = x - p.ox, dy = y - p.oy;
        return dx * dx + dy * dy < (p.r + b.r + PAD) ** 2;
      })) { b.ox = x; b.oy = y; ok = true; break; }
    }
    if (!ok) {
      b.ox = b.r + PAD + Math.random() * Math.max(1, W - 2 * b.r - 2 * PAD);
      b.oy = b.r + PAD + Math.random() * Math.max(1, H - 2 * b.r - 2 * PAD);
    }
    b.cx = b.ox; b.cy = b.oy;
    placed.push(b);
  });

  // ── Right panel — real addresses + color-coded cluster rows ──
  if (listEl) {
    const listRows = holders.filter(h => h.rank <= rawHolders.length);
    listEl.innerHTML =
      `<div class="text-[10px] text-gray-600 uppercase tracking-wider px-2 pb-1.5 border-b border-gray-800/60 mb-1 font-semibold shrink-0">Top Holders</div>` +
      listRows.map(h => {
        const [rv, gv, bv] = h.color;
        const isCl = h.style === "filled";
        return `
        <div class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] shrink-0 holder-row"
             style="${isCl ? `background:rgba(${rv},${gv},${bv},0.06);border:1px solid rgba(${rv},${gv},${bv},0.2)` : "border:1px solid transparent"}"
             data-rank="${h.rank}">
          <span class="text-gray-700 w-4 text-right font-mono text-[10px] shrink-0">#${h.rank}</span>
          <span class="w-2.5 h-2.5 rounded-full shrink-0 ${isCl ? "" : "border"}"
                style="${isCl ? `background:rgba(${rv},${gv},${bv},0.9)` : `border-color:rgba(${rv},${gv},${bv},0.5)`}"></span>
          <span class="flex-1 text-gray-400 truncate font-mono">${h.shortAddr}</span>
          <span class="font-bold text-gray-200 shrink-0 font-mono text-[10px]">${h.pct.toFixed(2)}%</span>
        </div>`;
      }).join("") +
      (!t.topHolders?.length
        ? `<div class="mt-2 px-2 text-[10px] text-gray-700 italic leading-relaxed">Est. distribution — Birdeye API for real addresses</div>`
        : "");

    listEl.querySelectorAll("[data-rank]").forEach(row => {
      row.addEventListener("click", () => {
        const rank = parseInt(row.dataset.rank);
        const h = holders.find(x => x.rank === rank);
        if (h) showHolderDetail(h);
      });
    });
  }

  // ── Clone canvas to remove stale event listeners ─────────────
  const newCanvas = canvas.cloneNode(true);
  newCanvas.width  = W;
  newCanvas.height = H;
  canvas.parentNode.replaceChild(newCanvas, canvas);
  const ctx = newCanvas.getContext("2d");

  // ── Tooltip ──────────────────────────────────────────────────
  const tooltip = document.getElementById("bubbleTooltip");
  const hitTest = (mx, my) => holders.find(h => {
    const dx = mx - h.cx, dy = my - h.cy;
    return dx * dx + dy * dy <= (h.r + 3) * (h.r + 3);
  });

  newCanvas.addEventListener("mousemove", e => {
    const rect  = newCanvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    const hit = hitTest(mx, my);
    if (hit && tooltip) {
      const [rv, gv, bv] = hit.color;
      tooltip.innerHTML = `
        <div class="font-mono text-[11px] font-semibold text-gray-100">#${hit.rank}&nbsp;&nbsp;${hit.shortAddr}</div>
        <div class="text-gray-400 text-[10px] mt-0.5">${hit.pct.toFixed(4)}% of supply</div>
        ${hit.clusterGroup !== null ? `<div class="text-[9px] mt-0.5" style="color:rgba(${rv},${gv},${bv},0.9)">Cluster ${String.fromCharCode(65 + hit.clusterGroup)}</div>` : ""}
        <div class="text-gray-600 text-[9px] mt-0.5">Click to inspect</div>`;
      tooltip.style.left = `${Math.min(mx + 14, W - 175)}px`;
      tooltip.style.top  = `${Math.max(4, my - 60)}px`;
      tooltip.classList.remove("hidden");
      newCanvas.style.cursor = "pointer";
    } else {
      tooltip?.classList.add("hidden");
      newCanvas.style.cursor = "default";
    }
  });

  newCanvas.addEventListener("mouseleave", () => {
    tooltip?.classList.add("hidden");
    newCanvas.style.cursor = "default";
  });

  newCanvas.addEventListener("click", e => {
    const rect  = newCanvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    const hit = hitTest(mx, my);
    if (hit) showHolderDetail(hit);
  });

  // ── Animated draw loop ────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Dot-grid background
    ctx.fillStyle = "rgba(99,102,241,0.018)";
    for (let gx = 25; gx < W; gx += 32)
      for (let gy = 25; gy < H; gy += 32) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.8, 0, Math.PI * 2); ctx.fill();
      }

    // Cluster connecting lines (drawn UNDER bubbles)
    [0, 1, 2].forEach(gi => {
      const grp = holders.filter(h => h.clusterGroup === gi);
      if (grp.length < 2) return;
      const [rv, gv, bv] = CLUSTER_COLORS[gi];
      ctx.save();
      ctx.strokeStyle = `rgba(${rv},${gv},${bv},0.22)`;
      ctx.lineWidth = 0.75;
      ctx.setLineDash([3, 5]);
      for (let a = 0; a < grp.length; a++)
        for (let b = a + 1; b < grp.length; b++) {
          ctx.beginPath();
          ctx.moveTo(grp[a].cx, grp[a].cy);
          ctx.lineTo(grp[b].cx, grp[b].cy);
          ctx.stroke();
        }
      ctx.setLineDash([]);
      ctx.restore();
    });

    // Bubbles
    holders.forEach(h => {
      h.phase += h.speed;
      h.cx = h.ox + Math.cos(h.phase * 0.71) * h.amp;
      h.cy = h.oy + Math.sin(h.phase)         * h.amp;
      const [rv, gv, bv] = h.color;

      if (h.style === "hollow") {
        // ── Large hollow circle — iNSIGHTX style ──
        const strokeAlpha = h.type === "whale" ? 0.7 : h.type === "top" ? 0.5 : 0.18;
        const strokeW     = h.type === "whale" ? 1.8 : h.type === "top" ? 1.4 : 0.9;
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, h.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rv},${gv},${bv},${strokeAlpha})`;
        ctx.lineWidth   = strokeW;
        ctx.stroke();
        ctx.fillStyle   = `rgba(${rv},${gv},${bv},0.02)`;
        ctx.fill();
        // % label inside larger named holders
        if (h.r >= 17 && h.type !== "community") {
          ctx.textAlign    = "center";
          ctx.textBaseline = "middle";
          ctx.font = `${Math.max(7, Math.floor(h.r * 0.30))}px 'JetBrains Mono',monospace`;
          ctx.fillStyle = `rgba(${rv},${gv},${bv},0.65)`;
          ctx.fillText(`${h.pct.toFixed(1)}%`, h.cx, h.cy);
        }
      } else {
        // ── Small filled cluster bubble ──
        // Outer glow
        const glow = ctx.createRadialGradient(h.cx, h.cy, 0, h.cx, h.cy, h.r * 2.8);
        glow.addColorStop(0, `rgba(${rv},${gv},${bv},0.22)`);
        glow.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, h.r * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = glow; ctx.fill();
        // Solid fill
        ctx.beginPath();
        ctx.arc(h.cx, h.cy, h.r, 0, Math.PI * 2);
        ctx.fillStyle   = `rgba(${rv},${gv},${bv},0.88)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${rv},${gv},${bv},0.95)`;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }
    });

    bubbleAnimFrame = requestAnimationFrame(draw);
  }
  draw();
}

// ── Synthetic holder distribution (no real data) ─────────────
function buildSyntheticHolders(t) {
  const top10    = Math.max(1, Math.min(100, Number(t.top10Pct) || 30));
  const conc     = t.concentrationLabel || "Moderate";
  const top1Share = conc === "Extreme" ? 0.36 : conc === "Moderate" ? 0.27 : 0.21;
  const rawW     = [top1Share, 0.19, 0.13, 0.10, 0.09, 0.08, 0.06, 0.05, 0.04, 0.02];
  const wSum     = rawW.reduce((a, b) => a + b, 0);
  return rawW.map((w, i) => ({
    rank: i + 1,
    address: "",
    pct: (w / wSum) * top10,
    uiAmount: 0
  }));
}

// ── Holder detail modal (shown on bubble/row click) ───────────
function showHolderDetail(h) {
  document.getElementById("holderDetailModal")?.remove();
  const [rv, gv, bv] = h.color;
  const isCl  = h.style === "filled";
  const cStr  = `rgba(${rv},${gv},${bv},1)`;
  const label = isCl
    ? `Cluster ${String.fromCharCode(65 + h.clusterGroup)} Member`
    : h.type === "whale" ? "Whale Wallet"
    : h.type === "top"   ? "Top Holder"
    : "Holder";

  const modal = document.createElement("div");
  modal.id = "holderDetailModal";
  modal.className = "absolute inset-0 flex items-center justify-center z-20 rounded-xl";
  modal.style.background = "rgba(4,8,19,0.75)";
  modal.style.backdropFilter = "blur(4px)";
  modal.innerHTML = `
    <div class="glass-panel rounded-2xl p-5 w-60 border relative" style="border-color:rgba(${rv},${gv},${bv},0.35)">
      <button id="closeHolderModal" class="absolute top-3 right-3 text-gray-500 hover:text-gray-200 text-xl leading-none transition-colors">&times;</button>
      <div class="flex items-center gap-2.5 mb-3.5">
        <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
             style="${isCl ? `background:rgba(${rv},${gv},${bv},0.15);border:2px solid ${cStr}` : `border:2px solid ${cStr};background:transparent`}">
          <span class="text-xs font-bold" style="color:${cStr}">#${h.rank}</span>
        </div>
        <div>
          <div class="text-xs font-bold text-gray-200">${label}</div>
          <div class="text-[10px] mt-0.5" style="color:rgba(${rv},${gv},${bv},0.7)">
            ${isCl ? `Cluster ${String.fromCharCode(65 + h.clusterGroup)}` : `Rank #${h.rank}`}
          </div>
        </div>
      </div>
      <div class="text-[11px] divide-y divide-gray-800/60">
        <div class="flex justify-between py-2">
          <span class="text-gray-500">Address</span>
          <span class="font-mono text-gray-300 text-[10px] ml-2 truncate max-w-[108px]" title="${h.address}">${h.shortAddr}</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-gray-500">% of Supply</span>
          <span class="font-bold" style="color:${cStr}">${h.pct.toFixed(4)}%</span>
        </div>
        ${h.uiAmount > 0 ? `<div class="flex justify-between py-2">
          <span class="text-gray-500">Tokens</span>
          <span class="font-mono text-gray-300 text-[10px]">${h.uiAmount.toLocaleString(undefined,{maximumFractionDigits:0})}</span>
        </div>` : ""}
      </div>
      ${h.address && h.address.length > 20
        ? `<button onclick="window.open('https://solscan.io/account/${h.address}','_blank')"
                  class="w-full mt-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-90"
                  style="background:rgba(${rv},${gv},${bv},0.12);color:${cStr};border:1px solid rgba(${rv},${gv},${bv},0.3)">
             View on Solscan ↗
           </button>`
        : ""}
    </div>`;

  const container = document.getElementById("bubbleMapContainer");
  if (!container) return;
  container.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.getElementById("closeHolderModal")?.addEventListener("click", () => modal.remove());
}

// ============================================================
//  AI Analysis — race-condition-safe
// ============================================================
async function runAIAnalysis(capturedId) {
  if (!currentTokenData || capturedId !== analysisId) return;

  hide("aiAnalysisError");
  show("aiLoadingIndicator");

  try {
    // Pass the full on-chain summary so the model gets coin-specific context
    const text    = currentTokenData.summaryForAI || `${currentTokenData.name} ${currentTokenData.symbol}`;
    const summary = currentTokenData.summaryForAI;

    const [sentRes, rugRes] = await Promise.all([
      postJSON("/api/sentiment", { text }),
      postJSON("/api/rugrisk",   { summary })
    ]);

    // Always check ID before touching the DOM
    if (capturedId !== analysisId) return;

    // Sentiment
    const sentData = sentRes?.ok
      ? normalizeSentimentFromPreds(sentRes.preds, currentTokenData)
      : generateFallbackSentiment(currentTokenData);
    displaySentimentResults(sentData);
    hide("sentimentPlaceholder"); show("sentimentResult");

    if (capturedId !== analysisId) return;

    // Pattern from chart
    const patData = heuristicPatternFromChart(currentTokenData?.chart?.points || []);
    displayPatternResults(patData);
    hide("patternPlaceholder"); show("patternResult");

    if (capturedId !== analysisId) return;

    // Rug risk
    const rugData = rugRes?.ok
      ? normalizeRugRiskFromZeroShot(rugRes.data)
      : generateRugRiskFromTokenData(currentTokenData);
    displayRugPullResults(rugData);
    hide("rugPullPlaceholder"); show("rugPullResult");

    if (window.lucide?.createIcons) window.lucide.createIcons();

  } catch (e) {
    if (capturedId !== analysisId) return;
    console.warn("AI analysis error:", e);
    // Graceful fallback — always show something rather than blank panels
    try {
      displaySentimentResults(generateFallbackSentiment(currentTokenData));
      hide("sentimentPlaceholder"); show("sentimentResult");

      displayPatternResults(heuristicPatternFromChart(currentTokenData?.chart?.points || []));
      hide("patternPlaceholder"); show("patternResult");

      displayRugPullResults(generateRugRiskFromTokenData(currentTokenData));
      hide("rugPullPlaceholder"); show("rugPullResult");
    } catch {}
  } finally {
    if (capturedId === analysisId) hide("aiLoadingIndicator");
  }
}

// ── API helpers ──────────────────────────────────────────────
async function postJSON(url, body) {
  const r    = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({ ok: false }));
  if (typeof data.ok !== "boolean") data.ok = r.ok;
  return data;
}

// ── Sentiment helpers ────────────────────────────────────────
// Called only when HuggingFace returns real predictions.
// Blends model output with coin-specific on-chain context.
function normalizeSentimentFromPreds(preds = [], t) {
  const name    = typeof t === "string" ? t : (t?.name || "Token");
  const coin    = typeof t === "object" ? t : currentTokenData;
  const pos = preds.find(p => /positive|bullish/i.test(p.label))?.score || 0;
  const neu = preds.find(p => /neutral/i.test(p.label))?.score          || 0;
  const neg = preds.find(p => /negative|bearish/i.test(p.label))?.score || 0;
  const positive = Math.round(pos * 100);
  const neutral  = Math.round(neu * 100);
  const negative = Math.max(0, 100 - positive - neutral);
  const score    = Math.max(0, Math.min(100, Math.round(((pos - neg) + 1) * 50)));

  // Build coin-specific mentions rather than generic filler
  const mentions = buildSentimentMentions(coin);
  const summary  = buildSentimentSummary(coin, positive);
  return { positive, neutral, negative, score, summary, mentions };
}

// Fully data-driven fallback — used when HuggingFace is unavailable
function generateFallbackSentiment(t) {
  const change   = Number(t.priceChange24h) || 0;
  const holders  = Number(t.holders)        || 0;
  const liqPct   = Number(t.lpLockedPct)    || 0;
  const top10    = Number(t.top10Pct)       || 0;
  const mcap     = Number(t.marketCap)      || 0;
  const vol      = Number(t.volume24hUSD)   || 0;

  // Derive a positive-sentiment base from actual coin metrics
  let posBase = 50;
  // Price momentum (most direct signal)
  if      (change > 20)  posBase += 22;
  else if (change > 10)  posBase += 15;
  else if (change > 3)   posBase +=  7;
  else if (change < -20) posBase -= 22;
  else if (change < -10) posBase -= 15;
  else if (change < -3)  posBase -=  7;
  // Holder base
  if      (holders >= 100_000) posBase += 12;
  else if (holders >= 10_000)  posBase +=  7;
  else if (holders >= 1_000)   posBase +=  2;
  else if (holders < 100 && holders > 0) posBase -= 18;
  else if (holders < 500)      posBase -= 10;
  // LP security
  if      (liqPct >= 90) posBase += 10;
  else if (liqPct >= 50) posBase +=  4;
  else if (liqPct <  20) posBase -= 12;
  // Whale concentration risk
  if      (top10 >= 70) posBase -= 15;
  else if (top10 >= 50) posBase -=  8;
  else if (top10 <= 20 && top10 > 0) posBase += 8;
  // Volume health (vol/mcap)
  if (mcap > 0 && vol > 0) {
    const vm = vol / mcap;
    if (vm >= 0.02 && vm <= 0.5) posBase += 5;
    else if (vm > 1)              posBase -= 8;
    else if (vm < 0.001)          posBase -= 5;
  }

  const positive = Math.max(5, Math.min(88, Math.round(posBase)));
  const negative = Math.max(5, Math.min(80, Math.round(100 - posBase)));
  const neutral  = Math.max(0, 100 - positive - negative);
  const score    = Math.max(5, Math.min(95, Math.round(posBase)));

  return {
    positive, neutral, negative, score,
    summary:  buildSentimentSummary(t, positive),
    mentions: buildSentimentMentions(t)
  };
}

// Coin-specific summary sentence
function buildSentimentSummary(t, positive) {
  const name    = t?.name || "Token";
  const change  = Number(t?.priceChange24h) || 0;
  const holders = Number(t?.holders) || 0;
  const liqPct  = Number(t?.lpLockedPct) || 0;
  let s = `${name}: `;
  if      (change > 10) s += `strong bullish momentum (+${change.toFixed(1)}%). `;
  else if (change > 2)  s += `mild upward trend (+${change.toFixed(1)}%). `;
  else if (change < -10) s += `sharp sell-off (${change.toFixed(1)}%). `;
  else if (change < -2)  s += `slight pullback (${change.toFixed(1)}%). `;
  else                   s += `price consolidating (${change >= 0 ? "+" : ""}${change.toFixed(2)}%). `;
  if (holders >= 10_000)      s += `${(holders / 1000).toFixed(0)}k+ holders — strong network. `;
  else if (holders > 0 && holders < 200) s += `Very thin holder base (${holders}). `;
  s += liqPct >= 70 ? `LP locked ${Math.round(liqPct)}%.`
     : liqPct > 0  ? `LP lock only ${Math.round(liqPct)}% — monitor.`
     : "";
  return s.trim();
}

// Coin-specific bullet-point mentions
function buildSentimentMentions(t) {
  const change  = Number(t?.priceChange24h) || 0;
  const holders = Number(t?.holders) || 0;
  const liqPct  = Number(t?.lpLockedPct) || 0;
  const top10   = Number(t?.top10Pct) || 0;
  const vol     = Number(t?.volume24hUSD) || 0;
  const mcap    = Number(t?.marketCap) || 0;
  const mentions = [];

  // Price change
  mentions.push({
    text: Math.abs(change) < 0.5
      ? `Price flat at ${(change >= 0 ? "+" : "")}${change.toFixed(2)}% — no clear direction`
      : `${change >= 0 ? "+" : ""}${change.toFixed(2)}% price change in 24 h`,
    sentiment: change > 5 ? "positive" : change < -5 ? "negative" : "neutral"
  });

  // Holders
  mentions.push({
    text: holders >= 10_000
      ? `${holders.toLocaleString()} holders — healthy community base`
      : holders >= 500
        ? `${holders.toLocaleString()} holders — growing but thin`
        : holders > 0
          ? `Only ${holders} holders — very early / high-risk`
          : "Holder count unavailable",
    sentiment: holders >= 10_000 ? "positive" : holders < 500 ? "negative" : "neutral"
  });

  // LP lock
  mentions.push({
    text: liqPct >= 80
      ? `LP ${Math.round(liqPct)}% locked — low rug risk`
      : liqPct >= 40
        ? `LP ${Math.round(liqPct)}% locked — moderate security`
        : liqPct > 0
          ? `LP only ${Math.round(liqPct)}% locked — elevated rug risk`
          : "LP lock status unknown",
    sentiment: liqPct >= 70 ? "positive" : liqPct < 30 ? "negative" : "neutral"
  });

  return mentions;
}

function displaySentimentResults(d) {
  document.getElementById("positiveSentiment").textContent = `${d.positive}%`;
  document.getElementById("neutralSentiment").textContent  = `${d.neutral}%`;
  document.getElementById("negativeSentiment").textContent = `${d.negative}%`;
  document.getElementById("sentimentScore").textContent    = `${d.score}/100`;
  const cursor = document.getElementById("sentimentCursor");
  if (cursor) cursor.style.left = `${d.score}%`;
  document.getElementById("sentimentSummary").textContent  = d.summary;
  const me = document.getElementById("sentimentMentions");
  if (me) {
    me.innerHTML = d.mentions.map(m => `
      <div class="flex items-start gap-1.5 py-0.5">
        <span class="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${m.sentiment === "positive" ? "bg-emerald-400" : m.sentiment === "negative" ? "bg-red-400" : "bg-gray-600"}"></span>
        <p class="text-gray-500 leading-snug">${m.text}</p>
      </div>`).join("");
  }
}

// ── Pattern helpers ──────────────────────────────────────────
function heuristicPatternFromChart(points) {
  if (!points.length) return { name: "No Data", description: "No price history.", confidence: 0, trend: "Unknown", support: "--", resistance: "--", prediction: "Retry shortly." };
  const prices = points.map(p => p.price).filter(n => isFinite(n) && n > 0);
  const first  = prices[0], last = prices[prices.length - 1];
  const pct    = first ? ((last - first) / first) * 100 : 0;
  const trend  = pct > 5 ? "Bullish" : pct < -5 ? "Bearish" : "Sideways";
  const name   = trend === "Bullish" ? "Uptrend" : trend === "Bearish" ? "Downtrend" : "Consolidation";
  const confidence = Math.min(92, Math.max(40, Math.round(Math.abs(pct) * 4.5 + 42)));
  const support    = prices.length ? Math.min(...prices) : 0;
  const resistance = prices.length ? Math.max(...prices) : 0;
  return {
    name,
    description: `Based on 7-day OHLCV. ${Math.abs(pct).toFixed(1)}% ${pct >= 0 ? "gain" : "loss"} over the period.`,
    confidence, trend,
    support:    support.toPrecision(6),
    resistance: resistance.toPrecision(6),
    prediction: trend === "Bullish" ? "Positive momentum — look for pullbacks to accumulate."
      : trend === "Bearish" ? "Bearish — avoid chasing; wait for reversal confirmation."
      : "Range-bound — wait for a confirmed breakout before entering."
  };
}

function displayPatternResults(d) {
  document.getElementById("patternName").textContent        = d.name;
  document.getElementById("patternDescription").textContent = d.description;
  document.getElementById("patternConfidence").textContent  = `${d.confidence}%`;
  document.getElementById("patternPrediction").textContent  = d.prediction;
  const tr = document.getElementById("patternTrend");
  if (tr) {
    tr.textContent = d.trend;
    tr.className   = `px-2 py-0.5 rounded-full text-[10px] font-medium border ${
      d.trend === "Bullish" ? "bg-emerald-900/50 text-emerald-400 border-emerald-500/20" :
      d.trend === "Bearish" ? "bg-red-900/50 text-red-400 border-red-500/20" :
      "bg-gray-800 text-gray-400 border border-gray-700"
    }`;
  }
  document.getElementById("supportLevel").textContent    = `$${d.support}`;
  document.getElementById("resistanceLevel").textContent = `$${d.resistance}`;
}

// ── Rug risk helpers ─────────────────────────────────────────
function normalizeRugRiskFromZeroShot(z) {
  const labels = z?.labels || [], scores = z?.scores || [];
  const idx    = labels.findIndex(l => /rug|scam/i.test(String(l)));
  return generateRugPullDataFromScore(Math.round((idx >= 0 ? scores[idx] : 0.25) * 100), currentTokenData);
}

function generateRugRiskFromTokenData(t) {
  const liqPct  = Number(t.lpLockedPct)  || 0;
  const top10   = Number(t.top10Pct)     || 0;
  const holders = Number(t.holders)      || 0;
  const liq     = Number(t.liquidityUSD) || 0;

  let score = 8; // start optimistic

  // LP lock is the #1 rug indicator
  if      (liqPct === 0)  score += 38;
  else if (liqPct < 20)   score += 30;
  else if (liqPct < 50)   score += 18;
  else if (liqPct < 80)   score +=  8;
  // top-10 concentration
  if      (top10 >= 80)   score += 30;
  else if (top10 >= 60)   score += 18;
  else if (top10 >= 40)   score +=  8;
  // Holder count — very thin base = easy rug
  if      (holders > 0 && holders < 10)  score += 28;
  else if (holders < 100)                score += 18;
  else if (holders < 500)                score +=  8;
  // Authority flags
  if (t.risks?.find(r => r.name === "Mint Authority"   && r.risk)) score += 15;
  if (t.risks?.find(r => r.name === "Freeze Authority" && r.risk)) score += 10;
  // Wash trading
  if      (t.washRiskLabel === "High")   score += 12;
  else if (t.washRiskLabel === "Medium") score +=  5;
  // Tiny liquidity pool
  if      (liq > 0 && liq < 1_000)  score += 18;
  else if (liq < 10_000)             score +=  8;

  return generateRugPullDataFromScore(Math.min(95, Math.max(5, score)), t);
}

function generateRugPullDataFromScore(score, t) {
  // t is optional — if provided, use real values in indicator labels
  const tok     = t || currentTokenData || {};
  const liqPct  = Number(tok.lpLockedPct)  || 0;
  const top10   = Number(tok.top10Pct)     || 0;
  const holders = Number(tok.holders)      || 0;
  const level   = score < 30 ? "Low" : score < 60 ? "Medium" : "High";

  const lpLabel =
    liqPct >= 80 ? `${Math.round(liqPct)}% locked ✅`  :
    liqPct >= 40 ? `${Math.round(liqPct)}% locked ⚠️`  :
    liqPct >  0  ? `Only ${Math.round(liqPct)}% locked ❌` : "Unknown ⚠️";

  const holderLabel =
    top10 >= 70 ? `Top 10 hold ${top10.toFixed(1)}% ❌` :
    top10 >= 40 ? `Top 10 hold ${top10.toFixed(1)}% ⚠️` :
    top10 >  0  ? `Top 10 hold ${top10.toFixed(1)}% ✅` : "Data unavailable";

  const holderCountLabel =
    holders >= 10_000 ? `${holders.toLocaleString()} holders ✅` :
    holders >= 500    ? `${holders.toLocaleString()} holders ⚠️` :
    holders > 0       ? `Only ${holders} holders ❌` : "Unknown";

  const washLabel =
    tok.washRiskLabel === "High"   ? "Wash trading detected ❌" :
    tok.washRiskLabel === "Medium" ? "Some wash signals ⚠️"    : "Organic volume ✅";

  return {
    score, riskLevel: level,
    indicators: [
      { name: "LP Lock",         status: lpLabel,          risk: liqPct < 50 },
      { name: "Concentration",   status: holderLabel,       risk: top10 >= 50 },
      { name: "Holder Count",    status: holderCountLabel,  risk: holders < 500 },
      { name: "Volume Pattern",  status: washLabel,         risk: tok.washRiskLabel === "High" }
    ],
    flags: level === "High"
      ? [
          liqPct < 20 ? `LP barely locked (${Math.round(liqPct)}%)` : "Low LP security",
          top10 >= 60 ? `${top10.toFixed(0)}% held by top 10` : "High concentration",
          holders < 100 ? `Only ${holders} holders` : "Thin community"
        ]
      : level === "Medium"
        ? ["Monitor LP lock closely", "Use tight stop-losses"]
        : ["Relatively lower risk — DYOR always"]
  };
}

function displayRugPullResults(d) {
  const se = document.getElementById("rugPullScore");
  if (se) {
    se.textContent = d.score;
    se.className   = `text-6xl font-black mb-0.5 ${d.riskLevel === "High" ? "text-red-400 score-glow-red" : d.riskLevel === "Medium" ? "text-yellow-400 score-glow-yellow" : "text-emerald-400 score-glow-green"}`;
  }
  const ie = document.getElementById("rugPullIndicators");
  if (ie) {
    ie.innerHTML = d.indicators.map(i => `
      <div class="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2">
        <span class="text-[10px] text-gray-500">${i.name}</span>
        <span class="text-[10px] font-semibold ${i.risk ? "text-red-400" : "text-emerald-400"}">${i.status}</span>
      </div>`).join("");
  }
  const fe = document.getElementById("mlFlags");
  if (fe) fe.innerHTML = d.flags.map(f => `<span class="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-full text-[10px]">${f}</span>`).join("");

  const ve = document.getElementById("rugPullVerdict");
  const be = document.getElementById("rugPullVerdictBox");
  if (ve && be) {
    if (d.riskLevel === "High")   { ve.textContent = "⚠️ HIGH RISK: Multiple rug-like signals. Avoid large positions."; be.className = "p-3 rounded-xl border bg-red-900/15 border-red-500/25"; ve.className = "text-xs font-semibold text-center text-red-400"; }
    else if (d.riskLevel === "Medium") { ve.textContent = "⚡ MEDIUM RISK: Mixed signals — trade small, use tight stops."; be.className = "p-3 rounded-xl border bg-yellow-900/15 border-yellow-500/25"; ve.className = "text-xs font-semibold text-center text-yellow-400"; }
    else                          { ve.textContent = "✅ LOWER RISK: Fewer rug signals detected. Still DYOR."; be.className = "p-3 rounded-xl border bg-emerald-900/15 border-emerald-500/25"; ve.className = "text-xs font-semibold text-center text-emerald-400"; }
  }
}

// ============================================================
//  Reset
// ============================================================
function resetAnalysis() {
  analysisId++;  // Invalidate any in-flight analysis
  currentTokenData = null;
  if (currentChart)    { currentChart.destroy(); currentChart = null; }
  if (bubbleAnimFrame) { cancelAnimationFrame(bubbleAnimFrame); bubbleAnimFrame = null; }

  const input = document.getElementById("contractInput");
  if (input) input.value = "";
  document.getElementById("heroLoadingText").textContent = "Ready — paste a contract address above";

  hide("analysisResults");
  hide("loadingState");
  show("heroSection");

  hide("sentimentResult");  show("sentimentPlaceholder");
  hide("patternResult");    show("patternPlaceholder");
  hide("rugPullResult");    show("rugPullPlaceholder");
  hide("aiAnalysisError");
  hide("aiLoadingIndicator");

  const listEl = document.getElementById("holderList");
  if (listEl) listEl.innerHTML = "";

  setSearchStatus("idle", "");
  if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ============================================================
//  DexScreener link
// ============================================================
function viewChart() {
  if (currentTokenData?.address) window.open(`https://dexscreener.com/solana/${currentTokenData.address}`, "_blank");
}
