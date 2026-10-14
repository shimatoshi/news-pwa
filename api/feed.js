// 固定のニュースRSSだけを取得する。配信一覧は本文より短いキャッシュで更新。
const FEEDS = new Set(['top-picks', 'domestic', 'it', 'science', 'business']);
export default async function handler(req, res) {
  const category = req.query.category;
  if (!FEEDS.has(category)) return res.status(400).send('invalid category');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://news.yahoo.co.jp/rss/topics/${category}.xml`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/rss+xml,application/xml,text/xml' },
    });
    if (!response.ok) return res.status(502).send(`RSS upstream HTTP ${response.status}`);
    const xml = await response.text();
    if (!/<rss[\s>]/i.test(xml)) return res.status(502).send('invalid RSS response');
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).send(xml);
  } catch (_) {
    return res.status(504).send('RSS fetch timeout or network failure');
  } finally { clearTimeout(timer); }
}
