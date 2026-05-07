// ニュース & 天気 PWA

const DB_NAME = 'news-weather-db';
const DB_VERSION = 1;
const STORE_NEWS = 'news';
const STORE_WEATHER = 'weather';
const STORE_META = 'meta';

const WEATHER_REGIONS = [
  { code: '016000', name: '北海道' },
  { code: '040000', name: '宮城' },
  { code: '130000', name: '東京' },
  { code: '150000', name: '新潟' },
  { code: '230000', name: '愛知' },
  { code: '270000', name: '大阪' },
  { code: '340000', name: '広島' },
  { code: '400000', name: '福岡' },
  { code: '471000', name: '沖縄' },
];

const NEWS_FEEDS = [
  { url: 'https://www.nhk.or.jp/rss/news/cat0.xml', category: '主要' },
  { url: 'https://www.nhk.or.jp/rss/news/cat1.xml', category: '社会' },
  { url: 'https://www.nhk.or.jp/rss/news/cat3.xml', category: '科学・文化' },
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

const CAT_ICONS = { '主要': '📰', '社会': '🏛️', '科学・文化': '🔬' };
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

// --- フェッチ ---
async function fetchSingleFeed(feed) {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (data.status !== 'ok' || !data.items) return [];
  return data.items.map((item, i) => ({
    id: `${feed.category}-${i}`,
    title: item.title || '',
    link: item.link || '',
    pubDate: item.pubDate || '',
    description: item.description || '',
    category: feed.category,
    fetchedAt: new Date().toISOString(),
  }));
}

async function fetchRegionWeather(region) {
  const [overviewRes, forecastRes] = await Promise.all([
    fetch(`https://www.jma.go.jp/bosai/forecast/data/overview_forecast/${region.code}.json`),
    fetch(`https://www.jma.go.jp/bosai/forecast/data/forecast/${region.code}.json`),
  ]);

  let overviewText = '', reportDatetime = '';
  if (overviewRes.ok) {
    const ov = await overviewRes.json();
    overviewText = ov.text || '';
    reportDatetime = ov.reportDatetime || '';
  }

  let days = [];
  if (forecastRes.ok) {
    const fc = await forecastRes.json();
    if (fc[1]) {
      const ts = fc[1].timeSeries[0];
      const area = ts.areas[0];
      const codes = area.weatherCodes || [];
      const pops = area.pops || [];
      const tsTemp = fc[1].timeSeries[1];
      const tempArea = tsTemp ? tsTemp.areas[0] : {};
      const maxTemps = tempArea.tempsMax || [];
      const minTemps = tempArea.tempsMin || [];

      days = ts.timeDefines.map((d, i) => {
        const date = new Date(d);
        const dow = DOW[date.getDay()];
        return {
          label: `${date.getMonth() + 1}/${date.getDate()}(${dow})`,
          dow,
          icon: (WEATHER_CODES[codes[i]] || ['', '❓'])[1],
          weather: (WEATHER_CODES[codes[i]] || [`天気${codes[i]}`])[0],
          pop: pops[i] || '',
          tempMax: maxTemps[i] || '',
          tempMin: minTemps[i] || '',
        };
      });
    }
  }

  if (!overviewText && days.length === 0) return null;
  return { region: region.code, name: region.name, reportDatetime, overview: overviewText, days, fetchedAt: new Date().toISOString() };
}

async function fetchWeather() {
  const results = await Promise.all(
    WEATHER_REGIONS.map(r => fetchRegionWeather(r).catch(() => null))
  );
  return results.filter(Boolean);
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
            <div class="meta">${date}</div>
          </div>
          <div class="news-body">
            <p>${item.description || '概要なし'}</p>
            <a href="${item.link}" target="_blank" rel="noopener" class="read-more">全文を読む →</a>
          </div>
        </div>`;
    }
    html += `</div>`;
  }
  panel.innerHTML = html;
}

function renderWeather(weatherItems) {
  const panel = document.getElementById('panel-weather');
  if (!weatherItems || weatherItems.length === 0) {
    panel.innerHTML = '<div class="empty">天気データなし</div>';
    return;
  }
  let html = '';
  for (const item of weatherItems) {
    const reportDate = item.reportDatetime
      ? new Date(item.reportDatetime).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
    html += `<div class="weather-region">
      <div class="region-header">
        <h3>${item.name}</h3>
        <span class="report-time">${reportDate}</span>
      </div>
      <div class="region-body">`;
    if (item.overview) {
      html += `<div class="region-overview">${item.overview}</div>`;
    }
    if (item.days && item.days.length > 0) {
      html += `<div class="week-grid">`;
      for (const d of item.days) {
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

  // 天気（全地域並行）とニュース（直列・逐次表示）を同時開始
  const weatherPromise = fetchWeather().then(async (items) => {
    if (items.length > 0) {
      await dbPut(STORE_WEATHER, items);
      renderWeather(items);
    }
  }).catch(e => console.error('天気取得失敗:', e));

  const newsPromise = (async () => {
    const allNews = [];
    for (const feed of NEWS_FEEDS) {
      try {
        const items = await fetchSingleFeed(feed);
        allNews.push(...items);
        renderNews(allNews);
      } catch (e) {
        console.warn(`RSS取得失敗: ${feed.category}`, e);
      }
    }
    if (allNews.length > 0) {
      await dbClear(STORE_NEWS);
      await dbPut(STORE_NEWS, allNews);
    }
  })();

  await Promise.all([weatherPromise, newsPromise]);

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
