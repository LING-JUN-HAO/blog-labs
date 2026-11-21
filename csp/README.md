# CSP 實驗

搭配文章〈CSP 是什麼？用 Content-Security-Policy 限制瀏覽器能執行的程式碼〉。文章的一個段落對應一個頁面，
每頁把要比較的 CSP 設定並排成好幾欄，一次載入就看得到差異，不用來回切換。

- `http://localhost:8080`：本站，Express + EJS。每一欄是一個 iframe，載入 `/<頁面>?mode=<設定>`，
  那次回應才送出對應的 CSP Header，欄位頂端會印出實際送出的 Header。
- `http://localhost:8081`：其他網站。Port 不同就是不同來源，用來扮演外部 API、外部圖片，以及攻擊者收集資料的地方。

| 頁面 | 段落 |
| --- | --- |
| `/basic` | CSP 是什麼？、CSP 的規則怎麼寫？（少了引號的 `self`） |
| `/default-src` | 常用的 directive：`default-src` 是預設值 |
| `/base-form` | 常用的 directive：`base-uri`、`form-action` |
| `/frame-ancestors` | 常用的 directive：`frame-ancestors` |
| `/connect-src` | connect-src 和 CORS 有什麼不同？ |
| `/unsafe-inline` | 為什麼不該直接加上 unsafe-inline？ |
| `/nonce`、`/hash`、`/strict-dynamic` | nonce、hash 與 strict-dynamic |
| `/trusted-types` | Trusted Types 限制字串進入危險 API |
| `/report-only` | 先用 Report-Only 觀察 |
| `/meta` | CSP 要設定在哪裡？（`<meta>` 的限制） |

Nuxt 與 Vercel 那兩段是設定檔寫法，這裡沒有另外做範例。

## 跑起來

```bash
npm install
npm run dev
```

打開 `http://localhost:8080`。

## 怎麼看結果

CSP 是伺服器**回應**時放在 Response Header 裡的，請求不會帶。每欄頂端灰底那塊印的就是那一欄收到的 Header；
要看瀏覽器實際收到的原始 Header，打開 DevTools → Network，點 `nonce?mode=random` 這類 document 請求 → Headers → Response Headers。

每欄裡紅色虛線框是攻擊者注入的內容、綠色虛線框是頁面自己的程式碼，框裡先列出原始碼，下面才是瀏覽器實際解析的結果
（`<script>` 本身看不見，所以要看原始碼才知道裡面藏了什麼）。

注入的內容不用 `alert()`，改成呼叫 `hit()`，頁面下方「結果」會用顏色區分：

- 綠色：頁面自己的程式碼正常執行。
- 紅色：攻擊者注入的程式碼執行了。
- 藍色：瀏覽器發出 `securitypolicyviolation` 事件，代表 CSP 擋下（或 Report-Only 回報）了某個東西。

需要點擊才會發生的動作（`eval()`、`fetch()`、寫入 `innerHTML`）載入時會自動執行一次。
想看 Console 的錯誤訊息，點欄位下方的「單獨開啟」，用 DevTools 看那一欄自己的頁面。

瀏覽器擴充功能有時會往頁面注入程式碼，也會被 CSP 擋下，偶爾多出一行跟實驗無關的藍色 `script-src-elem`。
結果看起來怪怪的，用無痕視窗（預設停用擴充功能）再開一次。

每頁的 `<script>` 與樣式都是外部檔案（`public/js/lab.js`、`public/style.css`），
不然 `default-src 'self'` 會連頁面自己的行內樣式、程式一起擋掉。打開 DevTools 的 Console 可以對照瀏覽器的錯誤訊息。

## 每頁看什麼

### CSP 是什麼？

1. 沒有 CSP：注入的 `<img onerror>` 執行，出現紅色那行。
2. `script-src 'self'`：`onerror` 還在 DOM 裡，但沒有執行，本站的 `lab.js` 照常執行。
3. `script-src self`：少了引號，`self` 被當成網域名稱，連本站的 `lab.js` 都被擋，那一欄停在紅底的提示，結果是空的。

### default-src

三張圖片分別來自本站、`8081`、`data:`。`default-src 'self'` 只留下本站那張；另外設定 `img-src` 後三張都回來，
`img-src` 取代了 `default-src` 對圖片的設定。

### base-uri 與 form-action

頁面被注入一個 `<base href="http://localhost:8081/">` 和一個假的登入表單（送到 `8081/steal`）。

