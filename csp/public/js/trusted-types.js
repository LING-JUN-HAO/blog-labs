const userInput = `<b>Hello</b><img src="invalid" onerror="hit('onerror 執行了')">`;

// sanitize 集中在 policy 裡
const appPolicy = trustedTypes.createPolicy('app-policy', {
  createHTML(input) {
    return DOMPurify.sanitize(input);
  },
});

// 錯誤示範：policy 沒做任何處理
const badPolicy = trustedTypes.createPolicy('bad-policy', {
  createHTML(input) {
    return input;
  },
});

function render(key, label, value) {
  const container = document.querySelector(`[data-case="${key}"]`);
  try {
    container.innerHTML = value;
    ok(`${label}：寫入成功`);
  } catch (e) {
    container.textContent = `${e.name}`;
    info(`${label}：${e.name}（${e.message}）`);
  }
}

render('raw', '直接指定字串', userInput);
render('app', 'app-policy', appPolicy.createHTML(userInput));
render('bad', 'bad-policy', badPolicy.createHTML(userInput));

try {
  trustedTypes.createPolicy('other-policy', { createHTML: (s) => s });
  ok('建立沒列名的 other-policy：成功');
} catch (e) {
  info(`建立沒列名的 other-policy：${e.name}`);
}
