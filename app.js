const config = require('./config');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const db = require('./db');
const logger = require('./log');
const utils = require('./utils');  // 引用 utils.js 中导出的函数


const app = express();// 创建 Express 应用

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 处理 WebSocket 连接
wss.on('connection', ws => {
    // 发送初始消息
    ws.send(JSON.stringify({
        status_name: "在线",
        status_desc: "服务器一切正常",
        last_updated: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status_color: "green"
    }));

    // 每 10 秒更新一次状态
    // setInterval(() => {
    //     ws.send(JSON.stringify({
    //         status_name: "离线",
    //         status_desc: "服务器暂时不可用",
    //         last_updated: new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai',year: 'numeric',month: 'long',day: 'numeric',hour: '2-digit',minute: '2-digit',second: '2-digit'}),
    //         status_color: "red"
    //     }));
    // }, 10000);
});
let usersCache = []; // 用于缓存查询结果的全局变量
// 配置 EJS 模板引擎
app.set('view engine', 'ejs');

// 提供静态文件
app.use(express.static('public'));
// 渲染首页
app.get('/', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    res.render('index', {
        port: config.port,
        user: config.user,
        hitokoto: config.hitokoto,
        repo: config.repo,
        canvas: config.canvas,
        background_img: config.img,
        alpha: config.alpha,
    });
});

app.get('/:username', (req, res) => {
    const username = req.params.username; // 获取 URL 中的参数
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    res.render('index', {
        port: config.port,
        user: username,
        hitokoto: config.hitokoto,
        repo: config.repo,
        canvas: config.canvas,
        background_img: config.img,
        alpha: config.alpha,
    });
    // logger.info(`访问用户 ${username}`);
});

app.get('/:username/device/set', (req, res) => {
    const query = req.query; // 获取查询参数
    console.log(query); // 在控制台打印参数
    const username = req.params.username;
    const secret = query.secret
    const id = query.id
    const show_name =query.show_name
    const app_name = query.app_name
    if (!secret || !id || !show_name || !app_name) {
        return res.status(400).send('参数不完整');
    }
    const result = await utils.UserIfNotExist(username, secret);
    // 检查 result 是否为有效的 updatedAt（意味着用户已创建）
if (result && result !== false) {
  // 如果 result 是 updatedAt，调用 updateStatus
  utils.updateStatus(result);
} else {
  console.log('User creation failed or incorrect password');
}
    //res.send(`Received query: ${JSON.stringify(query)}`);
});

// 启动 HTTP 和 WebSocket 服务
const port = config.port;
server.listen(port, config.host, () => {
    logger.info(`🚀 Server running at http://${config.host}:${port}`);
});
