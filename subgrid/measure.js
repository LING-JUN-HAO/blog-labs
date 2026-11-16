// 量測每張卡片的標題高度、中間內容與連結區域的起點，確認有沒有跨卡片對齊。
// 起點是相對於卡片頂端的距離；同一排的數字都一樣，就代表那一列有對齊。
// 視窗大小改變時重新量測，方便觀察響應式排版下分組的變化。

function measure() {
  const output = document.querySelector('.measure');
  if (!output) return;

  const cards = [...document.querySelectorAll('.card')];
  const rows = cards.map((card, index) => {
    const top = card.getBoundingClientRect().top;
    const offset = (selector) =>
      Math.round(card.querySelector(selector).getBoundingClientRect().top - top);

    return {
      name: card.dataset.name ?? String.fromCharCode(65 + index),
      cardTop: Math.round(top + window.scrollY),
      title: Math.round(card.querySelector('.card__title').getBoundingClientRect().height),
      content: offset('.card__content'),
      footer: offset('.card__footer'),
    };
  });

  // 卡片頂端位置相同的視為同一排，只在同一排裡比較
  const groups = Object.values(Object.groupBy(rows, (row) => row.cardTop));
  const aligned = (key) =>
    groups.every((group) => new Set(group.map((row) => row[key])).size === 1);

  output.innerHTML = `
    <table>
      <thead>
        <tr><th>卡片</th><th>標題高度</th><th>中間內容起點</th><th>連結區域起點</th></tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr><td>${row.name}</td><td>${row.title}px</td><td>${row.content}px</td><td>${row.footer}px</td></tr>`,
          )
          .join('')}
      </tbody>
    </table>
    <p class="verdict">
      中間內容${aligned('content') ? '有對齊' : '沒有對齊'}，
      連結區域${aligned('footer') ? '有對齊' : '沒有對齊'}
      ${groups.length > 1 ? `（共 ${groups.length} 排，每排各自比較）` : ''}
    </p>
  `;
}

window.addEventListener('load', measure);
window.addEventListener('resize', measure);
