# XSS 實驗

文章的一個段落對應一個頁面。Angular 那段是獨立的 Angular 專案，其他頁面由 Express 提供，有些是靜態 HTML，有些用 EJS 在伺服器端渲染。

| 頁面 | 段落 |
| --- | --- |
| `public/attribute.html` | 從 HTML 屬性進行 XSS 攻擊 |
| `public/javascript-url.html` | `javascript:` 偽協議 |
| `public/content.html` | 從 HTML 內容進行 XSS 攻擊 |
| `views/javascript.ejs`（`/javascript`） | 從 JavaScript 程式碼進行 XSS 攻擊 |
| `angular/` | 框架幫我們處理了什麼？以 Angular 為例 |

## 跑起來

```bash
npm install
npm run dev
```

打開 `http://localhost:8080`。不要直接雙擊 HTML 檔，EJS 的頁面需要伺服器。

Angular 那段另外開一個終端機：

```bash
cd angular
npm install
npm start
```

打開 `http://localhost:4200`。

## 從 HTML 屬性進行 XSS 攻擊

1. 點「正常值」，產生 `<div class="container">Demo</div>`，Demo 變綠色。
2. 點「攻擊」，產生 `<div class="" tabindex="1" onfocus="alert(1)" x="">Demo</div>`。
   這時候還不會跳 alert —— HTML 被注入不代表 JavaScript 會立刻執行。
3. 按 `Tab` 讓 Demo 取得焦點，才會跳出 `alert(1)`。
   頁面最後有一段 `focusin` 會把焦點移走：不然 alert 關掉後焦點回到 Demo，`onfocus` 會一直重複觸發。

## `javascript:` 偽協議

1. 點「正常值」，兩個「查看內容」都連到 MDN。
2. 點「攻擊」，上面那個連結的 `href` 是 `javascript:alert(1)`，點下去才會跳出 `alert(1)`。
3. 下面那個連結先用 `new URL()` 解析，協議不是 `http:` 或 `https:` 就換成 `#`，點了不會執行。

## 從 HTML 內容進行 XSS 攻擊

1. 點「正常值」，`<b>Hello</b>` 會變成粗體，代表內容被當成 HTML 解析。
2. 點「script 標籤」，產生的 HTML 裡有 `<script>alert(1)</script>`，但不會跳 alert：
   透過 `innerHTML` 插入的 `<script>` 不會執行。
3. 點「img onerror」，`src=x` 載入失敗觸發 `error` 事件，馬上跳出 `alert(1)`，不需要任何操作。

## 從 JavaScript 程式碼進行 XSS 攻擊

1. 點「正常值」，「name 的值」顯示 `Antonio`。
2. 點「攻擊」，一打開頁面就跳出 `alert(1)`。
   頁面上「瀏覽器收到的 &lt;script&gt;」會顯示 `const name = ''; alert(1); //';`：
   `'` 結束字串、`alert(1)` 執行、`//` 把後面多的 `';` 變成註解。
3. 這次 `<script>` 是伺服器回傳 HTML 的一部分，瀏覽器解析時就會執行，跟 `innerHTML` 插入的 `<script>` 不一樣。
4. 把 `views/javascript.ejs` 裡的 `<%- name %>` 改成 `<%= name %>` 再試：`'` 會被跳脫成 `&#39;`，
   但 `<script>` 裡不會解碼 HTML 實體，`name` 會變成字面上的 `&#39;; alert(1); //`，不會執行，只是值也不對了。

## Angular 的 XSS 防護

`angular/src/app/app.ts` 用同一段 `content` 比較四種寫法：

1. 模板插值：畫面直接顯示 `<strong>` 與 `<img>` 的原始字串。
2. `[innerHTML]`：Hello 變粗體，`onerror` 被拿掉，Console 會出現 `sanitizing HTML stripped some content` 的警告。
3. `[href]`：用 DevTools 看元素，`href` 變成 `unsafe:javascript:alert(1)`，點了不會跳 alert。
4. `bypassSecurityTrustHtml`：按「渲染繞過防護的內容」才會渲染，`onerror` 被保留下來，跳出 `alert(1)`。

## 加上 CSP 試試

在 `public/` 底下任一頁的 `<head>` 加上這行，重新整理再做一次：

```html
<meta http-equiv="Content-Security-Policy" content="script-src 'nonce-demo'">
```

HTML 一樣被注入，但 `onfocus`、`onerror` 都不會執行，Console 會出現違反 CSP 的錯誤。
頁面本身的 `<script nonce="demo">` 因為 nonce 對得上，還是會執行；行內事件處理器沒有 nonce，就被擋下來。

「從 JavaScript 程式碼」那頁要在 `views/javascript.ejs` 加，結果不一樣：`alert(1)` 照樣執行。
注入的程式碼就在帶有 nonce 的 `<script>` 裡面，CSP 分不出哪一行是攻擊者的。

## 加上 Trusted Types 試試

在 `public/content.html` 的 `<head>` 加上這行：

```html
<meta http-equiv="Content-Security-Policy" content="require-trusted-types-for 'script'">
```

重新整理後，`innerHTML = content` 這行會直接丟出 `TypeError`，Console 說它需要 `TrustedHTML`，不能再塞普通字串，
所以三個連結都不會有內容寫進畫面。Trusted Types 不會幫忙清理內容，它只是讓直接寫入字串的地方一定會被發現。

> 「產生出來的 HTML」是讀 `innerHTML` 序列化回來的結果，所以 `tabindex=1` 會顯示成 `tabindex="1"`。
