// ニュース & 天気 PWA

const DB_NAME = 'news-weather-db';
const DB_VERSION = 1;
const STORE_NEWS = 'news';
const STORE_WEATHER = 'weather';
const STORE_META = 'meta';

// 気象庁の全予報区（地方→都道府県）
const WEATHER_AREAS = [
  { region: '北海道', codes: [
    ['011000','宗谷'],['012000','上川・留萌'],['013000','網走・北見・紋別'],['014030','十勝'],
    ['014100','釧路・根室'],['015000','胆振・日高'],['016000','石狩・空知・後志'],['017000','渡島・檜山']]},
  { region: '東北', codes: [
    ['020000','青森'],['030000','岩手'],['040000','宮城'],['050000','秋田'],['060000','山形'],['070000','福島']]},
  { region: '関東甲信', codes: [
    ['080000','茨城'],['090000','栃木'],['100000','群馬'],['110000','埼玉'],['120000','千葉'],
    ['130000','東京'],['140000','神奈川'],['190000','山梨'],['200000','長野']]},
  { region: '北陸', codes: [['150000','新潟'],['160000','富山'],['170000','石川'],['180000','福井']]},
  { region: '東海', codes: [['210000','岐阜'],['220000','静岡'],['230000','愛知'],['240000','三重']]},
  { region: '近畿', codes: [
    ['250000','滋賀'],['260000','京都'],['270000','大阪'],['280000','兵庫'],['290000','奈良'],['300000','和歌山']]},
  { region: '中国', codes: [['310000','鳥取'],['320000','島根'],['330000','岡山'],['340000','広島'],['350000','山口']]},
  { region: '四国', codes: [['360000','徳島'],['370000','香川'],['380000','愛媛'],['390000','高知']]},
  { region: '九州', codes: [
    ['400000','福岡'],['410000','佐賀'],['420000','長崎'],['430000','熊本'],['440000','大分'],
    ['450000','宮崎'],['460100','鹿児島']]},
  { region: '沖縄', codes: [['471000','沖縄本島'],['473000','宮古島'],['474000','八重山']]},
];

const CURRENTS_API_KEY = 'Bv9rfwwSo_5SIGS9p1wBlLGhD67QT7c8UQwWFEVo-JLPVSBT';
const NEWS_CATEGORIES = [
  { query: 'category=general', label: '総合' },
  { query: 'category=politics', label: '政治' },
  { query: 'category=technology', label: 'テクノロジー' },
  { query: 'category=science', label: '科学' },
  { query: 'category=business', label: '経済' },
];

const WEATHER_CODES = {
  '100': ['晴', '☀️'], '101': ['晴時々曇', '🌤️'], '102': ['晴一時雨', '🌦️'], '103': ['晴時々雨', '🌦️'],
  '104': ['晴一時雪', '🌨️'], '105': ['晴時々雪', '🌨️'],
  '110': ['晴後曇', '⛅'], '111': ['晴後雨', '🌦️'], '112': ['晴後一時雨', '🌦️'], '113': ['晴後時々雨', '🌦️'],
  '114': ['晴後雪', '🌨️'], '115': ['晴後一時雪', '🌨️'],
  '200': ['曇', '☁️'], '201': ['曇時々晴', '⛅'], '202': ['曇一時雨', '🌧️'], '203': ['曇時々雨', '🌧️'],
  '204': ['曇一時雪', '🌨️'], '205': ['曇時々雪', '🌨️'],
  '210': ['曇後晴', '⛅'], '211': ['曇後雨', '🌧️'], '212': ['曇後一時雨', '🌧️'], '213': ['曇後時々雨', '🌧️'],
  '214': ['曇後雪', '🌨️'], '215': ['曇後一時雪', '🌨️'],
  '300': ['雨', '🌧️'], '301': ['雨時々晴', '🌦️'], '302': ['雨一時曇', '🌧️'], '303': ['雨時々雪', '🌨️'],
  '304': ['雨時々曇', '🌧️'], '306': ['大雨', '⛈️'], '308': ['暴風雨', '🌪️'],
  '311': ['雨後晴', '🌦️'], '313': ['雨後曇', '🌧️'], '314': ['雨後雪', '🌨️'],
  '400': ['雪', '❄️'], '401': ['雪時々晴', '🌨️'], '402': ['雪一時曇', '🌨️'], '403': ['雪時々雨', '🌨️'],
  '411': ['雪後晴', '🌨️'], '413': ['雪後曇', '🌨️'], '414': ['雪後雨', '🌨️'],
};

