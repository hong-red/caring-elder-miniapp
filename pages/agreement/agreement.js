// pages/agreement/agreement.js
Page({
  data: {
    navHeight: 0,
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad() {
    this.calculateNavHeight();
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
    this.loadSettings();
  },

  loadSettings() {
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };
    this.setData({ settings });
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

  // 朗读当前页面主要内容
  readPageContent() {
    const app = getApp();
    const pageKey = 'agreement';
    const introText = app.pageDocs[pageKey] || app.pageDocs['default'];
    
    if (app.voiceManager) {
      app.voiceManager.toggle(introText, pageKey);
    }
  }
})