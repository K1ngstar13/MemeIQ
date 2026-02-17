export default async function handler(req, res) {
  try {
    const address = String(req.query.address || "").trim();
    if (!address) return res.status(400).json({ ok: false, error: "Missing address" });

    const KEY = process.env.BIRDEYE_API_KEY;
    if (!KEY) return res.status(500).json({ ok: false, error: "Missing BIRDEYE_API_KEY env var" });

    const headers = {
      "X-API-KEY": KEY,
      "accept": "application/json",
    };

    // Birdeye endpoints used:
    // - Token overview: /defi/token_overview
    // - Price/Volume: /defi/price_volume/single
    // - Security: /defi/v3/token/security
    // - Holder list: /defi/v3/token/holder
    // - Exit liquidity: /defi/v3/token/exit-liquidity
    // - Price history: /defi/history_price
    const [
      overview,
      pv,
      security,
      holders,
      liq,
      history
    ] = await Promise.all([
      bird(`https://public-api.birdeye.so/defi/token_overview?address=${encodeURIComponent(address)}`, headers),
      bird(`https://public-api.birdeye.so/defi/price_volume/single?address=${encodeURIComponent(address)}`, headers),
      bird(`https://public-api.birdeye.so/defi/v3/token/security?address=${encodeURIComponent(address)}`, headers),
      bird(`https://public-api.birdeye.so/defi/v3/token/holder?address=${encodeURIComponent(address)}&offset=0&limit=10`, headers),
      bird(`https://public-api.birdeye.so/defi/v3/token/exit-liquidity?address=${encodeURIComponent(address)}`, headers),
      bird(`https://public-api.birdeye.so/defi/history_price?address=${encodeURIComponent(address)}`, headers),
    ]);

    if (!overview?.success && !overview?.data) {
      return res.status(200).json({ ok: false, error: "Token not found (overview failed)", raw: overview });
    }

    // Normalize safest fields (Birdeye sometimes returns {success,data} or {data})
    const ov = overview?.data || overview;
    const pvData = pv?.data || pv;
    const sec = security?.data || security;
    const h = holders?.data || holders;
    const l = liq?.data || liq;
    const hist = history?.data || history;

    // Key metrics
    const price = number(pvData?.price ?? ov?.price);
    const priceChange24h = number(pvData?.priceChangePercent24h ?? ov?.priceChangePercent24h ?? pvData?.priceChange24h);

    const marketCap = number(ov?.mc ?? ov?.marketCap ?? pvData?.marketCap);
    const fdv = number(ov?.fdv ?? pvData?.fdv ?? ov?.fullyDilutedValuation);

    const volume24hUSD = number(pvData?.volume24h ?? pvData?.volume24hUSD ?? ov?.v24hUSD ?? ov?.volume24hUSD);
    const buyVol = number(pvData?.buyVolume24h);
    const sellVol = number(pvData?.sellVolume24h);
    const buySellRatio = (buyVol > 0 && sellVol > 0) ? (buyVol / sellVol) : null;

    const liquidityUSD =
      number(l?.liquidity ?? l?.totalLiquidity ?? ov?.liquidity ?? ov?.liquidityUSD);

    // Token metadata
    const name = ov?.name || ov?.tokenName || "Unknown";
    const symbol = ov?.symbol || ov?.tokenSymbol || "--";
    const logo = ov?.logoURI || ov?.logo || ov?.image || "";

    // Holders
    const holdersCount = number(ov?.holder ?? ov?.holders ?? sec?.holderCount);

    // Top10 concentration (approx): sum top 10 holder amounts / supply
    const supply = number(ov?.supply ?? ov?.totalSupply);
    const topHolders = Array.isArray(h?.items) ? h.items : (Array.isArray(h) ? h : []);
    const top10Amount = topHolders.slice(0, 10).reduce((acc, it) => acc + number(it?.amount ?? it?.uiAmount ?? it?.balance), 0);
    const top10Pct = (supply > 0 && top10Amount > 0) ? (top10Amount / supply) * 100 : null;

    // Security flags
    const mintAuth = truthy(sec?.mintAuthority) || truthy(sec?.mint_authority);
    const freezeAuth = truthy(sec?.freezeAuthority) || truthy(sec?.freeze_authority);
    const lpLockedPct = number(sec?.lpLockedPercent ?? sec?.lp_locked_percent ?? sec?.lp_locked);

    // Score heuristics (simple + transparent)
    const mcapLiqRatio = (marketCap > 0 && liquidityUSD > 0) ? marketCap / liquidityUSD : null;

    const concentrationLabel =
      top10Pct == null ? "Unknown" :
      top10Pct <= 30 ? "Healthy" :
      top10Pct <= 55 ? "Moderate" : "Extreme";

    const washRiskLabel =
      (volume24hUSD > 0 && liquidityUSD > 0 && volume24hUSD / liquidityUSD > 8) ? "High"
      : (volume24hUSD > 0 && liquidityUSD > 0 && volume24hUSD / liquidityUSD > 4) ? "Medium"
      : "Low";

    const liquidityScore = clampScore(
      scoreFrom([
        [lpLockedPct, v => v >= 90 ? 35 : v >= 70 ? 25 : v >= 40 ? 15 : 5],
        [mcapLiqRatio, v => v <= 5 ? 35 : v <= 10 ? 25 : v <= 20 ? 15 : 8],
        [liquidityUSD, v => v >= 500000 ? 30 : v >= 150000 ? 20 : v >= 50000 ? 12 : 6],
      ])
    );

    const volumeScore = clampScore(
      scoreFrom([
        [volume24hUSD, v => v >= 2000000 ? 35 : v >= 500000 ? 25 : v >= 100000 ? 18 : 10],
        [buySellRatio, v => (v >= 0.7 && v <= 1.6) ? 30 : (v >= 0.4 && v <= 2.5) ? 20 : 10],
        [washRiskLabel, v => v === "Low" ? 35 : v === "Medium" ? 20 : 10],
      ])
    );

    const holdersScore = clampScore(
      scoreFrom([
        [holdersCount, v => v >= 20000 ? 40 : v >= 5000 ? 30 : v >= 1000 ? 20 : 10],
        [top10Pct, v => v <= 30 ? 35 : v <= 55 ? 20 : 8],
        [mintAuth, v => v ? 5 : 25],       // mint auth active is bad
      ])
    );

    const overall = Math.round((liquidityScore + volumeScore + holdersScore) / 3);

    const recommendation =
      overall >= 78 && washRiskLabel !== "High" ? "BUY" :
      overall >= 58 ? "CAUTION" : "AVOID";

    const entryPrice = price;
    const exitPrice = (price && recommendation !== "AVOID") ? price * (recommendation === "BUY" ? 2.5 : 1.6) : price;

    const risks = [
      { name: "Mint Authority", status: mintAuth ? "Active 🔴" : "Revoked 🟢", risk: !!mintAuth },
      { name: "Freeze Authority", status: freezeAuth ? "Active 🔴" : "Revoked 🟢", risk: !!freezeAuth },
      { name: "LP Locked", status: isFinite(lpLockedPct) ? `${lpLockedPct.toFixed(0)}%` : "--", risk: isFinite(lpLockedPct) ? lpLockedPct < 60 : false },
      { name: "Top 10 Holders", status: top10Pct == null ? "--" : `${top10Pct.toFixed(1)}%`, risk: top10Pct != null ? top10Pct > 55 : false },
    ];

    const summary =
      recommendation === "BUY"
        ? `Healthy liquidity + volume, and acceptable concentration. Consider entry near ${price ? `$${price}` : "current price"} with disciplined risk management.`
        : recommendation === "CAUTION"
          ? `Mixed signals: monitor LP lock, holder concentration, and volume/liquidity ratio. Size smaller and use stops.`
          : `Multiple red flags: high concentration and/or risky authorities/LP. Avoid unless you fully understand the risks.`;

    // Chart points from history_price (best-effort; fallback to empty)
    const points = normalizeHistoryPoints(hist);

    const token = {
      address,
      name,
      symbol,
      logo,
      verified: !!(name && symbol && logo),
      price,
      priceChange24h,
      marketCap,
      fdv,
      volume24hUSD,
      buySellRatio,
      liquidityUSD,
      lpLockedPct,
      mcapLiqRatio,
      holders: holdersCount,
      top10Pct,
      concentrationLabel,
      washRiskLabel,
      scores: { liquidity: liquidityScore, volume: volumeScore, holders: holdersScore },
      recommendation,
      entryPrice,
      exitPrice,
      summary,
      summaryForAI: `Token: ${name} (${symbol})
Price: ${price}
24h change: ${priceChange24h}%
Market cap: ${marketCap}
FDV: ${fdv}
Liquidity USD: ${liquidityUSD}
LP locked %: ${lpLockedPct}
Top10 holders %: ${top10Pct}
Mint authority active: ${mintAuth}
Freeze authority active: ${freezeAuth}
Volume 24h USD: ${volume24hUSD}
Wash risk: ${washRiskLabel}
Classify this token as: rug pull / legitimate / high risk / safe. Return label probabilities.`,
      risks,
      chart: { points }
    };

    return res.status(200).json({ ok: true, token, raw: { overview, pv, security, holders, liq } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
}

async function bird(url, headers) {
  const r = await fetch(url, { headers });
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: "Non-JSON", raw: text.slice(0, 300) };
  }
}

function number(x) {
  const n = Number(x);
  return isFinite(n) ? n : NaN;
}

function truthy(x) {
  if (x === true) return true;
  if (x === false) return false;
  const s = String(x ?? "").toLowerCase();
  if (!s) return false;
  return ["true", "1", "yes", "active"].includes(s);
}

function clampScore(n) {
  const v = Math.round(Number(n) || 0);
  return Math.max(0, Math.min(100, v));
}

function scoreFrom(pairs) {
  let total = 0;
  for (const [val, fn] of pairs) {
    if (val === undefined || val === null) continue;
    if (!isFinite(Number(val)) && typeof val !== "string" && typeof val !== "boolean") continue;
    total += fn(val);
  }
  return total;
}

// Birdeye history_price is not always consistent across tokens.
// We do best-effort parsing and return up to 7 points.
function normalizeHistoryPoints(hist) {
  // Common shapes:
  // { data: { items: [{ unixTime, value }, ...] } }
  // { data: [{ unixTime, value }, ...] }
  const items =
    Array.isArray(hist?.items) ? hist.items :
    Array.isArray(hist?.data?.items) ? hist.data.items :
    Array.isArray(hist?.data) ? hist.data :
    Array.isArray(hist) ? hist :
    [];

  const mapped = items
    .map((it) => {
      const t = Number(it.unixTime ?? it.time ?? it.timestamp);
      const v = Number(it.value ?? it.price ?? it.close);
      const vol = Number(it.volume ?? it.volumeUSD ?? it.v);
      if (!isFinite(t) || !isFinite(v)) return null;
      const d = new Date(t * 1000);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      return { label, price: v, volume: isFinite(vol) ? vol : 0 };
    })
    .filter(Boolean);

  // keep last 7
  return mapped.slice(-7);
}
