// 記事本文取得用プロキシ（東京リージョンで実行 → Yahoo等の国外プロキシ地域ブロックを回避）
// HTMLをそのまま返し、本文抽出(Readability)はクライアント側で行う。
export default async function handler(req, res) {
  const url = req.query.url;
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).send('invalid url');
    return;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.8,en;q=0.5',
      },
    });
    const html = await r.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(r.ok ? 200 : 502).send(html);
  } catch (e) {
    res.status(504).send('fetch failed: ' + (e && e.message || 'unknown'));
  } finally {
    clearTimeout(timer);
  }
}
