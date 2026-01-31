// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { encryptedData, iv, openid, userInfo } = event;
  
  console.log('兼容模式手机号绑定请求参数:', event);
  
  try {
    if (!encryptedData || !iv) {
      return {
        success: false,
        message: '缺少必要参数encryptedData或iv'
      };
    }
    
    // 获取用户的session_key（需要提前存储）
    // 这里假设session_key已经存储在用户记录中
    let sessionKey;
    if (openid) {
      const userQuery = await db.collection('users').where({
        openid: openid
      }).get();
      
      if (userQuery.data && userQuery.data.length > 0) {
        const user = userQuery.data[0];
        sessionKey = user.sessionKey;
      }
    }
    
    // 如果没有session_key，尝试通过code2session获取
    if (!sessionKey) {
      return {
        success: false,
        message: '获取session_key失败，请重新登录'
      };
    }
    
    // 使用云函数的解密能力解密手机号
    const decryptResult = cloud.decryptData({
      encryptedData: encryptedData,
      iv: iv,
      sessionKey: sessionKey
    });
    
    console.log('解密结果:', decryptResult);
    
    const { phoneNumber, purePhoneNumber, countryCode } = decryptResult;
    
    if (!phoneNumber) {
      return {
        success: false,
        message: '解密手机号失败'
      };
    }
    
    // 查找用户并更新手机号
    let user;
    if (openid) {
      const userQuery = await db.collection('users').where({
        openid: openid
      }).get();
      
      if (userQuery.data && userQuery.data.length > 0) {
        user = userQuery.data[0];
        // 更新用户信息和手机号
        await db.collection('users').doc(user._id).update({
          data: {
            phone: purePhoneNumber,
            phoneNumber: phoneNumber,
            countryCode: countryCode,
            updatedAt: db.serverDate()
          }
        });
      } else {
        // 新建用户
        const userData = {
          openid: openid,
          phone: purePhoneNumber,
          phoneNumber: phoneNumber,
          countryCode: countryCode,
          userInfo: userInfo,
          sessionKey: sessionKey,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        };
        
        const addResult = await db.collection('users').add({
          data: userData
        });
        
        user = {
          ...userData,
          _id: addResult._id
        };
      }
    }
    
    return {
      success: true,
      message: '绑定成功',
      phone: purePhoneNumber,
      user: user
    };
  } catch (error) {
    console.error('兼容模式手机号绑定失败:', error);
    
    // 错误处理
    let errorMsg = '绑定失败，请稍后重试';
    if (error.errCode) {
      switch (error.errCode) {
        case -41003:
          errorMsg = '解密失败，session_key或iv无效';
          break;
        case -41001:
          errorMsg = 'encryptedData无效';
          break;
        default:
          errorMsg = `错误码: ${error.errCode}, ${error.errMsg}`;
      }
    }
    
    return {
      success: false,
      message: errorMsg,
      error: error
    };
  }
};