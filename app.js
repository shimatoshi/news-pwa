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

async function fetchPrefWeather(code, name) {
  const res = await fetch(`https://www.jma.go.jp/bosai/forecast/data/forecast/${code}.json`);
  if (!res.ok) return null;
  const fc = await res.json();

  // 今日明日の天気テキスト + 6時間毎降水確率 + 気温
  let todayTomorrow = [], hourlyPops = [], temps = {};
  if (fc[0]) {
    const ts0 = fc[0].timeSeries[0];
    const area0 = ts0.areas[0];
    todayTomorrow = ts0.timeDefines.map((d, i) => ({
      date: d, weather: (area0.weathers || [])[i] || '',
      code: (area0.weatherCodes || [])[i] || '',
    }));
    // 6時間毎の降水確率
    if (fc[0].timeSeries[1]) {
      const ts1 = fc[0].timeSeries[1];
      const popArea = ts1.areas[0];
      hourlyPops = ts1.timeDefines.map((d, i) => ({
        time: d, pop: (popArea.pops || [])[i] || '',
      }));
    }
    // 気温
    if (fc[0].timeSeries[2]) {
      const ts2 = fc[0].timeSeries[2];
      const tempArea = ts2.areas[0];
      const t = tempArea.temps || [];
      temps = { min: t[0] || '', max: t[1] || '' };
    }
  }

  // 週間予報
  let weekly = [];
  if (fc[1]) {
    const ts = fc[1].timeSeries[0];
    const area = ts.areas[0];
    const codes = area.weatherCodes || [];
    const pops = area.pops || [];
    const tsTemp = fc[1].timeSeries[1];
    const tempArea = tsTemp ? tsTemp.areas[0] : {};
    const maxTemps = tempArea.tempsMax || [];
    const minTemps = tempArea.tempsMin || [];

    weekly = ts.timeDefines.map((d, i) => {
      const date = new Date(d);
      const dow = DOW[date.getDay()];
      return {
        label: `${date.getMonth() + 1}/${date.getDate()}(${dow})`, dow,
        icon: (WEATHER_CODES[codes[i]] || ['', '❓'])[1],
        weather: (WEATHER_CODES[codes[i]] || [`天気${codes[i]}`])[0],
        pop: pops[i] || '', tempMax: maxTemps[i] || '', tempMin: minTemps[i] || '',
      };
    });
  }

  return { region: code, name, todayTomorrow, hourlyPops, temps, weekly, fetchedAt: new Date().toISOString() };
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
function renderNews(newsItems) {
  const panel = document.getElementById('panel-news');
  if (!newsItems || newsItems.length === 0) {
    panel.innerHTML = '<div class="empty">ニュースデータなし</div>';
    return;
  }
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
      html += `<div class="news-item">
          <div class="news-header" onclick="this.parentElement.classList.toggle('open')">
            <h3>${item.title}</h3>
            <div class="meta">${date}${item.source ? ' · ' + item.source : ''}</div>
          </div>
          <div class="news-body">
            <p>${item.description || '概要なし'}</p>
            <a href="${item.link}" target="_blank" rel="noopener" class="read-more">元記事を読む →</a>
          </div>
        </div>`;
    }
    html += `</div>`;
  }
  panel.innerHTML = html;
}

function renderPrefWeather(item) {
  let html = '';
  // 今日明日の天気
  if (item.todayTomorrow.length > 0) {
    html += `<div class="today-weather">`;
    for (const t of item.todayTomorrow) {
      const date = new Date(t.date);
      const label = `${date.getMonth()+1}/${date.getDate()}(${DOW[date.getDay()]})`;
      const icon = (WEATHER_CODES[t.code] || ['','❓'])[1];
      html += `<div class="today-item"><span class="today-label">${label}</span> ${icon} ${t.weather}</div>`;
    }
    if (item.temps.min || item.temps.max) {
      html += `<div class="today-temp">気温: <span class="lo">${item.temps.min || '-'}°</span> / <span class="hi">${item.temps.max || '-'}°</span></div>`;
    }
    html += `</div>`;
  }
  // 6時間毎の降水確率
  if (item.hourlyPops.length > 0) {
    html += `<div class="hourly-pops"><div class="hourly-label">降水確率</div><div class="hourly-bar">`;
    for (const h of item.hourlyPops) {
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
  }
  // 週間予報
  if (item.weekly.length > 0) {
    html += `<div class="week-grid">`;
    for (const d of item.weekly) {
      const dayClass = d.dow === '土' ? 'sat' : d.dow === '日' ? 'sun' : '';
      html += `<div class="day-card">
        <div class="day-name ${dayClass}">${d.label}</div>
        <div class="weather-icon">${d.icon}</div>
        <div class="weather-text">${d.weather}</div>
        ${d.tempMax || d.tempMin ? `<div class="temp"><span class="hi">${d.tempMax || '-'}°</span> / <span class="lo">${d.tempMin || '-'}°</span></div>` : ''}
        ${d.pop ? `<div class="pop">${d.pop}%</div>` : ''}
      </div>`;
    }
    html += `</div>`;
  }
  return html;
}

function renderWeather(weatherItems) {
  const panel = document.getElementById('panel-weather');
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
          <span class="pref-summary">${item.todayTomorrow[0] ? (WEATHER_CODES[item.todayTomorrow[0].code]||[''])[1] + ' ' + (WEATHER_CODES[item.todayTomorrow[0].code]||['?'])[0] : ''}</span>
        </div>
        <div class="pref-body">${renderPrefWeather(item)}</div>
      </div>`;
    }
    html += `</div></div>`;
  }
  panel.innerHTML = html;
}

// --- メイン ---
let refreshing = false;

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  const btn = document.getElementById('btn-refresh');
  btn.classList.add('loading');

  // 天気とニュースを並行
  const weatherPromise = fetchWeather().then(async (items) => {
    if (items.length > 0) {
      await dbPut(STORE_WEATHER, items);
      renderWeather(items);
    }
  }).catch(e => console.error('天気取得失敗:', e));

  const newsPromise = (async () => {
    const allNews = [];
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

  await Promise.all([weatherPromise, newsPromise]);
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
}

async function loadCached() {
  const [newsItems, weatherItems] = await Promise.all([
    dbGetAll(STORE_NEWS),
    dbGetAll(STORE_WEATHER),
  ]);
  renderNews(newsItems);
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
  if (navigator.onLine && await shouldAutoFetch()) {
    refresh();
  }
})();