// WMO天気コード（Open-Meteo） → [日本語, 絵文字]
const WMO_CODES = {
  0: ['快晴', '☀️'], 1: ['晴れ', '🌤️'], 2: ['薄曇り', '⛅'], 3: ['曇り', '☁️'],
  45: ['霧', '🌫️'], 48: ['霧氷', '🌫️'],
  51: ['弱い霧雨', '🌦️'], 53: ['霧雨', '🌦️'], 55: ['強い霧雨', '🌧️'],
  56: ['着氷性霧雨', '🌧️'], 57: ['着氷性霧雨', '🌧️'],
  61: ['弱い雨', '🌦️'], 63: ['雨', '🌧️'], 65: ['強い雨', '🌧️'],
  66: ['着氷性の雨', '🌧️'], 67: ['着氷性の雨', '🌧️'],
  71: ['弱い雪', '🌨️'], 73: ['雪', '🌨️'], 75: ['強い雪', '❄️'], 77: ['霧雪', '🌨️'],
  80: ['にわか雨', '🌦️'], 81: ['にわか雨', '🌧️'], 82: ['激しいにわか雨', '⛈️'],
  85: ['にわか雪', '🌨️'], 86: ['強いにわか雪', '❄️'],
  95: ['雷雨', '⛈️'], 96: ['雷雨（雹）', '⛈️'], 99: ['激しい雷雨', '⛈️'],
};
function wmo(code) { return WMO_CODES[code] || ['不明', '❓']; }

// 気象庁 警報・注意報コード → [名称, レベル]（special=特別警報 / warning=警報 / advisory=注意報）
const WARNING_CODES = {
  '32': ['暴風雪特別警報', 'special'], '33': ['大雨特別警報', 'special'], '35': ['暴風特別警報', 'special'],
  '36': ['大雪特別警報', 'special'], '37': ['波浪特別警報', 'special'], '38': ['高潮特別警報', 'special'],
  '02': ['暴風雪警報', 'warning'], '03': ['大雨警報', 'warning'], '04': ['洪水警報', 'warning'],
  '05': ['暴風警報', 'warning'], '06': ['大雪警報', 'warning'], '07': ['波浪警報', 'warning'], '08': ['高潮警報', 'warning'],
  '10': ['大雨注意報', 'advisory'], '12': ['大雪注意報', 'advisory'], '13': ['風雪注意報', 'advisory'],
  '14': ['雷注意報', 'advisory'], '15': ['強風注意報', 'advisory'], '16': ['波浪注意報', 'advisory'],
  '17': ['融雪注意報', 'advisory'], '18': ['洪水注意報', 'advisory'], '19': ['高潮注意報', 'advisory'],
  '20': ['濃霧注意報', 'advisory'], '21': ['乾燥注意報', 'advisory'], '22': ['なだれ注意報', 'advisory'],
  '23': ['低温注意報', 'advisory'], '24': ['霜注意報', 'advisory'], '25': ['着氷注意報', 'advisory'], '26': ['着雪注意報', 'advisory'],
};

const CAT_ICONS = { '総合': '📰', '政治': '🏛️', 'テクノロジー': '💻', '科学': '🔬', '経済': '💹' };
const DOW = ['日','月','火','水','木','金','土'];

// --- IndexedDB（シングルトン接続） ---
let dbInstance = null;

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      [STORE_NEWS, STORE_WEATHER, STORE_META].forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: name === STORE_META ? 'key' : name === STORE_NEWS ? 'id' : 'region' });
        }
      });
    };
    req.onsuccess = () => { dbInstance = req.result; resolve(dbInstance); };
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(storeName, data) {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  (Array.isArray(data) ? data : [data]).forEach(item => store.put(item));
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}

async function dbClear(storeName) {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).clear();
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}

async function dbGetAll(storeName) {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readonly');
  const req = tx.objectStore(storeName).getAll();
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}

async function dbGet(storeName, key) {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readonly');
  const req = tx.objectStore(storeName).get(key);
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}

// --- 進行状況 ---
function showProgress(text) {
  const el = document.getElementById('progress');
  if (el) { el.textContent = text; el.style.display = text ? 'block' : 'none'; }
}

