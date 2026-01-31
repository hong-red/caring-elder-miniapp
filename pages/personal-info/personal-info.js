// personal-info.js
const util = require('../../utils/util.js')

Page({
  data: {
    userInfo: {},
    navHeight: 0,
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad() {
    this.calculateNavHeight();
    this.loadUserInfo();
    this.loadSettings();
  },

  calculateNavHeight() {
    const systemInfo = wx.getSystemInfoSync();
    let navHeight = systemInfo.statusBarHeight + 44;
    try {
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton) {
        navHeight = menuButton.bottom + (menuButton.top - systemInfo.statusBarHeight);
      }
    } catch (e) {
      console.error('获取胶囊按钮位置失败', e);
    }
    this.setData({ navHeight: Math.max(0, navHeight - 10) });
  },

  onShow() {
    this.loadUserInfo();
    this.loadSettings();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('currentUser') || {};
    this.setData({
      userInfo: userInfo
    });
  },

  // 加载设置
  loadSettings() {
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };
    this.setData({ settings });
  },

  // 朗读当前页面主要内容 (改为弹窗显示大字 + 语音)
  readPageContent() {
    const app = getApp();
    const pageKey = 'profile'; // 个人资料也用 profile
    const introText = app.pageDocs[pageKey] || app.pageDocs['default'];
    
    // 弹窗显示大字介绍 (文字兜底)
    wx.showModal({
      title: '本页功能说明',
      content: introText,
      confirmText: '开始朗读',
      cancelText: '我知道了',
      success: (res) => {
        if (res.confirm) {
          if (app.voiceManager) {
            app.voiceManager.speak(introText, pageKey);
          }
        }
      }
    });
  },

  // 朗读指定文字
  readText(e) {
    if (!this.data.settings.realtimeReading) return;
    const text = e.currentTarget.dataset.text;
    if (text) {
      const app = getApp();
      if (app.voiceManager) {
        app.voiceManager.speak(text);
      }
    }
  },

  // 格式化时间
  formatTime(date) {
    return util.formatTime(new Date(date));
  },

  // 编辑个人资料
  editProfile() {
    wx.navigateTo({
      url: '/pages/edit-profile/edit-profile'
    });
  },
  
  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  }
});