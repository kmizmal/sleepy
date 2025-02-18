const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./log');

// 统一导出的数据库接口对象
let sequelize;
const db = {};
const dbUrl = config.db_url;

// 根据 DB_URL 配置数据库连接
if (dbUrl.startsWith('sqlite:')) {
  const sqliteFilePath = dbUrl.replace('sqlite:', '');
  sequelize = new Sequelize({
    logging: (msg) => logger.debug(msg),  // 输出调试日志
    dialect: 'sqlite',  // 使用 SQLite 数据库
    storage: sqliteFilePath,  // SQLite 数据库文件路径
  });
  logger.verbose('使用 SQLite 数据库');
} else if (dbUrl.startsWith('mysql://')) {
  const mysqlUrl = new URL(dbUrl);
  sequelize = new Sequelize(mysqlUrl.pathname.slice(1), mysqlUrl.username, mysqlUrl.password, {
    logging: (msg) => logger.debug(msg),  // 输出调试日志
    host: mysqlUrl.hostname,  // MySQL 主机名
    dialect: 'mysql',  // 使用 MySQL 数据库
    port: mysqlUrl.port || 3306,  // MySQL 端口号
  });
  logger.verbose('使用 MySQL 数据库');
} else if (dbUrl.startsWith('postgres://')) {
  const postgresUrl = new URL(dbUrl);
  sequelize = new Sequelize(postgresUrl.pathname.slice(1), postgresUrl.username, postgresUrl.password, {
    logging: (msg) => logger.debug(msg),  // 输出调试日志
    host: postgresUrl.hostname,  // PostgreSQL 主机名
    dialect: 'postgres',  // 使用 PostgreSQL 数据库
    port: postgresUrl.port || 5432,  // PostgreSQL 端口号
  });
  logger.verbose('使用 PostgreSQL 数据库');
} else {
  logger.error('DB_URL格式错误');  // 如果 DB_URL 格式不正确，则输出错误并退出
  process.exit(1);
}

// 测试数据库连接
sequelize.authenticate()
  .then(() => {
    logger.info('数据库连接成功');
  })
  .catch(err => {
    logger.error('数据库连接失败', err);  // 如果连接失败，则输出错误并退出
    process.exit(1);
  });

// 定义 User 模型
db.User = sequelize.define('User', {
  userId: {
    type: Sequelize.INTEGER,
    primaryKey: true,  // 显式声明为主键
    autoIncrement: true,  // 自动递增
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,  // 姓名不能为空
  },
  email: {
    type: Sequelize.STRING,
    unique: true,  // 邮箱地址唯一
    allowNull: false,  // 邮箱不能为空
  },
  secret: {
    type: Sequelize.STRING,
    allowNull: false,  // 密码不能为空
  },
  status: {
    type: Sequelize.ENUM,
    values: ['活着', '死了', '不明'],  // 定义枚举值
    defaultValue: '不明',  // 默认值
    allowNull: false,  // 不允许为空
  },
}, {
  timestamps: true,  // 自动管理 createdAt 和 updatedAt 字段
});

// 定义 Device 模型
db.Device = sequelize.define('Device', {
  device: {
    type: Sequelize.STRING,
    defaultValue: '未使用',  // 默认值
    allowNull: false,  // 设备不能为空
  },
}, {
  timestamps: true,  // 自动管理 createdAt 和 updatedAt 字段
});

// 在 User 和 Device 之间建立一对多关联关系
db.User.hasMany(db.Device, { foreignKey: 'userId' });  // 一个用户可以有多个设备
db.Device.belongsTo(db.User, { foreignKey: 'userId' });  // 每个设备属于一个用户

// 同步数据库模型
sequelize.sync()
  .then(() => {
    logger.debug('数据库同步成功');
  })
  .catch(err => {
    logger.error('数据库同步异常', err);  // 如果同步失败，则输出错误信息
  });

// 查询所有用户
db.getAllUsers = async () => {
  try {
    return await db.User.findAll();
  } catch (error) {
    logger.error('无法查询用户', error);  // 如果查询用户失败，输出错误日志
    throw error;
  }
};

// 插入新用户
db.insertUser = async (name, email, secret) => {
  try {
    if (!email) { email = ''; }  // 如果没有提供 email，则设置为空字符串
    const newUser = await db.User.create({ name, email, secret });
    return newUser;
  } catch (error) {
    logger.error('插入用户失败', error);  // 插入用户失败时，输出错误日志
    throw error;
  }
};

// 更新用户信息
db.updateUser = async (Id, name, email, secret) => {
  try {
    const user = await db.User.findByPk(Id);
    if (user) {
      user.name = name;
      user.email = email;
      user.secret = secret;
      logger.debug(`更新时间${user.updatedAt}`);  // 输出更新后的时间
      await user.save();
      return user;
    } else {
      throw new Error('用户不存在');  // 如果用户不存在，抛出异常
    }
  } catch (error) {
    logger.error('用户信息更新失败', error);  // 如果更新用户信息失败，输出错误日志
    throw error;
  }
};

// 删除用户
db.deleteUser = async (userId) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      await user.destroy();  // 删除用户
      return { message: '用户删除成功' };
    } else {
      throw new Error('用户不存在');  // 如果用户不存在，抛出异常
    }
  } catch (error) {
    logger.error('用户删除失败', error);  // 删除失败时输出错误日志
    throw error;
  }
};

// 更新用户状态
db.updateStatus = async (userId, status) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      user.status = status;
      await user.save();
      return user;
    } else {
      throw new Error('用户不存在');
    }
  } catch (error) {
    logger.error('用户状态更新失败', error);  // 如果状态更新失败，输出错误日志
    throw error;
  }
};

// 查询用户状态
db.getStatus = async (userId) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      return {
        status: user.status,
        updatedAt: user.updatedAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),  // 格式化时间为中国时区
      };
    } else {
      throw new Error('用户不存在');
    }
  } catch (error) {
    logger.error('查询用户状态失败', error);  // 查询失败时输出错误日志
    throw error;
  }
};

// 增加用户设备
db.addDevice = async (userId, deviceName) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      const newDevice = await db.Device.create({ device: deviceName, userId });  // 为用户添加设备
      return newDevice;
    } else {
      throw new Error('用户不存在');
    }
  } catch (error) {
    logger.error('增加用户设备失败', error);  // 添加设备失败时输出错误日志
    throw error;
  }
};

// 查询用户设备
db.getDevice = async (userId) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      const devices = await user.getDevices();  // 获取用户的所有设备
      return devices;
    } else {
      throw new Error('用户不存在');
    }
  } catch (error) {
    logger.error('查询用户设备失败', error);  // 查询设备失败时输出错误日志
    throw error;
  }
};
// 查询用户所有设备的状态
db.getDevicesStatus = async (userId) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      // 查询该用户的所有设备
      const devices = await db.Device.findAll({
        where: { userId },
      });

      // 如果没有设备，返回一个提示信息
      if (devices.length === 0) {
        throw new Error('该用户没有设备');
      }

      // 返回每个设备的状态
      const deviceStatuses = devices.map(device => ({
        deviceName: device.device,
        status: device.status,  // 设备的状态
        updatedAt: device.updatedAt.toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),  // 格式化设备的更新时间
      }));

      return deviceStatuses;
    } else {
      throw new Error('用户不存在');
    }
  } catch (error) {
    logger.error('查询用户设备状态失败', error);
    throw error;
  }
};

module.exports = db;