// --- フェッチ ---
async function fetchNewsCategory(cat) {
  const url = `https://api.currentsapi.services/v1/latest-news?language=ja&${cat.query}&apiKey=${CURRENTS_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== 'ok' || !data.news) return [];
  return data.news.map((item, i) => ({
    id: `${cat.label}-${i}`,
    title: (item.title || '').replace(/ - [^-]+$/, ''),
    link: item.url || '',
    pubDate: item.published || '',
    description: item.description || '',
    source: item.author || '',
    category: cat.label,
    fetchedAt: new Date().toISOString(),
  }));
}

// 記事本文をオフライン保存用に取得（CORSプロキシ経由 + Readability抽出）
// 先頭は自前の東京リージョン関数（Yahoo等の地域ブロックを回避）。失敗時は公開プロキシへ。
const CORS_PROXIES = [
  u => `/api/extract?url=${encodeURIComponent(u)}`,
  u => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

// プロキシのランディングページや地域/ボットブロックページを本文と誤認しないよう弾く
const BLOCK_MARKERS = [
  'no longer available in the EEA', 'EEA（European Economic Area', 'をご利用いただけません',
  'Access Restricted', 'access denied', 'CORSPROXY', 'Enable JavaScript and cookies',
  'いつもYahoo! JAPANのサービス', 'このサービスは、現在ご利用いただけません',
  'Just a moment', 'Attention Required', 'Please verify you are a human',
];
function isBlockedPage(text, title) {
  const hay = ((title || '') + ' ' + text.slice(0, 600)).toLowerCase();
  return BLOCK_MARKERS.some(m => hay.includes(m.toLowerCase()));
}

async function fetchArticleBody(url) {
  if (!url || typeof Readability !== 'function') return null;
  for (const proxy of CORS_PROXIES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(proxy(url), { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const html = await res.text();
      if (!html || html.length < 200) continue;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // 相対URL解決のため<base>を補う
      if (!doc.querySelector('base')) {
        const base = doc.createElement('base');
        base.href = url;
        doc.head && doc.head.prepend(base);
      }
      const article = new Readability(doc).parse();
      const text = article && article.textContent ? article.textContent.trim() : '';
      if (text.length > 200 && !isBlockedPage(text, article.title)) {
        return {
          body: text,
          byline: article.byline || '',
          siteName: article.siteName || '',
        };
      }
    } catch (e) { /* 次のプロキシへ */ }
  }
  return null;
}

// 全記事の本文をバックグラウンドで取得（同時実行を絞る）
async function prefetchBodies(items) {
  const targets = items.filter(it => !it.body && it.link);
  if (targets.length === 0) return;
  let done = 0;
  const total = targets.length;
  const CONCURRENCY = 3;
  let idx = 0;

  async function worker() {
    while (idx < targets.length) {
      const item = targets[idx++];
      const art = await fetchArticleBody(item.link).catch(() => null);
      if (art && art.body) {
        item.body = art.body;
        item.byline = art.byline;
        item.siteName = art.siteName;
        await dbPut(STORE_NEWS, item).catch(() => {});
        markSaved(item.id);
      }
      done++;
      showProgress(`記事を保存中... ${done}/${total}`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  showProgress('');
}

async function fetchPrefWeather(code, name) {
  // 天気予報と警報・注意報を並行取得（警報は失敗しても天気は出す）
  const [res, warn] = await Promise.all([
    fetch(`https://www.jma.go.jp/bosai/forecast/data/forecast/${code}.json`),
    fetchWarnings(code).catch(() => null),
  ]);
  if (!res.ok) return null;
  const fc = await res.json();

  // --- 今日明日：細分区域ごと（北西部/南部 等） ---
  // 天気(timeSeries[0])と降水確率(timeSeries[1])は同じ区域コードを持つのでコードでペアリング
  let subAreas = [], tempPoints = [];
  if (fc[0]) {
    const ts0 = fc[0].timeSeries[0];           // 天気
    const ts1 = fc[0].timeSeries[1];           // 降水確率
    const ts2 = fc[0].timeSeries[2];           // 気温（観測点）

    // 降水確率を区域コードで引けるように
    const popByCode = {};
    if (ts1) {
      for (const a of ts1.areas) {
        popByCode[a.area.code] = ts1.timeDefines.map((d, i) => ({
          time: d, pop: (a.pops || [])[i] || '',
        }));
      }
    }

    subAreas = ts0.areas.map(a => ({
      name: a.area.name,
      todayTomorrow: ts0.timeDefines.map((d, i) => ({
        date: d, weather: (a.weathers || [])[i] || '',
        code: (a.weatherCodes || [])[i] || '',
      })),
      hourlyPops: popByCode[a.area.code] || [],
      warnings: (warn && warn.byArea[a.area.code]) || [],  // 区域コードで警報を紐付け
    }));

    // 気温（観測点＝予報地点ごと）: temps = [今日最低, 今日最高, 明日最低, 明日最高] 想定
    // code は気象庁の観測所コード（アメダステーブルで緯度経度に変換 → Open-Meteoで地点別週間予報）
    if (ts2) {
      tempPoints = ts2.areas.map(a => {
        const t = a.temps || [];
        return { name: a.area.name, code: a.area.code, min: t[0] || '', max: t[1] || '', weekly: [] };
      });
    }
  }

  // 週間予報はJMAだと府県単位で粗く「どの地点か」が曖昧なので、
  // 各予報地点(tempPoints)ごとにOpen-Meteoで取得する（attachPointWeeklyで後付け）
  return {
    region: code, name, subAreas, tempPoints,
    headline: (warn && warn.headline) || '',  // 県全体の見出し文
    maxLevel: (warn && warn.maxLevel) || '',   // special / warning / advisory / ''
    fetchedAt: new Date().toISOString(),
  };
}

