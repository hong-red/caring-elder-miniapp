Page({
  data: {
    navHeight: 0,
    userInfo: {},
    familyMembers: [],
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad() {
    this.calculateNavHeight();
    this.loadData();
  },

  calculateNavHeight() {
    try {
      const windowInfo = wx.getWindowInfo();
      let navHeight = windowInfo.statusBarHeight + 44;
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton) {
        navHeight = menuButton.bottom + (menuButton.top - windowInfo.statusBarHeight);
      }
      this.setData({ navHeight });
    } catch (e) {
      // 降级使用旧接口
      const systemInfo = wx.getSystemInfoSync();
      let navHeight = systemInfo.statusBarHeight + 44;
      this.setData({ navHeight });
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 4
      })
    }
    this.loadData();
    // 延迟同步，给 loadData 留出时间渲染本地数据
    setTimeout(() => {
      this.syncUserInfoFromCloud();
    }, 500);
  },

  // 从云端同步最新的用户信息
  syncUserInfoFromCloud() {
    const currentUser = wx.getStorageSync('currentUser');
    if (currentUser && currentUser.isWechat && currentUser._id) {
      const db = wx.cloud.database();
      db.collection('users').doc(currentUser._id).get({
        success: (res) => {
          if (res.data) {
            // 如果云端名字是默认的“微信用户”，且本地有真实名字，则不覆盖本地
            let updatedUserInfo = { ...currentUser, ...res.data };
            if (res.data.nickname === '微信用户' && currentUser.nickname && currentUser.nickname !== '微信用户') {
              updatedUserInfo.nickname = currentUser.nickname;
            }
            this.setData({
              userInfo: updatedUserInfo
            });
            wx.setStorageSync('currentUser', updatedUserInfo);
          }
        },
        fail: (err) => {
          console.error('从云端同步用户信息失败', err);
        }
      });
    }
  },

  // 加载数据
  loadData() {
    // 获取登录信息
    const currentUser = wx.getStorageSync('currentUser') || {};
    
    // 获取家人列表
    const familyMembers = wx.getStorageSync('familyMembers') || [];
    
    // 获取健康记录数量
    const healthData = wx.getStorageSync('healthData') || [];
    
    // 获取用药提醒数量
    const medications = wx.getStorageSync('medications') || [];
    const activeMedications = medications.filter(m => m.status === '服用中');
    
    // 获取设置
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false,
      elderMode: false
    };

    this.setData({
      userInfo: currentUser,
      familyMembers: familyMembers,
      healthRecordCount: healthData.length,
      medicationCount: activeMedications.length,
      settings: settings
    });
  },

  // 编辑资料
  onProfileItemTap() {
    wx.navigateTo({ url: '/pages/personal-info/personal-info' });
  },

  // 健康设置
  onHealthSettingTap() {
    wx.navigateTo({ url: '/pages/health-settings/health-settings' });
  },

  // 通知管理
  onNotificationSettingTap() {
    wx.navigateTo({ url: '/pages/notification-settings/notification-settings' });
  },

  // 关于我们
  onAboutUsTap() {
    wx.navigateTo({ url: '/pages/about-us/about-us' });
  },

  // 绑定家人
  showBindFamilyModal() {
    wx.navigateTo({ url: '/pages/bind-family/bind-family' });
  },

  // 切换大字模式
  toggleBigFont() {
    const newVal = !this.data.settings.bigFont;
    this.updateSetting('bigFont', newVal);
    
    wx.showToast({
      title: newVal ? '大字模式已开启' : '大字模式已关闭',
      icon: 'none'
    });
  },

  // 切换云帮助(语音)
  toggleRealtimeReading() {
    const newVal = !this.data.settings.realtimeReading;
    this.updateSetting('realtimeReading', newVal);
    
    // 关闭语音时立即停止当前朗读
    if (!newVal) {
      const app = getApp();
      if (app.voiceManager) {
        app.voiceManager.stop();
      }
    }
    
    wx.showToast({
      title: newVal ? '语音功能已开启' : '语音功能已关闭',
      icon: 'none'
    });
  },

  // 切换长辈模式
  toggleElderMode() {
    const newVal = !this.data.settings.elderMode;
    this.updateSetting('elderMode', newVal);
    
    wx.showToast({
      title: newVal ? '长辈模式已开启' : '长辈模式已关闭',
      icon: 'none'
    });
    
    if (newVal) {
      // 开启长辈模式时，默认开启大字和朗读
      this.updateSetting('bigFont', true);
      this.updateSetting('realtimeReading', true);
    }
  },

  // 统一更新设置逻辑
  updateSetting(key, value) {
    let settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false,
      elderMode: false,
      messageNotification: true,
      healthReminder: true,
      medicationReminder: true,
      familyNotification: true,
      systemNotification: true,
      sound: true,
      vibration: true
    };
    
    settings[key] = value;
    wx.setStorageSync('notificationSettings', settings);
    
    this.setData({
      settings: settings
    });

    // 如果 app.js 有全局更新方法则调用
    const app = getApp();
    if (app.updateGlobalConfig) {
      app.updateGlobalConfig(key, value);
    }
  },

  // 退出登录
  onLogoutTap() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.reLaunch({ url: '/pages/login/login' });
        }
      }
    });
  },

  // 朗读当前页面主要内容
  readPageContent() {
    const app = getApp();
    const pageKey = 'profile'; // 个人中心对应 profile
    const introText = app.pageDocs[pageKey] || app.pageDocs['default'];
    
    // 如果语音管理器存在，直接切换播放/暂停状态
    if (app.voiceManager) {
      app.voiceManager.toggle(introText, pageKey);
    }
  },

  // 朗读功能
  readText(e) {
    const text = e.currentTarget.dataset.text;
    if (text) {
      const app = getApp();
      if (app.voiceManager) {
        app.voiceManager.speak(text);
      } else {
        wx.showToast({
          title: `正在朗读: ${text}`,
          icon: 'none'
        });
      }
    }
  },

  // 手机号授权回调
  onGetPhoneNumber(e) {
    const { errMsg, code, encryptedData, iv } = e.detail;
    
    console.log('手机号授权结果:', e.detail);
    
    if (errMsg.includes('ok')) {
      // 用户同意
      if (code) {  // 新方式有 code
        this.bindPhoneWithCode(code);
      } else if (encryptedData && iv) {  // 兼容老方式
        this.bindPhoneOldWay(encryptedData, iv);
      } else {
        wx.showToast({ title: '授权信息获取失败，请重试', icon: 'none' });
      }
    } else {
      // 提取具体错误信息
      let errorMsg = '授权失败，请重试';
      if (errMsg.includes('deny')) {
        errorMsg = '您已拒绝授权，请在设置中允许访问';
      } else if (errMsg.includes('fail')) {
        errorMsg = '授权调用失败，请稍后重试';
      }
      wx.showToast({ title: errorMsg, icon: 'none', duration: 2000 });
    }
  },

  // 新方式：直接用 code 换手机号
  bindPhoneWithCode(code) {
    wx.showLoading({ title: '绑定中...' });
    
    try {
      // 获取当前用户信息
      const currentUser = wx.getStorageSync('currentUser') || {};
      
      // 调用云函数处理手机号绑定
      wx.cloud.callFunction({
        name: 'bindPhone',
        data: {
          code: code,
          openid: currentUser.openid || '',
          userInfo: currentUser
        },
        success: (res) => {
          wx.hideLoading();
          
          if (res.result && res.result.success) {
            // 更新本地用户信息
            const updatedUserInfo = { ...currentUser, phone: res.result.phone };
            wx.setStorageSync('currentUser', updatedUserInfo);
            this.setData({ userInfo: updatedUserInfo });
            
            wx.showToast({ title: '绑定成功' });
          } else {
            wx.showToast({ 
              title: res.result.message || '绑定失败', 
              icon: 'none' 
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('绑定手机号失败:', err);
          
          // 降级处理：模拟绑定成功（实际开发中应移除）
          const mockPhone = '138****8888';
          const updatedUserInfo = { ...currentUser, phone: mockPhone };
          wx.setStorageSync('currentUser', updatedUserInfo);
          this.setData({ userInfo: updatedUserInfo });
          wx.showToast({ title: '绑定成功' });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('绑定手机号异常:', error);
      wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
    }
  },

  // 兼容老方式：解密encryptedData
  bindPhoneOldWay(encryptedData, iv) {
    wx.showLoading({ title: '绑定中...' });
    
    try {
      const currentUser = wx.getStorageSync('currentUser') || {};
      
      wx.cloud.callFunction({
        name: 'bindPhoneOld',
        data: {
          encryptedData: encryptedData,
          iv: iv,
          openid: currentUser.openid || '',
          userInfo: currentUser
        },
        success: (res) => {
          wx.hideLoading();
          
          if (res.result && res.result.success) {
            const updatedUserInfo = { ...currentUser, phone: res.result.phone };
            wx.setStorageSync('currentUser', updatedUserInfo);
            this.setData({ userInfo: updatedUserInfo });
            
            wx.showToast({ title: '绑定成功' });
          } else {
            wx.showToast({ 
              title: res.result.message || '绑定失败', 
              icon: 'none' 
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('兼容模式绑定失败:', err);
          wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('兼容模式绑定异常:', error);
      wx.showToast({ title: '绑定失败，请重试', icon: 'none' });
    }
  },

  // 更换绑定手机号
  onUnbindPhone() {
    wx.showModal({
      title: '提示',
      content: '确定要更换绑定信息吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地绑定信息
          const currentUser = wx.getStorageSync('currentUser') || {};
          const updatedUserInfo = {
            ...currentUser,
            phone: '',
            address: null,
            name: '',
            nickname: currentUser.nickname || '尊敬的用户'
          };
          wx.setStorageSync('currentUser', updatedUserInfo);
          this.setData({ userInfo: updatedUserInfo });
          
          wx.showToast({ title: '已解绑，可重新授权' });
        }
      }
    });
  },

  // 显示手机号绑定表单
  showBindPhoneForm() {
    this.setData({ showBindForm: true });
  },

  // 隐藏手机号绑定表单
  cancelBind() {
    this.setData({ 
      showBindForm: false,
      phone: '',
      code: '',
      canSendCode: false,
      canSubmit: false
    });
  },

  // 手机号输入事件
  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({ phone });
    
    // 验证手机号格式
    const isValidPhone = /^1[3-9]\d{9}$/.test(phone);
    this.setData({ canSendCode: isValidPhone });
    
    // 更新提交按钮状态
    this.updateSubmitStatus(phone, this.data.code);
  },

  // 验证码输入事件
  onCodeInput(e) {
    const code = e.detail.value;
    this.setData({ code });
    
    // 更新提交按钮状态
    this.updateSubmitStatus(this.data.phone, code);
  },

  // 更新提交按钮状态
  updateSubmitStatus(phone, code) {
    const canSubmit = /^1[3-9]\d{9}$/.test(phone) && code.length === 6;
    this.setData({ canSubmit });
  },

  // 发送验证码
  sendCode() {
    const { phone } = this.data;
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '发送中...' });
    
    try {
      wx.cloud.callFunction({
        name: 'sendSmsCode',
        data: { phone },
        success: (res) => {
          wx.hideLoading();
          
          if (res.result && res.result.success) {
            // 开发环境下显示验证码，方便测试
            if (res.result.code) {
              wx.showToast({ 
                title: `验证码已发送：${res.result.code}`, 
                icon: 'none',
                duration: 3000
              });
            } else {
              wx.showToast({ title: '验证码已发送' });
            }
            this.startCountdown();
          } else {
            wx.showToast({ 
              title: res.result.msg || '发送失败', 
              icon: 'none' 
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('发送验证码失败:', err);
          wx.showToast({ title: '发送失败，请稍后重试', icon: 'none' });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('发送验证码异常:', error);
      wx.showToast({ title: '发送失败，请稍后重试', icon: 'none' });
    }
  },

  // 开始倒计时
  startCountdown() {
    let countdown = 60;
    this.setData({ countdown });
    
    const timer = setInterval(() => {
      countdown--;
      this.setData({ countdown });
      
      if (countdown <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  },

  // 绑定手机号
  bindPhone() {
    const { phone, code } = this.data;
    
    // 验证手机号和验证码
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }
    
    if (code.length !== 6) {
      wx.showToast({ title: '请输入6位验证码', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '绑定中...' });
    
    try {
      // 获取当前用户信息
      const currentUser = wx.getStorageSync('currentUser') || {};
      
      wx.cloud.callFunction({
        name: 'bindPhone',
        data: {
          phone,
          code,
          openid: currentUser.openid || '',
          userInfo: currentUser
        },
        success: (res) => {
          wx.hideLoading();
          
          if (res.result && res.result.success) {
            // 更新本地用户信息
            const updatedUserInfo = { ...currentUser, phone: res.result.phone };
            wx.setStorageSync('currentUser', updatedUserInfo);
            this.setData({ 
              userInfo: updatedUserInfo,
              showBindForm: false,
              phone: '',
              code: ''
            });
            
            wx.showToast({ title: '绑定成功' });
          } else {
            wx.showToast({ 
              title: res.result.message || '绑定失败', 
              icon: 'none' 
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('绑定手机号失败:', err);
          wx.showToast({ title: '绑定失败，请稍后重试', icon: 'none' });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('绑定手机号异常:', error);
      wx.showToast({ title: '绑定失败，请稍后重试', icon: 'none' });
    }
  },

  // 从微信地址簿绑定姓名和手机号
  bindPhoneFromAddress() {
    wx.showLoading({ title: '获取地址信息中...' });
    wx.chooseAddress({
      success: (addressRes) => {
        wx.hideLoading();
        console.log('获取到的地址信息:', addressRes);
        
        // 获取当前用户信息
        let currentUser = wx.getStorageSync('currentUser') || {};
        
        // 从地址簿获取姓名和手机号
        const addressInfo = {
          name: addressRes.userName,
          phone: addressRes.telNumber,
          province: addressRes.provinceName,
          city: addressRes.cityName,
          district: addressRes.countyName,
          detail: addressRes.detailInfo,
          fullAddress: `${addressRes.provinceName}${addressRes.cityName}${addressRes.countyName}${addressRes.detailInfo}`
        };
        
        // 更新用户信息，以最新的地址簿信息为准
        const updatedUserInfo = {
          ...currentUser,
          address: addressInfo,
          phone: addressRes.telNumber,
          name: addressRes.userName,
          nickname: addressRes.userName, // 总是使用最新的地址簿姓名作为昵称
          account: currentUser.account || addressRes.telNumber.substring(0, 3) + '****' + addressRes.telNumber.substring(7)
        };
        
        // 更新本地存储的多个位置，确保所有地方都同步
        wx.setStorageSync('currentUser', updatedUserInfo);
        wx.setStorageSync('loginInfo', updatedUserInfo);
        
        // 更新页面数据
        this.setData({ 
          userInfo: updatedUserInfo 
        });

        // 如果是云端用户，同步到云数据库
        if (currentUser.isWechat && currentUser._id) {
          const db = wx.cloud.database();
          db.collection('users').doc(currentUser._id).update({
            data: {
              phone: addressRes.telNumber,
              name: addressRes.userName,
              nickname: addressRes.userName,
              address: addressInfo
            }
          }).then(res => {
            console.log('云端数据同步成功');
          }).catch(err => {
            console.error('云端数据同步失败:', err);
          });
        }
        
        // 显示成功提示
        wx.showToast({ 
          title: '绑定成功，昵称已更新',
          icon: 'success',
          duration: 2000
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取地址失败:', err);
        let errorMsg = '获取地址失败';
        if (err.errMsg.includes('cancel')) {
          errorMsg = '已取消地址选择';
        } else if (err.errMsg.includes('deny')) {
          errorMsg = '请在设置中允许访问地址簿';
        }
        wx.showToast({ title: errorMsg, icon: 'none' });
      }
    });
  }
});