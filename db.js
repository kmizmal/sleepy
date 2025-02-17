// db.js
const { Sequelize } = require('sequelize');
const config = require('./config/config');

// 统一导出的数据库接口对象
let sequelize;
const db = {};

// 根据 DB_URL 动态选择数据库并创建连接
const dbUrl = config.DB_URL;

if (dbUrl.startsWith('sqlite:')) {
  const sqliteFilePath = dbUrl.replace('sqlite:', '');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteFilePath,
  });
} else if (dbUrl.startsWith('mysql://')) {
  const mysqlUrl = new URL(dbUrl);
  sequelize = new Sequelize(mysqlUrl.pathname.slice(1), mysqlUrl.username, mysqlUrl.password, {
    host: mysqlUrl.hostname,
    dialect: 'mysql',
    port: mysqlUrl.port || 3306,
  });
} else if (dbUrl.startsWith('postgres://')) {
  const postgresUrl = new URL(dbUrl);
  sequelize = new Sequelize(postgresUrl.pathname.slice(1), postgresUrl.username, postgresUrl.password, {
    host: postgresUrl.hostname,
    dialect: 'postgres',
    port: postgresUrl.port || 5432,
  });
} else {
  console.error('Unsupported DB_URL format');
  process.exit(1);
}

// 测试数据库连接
sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully!');
  })
  .catch(err => {
    console.error('Database connection failed:', err);
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
});

// 同步数据库模型
sequelize.sync()
  .then(() => {
    console.log('Database tables synchronized.');
  })
  .catch(err => {
    console.error('Error synchronizing tables:', err);
  });

// 查询所有用户
db.getAllUsers = async () => {
  try {
    return await db.User.findAll();
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};

// 插入新用户
db.insertUser = async (name, email) => {
  try {
    const newUser = await db.User.create({ name, email });
    return newUser;
  } catch (error) {
    console.error('Failed to insert user:', error);
    throw error;
  }
};

// 更新用户信息
db.updateUser = async (userId, name, email) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      user.name = name;
      user.email = email;
      await user.save();
      return user;
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
};

// 删除用户
db.deleteUser = async (userId) => {
  try {
    const user = await db.User.findByPk(userId);
    if (user) {
      await user.destroy();
      return { message: 'User deleted successfully' };
    } else {
      throw new Error('User not found');
    }
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
};

module.exports = db;