// 気象庁の警報・注意報を府県コードで取得 → 区域コードごとの警報配列＋見出し文に整形
async function fetchWarnings(code) {
  const res = await fetch(`https://www.jma.go.jp/bosai/warning/data/warning/${code}.json`);
  if (!res.ok) return null;
  const w = await res.json();
  const byArea = {};
  let maxLevel = '';
  const rank = { advisory: 1, warning: 2, special: 3 };
  // areaTypes[0] = 一次細分区域（天気の北西部/南部…と同じコード体系）
  for (const a of (w.areaTypes?.[0]?.areas || [])) {
    const list = [];
    for (const wn of (a.warnings || [])) {
      if (wn.status === '解除' || wn.status === '発表警報・注意報はなし') continue;
      const def = WARNING_CODES[wn.code];
      if (!def) continue;
      list.push({ name: def[0], level: def[1] });
      if ((rank[def[1]] || 0) > (rank[maxLevel] || 0)) maxLevel = def[1];
    }
    if (list.length) byArea[a.code] = list;
  }
  return { byArea, headline: w.headlineText || '', maxLevel };
}

// アメダス観測所テーブル（コード→緯度経度）。一度取得したらキャッシュ。
let _amedasTable = null;
async function getAmedasTable() {
  if (_amedasTable) return _amedasTable;
  const cached = await dbGet(STORE_META, 'amedas').catch(() => null);
  if (cached && cached.table) { _amedasTable = cached.table; return _amedasTable; }
  const res = await fetch('https://www.jma.go.jp/bosai/amedas/const/amedastable.json');
  if (!res.ok) throw new Error('amedastable ' + res.status);
  _amedasTable = await res.json();
  dbPut(STORE_META, { key: 'amedas', table: _amedasTable, fetchedAt: new Date().toISOString() }).catch(() => {});
  return _amedasTable;
}

// 全予報地点の週間予報をOpen-Meteoで取得して tempPoints[].weekly に格納
async function attachPointWeekly(results) {
  let table;
  try { table = await getAmedasTable(); } catch (e) { console.warn('アメダステーブル取得失敗:', e); return; }

  const pts = [];
  for (const r of results) {
    for (const tp of (r.tempPoints || [])) {
      const st = table[tp.code];
      if (st && st.lat && st.lon) {
        pts.push({ lat: st.lat[0] + st.lat[1] / 60, lon: st.lon[0] + st.lon[1] / 60, tp });
      }
    }
  }
  if (!pts.length) return;

  const BATCH = 100;
  for (let i = 0; i < pts.length; i += BATCH) {
    const batch = pts.slice(i, i + BATCH);
    const lats = batch.map(p => p.lat.toFixed(4)).join(',');
    const lons = batch.map(p => p.lon.toFixed(4)).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
      + `&timezone=Asia%2FTokyo&forecast_days=7`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      let arr = await res.json();
      if (!Array.isArray(arr)) arr = [arr]; // 1地点だとオブジェクトで返る
      arr.forEach((loc, j) => {
        const dl = loc.daily;
        if (!dl || !batch[j]) return;
        batch[j].tp.weekly = dl.time.map((t, k) => ({
          date: t, code: dl.weather_code[k],
          tmax: dl.temperature_2m_max[k], tmin: dl.temperature_2m_min[k],
          pop: dl.precipitation_probability_max[k],
        }));
      });
    } catch (e) { /* このバッチはスキップ */ }
    showProgress(`週間予報取得中... ${Math.min(i + BATCH, pts.length)}/${pts.length}地点`);
  }
}

async function fetchWeather() {
  const allCodes = WEATHER_AREAS.flatMap(a => a.codes);
  const total = allCodes.length;
  let done = 0;
  const results = [];

  // 5並行で取得（サーバー負荷考慮）
  for (let i = 0; i < allCodes.length; i += 5) {
    const batch = allCodes.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(([code, name]) => fetchPrefWeather(code, name).catch(() => null))
    );
    results.push(...batchResults.filter(Boolean));
    done += batch.length;
    showProgress(`天気取得中... ${done}/${total}`);
  }

  // 各予報地点の週間予報（Open-Meteo）を付与
  await attachPointWeekly(results);
  return results;
}

