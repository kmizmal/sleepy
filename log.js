const winston = require('winston');
const config = require('./config');
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),  // 让所有部分都带上颜色
    winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}][${level}] ${message}`;
    })
);

const logger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    transports: [
        // 输出到控制台
        new winston.transports.Console({ format: logFormat }),
        // 输出到文件
        new winston.transports.File({ filename: 'app.log' })
    ]
});
module.exports = logger;  // 导出 logger 对象
// 使用日志
// logger.info('This is an info message');
// logger.error('This is an error message');
// logger.warn('This is a warning message');
// error (0)
// warn (1)
// info (2)
// verbose (3)
// debug (4)
// silly (5)