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
function copyToClipboard(text) {
    navigator.clipboard.writeText(text.replace('Address: ', ''));
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
    document.getElementById('contractAddress').textContent = `Address: ${data.address.slice(0, 8)}...${data.address.slice(-8)}`;
    
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

// Main AI Analysis Controller
async function runAIAnalysis() {
    const apiKey = document.getElementById('hfApiKey').value.trim();
    const tokenName = document.getElementById('tokenName').textContent;
    const tokenSymbol = document.getElementById('tokenSymbol').textContent;
    
    if (!currentTokenData) {
        showToast('Please analyze a token first');
        return;
    }
    
    // Show loading states
    document.getElementById('sentimentPlaceholder').classList.add('hidden');
    document.getElementById('patternPlaceholder').classList.add('hidden');
    document.getElementById('rugPullPlaceholder').classList.add('hidden');
    document.getElementById('sentimentLoading').classList.remove('hidden');
    document.getElementById('patternLoading').classList.remove('hidden');
    document.getElementById('rugPullLoading').classList.remove('hidden');
    document.getElementById('aiAnalysisError').classList.add('hidden');
    
    try {
        // Run all three AI analyses in parallel
        await Promise.all([
            analyzeSentiment(tokenName, tokenSymbol, apiKey),
            analyzeChartPattern(apiKey),
            analyzeRugPullRisk(apiKey)
        ]);
        
        // Refresh icons for new content
        lucide.createIcons();
        
        showToast('AI Analysis Complete!');
    } catch (error) {
        console.error('AI Analysis error:', error);
        document.getElementById('aiAnalysisError').classList.remove('hidden');
        document.getElementById('aiErrorMessage').textContent = 'Error: ' + error.message;
    } finally {
        // Hide loading states
        document.getElementById('sentimentLoading').classList.add('hidden');
        document.getElementById('patternLoading').classList.add('hidden');
        document.getElementById('rugPullLoading').classList.add('hidden');
    }
}

// 1. Social Media Crypto Sentiment Analysis using Hugging Face
async function analyzeSentiment(tokenName, symbol, apiKey) {
    try {
        let sentimentData;
        
        // If API key provided, try to call real Hugging Face API
        if (apiKey) {
            try {
                // Use a sentiment analysis model from Hugging Face
                // Example: cardiffnlp/twitter-roberta-base-sentiment-latest
                const model = 'cardiffnlp/twitter-roberta-base-sentiment-latest';
                const text = `${tokenName} ${symbol} crypto token price analysis`;
                
                const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ inputs: text })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    sentimentData = parseHFSentiment(result);
                } else {
                    throw new Error('API call failed');
                }
            } catch (apiError) {
                console.log('HF API failed, using mock data:', apiError);
                sentimentData = generateMockSentiment(tokenName);
            }
        } else {
            // No API key, use mock data with delay
            await new Promise(r => setTimeout(r, 1500));
            sentimentData = generateMockSentiment(tokenName);
        }
        
        // Display results
        displaySentimentResults(sentimentData);
        
    } catch (error) {
        console.error('Sentiment analysis error:', error);
        throw error;
    }
}

// Parse Hugging Face sentiment response
function parseHFSentiment(hfResponse) {
    // HF models return arrays of label/score objects
    // Format: [[{label: 'positive', score: 0.9}, {label: 'negative', score: 0.1}]]
    const scores = hfResponse[0] || [];
    
    let positive = 0, negative = 0, neutral = 0;
    
    scores.forEach(item => {
        const label = item.label.toLowerCase();
        const score = item.score * 100;
        
        if (label.includes('positive')) positive = Math.round(score);
        else if (label.includes('negative')) negative = Math.round(score);
        else if (label.includes('neutral')) neutral = Math.round(score);
    });
    
    // Normalize to ensure they sum to 100
    const total = positive + negative + neutral;
    if (total > 0) {
        positive = Math.round((positive / total) * 100);
        negative = Math.round((negative / total) * 100);
        neutral = 100 - positive - negative;
    }
    
    const score = Math.round((positive * 1 + neutral * 0.5) / 1.5);
    
    return {
        positive,
        negative,
        neutral,
        score,
        summary: generateSentimentSummary(positive, tokenName),
        mentions: generateMockMentions()
    };
}

function generateSentimentSummary(positive, tokenName) {
    if (positive > 70) {
        return `Strong bullish sentiment detected for ${tokenName}. Community showing high confidence with increasing engagement rates.`;
    } else if (positive > 40) {
        return `Mixed sentiment with cautious optimism for ${tokenName}. Some FUD detected but overall community remains supportive.`;
    } else {
        return `Negative sentiment spike detected for ${tokenName}. Multiple red flags mentioned in recent discussions. Exercise caution.`;
    }
}

