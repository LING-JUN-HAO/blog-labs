# CORS 實驗

搭配文章〈CORS 到底在擋什麼？Vue 3 + NestJS 跨來源 Cookie 實作筆記〉，自己動手看 CORS、預檢請求和 Cookie 的 SameSite。

- 前端：Vue 3，`http://localhost:5173`
- 後端：NestJS，`http://localhost:3100`，Swagger 在 `http://localhost:3100/api`

## 跑起來

```bash
npm run setup   # 安裝根目錄、backend、frontend 的套件
npm run dev     # 同時啟動前後端
```

前端請用 `http://localhost:5173` 開，用 `127.0.0.1` 開的話同站、跨站會反過來。

## API

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| GET | `/heartbeat` | 回 204，不會預檢 |
| POST | `/users` | 送 JSON，會先預檢 |
| POST | `/auth/login` | 寫入 `refreshToken` Cookie，可帶 `?sameSite=strict\|lax\|none`，預設 `lax` |
| GET | `/auth/check` | 看這次請求有沒有帶到 `refreshToken` |

## 可以試試

畫面上可以選要打「同站」(`localhost:3100`) 還是「跨站」(`127.0.0.1:3100`)，也能切換 `withCredentials`。

1. 按 `/heartbeat`，Network 裡不會有 `OPTIONS`；按 `/users`，會先看到一筆 `OPTIONS`。
2. 在 `backend/src/main.ts` 的 `enableCors` 加上 `maxAge: 600`，再按 `/users`，第二次就不會預檢。
3. 把 `enableCors` 註解掉，請求會被 CORS 擋下來，Console 會出現錯誤。
4. 同站登入後按 `/auth/check`，會是 `true`。
5. 跨站登入後按 `/auth/check`，會是 `false`，因為 Cookie 是 `SameSite=Lax`，跨站不會帶。
6. 取消 `withCredentials` 再登入，Cookie 就不會帶也不會收。

換情境之前，先在 DevTools 的 Application → Cookies 把舊的 `refreshToken` 刪掉，不然結果會混在一起。
