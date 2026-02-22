// Simple test endpoint to verify Birdeye API key works
export default async function handler(req, res) {
  try {
    const KEY = process.env.BIRDEYE_API_KEY;
    
    if (!KEY) {
      return res.status(500).json({ 
        ok: false, 
        error: "BIRDEYE_API_KEY not found in environment variables" 
      });
    }

    // Test with Solana's native token (SOL) - this should always work
    const testAddress = "So11111111111111111111111111111111111111112";
    
    const url = `https://public-api.birdeye.so/defi/token_overview?address=${testAddress}`;
    
    console.log('Testing Birdeye API with URL:', url);
    console.log('API Key (first 8 chars):', KEY.slice(0, 8));
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': KEY,
        'x-chain': 'solana',
        'accept': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response body (first 500 chars):', text.slice(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        ok: false,
        error: 'Birdeye returned non-JSON',
        status: response.status,
        body: text.slice(0, 500)
      });
    }

    return res.status(200).json({
      ok: true,
      status: response.status,
      hasData: !!data?.data,
      data: data,
      message: data?.data ? 'Birdeye API is working!' : 'Birdeye API responded but no data field'
    });

  } catch (e) {
    console.error('Test error:', e);
    return res.status(500).json({
      ok: false,
      error: e.message,
      stack: e.stack
    });
  }
}
