// 每次載入用一個 tag 標記請求，8081 的紀錄只顯示這一欄、這一次送出的
const newTag = () => `${document.body.dataset.mode}-${Math.random().toString(36).slice(2, 8)}`;
let tag = newTag();
const otherLog = document.querySelector('#other-log');

async function refreshOtherLog() {
  const entries = (await fetch(`${location.origin}/api/other-log`).then((r) => r.json())).filter((e) => e.url.includes(tag));
  const items = entries.map((e) => {
    const li = document.createElement('li');
    li.className = 'info';
    li.textContent = `${e.method} ${e.url.replace(`?from=${tag}`, '')}`;
    return li;
  });
  if (items.length === 0) {
    const li = document.createElement('li');
    li.textContent = '（一筆都沒收到）';
    items.push(li);
  }
  otherLog.replaceChildren(...items);
}

async function call(url) {
  const target = url.startsWith(location.origin) ? url : `${url}?from=${tag}`;
  try {
    const data = await fetch(target).then((r) => r.json());
    ok(`${new URL(url).pathname} 讀到：${data.message}`);
  } catch (e) {
    // CSP 擋下和 CORS 擋下都是 TypeError: Failed to fetch，要看藍色那行或 8081 的紀錄才分得出來
    info(`${new URL(url).pathname} 失敗：${e.message}`);
  }
}

const buttons = [...document.querySelectorAll('button[data-url]')];
for (const button of buttons) {
  button.addEventListener('click', async () => {
    await call(button.dataset.url);
    refreshOtherLog();
  });
}

// 清除紀錄：換一個新的 tag，之前送出的請求就不會再列出來
document.addEventListener('lab:clear', () => {
  tag = newTag();
  refreshOtherLog();
});

// 一載入就三個都打一次
(async () => {
  for (const button of buttons) await call(button.dataset.url);
  setTimeout(refreshOtherLog, 300);
})();
