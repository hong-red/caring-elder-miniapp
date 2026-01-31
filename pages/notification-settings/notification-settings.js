// notification-settings.js
Page({
  data: {
    navHeight: 0,
    userInfo: {},
    settings: {
      bigFont: false,
      realtimeReading: false,
      messageNotification: true,
      healthReminder: true,
      medicationReminder: true,
      familyNotification: true,
      systemNotification: true,
      sound: true,
      vibration: true
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
    this.setData({ navHeight });
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  // 加载设置
  loadSettings() {
    const settings = wx.getStorageSync('notificationSettings') || this.data.settings;
    const userInfo = wx.getStorageSync('currentUser') || {};
    this.setData({
      settings: settings,
      userInfo: userInfo
    });
  },

  // 大字模式开关
  onBigFontChange(e) {
    this.setData({
      'settings.bigFont': e.detail.value
    });
    // 这里可以触发全局样式改变逻辑
    const app = getApp();
    if (app.updateGlobalConfig) {
      app.updateGlobalConfig('bigFont', e.detail.value);
    }
  },

  // 语音功能介绍开关
  onRealtimeReadingChange(e) {
    const val = e.detail.value;
    this.setData({
      'settings.realtimeReading': val
    });
    
    const app = getApp();
    if (app.updateGlobalConfig) {
      app.updateGlobalConfig('realtimeReading', val);
    }

    // 关闭语音时立即停止当前朗读
    if (!val && app.voiceManager) {
      app.voiceManager.stop();
    }

    if (val) {
      wx.showToast({
        title: '语音功能已开启',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '语音功能已关闭',
        icon: 'none'
      });
    }
  },

  // 朗读当前页面主要内容 (改为弹窗显示大字 + 语音)
  readPageContent() {
    const app = getApp();
    const pageKey = 'accessibility-settings'; // 通知管理对应 accessibility-settings
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
            app.voiceManager.speak(introText, 'accessibility-settings');
          }
        }
      }
    });
  },

  // 消息通知开关
  onMessageNotificationChange(e) {
    this.updateSetting('messageNotification', e.detail.value);
  },

  // 健康数据提醒开关
  onHealthReminderChange(e) {
    this.updateSetting('healthReminder', e.detail.value);
  },

  // 用药提醒开关
  onMedicationReminderChange(e) {
    this.updateSetting('medicationReminder', e.detail.value);
  },

  // 家人动态通知开关
  onFamilyNotificationChange(e) {
    this.updateSetting('familyNotification', e.detail.value);
  },

  // 系统通知开关
  onSystemNotificationChange(e) {
    this.updateSetting('systemNotification', e.detail.value);
  },

  // 声音开关
  onSoundChange(e) {
    this.updateSetting('sound', e.detail.value);
  },

  // 振动开关
  onVibrationChange(e) {
    this.updateSetting('vibration', e.detail.value);
  },

  // 更新设置项
  updateSetting(key, value) {
    const { settings } = this.data;
    settings[key] = value;
    this.setData({ settings });
    
    // 同步到全局配置
    const app = getApp();
    if (app.updateGlobalConfig) {
      app.updateGlobalConfig(key, value);
    }
  },

  // 保存设置
  saveSettings() {
    wx.setStorageSync('notificationSettings', this.data.settings);
    wx.showToast({
      title: '设置已保存',
      icon: 'success',
      duration: 1500,
      success: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  },

  // 朗读文字
  readText(e) {
    const text = e.currentTarget.dataset.text;
    if (text) {
      const app = getApp();
      if (app.voiceManager) {
        app.voiceManager.speak(text);
      } else {
        wx.showToast({ title: `正在朗读: ${text}`, icon: 'none' });
      }
    }
  }
});