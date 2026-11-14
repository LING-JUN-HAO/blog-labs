const express = require('express');
const path = require('node:path');

const PORT = 8080;
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 從 JavaScript 程式碼進行 XSS 攻擊：伺服器把 name 用 <%- %> 原樣拼進 <script>
app.get('/javascript', (req, res) => {
  res.render('javascript', { name: String(req.query.name ?? '') });
});

// 其他頁面是純前端
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
