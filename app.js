const config = require('./config');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const db = require('./db');
const logger = require('./log');

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
function updateStatus() {
    wss.send(JSON.stringify({
        status_name: "在线",
        status_desc: "服务器一切正常",
        last_updated: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status_color: "green"
    }));
}
// 配置 EJS 模板引擎
app.set('view engine', 'ejs');

// 提供静态文件
app.use('/static', express.static('public'));

// 渲染首页
app.get('/', (req, res) => {
    res.render('index', {
        port: config.port,
        user: config.user,
        hitokoto: config.hitokoto,
        repo: config.repo,
        canvas: config.canvas,
        status_name: '正常',
        status_desc: '服务器正常运行',
        last_updated: new Date().toLocaleString(),
        status_color: 'green'
    });
});
//为什么css也要用ejs渲染啊啊啊啊啊
app.get('/style.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.render('style', {
        background_img: config.img,
        alpha: config.alpha
    });
});


// 启动 HTTP 和 WebSocket 服务
const port = config.port;
server.listen(port, config.host, () => {
    logger.info(`🚀 Server running at http://${config.host}:${port}`);
});
