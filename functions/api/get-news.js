/* * =================================
 * Cloudflare Function (後端)
 * 檔名: /functions/api/get-news.js
 *
 * [已修改] 
 * - 改為呼叫 GNews.io API
 * - 讀取新的 GNEWS_API_KEY 環境變數
 * =================================
 */

export async function onRequest(context) {
    
    // 1. [修改] 從 Cloudflare 讀取 GNews 的金鑰
    const API_KEY = context.env.GNEWS_API_KEY;

    if (!API_KEY) {
        const errorResponse = { status: 'error', message: 'GNews API 金鑰未在伺服器上設定。' };
        return new Response(JSON.stringify(errorResponse), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // 2. 從前端請求的 URL 中獲取 'category' 參數 (tw, jp, world)
    const url = new URL(context.request.url);
    const category = url.searchParams.get('category') || 'tw'; // 預設為 'tw'

    // 3. [修改] 根據類別建立 GNews API 網址
    //    GNews 使用 'token' 作為金鑰參數
    //    GNews 使用 'lang' 和 'country' 來篩選
    //    GNews 使用 'topic=headlines' 來取得頭條
    //    GNews 使用 'max=5' 來限制數量
    const BASE_URL = 'https://gnews.io/api/v4/top-headlines';
    const MAX_ARTICLES = 5;
    let realApiUrl;

    switch (category) {
        case 'jp':
            realApiUrl = `${BASE_URL}?topic=headlines&lang=ja&country=jp&max=${MAX_ARTICLES}&token=${API_KEY}`;
            break;
        case 'world':
            realApiUrl = `${BASE_URL}?topic=headlines&lang=en&max=${MAX_ARTICLES}&token=${API_KEY}`;
            break;
        case 'tw':
        default:
            // GNews 的 'zh-Hant' 似乎比 'country=tw' 更穩定
            realApiUrl = `${BASE_URL}?topic=headlines&lang=zh-Hant&max=${MAX_ARTICLES}&token=${API_KEY}`;
            break;
    }

    try {
        // 4. (關鍵) 從「伺服器」呼叫 GNews API
        //    (GNews 不需要 'User-Agent' 標頭)
        const newsResponse = await fetch(realApiUrl, {
            // Cloudflare 專屬：快取此 API 呼叫 30 分鐘 (1800 秒)
            // GNews 的免費方案有請求限制，快取非常重要！
            cf: {
                cacheTtl: 1800 
            }
        });

        // 檢查 GNews API 是否回傳錯誤
        if (!newsResponse.ok) {
            const errorData = await newsResponse.json();
            throw new Error(errorData.message || 'GNews API 請求失敗');
        }

        // 取得 GNews API 的 JSON 資料
        const data = await newsResponse.json();

        // 5. 將 GNews API 的資料原封不動地傳回給前端
        //    (幸運的是, GNews 和 NewsAPI 格式幾乎相同, 都有 'articles' 陣列)
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
