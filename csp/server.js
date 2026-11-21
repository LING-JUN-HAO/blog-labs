const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');

const PORT = 8080;
const OTHER_PORT = 8081;
const SELF = `http://localhost:${PORT}`;
// Port 不同就是不同來源，用來扮演「其他網站」：外部 API、攻擊者的收集站
const OTHER = `http://localhost:${OTHER_PORT}`;

// 8081 收到的請求，兩個 server 在同一個 process，8080 的頁面可以直接查
const otherLog = [];
// 8080 收到的 CSP 違規報告
const reports = [];

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.get('/favicon.ico', (req, res) => res.status(204).end());

/**
 * 一段文章對應一個頁面。
 * - 沒帶 ?mode=：比較頁，每種 mode 各放一個 iframe 並排，一次看完。
 * - 帶 ?mode=：那個 mode 的實驗本體（比較頁的 iframe 就是載入這個），這次回應才真的送出 CSP。
 * mode 的 csp 可以是字串或函式（需要這次請求的 nonce 時）。
 */
function lab(view, title, modes) {
  app.get(`/${view}`, (req, res) => {
    const base = { title, view, modes, SELF, OTHER };
    if (!(req.query.mode in modes)) {
      return res.render(view, { ...base, compare: true, mode: null, nonce: '' });
    }

    const mode = req.query.mode;
    const m = modes[mode];
    const nonce = m.fixedNonce ?? crypto.randomBytes(16).toString('base64');
    const csp = typeof m.csp === 'function' ? m.csp({ nonce }) : m.csp;
    const header = m.header ?? 'Content-Security-Policy';

    if (csp) res.set(header, csp);
    if (m.headers) res.set(m.headers);

    res.render(view, { ...base, compare: false, mode, csp, header, extraHeaders: m.headers, nonce, ...m.locals });
  });
}

lab('basic', 'CSP 是什麼？', {
  none: { label: '沒有 CSP' },
  self: { label: "script-src 'self'", csp: "script-src 'self'" },
  noquote: { label: 'script-src self（少了引號）', csp: 'script-src self' },
});

lab('default-src', 'default-src 是其他 directive 的預設值', {
  none: { label: '沒有 CSP' },
  default: { label: "default-src 'self'", csp: "default-src 'self'" },
  img: {
    label: '另外開放 img-src',
    csp: `default-src 'self'; img-src 'self' data: ${OTHER}`,
  },
});

lab('base-form', 'base-uri 與 form-action', {
  none: { label: '沒有 CSP' },
  default: { label: "只有 default-src 'self'", csp: "default-src 'self'" },
  strict: {
    label: '加上 base-uri、form-action',
    csp: "default-src 'self'; base-uri 'none'; form-action 'self'",
  },
});

// frame-ancestors 由「被嵌入的頁面」送出，這頁本身不需要 CSP
const FRAME_SETTINGS = [
  { key: 'unset', label: '沒有設定', csp: null },
  { key: 'self', label: "frame-ancestors 'self'", csp: "frame-ancestors 'self'" },
  { key: 'none', label: "frame-ancestors 'none'", csp: "frame-ancestors 'none'" },
];

app.get('/frame-ancestors', (req, res) => {
  res.render('frame-ancestors', { title: 'frame-ancestors', settings: FRAME_SETTINGS, SELF, OTHER });
});

// 被 iframe 嵌入的頁面：?fa= 決定送哪一種 frame-ancestors，?from= 只是告訴最上層是哪一格
app.get('/framed', (req, res) => {
  const setting = FRAME_SETTINGS.find((s) => s.key === req.query.fa) ?? FRAME_SETTINGS[0];
  if (setting.csp) res.set('Content-Security-Policy', setting.csp);
  res.render('framed', { setting, SELF });
});

lab('connect-src', 'connect-src 和 CORS 有什麼不同？', {
  none: { label: '沒有 CSP' },
  self: { label: "connect-src 'self'", csp: "connect-src 'self'" },
  other: { label: `connect-src 'self' ${OTHER}`, csp: `connect-src 'self' ${OTHER}` },
});

app.get('/api/data', (req, res) => res.json({ from: SELF, message: '同源 API 的回應' }));

lab('unsafe-inline', "為什麼不該直接加上 'unsafe-inline'？", {
  self: { label: "script-src 'self'", csp: "script-src 'self'" },
  inline: { label: "加上 'unsafe-inline'", csp: "script-src 'self' 'unsafe-inline'" },
  eval: { label: "加上 'unsafe-eval'", csp: "script-src 'self' 'unsafe-eval'" },
});

lab('nonce', 'nonce', {
  random: {
    label: '每次回應都換新的 nonce',
    csp: ({ nonce }) => `script-src 'nonce-${nonce}'`,
  },
  fixed: {
    label: '寫死的 nonce（錯誤示範）',
    fixedNonce: 'demo',
    csp: ({ nonce }) => `script-src 'nonce-${nonce}'`,
  },
});

// hash 依照 <script> 與 </script> 之間的完整內容計算，多一個空白就對不上
const HASHED_SCRIPT = "\n      ok('有 hash 的行內 script 執行了');\n    ";
const HASH = crypto.createHash('sha256').update(HASHED_SCRIPT).digest('base64');

lab('hash', 'hash', {
  match: {
    label: '內容與 hash 相符',
    csp: `script-src 'self' 'sha256-${HASH}'`,
    locals: { script: HASHED_SCRIPT, hash: HASH },
  },
  tamper: {
    label: '內容多一個空白',
    csp: `script-src 'self' 'sha256-${HASH}'`,
    locals: { script: HASHED_SCRIPT.replace('ok(', 'ok( '), hash: HASH },
  },
});

