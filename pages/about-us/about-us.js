// about-us.js
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
    const text = e.currentTarget.dataset.text;
    if (text) {
      const app = getApp();
      if (app.voiceManager) {
        app.voiceManager.speak(text);
      }
    }
  },

  // 朗读当前页面主要内容 (改为弹窗显示大字 + 语音)
  readPageContent() {
    const app = getApp();
    const pageKey = 'about-us'; // 关于我们对应 about-us
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

  navigateBack() {
    wx.navigateBack();
  },

  // 拨打客服电话
  makePhoneCall() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567',
      success: () => {
        console.log('拨打成功');
      },
      fail: (error) => {
        console.log('拨打失败', error);
      }
    });
  },

  // 跳转到用户协议
  navigateToAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 跳转到隐私政策
  navigateToPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  }
});