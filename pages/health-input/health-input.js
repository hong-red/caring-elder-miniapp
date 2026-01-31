const util = require('../../utils/util.js')

Page({
  data: {
    navHeight: 0,
    formData: {
      pulse: '',
      heartRate: '',
      systolic: '',
      diastolic: ''
    },
    settings: {
      bigFont: false,
      realtimeReading: false
    },
    userInfo: {}
  },

  onLoad() {
    this.calculateNavHeight();
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
      this.setData({ navHeight });
    } catch (e) {
      // 降级使用旧接口
      const systemInfo = wx.getSystemInfoSync();
      let navHeight = systemInfo.statusBarHeight + 44;
      this.setData({ navHeight });
    }
  },

  onShow() {
    this.loadSettings();
  },

  loadSettings() {
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };
    const userInfo = wx.getStorageSync('currentUser') || {};
    this.setData({ 
      settings,
      userInfo
    });
  },

  navigateBack() {
    wx.navigateBack();
  },

  // 脉搏输入
  onPulseInput(e) {
    this.setData({
      'formData.pulse': e.detail.value
    });
  },

  // 心跳输入
  onHeartRateInput(e) {
    this.setData({
      'formData.heartRate': e.detail.value
    });
  },

  // 收缩压输入
  onSystolicInput(e) {
    this.setData({
      'formData.systolic': e.detail.value
    });
  },

  // 舒张压输入
  onDiastolicInput(e) {
    this.setData({
      'formData.diastolic': e.detail.value
    });
  },

  // 提交表单
  submitForm(e) {
    const { pulse, heartRate, systolic, diastolic } = this.data.formData;
    
    // 验证输入
    if (!pulse || !heartRate || !systolic || !diastolic) {
      this.readText('请填写所有生理指标');
      wx.showToast({
        title: '请填写所有生理指标',
        icon: 'none'
      });
      return;
    }

    // 验证数据范围（简单验证）
    if (pulse < 40 || pulse > 200) {
      this.readText('脉搏值不在正常范围内');
      wx.showToast({
        title: '脉搏值不在正常范围内',
        icon: 'none'
      });
      return;
    }

    if (heartRate < 40 || heartRate > 200) {
      this.readText('心跳值不在正常范围内');
      wx.showToast({
        title: '心跳值不在正常范围内',
        icon: 'none'
      });
      return;
    }

    if (systolic < 60 || systolic > 200 || diastolic < 40 || diastolic > 120) {
      this.readText('血压值不在正常范围内');
      wx.showToast({
        title: '血压值不在正常范围内',
        icon: 'none'
      });
      return;
    }

    // 保存生理指标到本地存储
    const healthData = Object.assign({}, this.data.formData, {
      type: '血压', // 默认为血压类型记录
      value: `${systolic}/${diastolic}`, // 格式化显示值
      timestamp: new Date().toISOString()
    });

    // 获取历史数据
    const historyData = wx.getStorageSync('healthData') || [];
    historyData.unshift(healthData);
    
    // 只保存最近100条数据
    if (historyData.length > 100) {
      historyData.pop();
    }

    wx.setStorageSync('healthData', historyData);
    
    // 记录健康数据更新活动
    util.logActivity('数据更新', `录入了新的生理指标 (收缩压:${systolic} 舒张压:${diastolic})`, '📈');
    
    // 保存到全局变量，供其他页面使用
    getApp().globalData.currentHealthData = healthData;
    
    this.readText('生理指标保存成功');
    wx.showToast({
      title: '生理指标保存成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  },

  // 朗读指定文字
  readText(arg) {
    let text = '';
    if (typeof arg === 'string') {
      text = arg;
    } else if (arg && arg.currentTarget && arg.currentTarget.dataset) {
      text = arg.currentTarget.dataset.text;
    }
    
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
    const pageKey = 'vital-signs'; // 录入页也用 vital-signs
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
  }
});