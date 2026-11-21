if (document.currentScript?.src.includes('injected')) {
  hit('HTML 裡注入的 <script src> 執行了');
} else {
  ok('載入程式動態建立的 widget.js 執行了');
}
