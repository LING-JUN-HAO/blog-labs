// 比較頁：iframe 高度跟著內容走，不用在小框框裡捲動
const frames = [...document.querySelectorAll('.compare-col iframe')];

function fit() {
  for (const frame of frames) {
    try {
      const doc = frame.contentDocument;
      if (!doc?.body) continue;
      // 量 body 而不是 scrollHeight：scrollHeight 不會小於 iframe 目前的高度，清除後就縮不回來
      const height = Math.ceil(doc.body.getBoundingClientRect().height);
      if (Math.abs(frame.offsetHeight - height) > 2) frame.style.height = `${height}px`;
    } catch {
      // 跳到其他網站（例如表單送到 8081）就讀不到了，維持原本的高度
    }
  }
}

setInterval(fit, 300);

document.querySelector('#clear-all').addEventListener('click', () => {
  for (const frame of frames) {
    try {
      frame.contentWindow.labClear?.();
    } catch {
      // 已經跳到其他網站的欄位清不到
    }
  }
});

for (const button of document.querySelectorAll('.compare-col .reload')) {
  button.addEventListener('click', () => {
    const frame = button.closest('.compare-col').querySelector('iframe');
    frame.src = frame.getAttribute('src');
  });
}
