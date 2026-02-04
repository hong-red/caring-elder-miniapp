const voiceManager = require('./utils/voice.js');
const pageDocs = require('./utils/page-docs.js');
const loginUtil = require('./utils/login.js');

App({
  onLaunch() {
    // 检查并展示隐私政策
    const hasAgreedPrivacy = wx.getStorageSync('hasAgreedPrivacy');
    if (!hasAgreedPrivacy) {
      // 弹出隐私政策确认弹窗
      wx.showModal({
        title: '隐私政策',
        content: '欢迎使用听暖养老日记！\n\n为了保障您的权益，请您阅读并同意《用户协议》和《隐私政策》。我们重视您的隐私保护，将严格按照相关政策保护您的个人信息。',
        showCancel: true,
        confirmText: '同意',
        cancelText: '不同意',
        success: (res) => {
          if (res.confirm) {
            // 用户同意隐私政策，保存同意状态
            wx.setStorageSync('hasAgreedPrivacy', true);
            // 继续执行小程序初始化
            this.initApp();
          } else {
            // 用户不同意，退出小程序
            wx.exitMiniProgram();
          }
        }
      });
    } else {
      // 用户已同意，直接初始化
      this.initApp();
    }
  },

  // 小程序初始化函数
  initApp() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-0gxromkr6a6480c4',
        traceUser: true,
      });
    }

    // 挂载到全局
    this.voiceManager = voiceManager;
    this.pageDocs = pageDocs;
    
    // 展示本地存储能力
    let logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    // 最多保留 100 条启动日志，防止数据过大导致启动缓慢或死循环风险
    if (logs.length > 100) {
      logs = logs.slice(0, 100)
    }
    wx.setStorageSync('logs', logs)

    // 初始化全局设置
    let settings = wx.getStorageSync('notificationSettings');
    if (!settings) {
      settings = { ...this.globalData.settings };
      wx.setStorageSync('notificationSettings', settings);
    } else {
      this.globalData.settings = { ...this.globalData.settings, ...settings };
    }

    // 初始化全局数据
    this.loadUserInfo();
    
    // 执行静默登录
    loginUtil.silentLogin()
      .then(() => {
        console.log('静默登录成功');
        // 登录成功后重新加载用户信息
        this.loadUserInfo();
      })
      .catch(err => {
        console.error('静默登录失败', err);
        // 可降级处理：展示游客模式，或稍后重试
      });
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('currentUser') || wx.getStorageSync('loginInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      console.log('全局用户信息已加载:', userInfo.nickname);
    }
  },
  
  // 更新全局配置
  updateGlobalConfig(key, value) {
    if (this.globalData.settings.hasOwnProperty(key)) {
      this.globalData.settings[key] = value;
      // 同步到本地存储
      const settings = wx.getStorageSync('notificationSettings') || {};
      settings[key] = value;
      wx.setStorageSync('notificationSettings', settings);
      
      // 触发全局样式更新的通知（可选，通常页面 onShow 会重新获取）
    }
  },

  globalData: {
    userInfo: null,
    currentHealthData: null,
    settings: {
      bigFont: false,
      realtimeReading: false,
      checkInReminder: true,
      primaryGuardian: '未设置' // 默认守护人
    }
  },

  // 获取首要守护人
  getPrimaryGuardian() {
    const settings = wx.getStorageSync('notificationSettings') || {};
    return settings.primaryGuardian || this.globalData.settings.primaryGuardian;
  }
})
