// ===== API 設定 =====
// 請到 https://www.alphavantage.co/support/#api-key 免費註冊並取得 API key
const ALPHA_VANTAGE_API_KEY = 'DEMO';  // 請替換成您的 API key

// 顯示即時日期時間
function updateDateTime() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit', 
        minute: '2-digit'
    };
    document.getElementById('datetime').textContent = 
        now.toLocaleDateString('zh-TW', options);
}

updateDateTime();
setInterval(updateDateTime, 60000);

// 開啟連結功能
function openLink(url) {
    if (!url || url === '#') {
        alert('此功能尚未設定連結');
        return;
    }
    window.open(url, '_blank');
}

// 搜尋功能
function performSearch() {
    const query = document.getElementById('searchInput').value;
    if (query.trim()) {
        if (query.includes('.') && !query.includes(' ')) {
            window.open('https://' + query.replace(/^https?:\/\//, ''), '_blank');
        } else {
            window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank');
        }
    }
}

document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// 天氣功能
const weatherCodes = {
    0: { emoji: '☀️', desc: '晴天' },
    1: { emoji: '🌤️', desc: '大致晴朗' },
    2: { emoji: '⛅', desc: '部分多雲' },
    3: { emoji: '☁️', desc: '陰天' },
    45: { emoji: '🌫️', desc: '霧' },
    48: { emoji: '🌫️', desc: '霧淞' },
    51: { emoji: '🌦️', desc: '小雨' },
    53: { emoji: '🌦️', desc: '中雨' },
    55: { emoji: '🌧️', desc: '大雨' },
    61: { emoji: '🌧️', desc: '小雨' },
    63: { emoji: '🌧️', desc: '中雨' },
    65: { emoji: '⛈️', desc: '大雨' },
    71: { emoji: '🌨️', desc: '小雪' },
    73: { emoji: '🌨️', desc: '中雪' },
    75: { emoji: '❄️', desc: '大雪' },
    77: { emoji: '🌨️', desc: '雪粒' },
    80: { emoji: '🌦️', desc: '陣雨' },
    81: { emoji: '🌧️', desc: '陣雨' },
    82: { emoji: '⛈️', desc: '大陣雨' },
    85: { emoji: '🌨️', desc: '陣雪' },
    86: { emoji: '❄️', desc: '大陣雪' },
    95: { emoji: '⛈️', desc: '雷雨' },
    96: { emoji: '⛈️', desc: '雷陣雨冰雹' },
    99: { emoji: '⛈️', desc: '強雷陣雨' }
};

async function updateWeather() {
    const selector = document.getElementById('locationSelector');
    const [lat, lon] = selector.value.split(',');
    const forecastDiv = document.getElementById('weatherForecast');
    
    forecastDiv.innerHTML = '<div class="weather-loading">載入天氣資料中...</div>';
    
    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia/Taipei&forecast_days=7`
        );
        
        const data = await response.json();
        
        let html = '';
        const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(data.daily.time[i]);
            const dayName = i === 0 ? '今天' : weekdays[date.getDay()];
            const weatherCode = data.daily.weathercode[i];
            const weather = weatherCodes[weatherCode] || { emoji: '🌤️', desc: '多雲' };
            const tempMax = Math.round(data.daily.temperature_2m_max[i]);
            const tempMin = Math.round(data.daily.temperature_2m_min[i]);
            const rainProb = data.daily.precipitation_probability_max[i] || 0;
            
            html += `
                <div class="weather-day-h">
                    <div class="weather-date-h">${dayName}</div>
                    <span class="weather-emoji-h">${weather.emoji}</span>
                    <div class="weather-temp-h">${tempMin}° - ${tempMax}°</div>
                    <div class="weather-rain-h">💧 ${rainProb}%</div>
                    <div class="weather-desc-h">${weather.desc}</div>
                </div>
            `;
        }
        
        forecastDiv.innerHTML = html;
    } catch (error) {
        forecastDiv.innerHTML = '<div class="weather-loading">天氣資料載入失敗</div>';
        console.error('Weather fetch error:', error);
    }
}

updateWeather();

// ===== (已改造) 新聞功能 - 使用 Cloudflare Function =====
let currentRegion = 'tw';
let isLoadingNews = false;

// (!! 已替換 !!)
// 舊的 loadNews (RSS/CORS) 已被移除
// 換成這個呼叫我們後端 Function 的新版本
async function loadNews(region) {
    if (isLoadingNews) return;
    
    isLoadingNews = true;
    const newsList = document.getElementById('newsList');
    newsList.innerHTML = '<div class="news-loading">載入新聞中...</div>';

    try {
        // 1. 呼叫我們自己的後端 Function ( /api/get-news )
        // 我們將 'region' ('tw', 'jp', 'world') 作為參數傳遞
        const response = await fetch(`/api/get-news?category=${region}`);
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `伺服器錯誤 (HTTP ${response.status})`);
        }
        
        const data = await response.json();
        
        // 檢查 News API 是否在後端回傳錯誤
        if (data.status === 'error') {
            throw new Error(data.message);
        }

        const newsItems = data.articles;

        // 2. 渲染新聞 (使用 News API 回傳的資料)
        if (newsItems && newsItems.length > 0) {
            let html = '';
            
            // News API 預設回傳 5 筆
            newsItems.forEach(item => {
                const pubDate = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('zh-TW', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : '時間未知';
                
                const source = item.source.name || '新聞來源';
                
                html += `
                    <div class="news-item" onclick="openLink('${item.url}')">
                        <div class="news-item-title">${item.title}</div>
                        <div class="news-item-meta">
                            <span class="news-source">${source}</span>
                            <span class="news-time">${pubDate}</span>
                        </div>
                    </div>
                `;
            });
            
            newsList.innerHTML = html;
        } else {
            newsList.innerHTML = '<div class="news-loading">目前沒有可用的新聞。</div>';
        }
    } catch (error) {
        console.error('News fetch error:', error);
        newsList.innerHTML = `<div class="news-loading" style="color: red; line-height: 1.5; text-align: left;">
                                <b>新聞載入失敗：</b><br>${error.message}<br>
                                (請確認 Cloudflare 的 NEWS_API_KEY 環境變數已正確設定並重新部署)
                              </div>`;
    } finally {
        isLoadingNews = false;
    }
}

// (!! 保留 !!) 
// 您的 UI 函數 (switchNewsRegion, refreshNews) 保持不變
// 因為它們只是呼叫 loadNews()，而我們已經替換了 loadNews() 的內容
function switchNewsRegion(region) {
    currentRegion = region;
    
    document.querySelectorAll('.news-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadNews(region);
}

function refreshNews() {
    const btn = document.querySelector('.refresh-btn');
    btn.classList.add('loading');
    
    loadNews(currentRegion).finally(() => {
        setTimeout(() => {
            btn.classList.remove('loading');
        }, 500);
    });
}

// (!! 保留 !!)
// 您的初始載入
loadNews('tw');

// ===== (!! 保留 !!) 股票功能 - Alpha Vantage API =====
// (您所有的股票功能完全保留，不受影響)
let currentMarket = 'tw';
let stockWatchlist = {
    tw: ['2330.TPE', '2317.TPE', '2454.TPE', '2603.TPE', '0050.TPE'],
    us: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA']
};

let stockRequestCount = 0;
const MAX_REQUESTS_PER_MINUTE = 5;

async function loadStocks(market) {
    const stockList = document.getElementById('stockList');
    const stocks = stockWatchlist[market];
    
    if (stocks.length === 0) {
        stockList.innerHTML = '<div class="stock-loading">尚未加入任何股票</div>';
        return;
    }
    
    if (ALPHA_VANTAGE_API_KEY === 'DEMO') {
        document.getElementById('apiNotice').style.display = 'block';
        stockList.innerHTML = '<div class="stock-loading">請先設定 Alpha Vantage API key（完全免費）</div>';
        return;
    }
    
    stockList.innerHTML = '<div class="stock-loading">載入股票資料中...</div>';
    
    let html = '';
    
    for (const symbol of stocks.slice(0, 5)) {
        const stockData = await fetchStockData(symbol);
        
        if (stockData) {
            const displaySymbol = symbol.replace('.TPE', '');
            const changeClass = stockData.change > 0 ? 'stock-up' : stockData.change < 0 ? 'stock-down' : 'stock-neutral';
            const changeSymbol = stockData.change > 0 ? '+' : '';
            
            html += `
                <div class="stock-item" onclick="openLink('https://www.google.com/finance/quote/${symbol}')">
                    <div class="stock-info">
                        <div class="stock-symbol">${displaySymbol}</div>
                        <div class="stock-name">${stockData.name}</div>
                    </div>
                    <div class="stock-price-info">
                        <div class="stock-price ${changeClass}">$${stockData.price.toFixed(2)}</div>
                        <div class="stock-change ${changeClass}">${changeSymbol}${stockData.change.toFixed(2)} (${changeSymbol}${stockData.changePercent.toFixed(2)}%)</div>
                    </div>
                    <button class="stock-remove" onclick="event.stopPropagation(); removeStock('${symbol}')">✕</button>
                </div>
            `;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    stockList.innerHTML = html || '<div class="stock-loading">股票資料載入失敗，請稍後再試</div>';
}

async function fetchStockData(symbol) {
    try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data['Global Quote']) {
            const quote = data['Global Quote'];
            const price = parseFloat(quote['05. price']);
            const change = parseFloat(quote['09. change']);
            const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
            
            return {
                name: symbol.replace('.TPE', ''),
                price: price,
                change: change,
                changePercent: changePercent
            };
        }
        
        return null;
    } catch (error) {
        console.error('Stock fetch error:', symbol, error);
        return null;
    }
}

function switchStockMarket(market) {
    currentMarket = market;
    
    document.querySelectorAll('.stock-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const searchInput = document.getElementById('stockSearchInput');
    searchInput.placeholder = market === 'tw' ? '輸入股票代碼（例：2330）' : '輸入股票代碼（例：AAPL）';
    
    loadStocks(market);
}

function addStock() {
    const input = document.getElementById('stockSearchInput');
    let symbol = input.value.trim().toUpperCase();
    
    if (!symbol) {
        alert('請輸入股票代碼');
        return;
    }
    
    if (currentMarket === 'tw' && !symbol.includes('.TPE')) {
        symbol = symbol + '.TPE';
    }
    
    if (stockWatchlist[currentMarket].includes(symbol)) {
        alert('該股票已在追蹤清單中');
        return;
    }
    
    if (stockWatchlist[currentMarket].length >= 5) {
        alert('追蹤清單已滿（最多5支），請先移除其他股票');
        return;
    }
    
    stockWatchlist[currentMarket].push(symbol);
    input.value = '';
    loadStocks(currentMarket);
    
    localStorage.setItem('stockWatchlist', JSON.stringify(stockWatchlist));
}

function removeStock(symbol) {
    const index = stockWatchlist[currentMarket].indexOf(symbol);
    if (index > -1) {
        stockWatchlist[currentMarket].splice(index, 1);
        loadStocks(currentMarket);
        localStorage.setItem('stockWatchlist', JSON.stringify(stockWatchlist));
    }
}

document.getElementById('stockSearchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addStock();
    }
});

const savedWatchlist = localStorage.getItem('stockWatchlist');
if (savedWatchlist) {
    stockWatchlist = JSON.parse(savedWatchlist);
}

loadStocks('tw');

setInterval(() => {
    loadStocks(currentMarket);
}, 300000);