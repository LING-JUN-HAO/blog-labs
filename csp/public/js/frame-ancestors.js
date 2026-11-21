const loaded = new Set();

function mark(cell, shown) {
  const figure = document.querySelector(`[data-cell="${cell}"]`);
  const caption = figure.querySelector('.fa-result');
  figure.classList.toggle('blocked', !shown);
  caption.className = `fa-result ${shown ? 'good' : 'bad'}`;
  caption.textContent = shown ? '✓ 顯示' : '✗ 被擋下';
}

window.addEventListener('message', (e) => {
  if (e.data?.type !== 'framed-loaded') return;
  loaded.add(e.data.cell);
  mark(e.data.cell, true);
});

setTimeout(() => {
  for (const figure of document.querySelectorAll('[data-cell]')) {
    if (!loaded.has(figure.dataset.cell)) mark(figure.dataset.cell, false);
  }
}, 2000);
