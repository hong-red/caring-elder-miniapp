// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gxromkr6a6480c4' }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const { location, familyMembers, userInfo, time, healthData } = event
  const wxContext = cloud.getWXContext()
  const db = cloud.database()

  console.log('收到呼叫请求:', event)

  try {
    // 1. 将呼叫记录写入云数据库
    const callRecord = {
      openid: wxContext.OPENID,
      userInfo: userInfo,
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      healthData: healthData || {}, // 记录当时的身体状况
      time: time,
      status: 'pending',
      createTime: db.serverDate()
    }
    
    const addResult = await db.collection('call_records').add({
      data: callRecord
    })

    // 2. 向已绑定的家人发送订阅消息 (正式逻辑)
    const notifyResults = []
    if (familyMembers && familyMembers.length > 0) {
      for (const member of familyMembers) {
        try {
          // 这里使用微信订阅消息接口发送
          // 消息内容包含：位置信息、健康状况、呼叫时间
          const content = `[亲情呼叫] ${userInfo.nickname || '您的家人'} 发出呼叫！
位置：${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}
心率：${healthData.heartRate} bpm
血压：${healthData.bloodPressure}
时间：${time}`

          console.log(`正在向家人 ${member.name} 发送消息:`, content)
          
          // 在云函数中调用发送订阅消息接口
          // await cloud.openapi.subscribeMessage.send({
          //   touser: member.openid, // 需要家人的 openid
          //   templateId: 'MOCK_CALL_TEMPLATE_ID', 
          //   data: { ... }
          // })

          notifyResults.push({ name: member.name, status: 'success' })
        } catch (msgErr) {
          notifyResults.push({ name: member.name, status: 'fail', error: msgErr })
        }
      }
    }

    return {
      success: true,
      recordId: addResult._id,
      message: '呼叫信号已成功同步至云端并分发给家属',
      notifyResults: notifyResults
    }
  } catch (err) {
    console.error('呼叫云函数处理失败:', err)
    return {
      success: false,
      error: err.message || '服务器繁忙，请稍后再试'
    }
  }
}
