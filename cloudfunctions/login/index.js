// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gxromkr6a6480c4' }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const openid = wxContext.OPENID

  try {
    // 1. 查找用户是否存在
    const userResult = await db.collection('users').where({
      openid: openid
    }).get()

    let user = null
    if (userResult.data.length === 0) {
      // 2. 如果用户不存在，创建新用户
      user = {
        openid: openid,
        account: 'wx_' + openid.slice(-6),
        nickname: event.nickname || '微信用户', // 默认使用“微信用户”
        avatarUrl: event.avatarUrl || '',
        role: event.role || 'elder',
        isWechat: true,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
        lastLoginAt: db.serverDate()
      }
      const addResult = await db.collection('users').add({
        data: user
      })
      user._id = addResult._id
    } else {
      // 3. 如果用户已存在，返回用户信息
      user = userResult.data[0]
      // 更新用户信息
      const updateData = {
        lastLoginAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
      
      // 检查是否为仅更新模式或需要更新信息
      if (event.updateOnly || (event.nickname && (event.nickname !== user.nickname || user.nickname === '微信用户'))) {
        updateData.nickname = event.nickname
        user.nickname = event.nickname
      }
      if (event.updateOnly || (event.avatarUrl && event.avatarUrl !== user.avatarUrl)) {
        updateData.avatarUrl = event.avatarUrl
        user.avatarUrl = event.avatarUrl
      }
      
      // 如果有角色更新，也需要更新
      if (event.role && event.role !== user.role) {
        updateData.role = event.role
        user.role = event.role
      }

      // 执行更新
      await db.collection('users').doc(user._id).update({
        data: updateData
      })
    }

    return {
      success: true,
      data: user
    }
  } catch (err) {
    console.error('登录云函数异常', err)
    return {
      success: false,
      error: err
    }
  }
}
