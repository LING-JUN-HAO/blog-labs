// 每頁共用：把結果寫到畫面上，不用 alert，也不碰 innerHTML（Trusted Types 那頁也能用）
(() => {
  const queue = [];

  function write(kind, text) {
    const log = document.querySelector('#log');
    if (!log) {
      queue.push([kind, text]);
      return;
    }
    const li = document.createElement('li');
    li.className = kind;
    li.textContent = text;
    log.append(li);
  }

  // 注入的程式碼會呼叫 hit()：能看到紅色這行，代表攻擊成功
  window.hit = (text) => write('hit', `✗ ${text}`);
  // 頁面自己的程式碼正常執行
  window.ok = (text) => write('ok', `✓ ${text}`);
  window.info = (text) => write('info', text);

  // 把 directive 翻成白話：擋下的是什麼東西
  function describe(e) {
    // data: 網址的 blockedURI 只會給 "data"
    const url = e.blockedURI === 'data' ? 'data:' : e.blockedURI;
    const where = url && url !== 'inline' && url !== 'eval' ? ` ${url}` : '';
    switch (e.effectiveDirective) {
      case 'script-src-elem':
        return url === 'inline' ? '行內 <script>' : `外部 <script>${where}`;
      case 'script-src-attr':
        return '行內事件屬性（onerror、onclick…）';
      case 'script-src':
        return url === 'eval' ? 'eval()' : `JavaScript${where}`;
      case 'img-src':
        return `圖片${where}`;
      case 'connect-src':
        return `fetch 連線${where}`;
      case 'base-uri':
        return `<base>${where}`;
      case 'form-action':
        return `表單送出${where}`;
      case 'require-trusted-types-for':
        return '把字串直接寫進 innerHTML';
      case 'trusted-types':
        return `建立沒列名的 policy「${e.sample}」`;
      default:
        return url || '(inline)';
    }
  }

  // CSP 擋下（或 Report-Only 回報）的時候瀏覽器會發出這個事件
  document.addEventListener('securitypolicyviolation', (e) => {
    // 瀏覽器擴充功能注入的程式碼也會被擋，不是實驗的一部分
    if (/^(chrome|moz|safari-web)-extension:/.test(e.sourceFile)) return;
    const action = e.disposition === 'report' ? '回報（沒有擋）' : '擋下';
    write('blocked', `CSP ${action} ${describe(e)}（${e.effectiveDirective}）`);
  });

  // 清除結果；各頁自己的紀錄（8081 收到的請求、報告）聽 lab:clear 事件一起清
  window.labClear = () => {
    document.querySelector('#log')?.replaceChildren();
    document.dispatchEvent(new Event('lab:clear'));
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#clear-log')?.addEventListener('click', window.labClear);
    const status = document.querySelector('#lab-status');
    if (status) {
      status.textContent = 'lab.js 已執行（本站的外部 JavaScript 沒有被擋）';
      status.className = 'status good';
    }
    for (const [kind, text] of queue.splice(0)) write(kind, text);
  });
})();
