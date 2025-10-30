/* * =================================
 * Cloudflare Function (後端)
 * 檔名: /functions/api/get-news.js
 * =================================
 */

export async function onRequest(context) {
    
    // 1. 從 Cloudflare 的「環境變數」中安全地讀取金鑰
    //    (這就是您要在 Cloudflare 網站上設定的地方)
    const API_KEY = context.env.NEWS_API_KEY;

    if (!API_KEY) {
        const errorResponse = { status: 'error', message: 'API 金鑰未在伺服器上設定。' };
        return new Response(JSON.stringify(errorResponse), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 2. 從前端請求的 URL 中獲取 'category' 參數 (tw, jp, world)
    const url = new URL(context.request.url);
    const category = url.searchParams.get('category') || 'tw'; // 預設為 'tw'

    // 3. 根據類別建立真實的 News API 網址
    const BASE_URL = 'https://newsapi.org/v2/top-headlines';
    const PAGE_SIZE = 5; // 只抓 5 則
    let realApiUrl;

    switch (category) {
        case 'jp':
            realApiUrl = `${BASE_URL}?country=jp&pageSize=${PAGE_SIZE}&apiKey=${API_KEY}`;
            break;
        case 'world':
            // 免費方案的替代方案：使用美國頭條作為 "國際"
            realApiUrl = `${BASE_URL}?country=us&pageSize=${PAGE_SIZE}&apiKey=${API_KEY}`;
            break;
        case 'tw':
        default:
            realApiUrl = `${BASE_URL}?country=tw&pageSize=${PAGE_SIZE}&apiKey=${API_KEY}`;
            break;
    }

    try {
        // 4. (關鍵) 從「伺服器」呼叫 News API
        // 我們添加 'User-Agent'，因為 News API 會要求伺服器請求提供
        const newsResponse = await fetch(realApiUrl, {
            headers: {
                'User-Agent': 'cloudflare-function-news-widget-v1' // News API 需要這個
            },
            // Cloudflare 專屬：快取此 API 呼叫 30 分鐘 (1800 秒)
            // 這能大幅節省您的 API 額度
            cf: {
                cacheTtl: 1800 
            }
        });

        // 檢查 News API 是否回傳錯誤
        if (!newsResponse.ok) {
            const errorData = await newsResponse.json();
            throw new Error(errorData.message || 'News API 請求失敗');
        }

        // 取得 News API 的 JSON 資料
        const data = await newsResponse.json();

        // 5. 將 News API 的資料原封不動地傳回給前端
        return new Response(JSON.stringify(data), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=1800' // 讓 CDN 也快取
            }
        });

    } catch (error) {
        // 捕捉任何錯誤並回傳
        const errorResponse = { status: 'error', message: error.message };
        return new Response(JSON.stringify(errorResponse), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}