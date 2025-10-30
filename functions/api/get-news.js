/* * =================================
 * Cloudflare Function (後端)
 * 檔名: /functions/api/get-news.js
 *
 * [已修改] 
 * - 改為使用 Google News RSS Feeds
 * - 透過 rss2json.com 服務將 RSS 轉為 JSON
 * - 不再需要任何 API 金鑰
 * =================================
 */

export async function onRequest(context) {
    
    // 1. 從前端請求的 URL 中獲取 'category' 參數 (tw, jp, world)
    const url = new URL(context.request.url);
    const category = url.searchParams.get('category') || 'tw'; // 預設為 'tw'

    // 2. [修改] 定義 Google News RSS Feeds 網址
    const RSS_FEEDS = {
        tw: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGczTWpVMU5TRUtGZ0poWjJVb0FBUAE?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
        jp: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGczTWpZc05TRUtGZ0poWjJVb0FBUAE?hl=ja&gl=JP&ceid=JP:ja',
        world: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGcyZWhjU05TRUtGZ0poWjJVb0FBUAE?hl=en-US&gl=US&ceid=US:en'
    };

    // 取得對應的 RSS 網址
    const rssUrl = RSS_FEEDS[category] || RSS_FEEDS['tw'];

    // 3. [修改] 呼叫 rss2json API (免費服務)，將 RSS 轉為 JSON
    //    我們需要將 RSS 網址進行 URL 編碼 (encodeURIComponent)
    const rssToJsonApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    try {
        // 4. (關鍵) 從「伺服器」呼叫 rss2json API
        const newsResponse = await fetch(rssToJsonApiUrl, {
            // Cloudflare 專屬：快取此呼叫 30 分鐘 (1800 秒)
            // 這能避免 RSS 請求過於頻繁
            cf: {
                cacheTtl: 1800 
            }
        });

        // 檢查 rss2json API 是否回傳錯誤
        if (!newsResponse.ok) {
            throw new Error('rss2json API 請求失敗');
        }

        // 取得 rss2json 的 JSON 資料
        const data = await newsResponse.json();

        // 檢查 rss2json 的狀態
        if (data.status !== 'ok' || !data.items) {
            throw new Error('rss2json 未回傳有效的資料');
        }

        // 5. [關鍵] 轉換資料格式
        //    我們的前端 (app.js) 需要 { articles: [...] } 格式
        //    rss2json 回傳的是 { items: [...] } 格式
        //    我們必須手動將 data.items 轉換為 data.articles
        const articles = data.items.slice(0, 5).map(item => ({
            title: item.title,
            url: item.link, // rss2json 使用 'link'，我們的前端需要 'url'
            source: {
                name: item.author || 'Google News' // rss2json 使用 'author'，我們的前端需要 'source.name'
            }
            // pubDate: item.pubDate (如果未來需要時間，也可以從這裡抓)
        }));

        // 6. 建立與前端 app.js 相容的最終 JSON 物件
        const finalResponse = {
            status: 'ok',
            totalResults: articles.length,
            articles: articles
        };
        
        // 7. 將「轉換後」的資料傳回給前端
        return new Response(JSON.stringify(finalResponse), {
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
