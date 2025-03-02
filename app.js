const config = require('./config');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const logger = require('./log');
const utils = require('./utils');
const db = require('./db');

// 异步获取 db 实例
async function fetchDbInstance() {
    const dbInstance = await db(); // 等待 db 初始化完成
    return dbInstance;
}

// 初始化应用
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function getNowTime() {
    return new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}



// 获取用户数据（从缓存或数据库）
async function fetchUsersCache() {
    try {
        usersCache = await utils.GetUser();  // 等待缓存或数据库查询结果
    } catch (error) {
        logger.error('Error fetching users cache:', error);
    }
}
// WebSocket 广播消息
function broadcastToClients(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
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


app.get('/:username', async (req, res) => {
    const username = req.params.username;

    try {
        const dbInstance = await fetchDbInstance();
        try {
            await dbInstance.addUser(username);
            logger.info(`新用户 ${username} 已创建`);
        } catch (error) {
            if (error.message !== '用户已存在') {
                throw error;
            }
        }
        // 获取设备状态
        const devicesStatus = await dbInstance.getDevicesStatus(username);
        // 渲染页面
        res.render('index', {
            port: config.port,
            user: username,
            hitokoto: config.hitokoto,
            repo: config.repo,
            canvas: config.canvas,
            background_img: config.img,
            alpha: config.alpha,
        });

        // 处理 WebSocket 连接
        const userStatus = await dbInstance.getUserStatus(username);
        // console.log('用户状态:', userStatus);
        wss.on('connection', (ws, req) => {
            const ip = req.socket.remoteAddress;
            console.log(`🟢 新的 WebSocket 连接: ${ip}`);
            const statusData = {
                status_name: userStatus || "未知",
                status_desc: "服务器发送内容",
                last_updated: getNowTime(),
                status_color: "green",
                device: devicesStatus || []
            };
            broadcastToClients(statusData);
            logger.info(`用户 ${username} 的设备状态已广播`);

            // 断开连接时清理资源
            ws.on('close', () => {
                console.log(`🔴 WebSocket 连接关闭: ${ip}`);
            });

            // 错误处理
            ws.on('error', (err) => {
                logger.error('WebSocket error:', err);
            });
        });

    } catch (error) {
        logger.error("请求处理失败:", { username, error: error.stack });
        res.status(500).render('error', {
            message: "服务器错误",
            detail: config.env === 'development' ? error.message : ''
        });
    }
});


// 设置设备信息并处理用户和设备
app.get('/:username/device/set', async (req, res) => {
    const { secret, id, show_name, app_name } = req.query;
    const username = req.params.username;

    if (!secret || !id || !show_name || !app_name) {
        return res.status(400).send('参数不完整');
    }

    try {
        const userResult = await utils.UserIfNotExist(username, secret);
        if (userResult && userResult !== false) {
            const deviceArray = [{ id, show_name, app_name }];

            // 向所有已连接的 WebSocket 客户端广播设备状态
            const statusData = {
                user: userResult,
                device: deviceArray
            };
            broadcastToClients(statusData);
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

// 异步启动函数
async function startServer() {
    try {
        // 启动服务器
        server.listen(config.port, config.host, () => {
            logger.info(`🚀 Server running at http://${config.host}:${config.port}`);
            fetchUsersCache();
        });
    } catch (err) {
        logger.error('🔥 服务器启动失败', err);
        process.exit(1);
    }
}

// 启动服务
startServer();
