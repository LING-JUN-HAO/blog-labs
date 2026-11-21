// 只顯示這一欄、這次載入（或清除）之後收到的報告
const mode = document.body.dataset.mode;
let since = new Date().toLocaleTimeString('zh-TW', { hour12: false });
const tbody = document.querySelector('#reports');

async function refresh() {
  const reports = (await fetch('/api/reports').then((r) => r.json())).filter((r) => r.mode === mode && r.at >= since);
  const rows = reports.map((r) => {
    const tr = document.createElement('tr');
    for (const value of [r.at, r.via, r.directive, r.disposition]) {
      const td = document.createElement('td');
      td.textContent = value ?? '';
      tr.append(td);
    }
    return tr;
  });
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = '（還沒收到）';
    tr.append(td);
    rows.push(tr);
  }
  tbody.replaceChildren(...rows);
}

// 清除紀錄：只顯示清除之後收到的報告
document.addEventListener('lab:clear', () => {
  since = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  refresh();
});

refresh();
setInterval(refresh, 2000);