// --- 更新判定 ---
function getTimeSlot() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'afternoon';
  return 'evening';
}

async function shouldAutoFetch() {
  const meta = await dbGet(STORE_META, 'lastFetch');
  if (!meta) return true;
  return !(meta.date === new Date().toDateString() && meta.slot === getTimeSlot());
}

// --- 表示 ---
const newsById = {};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function renderNews(newsItems) {
  const panel = document.getElementById('panel-news');
  if (!newsItems || newsItems.length === 0) {
    panel.innerHTML = '<div class="empty">ニュースデータなし</div>';
    return;
  }
  for (const item of newsItems) newsById[item.id] = item;

  const grouped = {};
  newsItems.forEach(item => {
    (grouped[item.category] ||= []).push(item);
  });

  let html = '';
  for (const [cat, items] of Object.entries(grouped)) {
    html += `<div class="news-category">
      <div class="cat-header">
        <h2>${CAT_ICONS[cat] || '📄'} ${cat}</h2>
        <span class="count">${items.length}件</span>
      </div>`;
    for (const item of items) {
      const date = item.pubDate ? new Date(item.pubDate).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      const saved = item.body ? '<span class="offline-badge" title="オフライン保存済み">📥</span>' : '';
      html += `<div class="news-item" data-id="${escapeHtml(item.id)}" onclick="openReader(this.dataset.id)">
          <div class="news-header">
            <h3>${escapeHtml(item.title)}</h3>
            <div class="meta">${date}${item.source ? ' · ' + escapeHtml(item.source) : ''}${saved}</div>
          </div>
        </div>`;
    }
    html += `</div>`;
  }
  panel.innerHTML = html;
}

