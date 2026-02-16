let currentChart = null;
let currentTokenData = null;

// Initialize Lucide icons when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
    
    // Enter key support for search
    document.getElementById('contractInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            analyzeContract();
        }
    });
});

// Example data loader
function loadExample(type) {
    const examples = {
        bonk: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        pepe: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        shiba: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
    };
    document.getElementById('contractInput').value = examples[type] || '';
}

// Reset analysis
document.getElementById('loadingState').classList.add('hidden');

function resetAnalysis() {
    document.getElementById('searchSection').classList.remove('hidden');
    document.getElementById('analysisResults').classList.add('hidden');
    document.getElementById('contractInput').value = '';
    
    // Reset AI analysis sections
    document.getElementById('sentimentResult').classList.add('hidden');
    document.getElementById('sentimentPlaceholder').classList.remove('hidden');
    document.getElementById('patternResult').classList.add('hidden');
    document.getElementById('patternPlaceholder').classList.remove('hidden');
    document.getElementById('rugPullResult').classList.add('hidden');
    document.getElementById('rugPullPlaceholder').classList.remove('hidden');
    document.getElementById('aiAnalysisError').classList.add('hidden');
    
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
    currentTokenData = null;
}

// Copy to clipboard
function copyToClipboard(textOrEl) {
    let toCopy = '';

    if (typeof textOrEl === 'string') {
        toCopy = textOrEl.replace('Address: ', '');
    } else {
        toCopy = textOrEl.dataset.fullAddress || textOrEl.textContent.replace('Address: ', '');
    }

    navigator.clipboard.writeText(toCopy);
    showToast('Address copied to clipboard!');
}


