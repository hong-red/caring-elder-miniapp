// health-settings.js
Page({
  data: {
    navHeight: 0,
    healthSettings: {
      autoSync: true,
      healthReminder: true,
      medicationReminder: true,
      sleepReminder: false,
      exerciseReminder: false
    },
    settings: {
      bigFont: false,
      realtimeReading: false
    },
    userInfo: {},
    reminderOptions: ['5分钟', '10分钟', '15分钟', '30分钟'],
    reminderIndex: 0
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

  onShow() {
    this.loadSettings();
  },

  // 加载设置
  loadSettings() {
    const healthSettings = wx.getStorageSync('healthSettings') || this.data.healthSettings;
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };
    const userInfo = wx.getStorageSync('currentUser') || {};
    this.setData({
      healthSettings: healthSettings,
      settings: settings,
      userInfo: userInfo
    });
  },

  // 朗读当前页面主要内容 (改为弹窗显示大字 + 语音)
  readPageContent() {
    const app = getApp();
    const pageKey = 'health-settings'; // 健康设置对应 health-settings
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

  // 自动同步健康数据开关
  onAutoSyncChange(e) {
    this.setData({
      'healthSettings.autoSync': e.detail.value
    });
  },

  // 健康数据提醒开关
  onHealthReminderChange(e) {
    this.setData({
      'healthSettings.healthReminder': e.detail.value
    });
  },

  // 用药提醒开关
  onMedicationReminderChange(e) {
    this.setData({
      'healthSettings.medicationReminder': e.detail.value
    });
  },

  // 提醒时间选择
  onReminderTimeChange(e) {
    this.setData({
      reminderIndex: e.detail.value
    });
  },

  // 睡眠提醒开关
  onSleepReminderChange(e) {
    this.setData({
      'healthSettings.sleepReminder': e.detail.value
    });
  },

  // 运动提醒开关
  onExerciseReminderChange(e) {
    this.setData({
      'healthSettings.exerciseReminder': e.detail.value
    });
  },

  // 保存设置
  saveSettings() {
    wx.setStorageSync('healthSettings', this.data.healthSettings);
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

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  }
});