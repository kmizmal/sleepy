const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./log');
const db = {};
function setupDatabaseConnection() {
  const dbUrl = config.db_url;
  let sequelize;

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
    logger.error('DB_URL 格式错误');
    process.exit(1);
  }
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
  console.log('开始定义模型');

  // 定义 User 模型
  db.User = sequelize.define('User', {
    userId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      unique: true,
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
    tableName: 'users',  // 确保表名是 'users'
    timestamps: true,
  });
  console.log('User 模型已定义:', db.User);

  // 定义 Device 模型
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
  }, {
    tableName: 'devices',
    timestamps: true,
  });
  console.log('Device 模型已定义:', db.Device);
  // 关系定义
  db.User.hasMany(db.Device, { foreignKey: 'userId' });
  db.Device.belongsTo(db.User, { foreignKey: 'userId' });
}
// 同步数据库模型
async function syncDatabase(sequelize) {
  try {
    await sequelize.sync({ alter: true, force: false });
    console.log('数据库同步成功');
    // 确保模型定义已生效
    console.log('当前 db.User:', db.User);
    console.log('当前 db.Device:', db.Device);
  } catch (err) {
    console.error('数据库同步异常', err);
  }
}

// 增加设备
db.addDevice = async (userId, deviceName) => {
  try {
    const user = await db.User.findByPk(userId);
    if (!user) throw new Error('用户不存在');

    const newDevice = await db.Device.create({ device: deviceName, userId });
    return newDevice;
  } catch (error) {
    logger.error('增加用户设备失败', error);
    throw error;
  }
};

// 查询用户所有设备的状态
db.getDevicesStatus = async (userId) => {
  try {
    const user = await db.User.findByPk(userId);
    if (!user) throw new Error('用户不存在');

    const devices = await db.Device.findAll({ where: { userId } });
    if (devices.length === 0) throw new Error('该用户没有设备');

    return devices.map(device => ({
      deviceName: device.device,
      status: device.status,
      updatedAt: device.updatedAt.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }));
  } catch (error) {
    logger.error('查询用户设备状态失败', error);
    throw error;
  }
};

async function init() {
  try {
    console.log('初始化开始');
    
    const sequelize = setupDatabaseConnection();
    console.log('数据库连接已建立');
    
    await authenticateDatabase(sequelize);
    console.log('数据库认证成功');
    
    // 在认证成功后定义模型
    defineModels(sequelize);
    console.log('模型已定义');
    
    await syncDatabase(sequelize);
    console.log('数据库同步成功');
    
    console.log('初始化结果 db.User:', db.User);  // 确保 db.User 已经被定义
  } catch (err) {
    console.error('初始化过程中发生错误:', err);
  }
}

// 调用 init 函数并确保之后才执行其他操作
init().then(() => {
  console.log("数据库初始化成功，db.User:", db.User);
}).catch(err => {
  console.error('初始化失败', err);
});

module.exports = db;