// Show toast notification
function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Main analysis function
async function analyzeContract() {
    const input = document.getElementById('contractInput').value.trim();
    if (!input) {
        showToast('Please enter a contract address');
        return;
    }

    // Show loading
    document.getElementById('searchSection').classList.add('hidden');
    document.getElementById('loadingState').classList.remove('hidden');
    
    // Simulate API steps
    const steps = [
        'Connecting to Solana RPC...',
        'Fetching token metadata...',
        'Analyzing liquidity pools...',
        'Scanning holder distribution...',
        'Detecting wash trading patterns...',
        'Calculating risk metrics...'
    ];

    for (let i = 0; i < steps.length; i++) {
        document.getElementById('loadingStep').textContent = steps[i];
        await new Promise(r => setTimeout(r, 400));
    }

    // Generate mock analysis data (replace with real API calls)
    currentTokenData = generateMockAnalysis(input);
    
    // Display results
    displayResults(currentTokenData);
    
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('analysisResults').classList.remove('hidden');
    
    // Initialize chart
    initChart(currentTokenData.priceHistory);
    
    // Refresh icons
    lucide.createIcons();
    
    // Scroll to results
    document.getElementById('analysisResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Generate realistic mock analysis data
function generateMockAnalysis(address) {
    // Deterministic random based on address for demo consistency
    const seed = address.length + parseInt(address.slice(-4), 36) || 1;
    const isHighRisk = seed % 3 === 0;
    const isMediumRisk = seed % 3 === 1;
    
    return {
        name: isHighRisk ? 'MOONSHOT' : isMediumRisk ? 'SafeMoon' : 'PEPEzilla',
        symbol: isHighRisk ? 'MOON' : isMediumRisk ? 'SAFE' : 'PEPEZ',
        address: address,
        image: `https://static.photos/technology/200x200/${seed % 999}`,
        verified: !isHighRisk,
        price: (Math.random() * 0.001).toFixed(10),
        priceChange24h: (Math.random() * 100 - 30).toFixed(2),
        marketCap: Math.floor(Math.random() * 10000000),
        fdv: Math.floor(Math.random() * 20000000),
        
        // Liquidity metrics (A)
        liquidity: {
            total: Math.floor(Math.random() * 500000) + 10000,
            lockedPercent: isHighRisk ? 20 : isMediumRisk ? 65 : 95,
            mcapRatio: (Math.random() * 10 + 1).toFixed(1),
            score: isHighRisk ? 35 : isMediumRisk ? 65 : 90
        },
        
        // Volume metrics (B)
        volume: {
            h24: Math.floor(Math.random() * 2000000),
            buySellRatio: (Math.random() * 3 + 0.5).toFixed(2),
            washTrading: isHighRisk ? 'High Risk' : isMediumRisk ? 'Medium' : 'Low',
            score: isHighRisk ? 40 : isMediumRisk ? 70 : 85
        },
        
        // Holder metrics (C)
        holders: {
            total: Math.floor(Math.random() * 5000) + 100,
            growth24h: (Math.random() * 50 - 10).toFixed(1),
            newBuyers24h: Math.floor(Math.random() * 500),
            top10Percent: isHighRisk ? 85 : isMediumRisk ? 45 : 25,
            devPercent: isHighRisk ? 25 : isMediumRisk ? 8 : 2,
            concentration: isHighRisk ? 'Extreme' : isMediumRisk ? 'Moderate' : 'Healthy',
            score: isHighRisk ? 25 : isMediumRisk ? 60 : 88
        },
        
        // Recommendation
        recommendation: isHighRisk ? 'AVOID' : isMediumRisk ? 'CAUTION' : 'BUY',
        entryPrice: (Math.random() * 0.0005).toFixed(8),
        exitPrice: (Math.random() * 0.002).toFixed(8),
        
        // Risk flags
        risks: [
            { name: 'Mint Authority', status: isHighRisk ? 'Active 🔴' : 'Revoked 🟢', risk: isHighRisk },
            { name: 'Freeze Authority', status: isHighRisk ? 'Active 🔴' : 'Revoked 🟢', risk: isHighRisk },
            { name: 'LP Tokens', status: isHighRisk ? 'Unlocked 🔴' : 'Burned/Locked 🟢', risk: isHighRisk },
            { name: 'Contract Verified', status: 'Yes 🟢', risk: false }
        ],
        
        // Price history for chart
        priceHistory: Array.from({length: 7}, (_, i) => ({
            day: `Day ${i + 1}`,
            volume: Math.floor(Math.random() * 1000000),
            price: Math.random() * 0.001 * (1 + i * 0.1)
        }))
    };
}

// Display analysis results
function displayResults(data) {
    // Basic info
    document.getElementById('tokenName').textContent = data.name;
    document.getElementById('tokenSymbol').textContent = data.symbol;
    document.getElementById('tokenImage').src = data.image;
    const caEl = document.getElementById('contractAddress');
caEl.textContent = `Address: ${data.address.slice(0, 8)}...${data.address.slice(-8)}`;
caEl.dataset.fullAddress = data.address;

    
    const verifiedBadge = document.getElementById('verifiedBadge');
    if (data.verified) {
        verifiedBadge.classList.remove('hidden');
    } else {
        verifiedBadge.classList.add('hidden');
    }

    // Price
    document.getElementById('currentPrice').textContent = `$${data.price}`;
    const priceChange = parseFloat(data.priceChange24h);
    const priceChangeEl = document.getElementById('priceChange');
    priceChangeEl.textContent = `${priceChange > 0 ? '+' : ''}${priceChange}%`;
    priceChangeEl.className = `text-sm font-medium ${priceChange > 0 ? 'text-green-400' : 'text-red-400'}`;
    
    document.getElementById('marketCap').textContent = `$${data.marketCap.toLocaleString()}`;
    document.getElementById('fdv').textContent = `$${data.fdv.toLocaleString()}`;

    // Liquidity (A)
    document.getElementById('liquidityScore').textContent = `${data.liquidity.score}/100`;
    document.getElementById('totalLiquidity').textContent = `$${data.liquidity.total.toLocaleString()}`;
    document.getElementById('lpLocked').textContent = `${data.liquidity.lockedPercent}%`;
    document.getElementById('mcapLiqRatio').textContent = `${data.liquidity.mcapRatio}x`;
    document.getElementById('liquidityBar').style.width = `${data.liquidity.score}%`;
    document.getElementById('liquidityBar').className = `h-2 rounded-full transition-all duration-1000 ${data.liquidity.score > 70 ? 'bg-green-500' : data.liquidity.score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`;

    // Volume (B)
    document.getElementById('volumeScore').textContent = `${data.volume.score}/100`;
    document.getElementById('volume24h').textContent = `$${data.volume.h24.toLocaleString()}`;
    document.getElementById('buySellRatio').textContent = `${data.volume.buySellRatio}:1`;
    const washRiskEl = document.getElementById('washTradingRisk');
    washRiskEl.textContent = data.volume.washTrading;
    washRiskEl.className = `text-xs px-2 py-1 rounded ${data.volume.washTrading === 'Low' ? 'bg-green-900/50 text-green-400' : data.volume.washTrading === 'Medium' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`;
    document.getElementById('volumeBar').style.width = `${data.volume.score}%`;

    // Holders (C)
    document.getElementById('holderScore').textContent = `${data.holders.score}/100`;
    document.getElementById('totalHolders').textContent = data.holders.total.toLocaleString();
    document.getElementById('holderGrowth').textContent = `${data.holders.growth24h > 0 ? '+' : ''}${data.holders.growth24h}%`;
    document.getElementById('newBuyers24h').textContent = data.holders.newBuyers24h;
    document.getElementById('top10Holders').textContent = `${data.holders.top10Percent}%`;
    document.getElementById('devWallet').textContent = `${data.holders.devPercent}%`;
    const concRiskEl = document.getElementById('concentrationRisk');
    concRiskEl.textContent = data.holders.concentration;
    concRiskEl.className = `text-xs px-2 py-1 rounded ${data.holders.concentration === 'Healthy' ? 'bg-green-900/50 text-green-400' : data.holders.concentration === 'Moderate' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`;

    // Overall Score
    const overallScore = Math.round((data.liquidity.score + data.volume.score + data.holders.score) / 3);
    const scoreEl = document.getElementById('overallScore');
    scoreEl.textContent = overallScore;
    scoreEl.className = `text-3xl font-bold ${overallScore > 75 ? 'text-green-400' : overallScore > 50 ? 'text-yellow-400' : 'text-red-400'}`;
    
    const ratingEl = document.getElementById('overallRating');
    if (overallScore >= 80) {
        ratingEl.textContent = 'STRONG BUY';
        ratingEl.className = 'px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30';
    } else if (overallScore >= 60) {
        ratingEl.textContent = 'MODERATE';
        ratingEl.className = 'px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    } else {
        ratingEl.textContent = 'HIGH RISK';
        ratingEl.className = 'px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30';
    }

    // Recommendation
    const recBadge = document.getElementById('recommendationBadge');
    recBadge.textContent = data.recommendation;
    if (data.recommendation === 'BUY') {
        recBadge.className = 'px-4 py-2 rounded-full text-sm font-bold bg-green-500 text-white';
    } else if (data.recommendation === 'CAUTION') {
        recBadge.className = 'px-4 py-2 rounded-full text-sm font-bold bg-yellow-500 text-gray-900';
    } else {
        recBadge.className = 'px-4 py-2 rounded-full text-sm font-bold bg-red-500 text-white';
    }

    document.getElementById('entryPrice').textContent = `$${data.entryPrice}`;
    document.getElementById('exitPrice').textContent = `$${data.exitPrice}`;

    // Analysis Summary
    const summaries = {
        'BUY': `Strong fundamentals detected. Healthy liquidity ratio (${data.liquidity.mcapRatio}x), growing holder base (+${data.holders.growth24h}%), and low concentration risk. Recommended entry near $${data.entryPrice} with target at $${data.exitPrice} (3-5x potential).`,
        'CAUTION': `Mixed signals detected. Moderate liquidity and average volume quality. Holder distribution shows some concentration (${data.holders.top10Percent}% top 10). Consider small position size and tight stops.`,
        'AVOID': `Multiple red flags detected. Low liquidity locking (${data.liquidity.lockedPercent}%), high dev wallet concentration (${data.holders.devPercent}%), and suspicious volume patterns. High risk of rug pull.`
    };
    document.getElementById('analysisSummary').textContent = summaries[data.recommendation];

    // Risk Grid
    const riskGrid = document.getElementById('riskGrid');
    riskGrid.innerHTML = data.risks.map(risk => `
        <div class="bg-gray-800/50 rounded-lg p-4 border ${risk.risk ? 'border-red-500/30 bg-red-900/10' : 'border-green-500/30 bg-green-900/10'}">
            <p class="text-xs text-gray-500 mb-1">${risk.name}</p>
            <p class="font-semibold ${risk.risk ? 'text-red-400' : 'text-green-400'}">${risk.status}</p>
        </div>
    `).join('');
}

// Initialize Chart
function initChart(historyData) {
    const ctx = document.getElementById('volumeChart').getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: historyData.map(d => d.day),
            datasets: [{
                label: 'Price (USD)',
                data: historyData.map(d => d.price),
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                yAxisID: 'y',
                tension: 0.4,
                fill: true
            }, {
                label: 'Volume',
                data: historyData.map(d => d.volume),
                type: 'bar',
                backgroundColor: 'rgba(139, 92, 246, 0.5)',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: { color: 'rgb(156, 163, 175)' }
                }
            },
            scales: {
                x: {
                    ticks: { color: 'rgb(156, 163, 175)' },
                    grid: { color: 'rgba(75, 85, 99, 0.3)' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: { color: 'rgb(156, 163, 175)' },
                    grid: { color: 'rgba(75, 85, 99, 0.3)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: { display: false },
                    grid: { display: false }
                }
            }
        }
    });
}

// Set alert (mock)
function setAlert() {
    showToast('Price alert set! (Demo feature)');
}

// View chart (mock)
function viewChart() {
    window.open('https://dexscreener.com/solana', '_blank');
}

// ==========================================
// HUGGING FACE AI ANALYSIS INTEGRATION
// ==========================================

// ==========================================
// AI ANALYSIS (VERCEL /api PROXY) — NO KEYS IN BROWSER
// ==========================================
// Uses SAME-DOMAIN endpoints on Vercel:
//   POST /api/sentiment
//   POST /api/chart-vision
//   POST /api/rugrisk

async function runAIAnalysis() {
    if (!currentTokenData) {
        showToast('Please analyze a token first');
        return;
    }

    // Clear the key input (we don't use it in browser anymore)
    const keyInput = document.getElementById('hfApiKey');
    if (keyInput) keyInput.value = '';

    // Reset UI + show loading
    document.getElementById('sentimentPlaceholder').classList.add('hidden');
    document.getElementById('patternPlaceholder').classList.add('hidden');
    document.getElementById('rugPullPlaceholder').classList.add('hidden');

    document.getElementById('sentimentResult').classList.add('hidden');
    document.getElementById('patternResult').classList.add('hidden');
    document.getElementById('rugPullResult').classList.add('hidden');

    document.getElementById('sentimentLoading').classList.remove('hidden');
    document.getElementById('patternLoading').classList.remove('hidden');
    document.getElementById('rugPullLoading').classList.remove('hidden');

    document.getElementById('aiAnalysisError').classList.add('hidden');

    try {
        const tokenName = document.getElementById('tokenName').textContent.trim();
        const tokenSymbol = document.getElementById('tokenSymbol').textContent.trim();

        const sentimentText = `${tokenName} ${tokenSymbol} crypto token price analysis`;
        const summary = buildRiskSummary(tokenName, tokenSymbol);

        const canvas = document.getElementById('volumeChart');
        const imageDataUrl = canvas ? canvas.toDataURL('image/png') : null;

        const [sentimentRes, patternRes, rugRes] = await Promise.allSettled([
  postJSON('/api/sentiment', { text: sentimentText }),
  imageDataUrl ? postJSON('/api/chart-vision', { imageDataUrl }) : Promise.resolve({ ok: false }),
  postJSON('/api/rugrisk', { summary })
]);


        // ----- Sentiment -----
        if (sentimentRes.status === 'fulfilled' && sentimentRes.value?.ok) {
            const sentimentData = normalizeSentimentFromPreds(sentimentRes.value.preds, tokenName);
            displaySentimentResults(sentimentData);
            document.getElementById('sentimentResult').classList.remove('hidden');
        } else {
            document.getElementById('sentimentPlaceholder').classList.remove('hidden');
        }

        // ----- Pattern (vision placeholder) -----
        if (patternRes.status === 'fulfilled' && patternRes.value?.ok) {
            const patternData = normalizePatternFromVision(patternRes.value.data);
            displayPatternResults(patternData);
            document.getElementById('patternResult').classList.remove('hidden');
        } else {
            const patternData = generateMockPatternData();
            displayPatternResults(patternData);
            document.getElementById('patternResult').classList.remove('hidden');
        }

        // ----- Rug risk -----
        if (rugRes.status === 'fulfilled' && rugRes.value?.ok) {
            const riskData = normalizeRugRiskFromZeroShot(rugRes.value.data);
            displayRugPullResults(riskData);
            document.getElementById('rugPullResult').classList.remove('hidden');
        } else {
            const riskData = generateMockRugPullData();
            displayRugPullResults(riskData);
            document.getElementById('rugPullResult').classList.remove('hidden');
        }

        lucide.createIcons();
        showToast('AI Analysis Complete!');
    } catch (error) {
        console.error('AI Analysis error:', error);
        document.getElementById('aiAnalysisError').classList.remove('hidden');
        document.getElementById('aiErrorMessage').textContent =
            'Error running AI analysis. Please try again later.';
    } finally {
        document.getElementById('sentimentLoading').classList.add('hidden');
        document.getElementById('patternLoading').classList.add('hidden');
        document.getElementById('rugPullLoading').classList.add('hidden');
    }
}

async function postJSON(url, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return await r.json();
}

// ---------- Sentiment helpers ----------
function normalizeSentimentFromPreds(preds, tokenName) {
    const pos = (preds.find(p => p.label === 'positive')?.score || 0);
    const neu = (preds.find(p => p.label === 'neutral')?.score || 0);
    const neg = (preds.find(p => p.label === 'negative')?.score || 0);

    const positive = Math.round(pos * 100);
    const neutral = Math.round(neu * 100);
    const negative = Math.max(0, 100 - positive - neutral);

    const score = Math.max(0, Math.min(100, Math.round(((pos - neg) + 1) * 50)));

    return {
        positive,
        neutral,
        negative,
        score,
        summary: generateSentimentSummary(positive, tokenName),
        mentions: generateMockMentions()
    };
}

function generateSentimentSummary(positive, tokenName) {
    if (positive > 70) return `Strong bullish sentiment detected for ${tokenName}.`;
    if (positive > 40) return `Mixed sentiment with cautious optimism for ${tokenName}.`;
    return `Negative sentiment spike detected for ${tokenName}. Exercise caution.`;
}

function generateMockMentions() {
    return [
        { text: 'Just aped into this, looks primed for 10x 🚀', sentiment: 'positive' },
        { text: 'Dev is active and liquidity is locked 🔒', sentiment: 'positive' },
        { text: 'Volume looking suspicious, be careful guys', sentiment: 'negative' },
        { text: 'Chart consolidating nicely here', sentiment: 'neutral' }
    ];
}

// NOTE: You already had displaySentimentResults earlier in your older file.
// If it’s missing now, paste this too:
function displaySentimentResults(data) {
    document.getElementById('sentimentResult').classList.remove('hidden');
    document.getElementById('positiveSentiment').textContent = data.positive + '%';
    document.getElementById('neutralSentiment').textContent = data.neutral + '%';
    document.getElementById('negativeSentiment').textContent = data.negative + '%';
    document.getElementById('sentimentScore').textContent = data.score + '/100';
    document.getElementById('sentimentBar').style.width = data.score + '%';
    document.getElementById('sentimentBar').className =
        `h-2 rounded-full transition-all duration-1000 ${
            data.score > 70 ? 'bg-green-500' : data.score > 40 ? 'bg-yellow-500' : 'bg-red-500'
        }`;
    document.getElementById('sentimentSummary').textContent = data.summary;

    const mentionsHtml = data.mentions.map(m => `
        <div class="flex items-start gap-2">
            <span class="text-${m.sentiment === 'positive' ? 'green' : m.sentiment === 'negative' ? 'red' : 'gray'}-400 text-[10px] mt-0.5">●</span>
            <p class="text-gray-400 truncate">${m.text}</p>
        </div>
    `).join('');
    document.getElementById('sentimentMentions').innerHTML = mentionsHtml;
}

// ---------- Pattern helpers ----------
function normalizePatternFromVision(visionOutput) {
    const topScore = Array.isArray(visionOutput) && visionOutput[0]?.score ? visionOutput[0].score : 0.25;
    const confidence = Math.round(topScore * 100);

    return {
        name: 'Experimental Vision Output',
        description: 'Placeholder object-detection model (not true chart pattern recognition).',
        confidence: Math.min(95, Math.max(35, confidence)),
        trend: 'Unknown',
        support: (Math.random() * 0.0001).toFixed(8),
        resistance: (Math.random() * 0.0005 + 0.0001).toFixed(8),
        prediction: 'For real patterns, switch to OHLCV-based detection or a chart-trained model.'
    };
}

// NOTE: If your file no longer contains these, you need them:
function generateMockPatternData() {
    const patterns = ['Ascending Triangle', 'Bull Flag', 'Double Bottom', 'Head and Shoulders', 'Falling Wedge', 'Cup and Handle'];
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    const confidence = Math.floor(Math.random() * 40) + 60;
    const isBullish = ['Ascending Triangle', 'Bull Flag', 'Double Bottom', 'Falling Wedge', 'Cup and Handle'].includes(selectedPattern);
    return {
        name: selectedPattern,
        description: 'Mock pattern for demo.',
        confidence,
        trend: isBullish ? 'Bullish' : 'Bearish',
        support: (Math.random() * 0.0001).toFixed(8),
        resistance: (Math.random() * 0.0005 + 0.0001).toFixed(8),
        prediction: 'Mock prediction for demo.'
    };
}

function displayPatternResults(data) {
    document.getElementById('patternResult').classList.remove('hidden');
    document.getElementById('patternName').textContent = data.name;
    document.getElementById('patternDescription').textContent = data.description;
    document.getElementById('patternConfidence').textContent = data.confidence + '%';
    document.getElementById('patternTrend').textContent = data.trend;
    document.getElementById('patternTrend').className =
        `text-xs px-2 py-1 rounded ${
            data.trend === 'Bullish' ? 'bg-green-900/50 text-green-400' :
            data.trend === 'Bearish' ? 'bg-red-900/50 text-red-400' :
            'bg-gray-800 text-gray-300'
        }`;
    document.getElementById('supportLevel').textContent = 'S: $' + data.support;
    document.getElementById('resistanceLevel').textContent = 'R: $' + data.resistance;
    document.getElementById('patternPrediction').textContent = data.prediction;
}

// ---------- Rug risk helpers ----------
function buildRiskSummary(tokenName, tokenSymbol) {
    const liqLocked = currentTokenData?.liquidity?.lockedPercent ?? 0;
    const devPct = currentTokenData?.holders?.devPercent ?? 0;
    const top10Pct = currentTokenData?.holders?.top10Percent ?? 0;
    const mcapLiq = currentTokenData?.liquidity?.mcapRatio ?? '0';
    const vol24 = currentTokenData?.volume?.h24 ?? 0;
    const growth = currentTokenData?.holders?.growth24h ?? '0';
    const wash = currentTokenData?.volume?.washTrading ?? 'Unknown';

    const mintRisk = currentTokenData?.risks?.find(r => r.name === 'Mint Authority')?.risk ? 'active' : 'revoked';
    const freezeRisk = currentTokenData?.risks?.find(r => r.name === 'Freeze Authority')?.risk ? 'active' : 'revoked';
    const lpRisk = currentTokenData?.risks?.find(r => r.name === 'LP Tokens')?.risk ? 'unlocked' : 'burned/locked';

    return `
Token: ${tokenName} (${tokenSymbol})
Signals:
- Liquidity locked/burned: ${liqLocked}%
- LP status: ${lpRisk}
- Dev wallet percent: ${devPct}%
- Top 10 holders percent: ${top10Pct}%
- MCap/Liq ratio: ${mcapLiq}x
- 24h volume: ${vol24}
- Holder growth (24h): ${growth}%
- Wash trading risk: ${wash}
- Mint authority: ${mintRisk}
- Freeze authority: ${freezeRisk}

Classify as one of: rug pull, legitimate, high risk, safe.
Return label probabilities.
    `.trim();
}

function normalizeRugRiskFromZeroShot(zeroShot) {
    const labels = zeroShot?.labels || [];
    const scores = zeroShot?.scores || [];
    const rugIdx = labels.findIndex(l => String(l).toLowerCase().includes('rug'));
    const rugProb = rugIdx >= 0 ? scores[rugIdx] : 0.25;
    const score = Math.round(rugProb * 100);
    return generateRugPullDataFromScore(score);
}

function generateMockRugPullData() {
    return generateRugPullDataFromScore(Math.floor(Math.random() * 100));
}

function generateRugPullDataFromScore(score) {
    const riskLevel = score < 30 ? 'Low' : score < 70 ? 'Medium' : 'High';
    const indicators = [
        { name: 'Liquidity Lock', status: score < 40 ? 'Safe ✅' : score < 70 ? 'Partial ⚠️' : 'None ❌', risk: score > 60 },
        { name: 'Dev Wallet', status: score < 30 ? 'Low % ✅' : score < 60 ? 'Medium ⚠️' : 'High % ❌', risk: score > 50 },
        { name: 'Holder Concentration', status: score < 35 ? 'Healthy ✅' : score < 70 ? 'Moderate ⚠️' : 'Extreme ❌', risk: score > 70 },
        { name: 'Volume Pattern', status: score > 80 ? 'Artificial ❌' : score > 55 ? 'Suspicious ⚠️' : 'Organic ✅', risk: score > 55 }
    ];
    const flags = riskLevel === 'High'
        ? ['LP unlock risk', 'High dev concentration', 'Rug-like behavior']
        : riskLevel === 'Medium'
        ? ['Monitor LP', 'Watch dev wallet', 'Use tight stops']
        : ['Lower risk signals', 'No major flags detected'];

    return { score, riskLevel, indicators, flags };
}

function displayRugPullResults(data) {
    document.getElementById('rugPullResult').classList.remove('hidden');

    const scoreEl = document.getElementById('rugPullScore');
    scoreEl.textContent = data.score;

    // Color score
    scoreEl.className =
        data.riskLevel === 'High' ? 'text-4xl font-bold mb-1 text-red-400' :
        data.riskLevel === 'Medium' ? 'text-4xl font-bold mb-1 text-yellow-400' :
        'text-4xl font-bold mb-1 text-green-400';

    // Indicators
    document.getElementById('rugPullIndicators').innerHTML = data.indicators.map(ind => `
        <div class="flex items-center justify-between bg-gray-900/40 border border-gray-700 rounded-lg px-3 py-2">
            <span class="text-xs text-gray-400">${ind.name}</span>
            <span class="text-xs font-medium ${ind.risk ? 'text-red-400' : 'text-green-400'}">${ind.status}</span>
        </div>
    `).join('');

    // Flags
    document.getElementById('mlFlags').innerHTML = (data.flags || []).map(f => `
        <span class="px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-[11px]">${f}</span>
    `).join('');

    // Verdict
    const verdictEl = document.getElementById('rugPullVerdict');
    const box = document.getElementById('rugPullVerdictBox');

    if (data.riskLevel === 'High') {
        verdictEl.textContent = 'HIGH RISK: Multiple rug-style signals detected.';
        box.className = 'mt-4 p-3 rounded-lg border bg-red-900/20 border-red-500/30';
    } else if (data.riskLevel === 'Medium') {
        verdictEl.textContent = 'MEDIUM RISK: Mixed signals — trade smaller and use tight stops.';
        box.className = 'mt-4 p-3 rounded-lg border bg-yellow-900/20 border-yellow-500/30';
    } else {
        verdictEl.textContent = 'LOWER RISK: Fewer rug-like signals detected (still DYOR).';
        box.className = 'mt-4 p-3 rounded-lg border bg-green-900/20 border-green-500/30';
    }
}
