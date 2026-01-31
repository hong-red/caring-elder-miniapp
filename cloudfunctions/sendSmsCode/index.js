// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { phone } = event
  
  try {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        success: false,
        msg: '手机号格式错误'
      }
    }
    
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 存储验证码到数据库，设置5分钟过期
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000)
    
    await db.collection('smsCodes').add({
      data: {
        phone: phone,
        code: code,
        expiresAt: expiresAt,
        createdAt: db.serverDate()
      }
    })
    
    // 清理过期的验证码
    await db.collection('smsCodes').where({
      expiresAt: _.lt(new Date())
    }).remove()
    
    // 直接返回验证码（个体开发者环境，无需真实短信发送）
    return {
      success: true,
      msg: '验证码已生成',
      code: code // 测试阶段返回验证码，方便调试
    }
  } catch (error) {
    console.error('发送验证码失败:', error)
    return {
      success: false,
      msg: '发送验证码失败，请稍后重试'
    }
  }
}