const config = require('./config');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const logger = require('./log');
const utils = require('./utils');
const db = require('./db');

// 初始化应用
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let usersCache = [];

// 异步启动函数
async function startServer() {
    try {
      // 启动服务器
      server.listen(config.port, config.host, () => {
        logger.info(`🚀 Server running at http://${config.host}:${config.port}`);
        fetchUsersCache(); // 安全调用
      });
    } catch (err) {
      logger.error('🔥 服务器启动失败', err);
      process.exit(1);
    }
  }

// 处理 WebSocket 连接
wss.on('connection', ws => {
    // 发送初始消息
    const sendInitialStatus = () => {
        ws.send(JSON.stringify({
            status_name: "在线",
            status_desc: "服务器一切正常",
            last_updated: new Date().toLocaleString('zh-CN', { 
                timeZone: 'Asia/Shanghai', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            }),
            status_color: "green"
        }));
    };
    sendInitialStatus();
    // 断开连接时清理资源

});


// 获取用户数据（从缓存或数据库）
async function fetchUsersCache() {
    try {
        usersCache = await utils.GetUser();  // 等待缓存或数据库查询结果
    } catch (error) {
        logger.error('Error fetching users cache:', error);
    }
}

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

// 渲染用户主页
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
});

// 设置设备信息并处理用户和设备
app.get('/:username/device/set', async (req, res) => {
    const query = req.query; // 获取查询参数
    logger.info('Query received:', query);

    const { secret, id, show_name, app_name } = query;
    const username = req.params.username;

    // 参数验证
    if (!secret || !id || !show_name || !app_name) {
        return res.status(400).send('参数不完整');
    }

    try {
        // 用户验证或创建
        const userResult = await utils.UserIfNotExist(username, secret);
        if (userResult && userResult !== false) {
            const deviceArray = [{ id, show_name, app_name }];
            
            // 广播状态更新给所有 WebSocket 客户端
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    utils.updateStatus(client, userResult, deviceArray);
                }
            });
            res.send('User creation or password check completed.');
        } else {
            logger.warn('User creation failed or incorrect password');
            res.status(400).send('User creation failed or incorrect password');
        }
    } catch (error) {
        logger.error('Error processing device set:', error);
        res.status(500).send('Internal Server Error');
    }
});

// 启动服务
startServer();