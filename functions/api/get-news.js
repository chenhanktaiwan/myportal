/* * =================================
 * Cloudflare Function (後端)
 * 檔名: /functions/api/get-news.js
 *
 * [已修改] 
 * - 繞過 rss2json.com，改為直接抓取 Google News RSS (XML)
 * - 在後端手動解析 XML，轉換為 JSON
 * - 不再有第三方服務依賴，更穩定
 * =================================
 */

export async function onRequest(context) {
    
    // 1. 從前端請求的 URL 中獲取 'category' 參數 (tw, jp, world)
    const url = new URL(context.request.url);
    const category = url.searchParams.get('category') || 'tw'; // 預設為 'tw'

    // 2. 定義 Google News RSS Feeds 網址
    const RSS_FEEDS = {
        tw: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGczTWpVMU5TRUtGZ0poWjJVb0FBUAE?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
        jp: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGczTWpZc05TRUtGZ0poWjJVb0FBUAE?hl=ja&gl=JP&ceid=JP:ja',
        world: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRXdvSkwyMHZNRGcyZWhjU05TRUtGZ0poWjJVb0FBUAE?hl=en-US&gl=US&ceid=US:en'
    };

    const rssUrl = RSS_FEEDS[category] || RSS_FEEDS['tw'];

    try {
        // 3. [修改] 直接抓取 Google News 的 RSS (XML)
        const response = await fetch(rssUrl, {
            headers: {
                // 偽裝成瀏覽器，避免被 Google News 封鎖
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            cf: {
                cacheTtl: 1800 // 同樣快取 30 分鐘
            }
        });

        if (!response.ok) {
            throw new Error(`抓取 Google News RSS 失敗, 狀態: ${response.status}`);
        }

        // 取得 XML 純文字
        const xmlText = await response.text();

        // 4. [修改] 手動解析 XML
        //    這會尋找 <item>...</item> 區塊
        const items = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        
        const articles = [];
        const maxArticles = 5; // 只取前 5 筆

        for (let i = 0; i < items.length && i < maxArticles; i++) {
            const itemContent = items[i][1];
            
            // 抓取 <title>...</title>
            const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
            const title = titleMatch ? cleanCData(titleMatch[1]) : '無標題';
            
            // 抓取 <link>...</link>
            const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
            const link = linkMatch ? linkMatch[1] : '#';

            // 抓取 <source ...>...</source> 或 <dc:creator>...</dc:creator> (作者)
            const sourceMatch = itemContent.match(/<source [^>]+>([\s\S]*?)<\/source>/);
            let sourceName = sourceMatch ? sourceMatch[1] : null;
            if (!sourceName) {
                 const creatorMatch = itemContent.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/);
                 sourceName = creatorMatch ? creatorMatch[1] : 'Google News';
            }
            
            articles.push({
                title: title,
                url: link,
                source: {
                    name: sourceName
                }
            });
        }
        
        // 5. 建立與前端 app.js 相容的最終 JSON 物件
        const finalResponse = {
            status: 'ok',
            totalResults: articles.length,
            articles: articles
        };

        // 6. 將「轉換後」的資料傳回給前端
        return new Response(JSON.stringify(finalResponse), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=1800'
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

// 輔助函式：移除 RSS 中可能包含的 <![CDATA[...]]> 標記
function cleanCData(str) {
    if (str.startsWith('<![CDATA[') && str.endsWith(']]>')) {
        return str.substring(9, str.length - 3);
    }
    return str;
}
