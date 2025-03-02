const bcrypt = require('bcrypt');
const db = require('./db');
const WebSocket = require('ws');


// 获取用户数据（从缓存或数据库）
let usersCache = []; // 用于缓存查询结果的全局变量
let lastUpdatedAt = 0;  // 缓存的更新时间戳
async function GetUser() {
  const dbInstance = await db();  // 等待 db 返回正确的实例
  const currentTime = Date.now();

  // 如果缓存为空或者缓存已经过期
  if (usersCache.length === 0 || currentTime - lastUpdatedAt > 60000) {
    try {
      const users = await dbInstance.User.findAll();
      usersCache = users.map(user => user.toJSON());
      lastUpdatedAt = currentTime;  // 更新缓存时间
      console.log('获取的user数据:', usersCache);  // 打印用户缓存
    } catch (error) {
      console.error('Error fetching users from database:', error);
      throw new Error('Failed to fetch users from database');
    }
  } else {
    console.log('使用缓存', usersCache);
  }
  return usersCache;
}

async function UserIfNotExist(username, secret) {
  try {
    const usersData = await GetUser();  // 获取用户数据（缓存或数据库）

    // 检查用户名是否存在
    let existingUser = usersData.find(user => user.name === username);

    if (existingUser) {
      // 用户存在，进行密码比对
      console.log('User found:', existingUser);  // 打印用户信息
      const secretMatch = await bcrypt.compare(secret, existingUser.secret);

      if (secretMatch) {
        console.log('secret is correct');
        return existingUser; // 密码正确，返回用户数据
      } else {
        console.log('Incorrect secret');
        return false;  // 密码不正确
      }
    } else {
      // 用户不存在，创建新用户
      console.log('User not found, creating new user');
      const hashedsecret = await bcrypt.hash(secret, 10);

      const newUser = await db.User.create({
        name: username,
        secret: hashedsecret
      });

      // 更新缓存
      usersCache.push(newUser.toJSON()); // 将新创建的用户添加到缓存中

      console.log('User created:', newUser.toJSON());
      return newUser; // 返回新创建的用户数据
    }
  } catch (error) {
    console.error('创建用户失败:', error);
    throw new Error('创建用户失败'); // 抛出异常供外部处理
  }
}


// 设备状态设置
async function SetDevice(device, ShowName, userid) {
  try {
    const user = await db.User.findByPk(userid);
    if (!user) throw new Error('用户不存在');

    // 查找设备是否已经存在
    let existingDevice = await db.Device.findOne({ where: { device, userId: userid } });

    if (existingDevice) {
      // 设备已存在，更新 ShowName
      existingDevice.ShowName = ShowName;
      await existingDevice.save(); // 保存更新后的设备
      console.log('设备已存在，更新 ShowName:', existingDevice);
      return existingDevice; // 返回更新后的设备
    } else {
      // 设备不存在，创建新设备
      const newDevice = await db.Device.create({
        device: device,
        ShowName: ShowName,
        userId: userid
      });

      console.log('设备创建成功:', newDevice);
      return newDevice;
    }
  } catch (error) {
    console.error('Error in SetDevice function:', error);
    throw error;
  }
}


module.exports = {
  GetUser,
  UserIfNotExist,
  SetDevice
};
