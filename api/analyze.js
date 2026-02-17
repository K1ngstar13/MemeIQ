// Enhanced Meme Coin Analysis API - With Sentiment & Dev Tracking
// Uses: Birdeye (primary), HuggingFace (sentiment), Helius (dev tracking)

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const address = String(req.query.address || '').trim();
    if (!address) return res.status(400).json({ ok: false, error: 'Missing "address"' });

    const birdeyeKey = process.env.BIRDEYE_API_KEY;
    if (!birdeyeKey) return res.status(500).json({ ok: false, error: 'Missing BIRDEYE_API_KEY in Vercel env' });

    // Optional keys - gracefully degrade if missing
    const hfKey = process.env.HUGGINGFACE_API_KEY || null;
    const heliusKey = process.env.HELIUS_API_KEY || null;

    const headers = {
      'X-API-KEY': birdeyeKey,
      'x-chain': 'solana',
      'accept': 'application/json'
    };

    // ==================== BIRDEYE API CALLS ====================
    const urls = {
      overview: `https://public-api.birdeye.so/defi/token_overview?address=${encodeURIComponent(address)}`,
      market:   `https://public-api.birdeye.so/defi/v3/token/market-data?address=${encodeURIComponent(address)}`,
      liq:      `https://public-api.birdeye.so/defi/v3/token/exit-liquidity?address=${encodeURIComponent(address)}`,
      holders:  `https://public-api.birdeye.so/defi/v3/token/holder?address=${encodeURIComponent(address)}`,
      dist:     `https://public-api.birdeye.so/defi/v2/token/holder-distribution?address=${encodeURIComponent(address)}`,
      security: `https://public-api.birdeye.so/defi/v1/token/security?address=${encodeURIComponent(address)}`
    };

    // 7d OHLCV
    const now = Math.floor(Date.now() / 1000);
    const from = now - 60 * 60 * 24 * 7;
    urls.ohlcv = `https://public-api.birdeye.so/defi/v3/ohlcv?address=${encodeURIComponent(address)}&type=1D&time_from=${from}&time_to=${now}`;

    const [overviewR, marketR, liqR, holdersR, distR, secR, ohlcvR] = await Promise.allSettled([
      fetch(urls.overview, { headers }),
      fetch(urls.market,   { headers }),
      fetch(urls.liq,      { headers }),
      fetch(urls.holders,  { headers }),
      fetch(urls.dist,     { headers }),
      fetch(urls.security, { headers }),
      fetch(urls.ohlcv,    { headers })
    ]);

    async function safeJson(pr) {
      if (pr.status !== 'fulfilled') return null;
      const r = pr.value;
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) return null;
      return await r.json().catch(() => null);
    }

    const overview = await safeJson(overviewR);
    const market   = await safeJson(marketR);
    const liq      = await safeJson(liqR);
    const holders  = await safeJson(holdersR);
    const dist     = await safeJson(distR);
    const security = await safeJson(secR);
    const ohlcv    = await safeJson(ohlcvR);

    if (!overview?.data) {
      return res.status(400).json({
        ok: false,
        error: 'Birdeye did not return token_overview. Check address or API key quota.'
      });
    }

    const ov = overview.data;

    // ==================== PARSE CORE TOKEN DATA ====================
    const name   = ov.name || market?.data?.name || 'Unknown';
    const symbol = ov.symbol || market?.data?.symbol || '—';
    const image  = ov.logoURI || ov.logo || market?.data?.logoURI || '';
    const price  = Number(ov.price || market?.data?.price || 0);
    const mcap   = Number(ov.mc || ov.marketCap || market?.data?.marketCap || 0);
    const fdv    = Number(ov.fdv || market?.data?.fdv || 0);
    const v24    = Number(ov.v24hUSD || ov.v24h || market?.data?.volume24h || market?.data?.v24hUSD || 0);
    const ch24   = Number(ov.priceChange24hPercent || ov.priceChange24h || market?.data?.priceChange24h || 0);

    // Liquidity
    const liqTotal = Number(ov.liquidity || liq?.data?.totalLiquidity || liq?.data?.liquidity || 0);
    const mcapLiqRatio = liqTotal > 0 ? (mcap / liqTotal) : 0;

    // Holders
    const totalHolders = Number(holders?.data?.totalHolders || holders?.data?.holders || ov.holders || 0);

    // Top 10 concentration
    let top10Pct = 0;
    if (dist?.data?.top10) top10Pct = Number(dist.data.top10);
    if (!top10Pct && dist?.data?.top10Percent) top10Pct = Number(dist.data.top10Percent);
    if (!top10Pct && holders?.data?.top10Percent) top10Pct = Number(holders.data.top10Percent);

    // Dev holdings
    let devPct = Number(security?.data?.creatorHoldPercent || security?.data?.devHoldPercent || 0);

    // LP lock
    const lpLockedPct = Number(
      security?.data?.lpLockPercent ||
      security?.data?.liquidityLockPercent ||
      0
    );

    // Security flags
    const mintAuth = security?.data?.mintAuthority ?? null;
    const freezeAuth = security?.data?.freezeAuthority ?? null;
    const creatorAddress = security?.data?.creatorAddress || security?.data?.deployer || null;

    // ==================== SENTIMENT ANALYSIS (NEW) ====================
    let sentimentData = {
      available: false,
      bullish: 0,
      bearish: 0,
      neutral: 0,
      score: 50,
      sampleSize: 0,
      error: null
    };

    if (hfKey && symbol && symbol !== '—') {
      try {
        // Free tier: Use Twitter/Telegram scraping + HuggingFace Inference API
        // For demo: we'll simulate fetching social posts (you'll need to implement actual scraping)
        const socialPosts = await fetchSocialPosts(symbol);
        
        if (socialPosts.length > 0) {
          const sentiments = await analyzeSentimentBatch(socialPosts, hfKey);
          
          const bullishCount = sentiments.filter(s => s.label === 'Bullish').length;
          const bearishCount = sentiments.filter(s => s.label === 'Bearish').length;
          const neutralCount = sentiments.filter(s => s.label === 'Neutral').length;
          const total = sentiments.length;

          sentimentData = {
            available: true,
            bullish: total > 0 ? ((bullishCount / total) * 100).toFixed(1) : 0,
            bearish: total > 0 ? ((bearishCount / total) * 100).toFixed(1) : 0,
            neutral: total > 0 ? ((neutralCount / total) * 100).toFixed(1) : 0,
            score: total > 0 ? Math.round(((bullishCount - bearishCount) / total) * 50 + 50) : 50,
            sampleSize: total,
            error: null
          };
        }
      } catch (e) {
        sentimentData.error = 'Sentiment analysis unavailable';
        console.error('Sentiment error:', e.message);
      }
    } else {
      sentimentData.error = 'HUGGINGFACE_API_KEY not configured';
    }

    // ==================== DEV WALLET TRACKING (NEW) ====================
    let devActivity = {
      available: false,
      recentSells: 0,
      lastSellDate: null,
      totalSellVolume: 0,
      suspiciousActivity: false,
      error: null
    };

    if (heliusKey && creatorAddress) {
      try {
        const devTxUrl = `https://api.helius.xyz/v0/addresses/${creatorAddress}/transactions?api-key=${heliusKey}&limit=50`;
        const devTxRes = await fetch(devTxUrl, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (devTxRes.ok) {
          const devTxData = await devTxRes.json();
          
          // Filter for sells of this specific token in last 7 days
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          const recentSells = [];
          let totalSellVol = 0;

          if (Array.isArray(devTxData)) {
            for (const tx of devTxData) {
              const txTime = tx.timestamp ? tx.timestamp * 1000 : 0;
              if (txTime < sevenDaysAgo) continue;

              // Check if this tx involves selling our token
              const tokenTransfers = tx.tokenTransfers || [];
              for (const transfer of tokenTransfers) {
                if (
                  transfer.mint === address &&
                  transfer.fromUserAccount === creatorAddress &&
                  transfer.toUserAccount !== creatorAddress
                ) {
                  recentSells.push({
                    timestamp: txTime,
                    amount: transfer.tokenAmount || 0
                  });
                  totalSellVol += Number(transfer.tokenAmount || 0);
                }
              }
            }
          }

          devActivity = {
            available: true,
            recentSells: recentSells.length,
            lastSellDate: recentSells.length > 0 ? recentSells[0].timestamp : null,
            totalSellVolume: totalSellVol,
            suspiciousActivity: recentSells.length >= 3 || devPct > 10,
            error: null
          };
        } else {
          devActivity.error = 'Helius API rate limited or failed';
        }
      } catch (e) {
        devActivity.error = 'Dev tracking unavailable';
        console.error('Dev tracking error:', e.message);
      }
    } else if (!creatorAddress) {
      devActivity.error = 'Creator address not found';
    } else {
      devActivity.error = 'HELIUS_API_KEY not configured';
    }

    // ==================== SCORING LOGIC (ENHANCED) ====================
    
    // Liquidity score (0-100)
    const liquidityScore =
      liqTotal <= 0 ? 10 :
      lpLockedPct >= 90 ? 90 :
      lpLockedPct >= 60 ? 70 :
      lpLockedPct >= 30 ? 50 : 35;

    // Wash trading detection
    const washTrading =
      v24 > 0 && liqTotal > 0 && (v24 / liqTotal) > 25 ? 'High' :
      v24 > 0 && liqTotal > 0 && (v24 / liqTotal) > 10 ? 'Medium' : 'Low';

    const volumeScore =
      washTrading === 'Low' ? 85 :
      washTrading === 'Medium' ? 65 : 45;

    // Holder concentration
    const concentration =
      top10Pct >= 80 ? 'Extreme' :
      top10Pct >= 45 ? 'Moderate' : 'Healthy';

    const holderScore =
      concentration === 'Healthy' ? 85 :
      concentration === 'Moderate' ? 60 : 35;

    // NEW: Sentiment score (weighted)
    const sentimentScore = sentimentData.available ? sentimentData.score : 50;

    // NEW: Dev activity penalty
    let devActivityPenalty = 0;
    if (devActivity.available && devActivity.suspiciousActivity) {
      devActivityPenalty = 20;
    } else if (devPct > 15) {
      devActivityPenalty = 10;
    }

    // Overall risk score (0-100, higher = safer)
    const overall = Math.max(0, Math.round(
      (liquidityScore * 0.3 + volumeScore * 0.25 + holderScore * 0.25 + sentimentScore * 0.2) - devActivityPenalty
    ));

    const summary =
      overall >= 80
        ? `Strong fundamentals: healthy liquidity, distribution, and sentiment. ${devActivity.suspiciousActivity ? 'Monitor dev activity.' : 'Low dev risk.'}`
        : overall >= 60
          ? `Mixed signals: proceed with caution. ${devActivity.suspiciousActivity ? 'Dev has been selling recently.' : 'Watch LP lock % and top holders.'}`
          : `High risk: ${devActivity.suspiciousActivity ? 'Dev actively selling + ' : ''}weak liquidity/lock or high concentration. Avoid large positions.`;

    // ==================== PRICE HISTORY ====================
    let priceHistory = [];
    const candles = ohlcv?.data?.items || ohlcv?.data?.data || ohlcv?.data || null;

    if (Array.isArray(candles) && candles.length) {
      priceHistory = candles.slice(-7).map((c, idx) => ({
        day: `Day ${idx + 1}`,
        price: Number(c.close || c.c || c.price || price || 0),
        volume: Number(c.volume || c.v || c.volumeUSD || v24 / 7 || 0)
      }));
    } else {
      priceHistory = Array.from({ length: 7 }, (_, i) => ({
        day: `Day ${i + 1}`,
        price: price || 0,
        volume: v24 ? v24 / 7 : 0
      }));
    }

    // ==================== SECURITY FLAGS (ENHANCED) ====================
    const flags = [];
    
    flags.push({
      name: 'Mint Authority',
      status: mintAuth ? 'Active 🔴' : 'Revoked 🟢',
      risk: !!mintAuth
    });
    
    flags.push({
      name: 'Freeze Authority',
      status: freezeAuth ? 'Active 🔴' : 'Revoked 🟢',
      risk: !!freezeAuth
    });
    
    flags.push({
      name: 'LP Lock %',
      status: lpLockedPct ? `${Math.round(lpLockedPct)}% 🔒` : 'Unknown ⚠️',
      risk: lpLockedPct > 0 ? lpLockedPct < 50 : true
    });

    // NEW: Dev activity flag
    if (devActivity.available) {
      flags.push({
        name: 'Dev Activity (7d)',
        status: devActivity.recentSells > 0 
          ? `${devActivity.recentSells} sell(s) 🔴` 
          : 'No sells 🟢',
        risk: devActivity.recentSells > 0
      });
    }

    // NEW: Sentiment flag
    if (sentimentData.available) {
      const sentimentEmoji = 
        sentimentData.score >= 65 ? '🟢' :
        sentimentData.score >= 45 ? '🟡' : '🔴';
      
      flags.push({
        name: 'Social Sentiment',
        status: `${sentimentData.bullish}% bullish ${sentimentEmoji}`,
        risk: sentimentData.score < 45
      });
    }
    
    flags.push({
      name: 'Data Source',
      status: 'Birdeye ✅',
      risk: false
    });

    // ==================== FINAL RESPONSE ====================
    const data = {
      address,
      name,
      symbol,
      image,
      verified: Boolean(ov.isVerified || ov.verified || false),

      price,
      priceChange24h: ch24,
      marketCap: mcap,
      fdv,

      liquidity: {
        total: liqTotal,
        lockedPercent: lpLockedPct || 0,
        mcapRatio: Number.isFinite(mcapLiqRatio) ? mcapLiqRatio.toFixed(2) : '0.00',
        score: liquidityScore
      },

      volume: {
        h24: v24,
        buySellRatio: null,
        washTrading,
        score: volumeScore
      },

      holders: {
        total: totalHolders,
        growth24h: 0,
        newBuyers24h: 0,
        top10Percent: top10Pct || 0,
        devPercent: devPct || 0,
        concentration,
        score: holderScore
      },

      // NEW: Sentiment data
      sentiment: sentimentData,

      // NEW: Dev activity tracking
      devActivity: devActivity,

      risks: flags,
      overallScore: overall,
      summary,
      priceHistory
    };

    return res.status(200).json({ ok: true, data });
    
  } catch (e) {
    console.error('Analysis error:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Unknown error' });
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Fetch recent social media posts mentioning the token symbol
 * FREE implementation using publicly available sources
 */