// --- アプリ内リーダー ---
function bodyToHtml(text) {
  return text.split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${escapeHtml(p)}</p>`).join('');
}

async function openReader(id) {
  const item = newsById[id];
  if (!item) return;
  const overlay = document.getElementById('reader');
  const date = item.pubDate ? new Date(item.pubDate).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const renderBody = (state) => {
    let bodyHtml;
    if (item.body) bodyHtml = bodyToHtml(item.body);
    else if (state === 'loading') bodyHtml = '<p class="reader-note">本文を取得中…</p>';
    else if (state === 'offline') bodyHtml = `<p class="reader-note">オフラインのため全文を取得できません。</p><p>${escapeHtml(item.description || '')}</p>`;
    else bodyHtml = `<p class="reader-note">全文を取得できませんでした。概要を表示します。</p><p>${escapeHtml(item.description || '概要なし')}</p>`;
    overlay.querySelector('.reader-content').innerHTML = `
      <h2 class="reader-title">${escapeHtml(item.title)}</h2>
      <div class="reader-meta">${date}${item.source ? ' · ' + escapeHtml(item.source) : ''}${item.siteName ? ' · ' + escapeHtml(item.siteName) : ''}</div>
      <div class="reader-text">${bodyHtml}</div>
      <a href="${escapeHtml(item.link)}" target="_blank" rel="noopener" class="read-more">元記事を開く →</a>`;
  };

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderBody(item.body ? 'cached' : (navigator.onLine ? 'loading' : 'offline'));

  // 未保存かつオンラインなら全文を取りに行く
  if (!item.body && navigator.onLine) {
    const art = await fetchArticleBody(item.link);
    if (art && art.body) {
      item.body = art.body;
      item.byline = art.byline;
      item.siteName = art.siteName;
      dbPut(STORE_NEWS, item).catch(() => {});
      markSaved(id);
    }
    // オーバーレイがまだ同じ記事を表示中なら更新
    if (overlay.classList.contains('open')) renderBody(item.body ? 'cached' : 'fail');
  }
}

function closeReader() {
  document.getElementById('reader').classList.remove('open');
  document.body.style.overflow = '';
}

function markSaved(id) {
  const el = document.querySelector(`.news-item[data-id="${CSS.escape(id)}"] .meta`);
  if (el && !el.querySelector('.offline-badge')) {
    el.insertAdjacentHTML('beforeend', '<span class="offline-badge" title="オフライン保存済み">📥</span>');
  }
}

function renderHourlyPops(hourlyPops) {
  if (!hourlyPops || hourlyPops.length === 0) return '';
  let html = `<div class="hourly-pops"><div class="hourly-label">降水確率</div><div class="hourly-bar">`;
  for (const h of hourlyPops) {
    const date = new Date(h.time);
    const hour = `${date.getHours()}時`;
    const val = parseInt(h.pop) || 0;
    const color = val >= 60 ? '#e94560' : val >= 30 ? '#ff9800' : '#4fc3f7';
    html += `<div class="hourly-cell">
      <div class="hourly-time">${hour}</div>
      <div class="hourly-gauge" style="height:${Math.max(val, 4)}%;background:${color}"></div>
      <div class="hourly-val">${h.pop}%</div>
    </div>`;
  }
  html += `</div></div>`;
  return html;
}

// 警報バッジ（special=赤 / warning=橙 / advisory=黄）
function renderWarnBadges(warnings) {
  if (!warnings || !warnings.length) return '';
  let h = '<div class="warn-badges">';
  for (const w of warnings) h += `<span class="warn-badge warn-${w.level}">⚠️ ${w.name}</span>`;
  return h + '</div>';
}

function renderPrefWeather(item) {
  let html = '';
  // 県全体の警報見出し（出ているときだけ）
  if (item.headline) {
    html += `<div class="warn-headline warn-${item.maxLevel || 'advisory'}">⚠️ ${item.headline}</div>`;
  }
  // 今日明日の天気：細分区域ごと（柏=北西部 / 房総=南部 を区別）
  for (const sub of (item.subAreas || [])) {
    html += `<div class="sub-area"><div class="sub-name">${sub.name}</div>`;
    html += renderWarnBadges(sub.warnings);
    html += `<div class="today-weather">`;
    for (const t of sub.todayTomorrow) {
      const date = new Date(t.date);
      const label = `${date.getMonth()+1}/${date.getDate()}(${DOW[date.getDay()]})`;
      const icon = (WEATHER_CODES[t.code] || ['','❓'])[1];
      html += `<div class="today-item"><span class="today-label">${label}</span> ${icon} ${t.weather}</div>`;
    }
    html += `</div>`;
    html += renderHourlyPops(sub.hourlyPops);
    html += `</div>`;
  }
  // 週間予報：予報地点ごと（千葉 / 銚子 / 館山 …）。どの地点の予報か明示。
  for (const p of (item.tempPoints || [])) {
    const today = (p.min || p.max) ? ` <span class="point-now">今日 ${p.min || '-'}°/${p.max || '-'}°</span>` : '';
    html += `<div class="point-week"><div class="point-name">📍 ${p.name}${today}</div>`;
    if (p.weekly && p.weekly.length > 0) {
      html += `<div class="week-grid">`;
      for (const d of p.weekly) {
        const date = new Date(d.date);
        const dow = DOW[date.getDay()];
        const dayClass = dow === '土' ? 'sat' : dow === '日' ? 'sun' : '';
        const [wtxt, wic] = wmo(d.code);
        html += `<div class="day-card">
          <div class="day-name ${dayClass}">${date.getMonth()+1}/${date.getDate()}(${dow})</div>
          <div class="weather-icon">${wic}</div>
          <div class="weather-text">${wtxt}</div>
          <div class="temp"><span class="hi">${Math.round(d.tmax)}°</span> / <span class="lo">${Math.round(d.tmin)}°</span></div>
          ${d.pop != null ? `<div class="pop">${d.pop}%</div>` : ''}
        </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="point-noweek">週間予報なし</div>`;
    }
    html += `</div>`;
  }
  return html;
}

function renderWeather(weatherItems) {
  const panel = document.getElementById('jma-weather');
  if (!weatherItems || weatherItems.length === 0) {
    panel.innerHTML = '<div class="empty">天気データなし</div>';
    return;
  }
  // コードでルックアップ
  const byCode = {};
  for (const item of weatherItems) byCode[item.region] = item;

  let html = '';
  for (const area of WEATHER_AREAS) {
    const prefs = area.codes.filter(([code]) => byCode[code]);
    if (prefs.length === 0) continue;

    html += `<div class="weather-area">
      <div class="area-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="area-arrow">▶</span>
        <h3>${area.region}</h3>
        <span class="area-count">${prefs.length}</span>
      </div>
      <div class="area-body">`;
    for (const [code, name] of prefs) {
      const item = byCode[code];
      html += `<div class="weather-pref">
        <div class="pref-header" onclick="this.parentElement.classList.toggle('open')">
          <span>${name}</span>
          <span class="pref-summary">${(() => {
            const t0 = item.subAreas && item.subAreas[0] && item.subAreas[0].todayTomorrow[0];
            return t0 ? (WEATHER_CODES[t0.code]||[''])[1] + ' ' + (WEATHER_CODES[t0.code]||['?'])[0] : '';
          })()}</span>
        </div>
        <div class="pref-body">${renderPrefWeather(item)}</div>
      </div>`;
    }
    html += `</div></div>`;
  }
  panel.innerHTML = html;
}

// --- 現在地ピンポイント天気（Open-Meteo） ---
function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(err),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ja`);
    if (!res.ok) return '';
    const d = await res.json();
    const parts = [d.principalSubdivision, d.city, d.locality].filter(Boolean);
    return [...new Set(parts)].join(' ');
  } catch { return ''; }
}