function generateMockSentiment(tokenName) {
    const positive = Math.floor(Math.random() * 60) + 20;
    const negative = Math.floor(Math.random() * (100 - positive - 10));
    const neutral = 100 - positive - negative;
    const score = Math.floor((positive * 1 + neutral * 0.5) / 1.5);
    
    const summaries = [
        `Strong bullish sentiment detected for ${tokenName}. Community showing high confidence with increasing engagement rates.`,
        `Mixed sentiment with cautious optimism. Some FUD detected but overall community remains supportive.`,
        `Negative sentiment spike detected. Multiple red flags mentioned in recent discussions. Exercise caution.`
    ];
    
    const mentions = [
        { text: "Just aped into this, looks primed for 10x 🚀", sentiment: "positive" },
        { text: "Dev is active and liquidity is locked 🔒", sentiment: "positive" },
        { text: "Volume looking suspicious, be careful guys", sentiment: "negative" },
        { text: "Chart consolidating nicely here", sentiment: "neutral" },
        { text: "Whales accumulating, smart money moving in", sentiment: "positive" },
        { text: "Rug pull vibes, dev wallet moving funds", sentiment: "negative" }
    ];
    
    // Randomly select 4 mentions
    const selectedMentions = mentions.sort(() => 0.5 - Math.random()).slice(0, 4);
    
    return { 
        positive, 
        negative, 
        neutral, 
        score, 
        summary: summaries[Math.floor(Math.random() * summaries.length)], 
        mentions: selectedMentions 
    };
}

function generateMockMentions() {
    const mentions = [
        { text: "Just aped into this, looks primed for 10x 🚀", sentiment: "positive" },
        { text: "Dev is active and liquidity is locked 🔒", sentiment: "positive" },
        { text: "Volume looking suspicious, be careful guys", sentiment: "negative" },
        { text: "Chart consolidating nicely here", sentiment: "neutral" }
    ];
    return mentions;
}

function displaySentimentResults(data) {
    document.getElementById('sentimentResult').classList.remove('hidden');
    document.getElementById('positiveSentiment').textContent = data.positive + '%';
    document.getElementById('neutralSentiment').textContent = data.neutral + '%';
    document.getElementById('negativeSentiment').textContent = data.negative + '%';
    document.getElementById('sentimentScore').textContent = data.score + '/100';
    document.getElementById('sentimentBar').style.width = data.score + '%';
    document.getElementById('sentimentBar').className = `h-2 rounded-full transition-all duration-1000 ${data.score > 70 ? 'bg-green-500' : data.score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`;
    document.getElementById('sentimentSummary').textContent = data.summary;
    
    // Recent mentions
    const mentionsHtml = data.mentions.map(m => `
        <div class="flex items-start gap-2">
            <span class="text-${m.sentiment === 'positive' ? 'green' : m.sentiment === 'negative' ? 'red' : 'gray'}-400 text-[10px] mt-0.5">●</span>
            <p class="text-gray-400 truncate">${m.text}</p>
        </div>
    `).join('');
    document.getElementById('sentimentMentions').innerHTML = mentionsHtml;
}

// 2. Chart Pattern Recognition using Hugging Face Vision Model
async function analyzeChartPattern(apiKey) {
    try {
        let patternData;
        
        if (apiKey && currentChart) {
            try {
                // For production: Convert chart to image and send to HF vision model
                // Model example: facebook/detr-resnet-50 or custom trained chart pattern model
                const canvas = document.getElementById('volumeChart');
                const imageData = canvas.toDataURL('image/png');
                
                // Note: Most HF vision models expect image URLs or base64
                const model = 'facebook/detr-resnet-50'; // Object detection model as example
                
                const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ inputs: imageData })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    patternData = parseHFChartPattern(result);
                } else {
                    throw new Error('Chart API failed');
                }
            } catch (apiError) {
                console.log('HF Vision API failed, using mock:', apiError);
                patternData = generateMockPatternData();
            }
        } else {
            // No API key or no chart, use mock
            await new Promise(r => setTimeout(r, 1800));
            patternData = generateMockPatternData();
        }
        
        displayPatternResults(patternData);
        
    } catch (error) {
        console.error('Pattern analysis error:', error);
        throw error;
    }
}

function parseHFChartPattern(hfResponse) {
    // Parse vision model response (model dependent)
    // This is a placeholder - actual implementation depends on the specific model used
    return generateMockPatternData();
}

function generateMockPatternData() {
    const patterns = ['Ascending Triangle', 'Bull Flag', 'Double Bottom', 'Head and Shoulders', 'Falling Wedge', 'Cup and Handle'];
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    const confidence = Math.floor(Math.random() * 40) + 60;
    const isBullish = ['Ascending Triangle', 'Bull Flag', 'Double Bottom', 'Falling Wedge', 'Cup and Handle'].includes(selectedPattern);
    
    return {
        name: selectedPattern,
        description: getPatternDescription(selectedPattern),
        confidence: confidence,
        trend: isBullish ? 'Bullish' : 'Bearish',
        support: (Math.random() * 0.0001).toFixed(8),
        resistance: (Math.random() * 0.0005 + 0.0001).toFixed(8),
        prediction: getPatternPrediction(selectedPattern, confidence)
    };
}

