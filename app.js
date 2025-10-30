/* * =================================
 * Portal v1.0 - app.js
 * * 說明：
 * 1. 使用 DOMContentLoaded 確保所有 HTML 元素都載入後才執行
 * 2. [最終修正] 新聞區塊 (fetchNews) 改為在 "前端" 直接呼叫 rss2json.com
 * 3. 不再依賴 /api/get-news 後端函式
 * =================================
 */

document.addEventListener('DOMContentLoaded', () => {

    /* =================================
     * 1. Google 搜尋功能
     * =================================
     */
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }

    function performSearch() {
        const query = searchInput.value.trim();
        if (query) {
            const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            window.open(googleSearchUrl, '_blank');
        }
    }

    /* =================================
     * 2. 天氣區塊 (Weather)
     * =================================
     */
    
    function fetchWeather() {
        console.log('天氣功能尚未實作。');
        // (你原始的 index.html 中有 onchange="updateWeather()"，
        //  但我們 app.js 尚未定義 updateWeather()，所以天氣下拉選單目前無作用)
    }


    /* =================================
     * 3. 今日新聞 (News) - (已修正為前端抓取)
     * =================================
     */
    const newsList = document.getElementById('news-list');
    const newsTabs = document.querySelectorAll('.news-tabs button');
    const refreshNewsButton = document.getElementById('refresh-news');

    // [最終修正] 此函式現在直接從前端呼叫 rss2json
    async function fetchNews(category = 'tw') {
        
        // 1. 顯示載入中
        if (newsList) {
            newsList.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> 正在載入新聞...</li>';
        } else {
            console.error('找不到 #news-list 元素');
            return; 
        }

        // 2. [修改] 定義 Google News RSS Feeds 網址
        const RSS_FEEDS = {
            tw: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGczTWpVMU5TRUtGZ0poWjJVb0FBUAE?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
            jp: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGczTWpZc05TRUtGZ0poWjJVb0FBUAE?hl=ja&gl=JP&ceid=JP:ja',
            world: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGcyZWhjU05TRUtGZ0poWjJVb0FBUAE?hl=en-US&gl=US&ceid=US:en'
        };
        const rssUrl = RSS_FEEDS[category] || RSS_FEEDS['tw'];

        // 3. [修改] 呼叫 rss2json API (免費服務)，將 RSS 轉為 JSON
        const rssToJsonApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

        try {
            // 4. [修改] 直接從 "前端" fetch
            const response = await fetch(rssToJsonApiUrl);
            
            if (!response.ok) {
                // 如果 rss2json 服務掛了或回傳錯誤
                const errorData = await response.json();
                throw new Error(errorData.message || 'rss2json API 請求失敗');
            }

            const data = await response.json();

            // 5. 檢查從 rss2json 回傳的資料
            if (data.status === 'ok' && data.items && data.items.length > 0) {
                
                // 6. [關鍵] 轉換資料格式 (在前端進行轉換)
                const articles = data.items.slice(0, 5).map(item => ({
                    title: item.title,
                    url: item.link, 
                    source: {
                        name: item.author || 'Google News'
                    }
                }));
                
                // 7. 渲染新聞
                newsList.innerHTML = ''; // 清空載入中
                articles.forEach(article => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = article.url;
                    a.target = '_blank';
                    const sourceName = article.source.name || '未知來源';
                    
                    // 確保格式正確
                    a.textContent = `[${sourceName}] ${article.title}`;
                    li.appendChild(a);
                    newsList.appendChild(li);
                });
                
            } else {
                // rss2json 回傳 status: "ok" 但 items 是空的
                newsList.innerHTML = '<li>目前沒有可用的新聞。</li>';
            }

        } catch (error) {
            // 這是 fetch 本身失敗 (例如網路中斷、CORS 錯誤、rss2json 服務掛了)
            console.error('Fetch error:', error);
            newsList.innerHTML = `<li>無法連線到新聞伺服器：${error.message}</li>`;
        }
    }

    // 新聞頁籤的點擊事件 (保持不變)
    if (newsTabs) {
        newsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                newsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                fetchNews(tab.dataset.category);
            });
        });
    }

    // 重新整理按鈕的點擊事件 (保持不變)
    if (refreshNewsButton) {
        refreshNewsButton.addEventListener('click', () => {
            const activeTab = document.querySelector('.news-tabs button.active');
            const category = activeTab ? activeTab.dataset.category : 'tw';
            fetchNews(category);
        });
    }


    /* =================================
     * 4. 股票追蹤 (Stocks)
     * =================================
     */
    
    function fetchStocks() {
        console.log('股票功能尚未實作。');
        // (你原始的 index.html 中有 onchange="switchStockMarket()" 等函式，
        //  但我們 app.js 尚未定義它們，所以股票功能目前無作用)
    }


    /* =================================
     * 初始載入 (Initial Load)
     * =================================
     */
    fetchWeather(); // 執行天氣 (目前是空的)
    fetchNews('tw');  // 執行新聞 (已修正)
    fetchStocks();  // 執行股票 (目前是空的)

}); // DOMContentLoaded 結束
