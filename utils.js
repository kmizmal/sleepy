const bcrypt = require('bcrypt');

// 用于更新状态的函数
function updateStatus(updatedAt, deviceArray) {
    ws.send(JSON.stringify({
        status_name: "在线",
        status_desc: "服务器一切正常",
        last_updated: updatedAt,
        status_color: "green",
        device: deviceArray
    }));
}

// 获取用户数据（从缓存或数据库）
async function GetSQL() {
  if (usersCache.length === 0) {
    // 如果缓存为空，则从数据库查询并保存到缓存
    const users = await User.findAll(); // 获取所有用户
    usersCache = users.map(user => user.toJSON()); // 将结果保存到全局变量
    console.log('Data fetched from database:', usersCache);
  } else {
    console.log('Using cached data:', usersCache);
  }

  return usersCache;
}

// 用于判断用户是否存在，如果不存在就创建用户
async function UserIfNotExist(username, secret) {
  const usersData = await GetSQL(); // 获取用户数据（缓存或数据库）

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
    try {
      // 加密密码
      const hashedsecret = await bcrypt.hash(secret, 10);

      // 创建新用户
      const newUser = await User.create({
        name: username,
        secret: hashedsecret // 保存加密后的密码
      });

      // 更新缓存
      usersCache.push(newUser.toJSON()); // 将新创建的用户添加到缓存中

      console.log('User created:', newUser.toJSON());
      return newUser.updatedAt; // 成功返回 updatedAt 字段
    } catch (error) {
      console.error('Error creating user:', error);
      return false; // 如果创建失败，返回 false
    }
  }
}

module.exports = {
  updateStatus,
  UserIfNotExist
};
