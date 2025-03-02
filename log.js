const winston = require('winston');

// 延迟 require 避免循环依赖
function getLogLevel() {
    return require('./config').logLevel;
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),  // 让所有部分都带上颜色
    winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}][${level}] ${message}`;
    })
);

const logger = winston.createLogger({
    level: getLogLevel(),  // 这样就不会在 require 时报错
    format: logFormat,
    transports: [
        new winston.transports.Console({ format: logFormat }),
        new winston.transports.File({ filename: 'app.log' })
    ]
});

module.exports = logger;
// 导出 logger 对象
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