1. 沒有 CSP、只有 `default-src 'self'`：「會員中心」被改到 `8081/account`；按「登入」，那一欄會跳到攻擊者的網站，顯示收到的帳密。
   `default-src` 管不到這兩件事。
2. 加上 `base-uri 'none'; form-action 'self'`：`<base>` 被忽略，連結留在本站；按「登入」被擋，畫面不動。

表單送出後按欄位下方的「重新載入」回到原本的畫面。

### frame-ancestors

六格嵌入的都是 `/framed`，三種設定 × 從本站或從 `8081/embed` 嵌入，每格下方顯示實際有沒有顯示出來。`'self'` 只允許本站嵌入，`'none'` 誰都不行；
沒有設定時其他網站也能把頁面放進 iframe。

### connect-src 和 CORS

每欄載入時 `fetch()` 同源 API、`8081` 有 CORS 的 API、`8081` 沒有 CORS 的 API，並列出這一欄送出、`8081` 實際收到的請求。

1. 沒有 CSP：沒有 CORS 那個讀不到回應，但「8081 收到的請求」有它，請求其實已經送到了。
2. `connect-src 'self'`：兩個外部 API 都在送出前被擋，`8081` 一筆都沒收到。
3. `connect-src 'self' http://localhost:8081`：回到跟沒有 CSP 一樣。

CORS 擋的是「讀回應」，擋不住資料外送；要擋外送靠 `connect-src`。

### unsafe-inline

注入行內 `<script>`、`onerror`、`onclick`、`javascript:` 連結四種。

`onclick` 與 `javascript:` 連結要自己點。

1. `script-src 'self'`：全部被擋，`eval()` 丟出 `EvalError`。
2. 加上 `'unsafe-inline'`：四種全部執行。
3. 加上 `'unsafe-eval'`：注入的一樣被擋，但 `eval()` 可以執行。

### nonce

1. 每次換新的 nonce：按「重新載入」nonce 會變；只有頁面自己帶正確 nonce 的 script 執行，注入的都被擋。
2. 寫死的 nonce：攻擊者猜 `nonce="demo"` 剛好猜中，那段 script 就執行了。

### hash

伺服器對行內 script 的完整內容算 SHA-256 放進 Header。「內容多一個空白」時 hash 對不上，頁面自己的 script 也被擋，
Chrome 的 Console 會列出這段內容實際的 hash。

### strict-dynamic

帶有 nonce 的行內 script 動態建立 `<script src="/js/widget.js">`。

1. 只有 nonce：`widget.js` 沒有 nonce，被擋。
2. 加上 `'strict-dynamic'`：信任傳給它建立的 `widget.js`，執行了。

兩種情況下，直接寫在 HTML 裡、沒有 nonce 的 `<script src>` 都被擋。

### Trusted Types

同一段含 `onerror` 的字串用四種方式寫進 `innerHTML`：

1. 直接指定字串：沒有 Trusted Types 時 `onerror` 執行；加上後丟出 `TypeError`。
2. `app-policy`：先用 DOMPurify 清理，Hello 變粗體，`onerror` 被拿掉。
3. `bad-policy`：policy 直接回傳原字串，危險內容一樣被包成 `TrustedHTML`，`onerror` 執行。
4. 建立沒列在 `trusted-types` 裡的 policy：丟出 `TypeError`。

`trusted-types` 多列了 `dompurify`，因為 DOMPurify 會建立自己的 policy 來解析 HTML，不列進來它就無法運作。
這頁沒有設定 `script-src`，才看得到 `bad-policy` 讓 `onerror` 執行的結果。

### Report-Only

1. Report-Only：`onerror` 照樣執行，同時產生違規報告送到 `/csp-reports`，每欄的表格列出伺服器收到、屬於這一欄的報告。
2. 正式 Content-Security-Policy：`onerror` 被擋，一樣送出報告。

同時有 `report-to` 與 `report-uri` 時，支援 Reporting API 的瀏覽器只用 `report-to`。Chrome 會把報告累積一段時間再批次送出，
本機實測等了幾分鐘都不一定會出現在表格裡；只有 `report-uri` 的那欄會馬上收到。

Report-Only 模式下，Chrome 對同一個 `onerror` 會回報兩次違規，正式模式只有一次。

### `<meta>`

這頁不送 Header，`<meta http-equiv="Content-Security-Policy">` 寫在 `<head>` 中間：

1. `<meta>` 前面的行內 script 執行了，後面那段被擋。
2. `<meta>` 裡的 `frame-ancestors` 沒有作用，Console 有警告；頁面下方用 iframe 嵌入自己，照樣顯示。
