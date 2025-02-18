const fs = require('fs');
const dotenv = require('dotenv');

// 检查 .env 文件是否存在，如果不存在则使用 .env.example
const envFile = fs.existsSync('.env') ? '.env' : '.env.example';

// 如果使用 .env.example 文件，给出警告
if (envFile === '.env.example') {
    console.warn('[警告] .env 文件不存在，正在加载默认配置：.env.example');
}

// 加载环境变量
dotenv.config({ path: envFile });

// 定义 config 对象并设置配置
const config = {};
config.port = process.env.PORT;
config.host = process.env.HOST;
config.logLevel = process.env.LOG_LEVEL;
config.user= process.env.USER;
config.hitokoto = process.env.HITOKOTO;
config.repo = process.env.REPO;
config.canvas = process.env.CANVAS;
config.img = process.env.IMG;
config.alpha = process.env.ALPHA;
config.db_url = process.env.DB_URL;


module.exports = config;  // 导出 config 对象
// console.log('配置文件加载成功',config);
