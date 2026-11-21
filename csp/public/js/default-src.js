for (const row of document.querySelectorAll('.images tr')) {
  const img = row.querySelector('img');
  const status = row.querySelector('.img-status');
  if (!img) continue;

  const show = () => {
    status.textContent = img.naturalWidth > 0 ? '✓ 載入成功' : '✗ 沒有載入';
  };
  if (img.complete) show();
  else {
    img.addEventListener('load', show);
    img.addEventListener('error', show);
  }
}
