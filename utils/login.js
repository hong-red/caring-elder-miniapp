// utils/login.js
// 静默登录工具函数

let loginPromise = null;

/**
 * 静默登录函数
 * @returns {Promise} 返回登录结果
 */
function silentLogin() {
  // 如果已经有登录中，直接返回同一个 promise（防止并发）
  if (loginPromise) return loginPromise;

  loginPromise = new Promise((resolve, reject) => {
    // 先检查本地 token 是否有效（可选，根据业务需求）
    const token = wx.getStorageSync('token');
    if (token) {
      // 可选：校验 token 是否过期（调用后端 /checkToken 接口）
      return resolve({ token });
    }

    wx.login({
      success: res => {
        if (!res.code) {
          reject(new Error('wx.login 获取 code 失败'));
          return;
        }

        // 尝试获取用户信息（非强制授权）
        let userInfoParams = {};
        try {
          // 尝试从本地存储获取已有的用户信息
          const existingUser = wx.getStorageSync('currentUser') || wx.getStorageSync('loginInfo');
          if (existingUser && existingUser.nickname && existingUser.nickname !== '微信用户') {
            userInfoParams.nickname = existingUser.nickname;
            userInfoParams.avatarUrl = existingUser.avatarUrl;
          }
        } catch (e) {
          console.error('获取本地用户信息失败', e);
        }

        // 发送 code 到后端
        // 由于当前项目使用云开发，直接调用云函数
        wx.cloud.callFunction({
          name: 'login',
          data: {
            code: res.code,
            role: 'elder', // 默认长辈模式，可以根据实际需求调整
            ...userInfoParams // 传入已有的用户信息
          },
          success: (loginRes) => {
            if (loginRes.result && loginRes.result.success) {
              const { data } = loginRes.result;
              const token = data._id; // 使用用户ID作为临时token
              
              wx.setStorageSync('token', token);
              wx.setStorageSync('openid', data.openid);
              wx.setStorageSync('currentUser', data);
              wx.setStorageSync('loginInfo', data);
              
              resolve({ token, openid: data.openid });
            } else {
              reject(new Error('登录失败'));
            }
          },
          fail: err => {
            console.error('云函数调用失败', err);
            // 云函数调用失败，降级到本地模拟登录
            const existingUser = wx.getStorageSync('currentUser') || wx.getStorageSync('loginInfo') || {};
            
            const mockUserInfo = {
              _id: existingUser._id || 'local_' + Date.now(),
              openid: existingUser.openid || 'mock_openid_' + Date.now(),
              account: existingUser.account || 'wx_' + Date.now().toString().slice(-6),
              nickname: (existingUser.nickname && existingUser.nickname !== '微信用户') ? existingUser.nickname : '微信用户',
              avatarUrl: existingUser.avatarUrl || '',
              role: existingUser.role || 'elder',
              phone: existingUser.phone || '',
              address: existingUser.address || null,
              isWechat: true,
              loginTime: new Date().toLocaleString()
            };
            
            const token = mockUserInfo._id;
            wx.setStorageSync('token', token);
            wx.setStorageSync('openid', mockUserInfo.openid);
            wx.setStorageSync('currentUser', mockUserInfo);
            wx.setStorageSync('loginInfo', mockUserInfo);
            
            resolve({ token, openid: mockUserInfo.openid });
          },
          complete: () => { 
            loginPromise = null;
          }
        });
      },
      fail: err => {
        console.error('wx.login失败:', err);
        reject(err);
        loginPromise = null;
      }
    });
  });

  loginPromise.catch(() => { 
    loginPromise = null;
  });
  return loginPromise;
}

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  return !!wx.getStorageSync('token');
}

/**
 * 获取当前登录用户信息
 * @returns {Object|null} 用户信息
 */
function getCurrentUser() {
  return wx.getStorageSync('currentUser') || null;
}

/**
 * 退出登录
 */
function logout() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('openid');
  wx.removeStorageSync('currentUser');
  wx.removeStorageSync('loginInfo');
}

// 导出模块
module.exports = {
  silentLogin,
  isLoggedIn,
  getCurrentUser,
  logout
};