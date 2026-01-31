const app = getApp();

Page({
  data: {
    navHeight: 0,
    settings: {
      bigFont: false,
      realtimeReading: false,
      checkInReminder: true
    }
  },

  onLoad() {
    this.calculateNavHeight();
    this.loadSettings();
  },

  // 设置首要守护人
  setPrimaryGuardian() {
    wx.showModal({
      title: '设置常用守护人',
      editable: true,
      placeholderText: '请输入守护人电话',
      content: this.data.settings.primaryGuardian || '10086',
      success: (res) => {
        if (res.confirm && res.content) {
          const settings = Object.assign({}, this.data.settings, { primaryGuardian: res.content });
          this.setData({ settings });
          wx.setStorageSync('notificationSettings', settings);
          wx.showToast({
            title: '设置成功',
            icon: 'success'
          });
        }
      }
    });
  },

  onShow() {
    this.loadSettings();
  },

  calculateNavHeight() {
    try {
      const windowInfo = wx.getWindowInfo();
      let navHeight = windowInfo.statusBarHeight + 44;
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton) {
        navHeight = menuButton.bottom + (menuButton.top - windowInfo.statusBarHeight);
      }
      this.setData({ navHeight: Math.max(0, navHeight - 10) });
    } catch (e) {
      // 降级使用旧接口
      const systemInfo = wx.getSystemInfoSync();
      let navHeight = systemInfo.statusBarHeight + 44;
      this.setData({ navHeight: Math.max(0, navHeight - 10) });
    }
  },

  loadSettings() {
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false,
      checkInReminder: true,
      primaryGuardian: '10086'
    };
    this.setData({ settings });
  },

  onLargeTextChange(e) {
    const value = e.detail.value;
    const settings = Object.assign({}, this.data.settings, { bigFont: value });
    this.setData({ settings });
    wx.setStorageSync('notificationSettings', settings);
    
    // 同步到全局配置
    if (app.updateGlobalConfig) {
      app.updateGlobalConfig('bigFont', value);
    }
    
    if (value) {
      this.speak('大字模式已开启');
    } else {
      this.speak('大字模式已关闭');
    }
  },

  onReadAloudChange(e) {
    const value = e.detail.value;
    const settings = Object.assign({}, this.data.settings, { realtimeReading: value });
    this.setData({ settings });
    wx.setStorageSync('notificationSettings', settings);
    
    // 同步到全局配置
    if (app.updateGlobalConfig) {
      app.updateGlobalConfig('realtimeReading', value);
    }
    
    // 关闭语音时立即停止当前朗读
    if (!value && app.voiceManager) {
      app.voiceManager.stop();
    }
    
    if (value) {
      this.speak('语音功能已开启');
    } else {
      this.speak('语音功能已关闭');
    }
  },

  onCheckInReminderChange(e) {
    const value = e.detail.value;
    const settings = Object.assign({}, this.data.settings, { checkInReminder: value });
    this.setData({ settings });
    wx.setStorageSync('notificationSettings', settings);
  },

  goBack() {
    wx.navigateBack();
  },

  checkUpdate() {
    wx.showLoading({ title: '检查中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '当前已是最新版本', icon: 'success' });
    }, 1000);
  },

  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中...' });
          setTimeout(() => {
            wx.hideLoading();
            wx.showToast({ title: '清理完成', icon: 'success' });
          }, 1000);
        }
      }
    });
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  // 朗读指定文字
  readText(e) {
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
    const pageKey = 'accessibility-settings'; // 设置页面对应 accessibility-settings
    const introText = app.pageDocs[pageKey] || app.pageDocs['default'];
    
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

  speak(text) {
    if (this.data.settings.realtimeReading && app.voiceManager) {
      app.voiceManager.speak(text);
    }
  }
});
