// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { phone, code, openid, userInfo } = event
  
  try {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        success: false,
        message: '手机号格式错误'
      }
    }
    
    // 验证验证码
    const now = new Date()
    const smsCodeResult = await db.collection('smsCodes').where({
      phone: phone,
      code: code,
      expiresAt: _.gt(now)
    }).get()
    
    if (smsCodeResult.data.length === 0) {
      return {
        success: false,
        message: '验证码错误或已过期'
      }
    }
    
    // 删除已使用的验证码
    await db.collection('smsCodes').where({
      phone: phone,
      code: code
    }).remove()
    
    // 更新用户信息，绑定手机号
    let user = null
    if (openid) {
      // 根据openid查找用户
      const userQuery = await db.collection('users').where({
        openid: openid
      }).get()
      
      if (userQuery.data.length > 0) {
        // 用户存在，更新手机号
        user = userQuery.data[0]
        await db.collection('users').doc(user._id).update({
          data: {
            phone: phone,
            updatedAt: db.serverDate()
          }
        })
      } else {
        // 用户不存在，创建新用户
        const userData = {
          openid: openid,
          phone: phone,
          userInfo: userInfo || {},
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
        
        const addResult = await db.collection('users').add({
          data: userData
        })
        
        user = {
          ...userData,
          _id: addResult._id
        }
      }
    } else {
      // 无openid情况，仅绑定手机号（极少）
      return {
        success: false,
        message: '用户未登录'
      }
    }
    
    return {
      success: true,
      message: '手机号绑定成功',
      phone: phone,
      user: user
    }
  } catch (error) {
    console.error('绑定手机号失败:', error)
    return {
      success: false,
      message: '绑定失败，请稍后重试'
    }
  }
}