lab('strict-dynamic', 'strict-dynamic', {
  nonce: {
    label: '只有 nonce',
    csp: ({ nonce }) => `script-src 'nonce-${nonce}'; object-src 'none'; base-uri 'none'`,
  },
  dynamic: {
    label: "加上 'strict-dynamic'",
    csp: ({ nonce }) => `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`,
  },
});

lab('trusted-types', 'Trusted Types', {
  none: { label: '沒有 Trusted Types' },
  enforce: {
    label: "require-trusted-types-for 'script'",
    // dompurify 是 DOMPurify 自己要建立的 policy，不列進來它就無法解析 HTML
    csp: "require-trusted-types-for 'script'; trusted-types app-policy bad-policy dompurify",
  },
});

// 報告網址帶上 mode，比較頁三個 iframe 才分得出哪筆報告是誰的
const reportingEndpoints = (mode) => ({ 'Reporting-Endpoints': `csp-endpoint="${SELF}/csp-reports?mode=${mode}"` });

lab('report-only', '先用 Report-Only 觀察', {
  reportTo: {
    label: 'Report-Only + report-to',
    header: 'Content-Security-Policy-Report-Only',
    csp: "script-src 'self'; report-to csp-endpoint; report-uri /csp-reports?mode=reportTo",
    headers: reportingEndpoints('reportTo'),
  },
  reportUri: {
    label: 'Report-Only + report-uri',
    header: 'Content-Security-Policy-Report-Only',
    csp: "script-src 'self'; report-uri /csp-reports?mode=reportUri",
  },
  enforce: {
    label: '正式 Content-Security-Policy',
    csp: "script-src 'self'; report-to csp-endpoint; report-uri /csp-reports?mode=enforce",
    headers: reportingEndpoints('enforce'),
  },
});

// report-to 送 application/reports+json（一次一批），report-uri 送 application/csp-report（一次一筆）
app.post('/csp-reports', express.json({ type: ['application/reports+json', 'application/csp-report', 'application/json'] }), (req, res) => {
  const at = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  if (Array.isArray(req.body)) {
    for (const r of req.body) {
      reports.push({ at, mode: req.query.mode, via: 'report-to', directive: r.body?.effectiveDirective, blocked: r.body?.blockedURL, disposition: r.body?.disposition, sample: r.body?.sample });
    }
  } else if (req.body?.['csp-report']) {
    const r = req.body['csp-report'];
    reports.push({ at, mode: req.query.mode, via: 'report-uri', directive: r['effective-directive'] ?? r['violated-directive'], blocked: r['blocked-uri'], disposition: r.disposition, sample: r['script-sample'] });
  }
  res.status(204).end();
});
app.get('/api/reports', (req, res) => res.json(reports));
app.post('/api/reports/clear', (req, res) => {
  reports.length = 0;
  res.status(204).end();
});

// 政策寫在 HTML 的 <meta>，不送 Header；?framed 是被自己嵌入的那份
app.get('/meta', (req, res) => {
  res.render('meta', { title: '用 <meta> 設定 CSP', framed: 'framed' in req.query });
});

app.get('/api/other-log', (req, res) => res.json(otherLog));
app.post('/api/other-log/clear', (req, res) => {
  otherLog.length = 0;
  res.status(204).end();
});

app.get('/account', (req, res) => res.render('message', { title: '本站的會員中心', body: `這是 ${SELF}/account，連結沒有被改走。`, SELF }));
app.get('/', (req, res) => res.render('index', { SELF, OTHER }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor', express.static(path.join(__dirname, 'node_modules/dompurify/dist')));

app.listen(PORT, () => console.log(`本站       ${SELF}`));

// ---------------------------------------------------------------------------
// 8081：其他網站。外部 API、外部圖片，也扮演攻擊者收集資料的地方。
// ---------------------------------------------------------------------------
const other = express();
other.set('view engine', 'ejs');
other.set('views', path.join(__dirname, 'views'));
other.get('/favicon.ico', (req, res) => res.status(204).end());

other.use((req, res, next) => {
  if (!req.path.startsWith('/img/')) {
    otherLog.push({ at: new Date().toLocaleTimeString('zh-TW', { hour12: false }), method: req.method, url: req.originalUrl });
  }
  next();
});

// 有 CORS：允許 8080 讀回應
other.get('/api/cors', (req, res) => {
  res.set('Access-Control-Allow-Origin', SELF);
  res.json({ from: OTHER, message: '有 CORS 的外部 API' });
});
// 沒有 CORS：請求照樣收到，只是 8080 讀不到回應
other.get('/api/no-cors', (req, res) => res.json({ from: OTHER, message: '沒有 CORS 的外部 API' }));

// 攻擊者的收集站
other.all('/steal', express.urlencoded({ extended: false }), (req, res) => {
  const data = req.method === 'POST' ? new URLSearchParams(req.body).toString() : req.originalUrl;
  otherLog[otherLog.length - 1].data = data;
  res.render('message', { title: '攻擊者的網站', body: `收到資料：${data}`, SELF });
});
other.get('/account', (req, res) => res.render('message', { title: '攻擊者的網站', body: `這是 ${OTHER}/account，「會員中心」被 <base> 改到這裡了。`, SELF }));

// 從其他網站嵌入 8080 的頁面
// 其他網站的頁面，裡面再用 iframe 嵌入 8080/framed
other.get('/embed', (req, res) => {
  const fa = FRAME_SETTINGS.some((s) => s.key === req.query.fa) ? req.query.fa : 'unset';
  res.render('embed', { fa, SELF, OTHER });
});

other.use(express.static(path.join(__dirname, 'public')));

other.listen(OTHER_PORT, () => console.log(`其他網站   ${OTHER}`));
