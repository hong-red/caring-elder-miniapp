// 云函数：verifySmsCode
// 用于验证短信验证码的正确性

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { phone, code } = event
  
  try {
    // 验证参数
    if (!phone || !code || !/^1[3-9]\d{9}$/.test(phone) || code.length !== 6) {
      return {
        success: false,
        msg: '参数错误'
      }
    }
    
    // 查找有效的验证码
    const now = new Date()
    const smsCodeResult = await db.collection('smsCodes').where({
      phone: phone,
      code: code,
      expiresAt: _.gt(now)
    }).get()
    
    if (smsCodeResult.data.length === 0) {
      return {
        success: false,
        msg: '验证码错误或已过期'
      }
    }
    
    // 删除已使用的验证码
    await db.collection('smsCodes').where({
      phone: phone,
      code: code
    }).remove()
    
    return {
      success: true,
      msg: '验证码验证成功'
    }
  } catch (error) {
    console.error('验证验证码失败:', error)
    return {
      success: false,
      msg: '验证失败，请稍后重试'
    }
  }
}