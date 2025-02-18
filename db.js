const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./log');
// 统一导出的数据库接口对象
let sequelize;
const db = {};
const dbUrl = config.db_url;

if (dbUrl.startsWith('sqlite:')) {
  const sqliteFilePath = dbUrl.replace('sqlite:', '');
  sequelize = new Sequelize({
    logging: (msg) => logger.debug(msg),
    dialect: 'sqlite',
    storage: sqliteFilePath,
  });
  logger.verbose('使用 SQLite 数据库');
} else if (dbUrl.startsWith('mysql://')) {
  const mysqlUrl = new URL(dbUrl);
  sequelize = new Sequelize(mysqlUrl.pathname.slice(1), mysqlUrl.username, mysqlUrl.password, {
    logging: (msg) => logger.debug(msg),
    host: mysqlUrl.hostname,
    dialect: 'mysql',
    port: mysqlUrl.port || 3306,
  });
  logger.verbose('使用 MySQL 数据库');
} else if (dbUrl.startsWith('postgres://')) {
  const postgresUrl = new URL(dbUrl);
  sequelize = new Sequelize(postgresUrl.pathname.slice(1), postgresUrl.username, postgresUrl.password, {
    logging: (msg) => logger.debug(msg),
    host: postgresUrl.hostname,
    dialect: 'postgres',
    port: postgresUrl.port || 5432,
  });
  logger.verbose('使用 PostgreSQL 数据库');
} else {
  logger.error('DB_URL格式错误');
  process.exit(1);
}

// 测试数据库连接
sequelize.authenticate()
  .then(() => {
    logger.info('数据库连接成功');
  })
  .catch(err => {
    logger.error('数据库连接失败', err);
    process.exit(1);
  });

// 定义统一的数据库模型：User
db.User = sequelize.define('User', {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  email: {
    type: Sequelize.STRING,
    unique: true,
    allowNull: false,
  },
  secret: {
    type: Sequelize.STRING,
    allowNull: false,  // 不能为空
  },
  status: {
    type: Sequelize.ENUM,
    values: ['active', 'inactive', 'suspended'],  // 定义枚举值
    defaultValue: 'active',  // 默认值
    allowNull: false,  // 不允许为 NULL
  },
  timestamps: true,
});

// 同步数据库模型
sequelize.sync()
  .then(() => {
    logger.debug('数据库同步成功');
  })
  .catch(err => {
    logger.error('数据库同步异常', err);
  });

// 查询所有用户
db.getAllUsers = async () => {
  try {
    return await db.User.findAll();
  } catch (error) {
    logger.error('无法查询用户', error);
    throw error;
  }
};

// 插入新用户
db.insertUser = async (name, email,secret) => {
  try {
    if (!email) {email='';}
    const newUser = await db.User.create({ name,email,secret });
    return newUser;
  } catch (error) {
    logger.error('插入用户失败', error);
    throw error;
  }
};

// 更新用户信息
db.updateUser = async (userId, name, email,secret) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      user.name = name;
      user.email = email;
      user.secret = secret;
      logger.debug(`更新时间${user.updatedAt}`);
      await user.save();
      return user;
    } else {
      throw new Error('用户不存在');
    }
  } catch (error) {
    logger.error('用户信息更新失败', error);
    throw error;
  }
};

// 删除用户
db.deleteUser = async (userId) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      await user.destroy();
      return { message: '用户删除成功' };
    } else {
      throw new Error('用户不存在');
    }
  } catch (error) {
    logger.error('用户删除失败', error);
    throw error;
  }
};
//更新用户状态
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
    logger.error('用户状态更新失败', error);
    throw error;
  }
}
// 查询用户状态
db.getStatus = async (userId) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      return {
        status: user.status,
        updatedAt: user.updatedAt,  // 返回 updatedAt
      };
    } else {
      throw new Error('用户不存在');
    }
  } catch (error) {
    logger.error('查询用户状态失败', error);
    throw error;
  }
};

module.exports = db;