async function fetchGeoWeather() {
  const coords = await getPosition();
  const lat = coords.latitude.toFixed(4), lon = coords.longitude.toFixed(4);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,weather_code,precipitation,relative_humidity_2m,wind_speed_10m,apparent_temperature`
    + `&hourly=temperature_2m,precipitation_probability,weather_code`
    + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
    + `&timezone=Asia%2FTokyo&forecast_days=7`;
  const [res, name] = await Promise.all([fetch(url), reverseGeocode(lat, lon)]);
  if (!res.ok) throw new Error('open-meteo ' + res.status);
  const d = await res.json();

  // 現在時刻以降の時間別（24時間分）
  const now = new Date();
  const h = d.hourly;
  let startIdx = h.time.findIndex(t => new Date(t) >= now);
  if (startIdx < 0) startIdx = 0;
  const hourly = [];
  for (let i = startIdx; i < Math.min(startIdx + 24, h.time.length); i++) {
    hourly.push({ time: h.time[i], temp: h.temperature_2m[i], pop: h.precipitation_probability[i], code: h.weather_code[i] });
  }

  const dl = d.daily;
  const daily = dl.time.map((t, i) => ({
    date: t, code: dl.weather_code[i],
    tmax: dl.temperature_2m_max[i], tmin: dl.temperature_2m_min[i],
    pop: dl.precipitation_probability_max[i],
  }));

  return {
    key: 'geoWeather', name: name || '現在地', lat, lon,
    current: d.current, hourly, daily, fetchedAt: new Date().toISOString(),
  };
}

function renderGeoWeather(data) {
  const el = document.getElementById('geo-weather');
  if (!el) return;
  if (!data || !data.current) {
    el.innerHTML = `<div class="geo-card geo-empty">
      <div>📍 現在地の天気</div>
      <button class="geo-btn" onclick="loadGeoWeather(true)">現在地を表示</button>
    </div>`;
    return;
  }
  const c = data.current;
  const [txt, icon] = wmo(c.weather_code);
  const updated = new Date(data.fetchedAt).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' });

  // 時間別バー（pop）
  let hourlyHtml = '';
  if (data.hourly && data.hourly.length) {
    hourlyHtml = `<div class="hourly-pops"><div class="hourly-label">時間別 降水確率・気温</div><div class="hourly-bar">`;
    for (const hh of data.hourly.slice(0, 12)) {
      const hr = new Date(hh.time).getHours();
      const val = hh.pop || 0;
      const color = val >= 60 ? '#e94560' : val >= 30 ? '#ff9800' : '#4fc3f7';
      hourlyHtml += `<div class="hourly-cell">
        <div class="hourly-time">${hr}時</div>
        <div class="hourly-gauge" style="height:${Math.max(val, 4)}%;background:${color}"></div>
        <div class="hourly-val">${val}%</div>
        <div class="hourly-temp">${Math.round(hh.temp)}°</div>
      </div>`;
    }
    hourlyHtml += `</div></div>`;
  }

  // 7日間
  let weekHtml = `<div class="week-grid">`;
  for (const d of data.daily) {
    const date = new Date(d.date);
    const dow = DOW[date.getDay()];
    const dayClass = dow === '土' ? 'sat' : dow === '日' ? 'sun' : '';
    const [, dicon] = wmo(d.code);
    weekHtml += `<div class="day-card">
      <div class="day-name ${dayClass}">${date.getMonth()+1}/${date.getDate()}(${dow})</div>
      <div class="weather-icon">${dicon}</div>
      <div class="weather-text">${wmo(d.code)[0]}</div>
      <div class="temp"><span class="hi">${Math.round(d.tmax)}°</span> / <span class="lo">${Math.round(d.tmin)}°</span></div>
      ${d.pop != null ? `<div class="pop">${d.pop}%</div>` : ''}
    </div>`;
  }
  weekHtml += `</div>`;

  el.innerHTML = `<div class="geo-card">
    <div class="geo-head">
      <div class="geo-name">📍 ${data.name}</div>
      <button class="geo-refresh" onclick="loadGeoWeather(true)" title="現在地を更新">↻</button>
    </div>
    <div class="geo-now">
      <span class="geo-icon">${icon}</span>
      <span class="geo-temp">${Math.round(c.temperature_2m)}°</span>
      <div class="geo-detail">
        <div>${txt}</div>
        <div>体感${Math.round(c.apparent_temperature)}° · 湿度${c.relative_humidity_2m}% · 風${Math.round(c.wind_speed_10m)}km/h</div>
      </div>
    </div>
    ${hourlyHtml}
    ${weekHtml}
    <div class="geo-updated">取得 ${updated}</div>
  </div>`;
}

async function loadGeoWeather(force) {
  // キャッシュ表示
  const cached = await dbGet(STORE_META, 'geoWeather');
  if (cached && !force) renderGeoWeather(cached);
  else if (!cached) renderGeoWeather(null);

  if (!navigator.onLine) return;
  if (!force && cached) {
    // キャッシュが新しければ（30分以内）再取得しない
    if (Date.now() - new Date(cached.fetchedAt).getTime() < 30 * 60 * 1000) return;
  }
  try {
    const data = await fetchGeoWeather();
    await dbPut(STORE_META, data);
    renderGeoWeather(data);
  } catch (e) {
    console.warn('現在地天気取得失敗:', e);
    if (!cached) renderGeoWeather(null);
  }
}

// --- メイン ---
let refreshing = false;

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  const btn = document.getElementById('btn-refresh');
  btn.classList.add('loading');

  // 天気とニュースを並行
  const geoPromise = loadGeoWeather(true).catch(e => console.warn('現在地天気:', e));
  const weatherPromise = fetchWeather().then(async (items) => {
    if (items.length > 0) {
      await dbPut(STORE_WEATHER, items);
      renderWeather(items);
    }
  }).catch(e => console.error('天気取得失敗:', e));

  let allNews = [];
  const newsPromise = (async () => {
    for (let i = 0; i < NEWS_CATEGORIES.length; i++) {
      const cat = NEWS_CATEGORIES[i];
      try {
        showProgress(`ニュース取得中... ${i + 1}/${NEWS_CATEGORIES.length} — ${cat.label}`);
        const items = await fetchNewsCategory(cat);
        allNews.push(...items);
        renderNews(allNews);
      } catch (e) {
        console.warn(`ニュース取得失敗: ${cat.label}`, e);
      }
    }
    if (allNews.length > 0) {
      await dbClear(STORE_NEWS);
      await dbPut(STORE_NEWS, allNews);
    }
  })();

  await Promise.all([geoPromise, weatherPromise, newsPromise]);
  showProgress('');

  await dbPut(STORE_META, {
    key: 'lastFetch',
    slot: getTimeSlot(),
    date: new Date().toDateString(),
    timestamp: new Date().toISOString(),
  });

  updateStatus();
  btn.classList.remove('loading');
  refreshing = false;

  // 本文をバックグラウンドで取得してオフライン保存（ボタンは先に解放）
  if (allNews.length > 0 && navigator.onLine) {
    prefetchBodies(allNews).catch(e => console.warn('本文取得失敗:', e));
  }
}

async function loadCached() {
  const [newsItems, weatherItems, geo] = await Promise.all([
    dbGetAll(STORE_NEWS),
    dbGetAll(STORE_WEATHER),
    dbGet(STORE_META, 'geoWeather'),
  ]);
  renderNews(newsItems);
  renderGeoWeather(geo || null);
  renderWeather(weatherItems);
}

async function updateStatus() {
  const el = document.getElementById('status');
  const online = navigator.onLine;
  const meta = await dbGet(STORE_META, 'lastFetch');
  const lastTime = meta ? new Date(meta.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'なし';
  el.textContent = `${online ? 'オンライン' : 'オフライン'} | 最終更新: ${lastTime}`;
  el.className = `status ${online ? 'online' : 'offline'}`;
}

// --- タブ切替 ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const panel = tab.dataset.panel;
    document.getElementById('panel-news').classList.toggle('active', panel === 'news');
    document.getElementById('panel-weather').classList.toggle('active', panel === 'weather');
  });
});

// --- 初期化 ---
document.getElementById('btn-refresh').addEventListener('click', refresh);
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);

(async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW登録失敗:', e));
  }
  await loadCached();
  updateStatus();
  // 位置情報の許可が既にあれば現在地天気を静かに更新（未許可なら勝手にプロンプトを出さない）
  if (navigator.onLine && navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' })
      .then(p => { if (p.state === 'granted') loadGeoWeather(false); })
      .catch(() => {});
  }
  if (navigator.onLine && await shouldAutoFetch()) {
    refresh();
  }
})();