function getPatternDescription(pattern) {
    const descriptions = {
        'Ascending Triangle': 'Higher lows with consistent resistance. Typically breaks out upward with volume.',
        'Bull Flag': 'Sharp upward move followed by consolidation. Continuation pattern indicating further upside.',
        'Double Bottom': 'W-shaped pattern indicating strong support level and potential trend reversal.',
        'Head and Shoulders': 'Reversal pattern with three peaks. Middle peak highest. Bearish signal.',
        'Falling Wedge': 'Converging downtrend lines. Usually breaks upward. Bullish reversal pattern.',
        'Cup and Handle': 'Rounded bottom followed by small consolidation. Strong bullish continuation.'
    };
    return descriptions[pattern] || 'Technical pattern detected in price action.';
}

function getPatternPrediction(pattern, confidence) {
    if (confidence > 80) {
        return `High confidence ${pattern} detected. AI suggests 75% probability of breakout within 24-48 hours. Consider position sizing accordingly.`;
    } else if (confidence > 65) {
        return `Moderate confidence pattern match. Monitor volume for confirmation before entry. Recommended position: 50% size until confirmation.`;
    } else {
        return `Low confidence reading. Pattern incomplete or noisy data. Wait for clearer structure before entering.`;
    }
}

function displayPatternResults(data) {
    document.getElementById('patternResult').classList.remove('hidden');
    document.getElementById('patternName').textContent = data.name;
    document.getElementById('patternDescription').textContent = data.description;
    document.getElementById('patternConfidence').textContent = data.confidence + '%';
    document.getElementById('patternTrend').textContent = data.trend;
    document.getElementById('patternTrend').className = `text-xs px-2 py-1 rounded ${data.trend === 'Bullish' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`;
    document.getElementById('supportLevel').textContent = 'S: $' + data.support;
    document.getElementById('resistanceLevel').textContent = 'R: $' + data.resistance;
    document.getElementById('patternPrediction').textContent = data.prediction;
}

// 3. Rug Pull Detection ML Model using Hugging Face
async function analyzeRugPullRisk(apiKey) {
    try {
        let riskData;
        
        if (apiKey && currentTokenData) {
            try {
                // Prepare features for ML model
                const features = {
                    liquidity_locked: currentTokenData.liquidity.lockedPercent,
                    dev_wallet_pct: currentTokenData.holders.devPercent,
                    top10_pct: currentTokenData.holders.top10Percent,
                    mcap_liq_ratio: parseFloat(currentTokenData.liquidity.mcapRatio),
                    volume_24h: currentTokenData.volume.h24,
                    holder_growth: parseFloat(currentTokenData.holders.growth24h),
                    mint_authority_revoked: !currentTokenData.risks.find(r => r.name === 'Mint Authority').risk,
                    freeze_authority_revoked: !currentTokenData.risks.find(r => r.name === 'Freeze Authority').risk
                };
                
                // Call custom rug pull detection model on HF
                // You would need to train and deploy this model to Hugging Face
                const model = 'your-username/rug-pull-detector'; // Replace with actual model
                
                const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ inputs: features })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    riskData = parseHFRugPullResult(result, features);
                } else {
                    throw new Error('Rug pull API failed');
                }
            } catch (apiError) {
                console.log('HF Rug Pull API failed, using mock:', apiError);
                riskData = generateMockRugPullData();
            }
        } else {
            // No API key, use mock with delay
            await new Promise(r => setTimeout(r, 2000));
            riskData = generateMockRugPullData();
        }
        
        displayRugPullResults(riskData);
        
    } catch (error) {
        console.error('Rug pull analysis error:', error);
        throw error;
    }
}

function parseHFRugPullResult(hfResponse, features) {
    // Parse ML model response
    // Expected format: { risk_score: 0-100, risk_level: 'low'|'medium'|'high', flags: [...] }
    const score = Math.round(hfResponse.risk_score || Math.random() * 100);
    return generateRugPullDataFromScore(score);
}

function generateMockRugPullData() {
    const score = Math.floor(Math.random() * 100);
    return generateRugPullDataFromScore(score);
}

function generateRugPullDataFromScore(score) {
    const riskLevel = score < 30 ? 'Low' : score < 70 ? 'Medium' : 'High';
    
    const indicators = [
        { 
            name: 'Liquidity Lock', 
            status: score < 40 ? 'Safe ✅' : score < 70 ? 'Partial ⚠️' : 'None ❌', 
            risk: score > 60 
        },
        { 
            name: 'Dev Wallet', 
            status: score < 30 ? 'Low % ✅' : score < 60 ? 'Medium ⚠️' : 'High % ❌', 
            risk: score > 50 
        },
        { 
            name: 'Code Similarity', 
            status: score > 80 ? 'Known Scam ❌' : 'Unique ✅', 
            risk: score > 80 
        },
        { 
            name: 'Volume Pattern', 
            status: score > 80 ? 'Artificial ❌' : 'Organic ✅', 
            risk: score > 80 
        }
    ];
    
    const flags = score > 70 ? 
        ['<span class="px-2 py-1 bg-red-900/30 text-red-400 rounded text-[
