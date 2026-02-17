// DEBUG VERSION - Enhanced error logging
// Place this temporarily to see what's failing

export default async function handler(req, res) {
  try {
    console.log('=== ANALYZE DEBUG START ===');
    
    if (req.method !== 'GET') {
      console.log('Error: Wrong method:', req.method);
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const address = String(req.query.address || '').trim();
    console.log('Address:', address);
    
    if (!address) {
      console.log('Error: No address provided');
      return res.status(400).json({ ok: false, error: 'Missing "address"' });
    }

    const birdeyeKey = process.env.BIRDEYE_API_KEY;
    console.log('Birdeye key exists:', !!birdeyeKey);
    console.log('Birdeye key length:', birdeyeKey?.length || 0);
    
    if (!birdeyeKey) {
      console.log('Error: BIRDEYE_API_KEY not set');
      return res.status(500).json({ ok: false, error: 'Missing BIRDEYE_API_KEY in Vercel env' });
    }

    const headers = {
      'X-API-KEY': birdeyeKey,
      'x-chain': 'solana',
      'accept': 'application/json'
    };

    const overviewUrl = `https://public-api.birdeye.so/defi/token_overview?address=${encodeURIComponent(address)}`;
    console.log('Calling Birdeye URL:', overviewUrl);

    const overviewResponse = await fetch(overviewUrl, { headers });
    console.log('Birdeye response status:', overviewResponse.status);
    console.log('Birdeye response headers:', Object.fromEntries(overviewResponse.headers.entries()));

    const responseText = await overviewResponse.text();
    console.log('Birdeye response body (first 500 chars):', responseText.slice(0, 500));

    let overview;
    try {
      overview = JSON.parse(responseText);
    } catch (e) {
      console.log('Error: Failed to parse JSON:', e.message);
      return res.status(500).json({ 
        ok: false, 
        error: 'Birdeye returned invalid JSON',
        details: responseText.slice(0, 200)
      });
    }

    console.log('Parsed overview:', JSON.stringify(overview).slice(0, 500));

    if (!overview?.data) {
      console.log('Error: No overview.data');
      console.log('Overview keys:', Object.keys(overview || {}));
      return res.status(400).json({
        ok: false,
        error: 'Birdeye did not return token_overview',
        birdeyeResponse: overview
      });
    }

    console.log('Success! Token:', overview.data.name);

    // Return minimal success response for testing
    return res.status(200).json({
      ok: true,
      token: {
        address,
        name: overview.data.name || 'Unknown',
        symbol: overview.data.symbol || '?',
        logo: overview.data.logoURI || '',
        verified: Boolean(overview.data.verified),
        price: Number(overview.data.price || 0),
        priceChange24h: Number(overview.data.priceChange24hPercent || 0),
        marketCap: Number(overview.data.mc || 0),
        fdv: Number(overview.data.fdv || 0),
        liquidityUSD: Number(overview.data.liquidity || 0),
        lpLockedPct: 0,
        mcapLiqRatio: '0.00',
        volume24hUSD: Number(overview.data.v24hUSD || 0),
        buySellRatio: null,
        washRiskLabel: 'Unknown',
        holders: 0,
        top10Pct: 0,
        concentrationLabel: 'Unknown',
        scores: {
          liquidity: 50,
          volume: 50,
          holders: 50,
          overall: 50
        },
        chart: {
          points: []
        },
        recommendation: 'CAUTION',
        entryPrice: Number(overview.data.price || 0) * 0.95,
        exitPrice: Number(overview.data.price || 0) * 1.15,
        summary: 'Debug mode - minimal data returned',
        risks: [
          { name: 'Debug Mode', status: 'Active', risk: false }
        ],
        sentiment: {
          available: false,
          error: 'Debug mode'
        },
        devActivity: {
          available: false,
          error: 'Debug mode'
        },
        summaryForAI: 'Debug mode'
      }
    });

  } catch (e) {
    console.error('=== ANALYZE ERROR ===');
    console.error('Error name:', e.name);
    console.error('Error message:', e.message);
    console.error('Error stack:', e.stack);
    
    return res.status(500).json({ 
      ok: false, 
      error: e.message || 'Unknown error',
      errorName: e.name,
      errorStack: e.stack?.split('\n').slice(0, 3).join('\n')
    });
  }
}
