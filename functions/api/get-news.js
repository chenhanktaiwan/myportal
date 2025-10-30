/* * =================================
 * Cloudflare Function (後端)
 * 檔名: /functions/api/get-news.js
 * * 功能: 讀取您指定的 RSS (CNA, NHK)
 * * [修正]: 將 'world' 來源從 nippon.com 更換為 BBC News
 * =================================
 */

export async function onRequest(context) {
    
    // 1. 從前端請求的 URL 中獲取 'category' 參數 (tw, jp, world)
    const url = new URL(context.request.url);
    // 前端傳 'intl' 時，我們在前端已將其對應為 'world'
    const category = url.searchParams.get('category') || 'tw'; 

    // 2. [修改] 更新 'world' 的 RSS Feed 網址
    const RSS_FEEDS = {
        tw: 'https://www.cna.com.tw/rsspolitics.xml',  // 中央通訊社 (政治)
        jp: 'https://www3.nhk.or.jp/rss/news/cat0.xml',    // NHK WORLD-JAPAN
        world: 'http://feeds.bbci.co.uk/news/world/rss.xml' // [修正] 改為 BBC News
    };

    const rssUrl = RSS_FEEDS[category] || RSS_FEEDS['tw'];

    try {
        // 3. 直接抓取 RSS (XML)
        const response = await fetch(rssUrl, {
            headers: {
                // 偽裝成瀏覽器，避免被 RSS 伺服器封鎖
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            cf: {
                cacheTtl: 1800 // 快取 30 分鐘
            }
        });

        if (!response.ok) {
            throw new Error(`抓取 RSS 失敗, 狀態: ${response.status} - ${response.statusText}`);
        }

        // 取得 XML 純文字
        const xmlText = await response.text();

        // 4. 手動解析 XML (尋找 <item>...</item> 區塊)
        // (BBC 和 NHK/CNA 都使用 <item> 標籤)
        const items = [...xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        
        // (備用方案: 處理 .rdf 格式)
        if (items.length === 0) {
             items.push(...xmlText.matchAll(/<item [^>]+>([\s\S]*?)<\/item>/g));
        }

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

            // 抓取 <source> 或 <dc:creator> (作者)
            let sourceName = 'BBC News'; // 預設為 BBC (因為 BBC RSS 裡沒有作者欄位)
            if (category === 'tw') sourceName = '中央通訊社';
            if (category === 'jp') sourceName = 'NHK';
            
            articles.push({
                title: title,
                url: link,
                source: {
                    name: sourceName
                }
            });
        }
        
        // 5. 建立與前端 app.js 相容的 JSON 物件
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
    // 也要清理 XML 轉義字元
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
