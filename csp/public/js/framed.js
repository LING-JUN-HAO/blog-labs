// 載入成功就告訴最上層的頁面是哪一格；被 frame-ancestors 擋下時這段根本不會執行
const params = new URLSearchParams(location.search);
if (window.top !== window) {
  window.top.postMessage({ type: 'framed-loaded', cell: `${params.get('from')}-${params.get('fa')}` }, '*');
}
