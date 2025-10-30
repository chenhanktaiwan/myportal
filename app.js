/* * =================================
 * Portal v1.0 - app.js
 * * 說明：
 * 1. 使用 DOMContentLoaded 確保所有 HTML 元素都載入後才執行
 * 2. 新聞區塊 (fetchNews) 已修改為呼叫我們自己的後端 /api/get-news
 * 3. 其他功能 (天氣、搜尋、股票) 均已包含在此
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
            // 使用 'q' 參數進行 Google 搜尋
            const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            // 在新分頁中開啟
            window.open(googleSearchUrl, '_blank');
            // searchInput.value = ''; // (可選) 清空搜尋框
        }
    }

    /* =================================
     * 2. 天氣區塊 (Weather)
     * =================================
     */
    
    // TODO: 天氣功能需要實作
    // 注意：天氣 API (例如 OpenWeatherMap) 同樣有 API Key 限制。
    // 最佳做法是像新聞一樣，也為天氣建立一個後端 /functions/api/get-weather.js
    function fetchWeather() {
        console.log('天氣功能尚未實作。');
        // 範例：
        // const weatherWidget = document.getElementById('weather-widget');
        // if (weatherWidget) {
        //     weatherWidget.innerHTML = '<p>天氣功能載入中...</p>';
        // }
        // (此處應呼叫後端 API 來獲取天氣資料)
    }


    /* =================================
     * 3. 今日新聞 (News) - (已修正為呼叫後端)
     * =================================
     */
    const newsList = document.getElementById('news-list');
    const newsTabs = document.querySelectorAll('.news-tabs button');
    const refreshNewsButton = document.getElementById('refresh-news');

    async function fetchNews(category = 'tw') {
        // 1. 顯示載入中
        if (newsList) {
            newsList.innerHTML = '<li><i class="fas fa-spinner fa-spin"></i> 正在載入新聞...</li>';
        } else {
            console.error('找不到 #news-list 元素');
            return; // 如果找不到元素，提前退出
        }

        // 2. (關鍵修改) 呼叫我們自己的後端 API
        //    我們不再需要 API Key，它已經安全地存在 Cloudflare 後端了
        const apiUrl = `/api/get-news?category=${category}`;

        try {
            const response = await fetch(apiUrl);
            
            // 檢查我們「自己」的後端是否回傳錯誤
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '無法從伺服器獲取新聞');
            }

            const data = await response.json();

            // 3. 檢查從 News API 透過後端傳回的資料
            if (data.status === 'error') {
                // 這是 News API 回傳的錯誤 (例如 API 金鑰錯誤)
                console.error('News API error:', data.message);
                newsList.innerHTML = `<li>讀取新聞時發生錯誤：${data.message}</li>`;
            } else if (data.articles && data.articles.length > 0) {
                newsList.innerHTML = ''; // 清空載入中
                data.articles.forEach(article => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = article.url;
                    a.target = '_blank';
                    const sourceName = article.source.name || '未知來源';
                    a.textContent = `[${sourceName}] ${article.title}`;
                    li.appendChild(a);
                    newsList.appendChild(li);
                });
            } else {
                newsList.innerHTML = '<li>目前沒有可用的新聞。</li>';
            }

        } catch (error) {
            // 這是 fetch 本身失敗 (例如網路中斷或我們的後端 500 錯誤)
            console.error('Fetch error:', error);
            newsList.innerHTML = `<li>無法連線到新聞伺服器：${error.message}</li>`;
        }
    }

    // 新聞頁籤的點擊事件
    if (newsTabs) {
        newsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                newsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                fetchNews(tab.dataset.category);
            });
        });
    }

    // 重新整理按鈕的點擊事件
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
    
    // TODO: 股票功能需要實作
    // 注意：股票 API (例如 Finnhub, Alpha Vantage) 同樣有 API Key 限制。
    // 最佳做法是像新聞一樣，也為股票建立一個後端 /functions/api/get-stocks.js
    function fetchStocks() {
        console.log('股票功能尚未實作。');
        // 範例：
        // const stockWidget = document.getElementById('stock-widget');
        // if (stockWidget) {
        //     stockWidget.innerHTML = '<p>股票功能載入中...</p>';
        // }
        // (此處應呼叫後端 API 來獲取股票資料)
    }


    /* =================================
     * 初始載入 (Initial Load)
     * =================================
     */
    // 頁面載入時，立即執行一次
    fetchWeather(); // 執行天氣 (目前是空的)
    fetchNews('tw');  // 執行新聞 (已修正)
    fetchStocks();  // 執行股票 (目前是空的)

}); // DOMContentLoaded 結束
