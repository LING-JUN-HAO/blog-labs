const href = document.querySelector('#account').href;
document.querySelector('#account-href').textContent = href;

if (new URL(href).origin === location.origin) ok('「會員中心」留在本站');
else hit(`「會員中心」被 <base> 改到 ${href}`);

// form-action 擋下時頁面不會動，結果會多一行藍色的 form-action
