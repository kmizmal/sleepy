const bcrypt = require('bcrypt');
const db = require('./db');
const WebSocket = require('ws');

function updateStatus(ws, updatedAt, deviceArray) {
    if (ws.readyState === WebSocket.OPEN) { // 确保 WebSocket 连接是打开状态
        try {
            ws.send(JSON.stringify({
                status_name: "在线",
                status_desc: "服务器一切正常",
                last_updated: updatedAt,
                status_color: "green",
                device: deviceArray
            }));
        } catch (error) {
            console.error("WebSocket 发送消息失败:", error);
        }
    } else {
        console.warn("WebSocket 连接不可用，消息未发送");
    }
}

let usersCache = []; // 用于缓存查询结果的全局变量

// 获取用户数据（从缓存或数据库）
async function GetUser() {
  // 等待 db 初始化完成
  const dbInstance = await db;  // 等待 db 返回正确的实例
  
  if (!dbInstance || !dbInstance.User) {
    throw new Error('数据库未正确初始化');
  }
  
  // console.log('db:', dbInstance);  // 打印 db 对象，确保它已被正确初始化
  console.log('db.User:', dbInstance.User);  // 打印 db.User，确保模型已加载

  if (usersCache.length === 0) {
    try {
      const users = await dbInstance.User.findAll(); // 获取所有用户
      usersCache = users.map(user => user.toJSON()); // 将结果保存到全局变量
      // console.log('Data fetched from database:', usersCache);  //用户缓存
    } catch (error) {
      console.error('Error fetching users from database:', error);
      throw new Error('Failed to fetch users from database');
    }
  } else {
    console.log('Using cached data:', usersCache);
  }

  return usersCache;
}

// 用于判断用户是否存在，如果不存在就创建用户
async function UserIfNotExist(username, secret) {
  try {
    const usersData = await GetUser(); // 获取用户数据（缓存或数据库）

    // 检查用户名是否存在
    const existingUser = usersData.find(user => user.name === username);

    if (existingUser) {
      // 用户存在，进行密码比对
      const secretMatch = await bcrypt.compare(secret, existingUser.secret);

      if (secretMatch) {
        console.log('secret is correct');
        return true; // 密码正确，返回 true
      } else {
        console.log('Incorrect secret');
        return false; // 密码不正确，返回 false
      }
    } else {
      // 用户不存在，创建新用户
      const hashedsecret = await bcrypt.hash(secret, 10);

      // 创建新用户
      const newUser = await db.User.create({
        name: username,
        secret: hashedsecret // 保存加密后的密码
      });

      // 更新缓存
      usersCache.push(newUser.toJSON()); // 将新创建的用户添加到缓存中

      console.log('User created:', newUser.toJSON());
      return newUser.updatedAt; // 成功返回 updatedAt 字段
    }
  } catch (error) {
    console.error('Error in UserIfNotExist function:', error);
    throw new Error('Error in UserIfNotExist function'); // 抛出异常供外部处理
  }
}

// 设备状态设置
async function SetDevice(device, ShowName, userid) {
  try {
    const user = await db.User.findByPk(userid);
    if (!user) throw new Error('用户不存在');

    const newDevice = await db.Device.create({
      device: device,
      ShowName: ShowName,
      userId: userid
    });

    console.log('Device created:', newDevice);
    return newDevice;
  } catch (error) {
    console.error('Error in SetDevice function:', error);
    throw error;
  }
}

module.exports = {
  GetUser,
  updateStatus,
  UserIfNotExist,
  SetDevice
};