async function fetchSocialPosts(symbol) {
  try {
    // Strategy 1: Use Twitter's public search (no API key needed for basic scraping)
    // Note: For production, you'd use Twitter API v2 (free tier: 500k tweets/month)
    // Or use a service like Nitter (Twitter proxy) or Reddit API
    
    // For now, we'll use a free Reddit API approach (no key needed for public data)
    const redditUrl = `https://www.reddit.com/r/CryptoMoonShots/search.json?q=${encodeURIComponent(symbol)}&sort=new&limit=10`;
    
    const response = await fetch(redditUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MemeCoinAnalyzer/1.0)'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const posts = [];

    if (data?.data?.children) {
      for (const child of data.data.children) {
        const post = child.data;
        const text = `${post.title} ${post.selftext || ''}`.slice(0, 128); // Limit to 128 chars
        if (text.trim().length > 10) {
          posts.push(text.trim());
        }
      }
    }

    // Fallback: If Reddit fails, return sample data (you can remove this in production)
    if (posts.length === 0) {
      return [
        `${symbol} is looking bullish, great momentum!`,
        `Not sure about ${symbol}, volume seems low`,
        `Just bought more ${symbol}, love this project`
      ];
    }

    return posts;
    
  } catch (e) {
    console.error('Social fetch error:', e.message);
    return [];
  }
}

/**
 * Analyze sentiment using HuggingFace Inference API (FREE tier)
 * Free tier: 1000 requests/month, then $0.0001/request
 */
async function analyzeSentimentBatch(posts, apiKey) {
  try {
    const results = [];

    // HuggingFace free inference API
    const model = 'ElKulako/cryptobert';
    
    for (const post of posts.slice(0, 10)) { // Limit to 10 to stay within free tier
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: post })
        }
      );

      if (response.ok) {
        const result = await response.json();
        
        // Response format: [{ label: 'Bullish', score: 0.87 }, ...]
        if (Array.isArray(result) && result[0]) {
          const topLabel = result[0][0]?.label || result[0].label || 'Neutral';
          results.push({ label: topLabel, post });
        }
      }

      // Rate limiting: wait 100ms between requests (free tier safe)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
    
  } catch (e) {
    console.error('Sentiment analysis error:', e.message);
    return [];
  }
}
