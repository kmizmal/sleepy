const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./log');
const db = {};

// 提取数据库连接字符串解析逻辑 
function parseDbUrl(dbUrl) {
  if (dbUrl.startsWith('sqlite:')) {
    const sqliteFilePath = dbUrl.replace(/^sqlite:\/\//, '');
    return { dialect: 'sqlite', storage: sqliteFilePath };
  }
  const url = new URL(dbUrl);
  const config = {
    host: url.hostname,
    port: url.port || (url.protocol === 'mysql:' ? 3306 : 5432),
    username: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };
  if (dbUrl.startsWith('mysql://')) {
    config.dialect = 'mysql';
  } else if (dbUrl.startsWith('postgres://')) {
    config.dialect = 'postgres';
  } else {
    throw new Error('DB_URL 格式错误');
  }
  return config;
}

// 更新数据库连接的设置
function setupDatabaseConnection() {
  const dbUrl = config.db_url;
  const dbConfig = parseDbUrl(dbUrl);
  
  const sequelize = new Sequelize({
    logging: (msg) => logger.debug(msg),
    ...dbConfig,
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
  });
  
  const dialect = dbConfig.dialect === 'sqlite' ? 'SQLite' : dbConfig.dialect === 'mysql' ? 'MySQL' : 'PostgreSQL';
  logger.verbose(`使用 ${dialect} 数据库`);
  
  return sequelize;
}

// 数据库认证
async function authenticateDatabase(sequelize) {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接成功');
  } catch (err) {
    logger.error('数据库连接失败', err);
    process.exit(1);
  }
}

// 定义模型
function defineModels(sequelize) {
  db.User = sequelize.define('User', {
    userId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'sleepy用户id'
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,  //保证name唯一
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    secret: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM,
      values: ['活着', '死了', '不明'],
      defaultValue: '不明',
      allowNull: false,
    },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  db.Device = sequelize.define('Device', {
    device: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    ShowName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    status: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    userId: {  // 显式添加 userId 字段作为外键
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // 对应 User 模型的 tableName
        key: 'userId',
      },
    },
  }, {
    tableName: 'devices',
    timestamps: true,
  },);
  // 定义关系
  db.User.hasMany(db.Device, { foreignKey: 'userId' });
  db.Device.belongsTo(db.User, { foreignKey: 'userId' });
}

// 同步数据库模型 
async function syncDatabase(sequelize) {
  try {
    // 调用 sequelize.sync 并捕获详细错误
    await sequelize.sync({ alter: true, force: false });
    logger.info('数据库同步成功');
  } catch (err) {
    // 捕获 Validation error，输出详细错误信息
    if (err.name === 'SequelizeValidationError') {
      logger.error('数据库同步失败，验证错误:', err.errors);
    } else {
      logger.error('数据库同步异常', err);
    }
  }
}


// 增加用户
db.addUser = async (UserName) => {
  try {
    const user = await db.User.findOne({ where: { name: UserName } });
    if (user) {
      logger.info('用户已存在');
      return user;  // 如果用户已存在，直接返回现有用户
    }
    const newUser = await db.User.create({ name: UserName });
    logger.info(`用户 ${UserName} 创建成功`);
    return newUser;
  } catch (error) {
    logger.error('添加用户失败', error);
    throw error;  // 如果添加失败，抛出错误
  }
};



// 增加设备
db.addDevice = async (userId, deviceName, status) => {
  try {
    const user = await db.User.findByPk(userId);
    if (!user) { 
      console.log('用户不存在');
      throw new Error('用户不存在'); // 添加错误抛出，确保处理流程中断
    }
    const newDevice = await db.Device.create({ userId, device: deviceName, status });
    return newDevice;
  } catch (error) {
    logger.error('增加用户设备失败', error);
    throw error;
  }
};

// 查询用户所有设备的状态（通过 name 查找）
db.getDevicesStatus = async (name) => {
  try {
    const user = await db.User.findOne({ where: { name } });  // 使用 name 查找用户
    if (!user) {console.log('用户不存在');throw new Error('用户不存在');}

    const devices = await db.Device.findAll({ where: { userId: user.userId } });  // 按照 userId 查找设备
    if (devices.length === 0) {console.log("该用户没有设备");return}

    return devices.map(device => {
      // 确保 updatedAt 为有效日期对象
      const updatedAt = device.updatedAt instanceof Date
        ? device.updatedAt.toLocaleString('zh-CN', {
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : '未知';

      return {
        deviceName: device.device,
        status: device.status,
        updatedAt,
      };
    });
  } catch (error) {
    logger.error('查询用户设备状态失败', error);
    throw error;
  }
};
//查询用户状态
// 查询用户状态
db.getUserStatus = async (name) => {
  try {
    const user = await db.User.findOne({ where: { name }, attributes: ['status'] });
    return user ? user.status : null;
  } catch (error) {
    logger.error('查询用户状态失败', error);
    throw error;
  }
};


// 初始化数据库
async function initDatabase() {
  try {
    const sequelize = setupDatabaseConnection();
    await authenticateDatabase(sequelize);
    defineModels(sequelize);
    await syncDatabase(sequelize);
    db.sequelize = sequelize;
    db.Sequelize = Sequelize;
    return db;
  } catch (err) {
    logger.error('初始化错误:', err);
    throw err;
  }
}

module.exports = async () => {
  try {
    const dbInstance = await initDatabase();
    return dbInstance; // 返回初始化完成后的 dbInstance
  } catch (err) {
    logger.error('数据库初始化错误:', err);
    throw err;
  }
};

