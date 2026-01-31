// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取当前时间
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];
    
    // 只在20:00-20:30之间执行检查，避免频繁执行
    if (currentHour !== 20 || currentMinute > 30) {
      return {
        success: true,
        message: '当前时间不在检查范围内，无需执行',
        time: now.toISOString()
      };
    }
    
    // 获取所有用户的打卡记录
    // 注意：在实际生产环境中，你需要根据你的数据库结构来查询用户数据
    // 这里我们模拟从云数据库获取用户数据
    const db = cloud.database();
    const users = await db.collection('users').get();
    
    for (const user of users.data) {
      // 检查该用户今日是否已打卡
      const checkInHistory = user.checkInHistory || [];
      const todayRecord = checkInHistory.find(item => item.date === todayStr);
      const isCheckedIn = todayRecord && todayRecord.checked;
      
      // 如果未打卡且绑定了家人
      if (!isCheckedIn && user.familyMembers && user.familyMembers.length > 0) {
        // 发送提醒
        await sendReminder(user, todayStr);
      }
    }
    
    return {
      success: true,
      message: '未打卡检查完成',
      time: now.toISOString(),
      processedUsers: users.data.length
    };
    
  } catch (error) {
    console.error('未打卡检查失败:', error);
    return {
      success: false,
      error: error.message,
      time: now.toISOString()
    };
  }
};

// 发送提醒函数
async function sendReminder(user, date) {
  try {
    // 这里可以实现多种提醒方式
    // 1. 发送短信提醒
    // 2. 发送微信订阅消息
    // 3. 其他通知方式
    
    console.log(`发送未打卡提醒给用户 ${user.openid} 的家人，日期：${date}`);
    
    // 模拟发送订阅消息
    // 实际生产环境中，你需要调用微信订阅消息API或第三方短信服务
    
    return {
      success: true,
      message: '提醒发送成功',
      userId: user.openid
    };
    
  } catch (error) {
    console.error('发送提醒失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}