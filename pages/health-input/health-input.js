const util = require('../../utils/util.js')

Page({
  data: {
    navHeight: 0,
    formData: {
      heartRate: '',
      oxygen: '',
      bloodSugar: '',
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
    this.setCurrentDate();
  },
  
  onShow() {
    this.loadSettings();
    this.setCurrentDate();
  },
  
  setCurrentDate() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    this.setData({
      currentDateStr: dateStr
    });
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

  // 心率输入
  onHeartRateInput(e) {
    this.setData({
      'formData.heartRate': e.detail.value
    });
  },

  // 血氧浓度输入
  onOxygenInput(e) {
    this.setData({
      'formData.oxygen': e.detail.value
    });
  },
  
  // 血糖值输入
  onBloodSugarInput(e) {
    this.setData({
      'formData.bloodSugar': e.detail.value
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
    const { heartRate, oxygen, bloodSugar, systolic, diastolic } = this.data.formData;
    
    // 获取当前时间
    const timestamp = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
    
    // 获取历史数据
    const historyData = wx.getStorageSync('healthData') || [];
    
    // 保存心率数据
    if (heartRate) {
      const heartRateNum = parseFloat(heartRate);
      // 验证心率范围
      if (heartRateNum < 40 || heartRateNum > 200) {
        this.readText('心率值不在正常范围内');
        wx.showToast({
          title: '心率值不在正常范围内',
          icon: 'none'
        });
        return;
      }
      
      const heartData = {
        type: '心率',
        heartRate: heartRateNum,
        value: heartRateNum,
        unit: 'bpm',
        timestamp: timestamp,
        time: timeStr
      };
      historyData.unshift(heartData);
    }
    
    // 保存血氧数据
    if (oxygen) {
      const oxygenNum = parseFloat(oxygen);
      // 验证血氧范围
      if (oxygenNum < 70 || oxygenNum > 100) {
        this.readText('血氧浓度值不在正常范围内');
        wx.showToast({
          title: '血氧浓度值不在正常范围内',
          icon: 'none'
        });
        return;
      }
      
      const oxygenData = {
        type: '血氧',
        oxygen: oxygenNum,
        value: oxygenNum,
        unit: '%',
        timestamp: timestamp,
        time: timeStr
      };
      historyData.unshift(oxygenData);
    }
    
    // 保存血压数据
    if (systolic && diastolic) {
      const systolicNum = parseFloat(systolic);
      const diastolicNum = parseFloat(diastolic);
      // 验证血压范围
      if (systolicNum < 60 || systolicNum > 200 || diastolicNum < 40 || diastolicNum > 120) {
        this.readText('血压值不在正常范围内');
        wx.showToast({
          title: '血压值不在正常范围内',
          icon: 'none'
        });
        return;
      }
      
      const bloodPressureData = {
        type: '血压',
        systolic: systolicNum,
        diastolic: diastolicNum,
        value: `${systolicNum}/${diastolicNum}`,
        unit: 'mmHg',
        timestamp: timestamp,
        time: timeStr
      };
      historyData.unshift(bloodPressureData);
    }
    
    // 保存血糖数据
    if (bloodSugar) {
      const bloodSugarNum = parseFloat(bloodSugar);
      // 验证血糖范围
      if (bloodSugarNum < 2.8 || bloodSugarNum > 11.1) {
        this.readText('血糖值不在正常范围内');
        wx.showToast({
          title: '血糖值不在正常范围内',
          icon: 'none'
        });
        return;
      }
      
      const bloodSugarData = {
        type: '血糖',
        bloodSugar: bloodSugarNum,
        value: bloodSugarNum,
        unit: 'mmol/L',
        timestamp: timestamp,
        time: timeStr
      };
      historyData.unshift(bloodSugarData);
    }
    
    // 验证至少录入了一种数据
    if (historyData.length === (wx.getStorageSync('healthData') || []).length) {
      this.readText('请至少填写一种生理指标');
      wx.showToast({
        title: '请至少填写一种生理指标',
        icon: 'none'
      });
      return;
    }
    
    // 只保存最近100条数据
    if (historyData.length > 100) {
      historyData.pop();
    }

    wx.setStorageSync('healthData', historyData);
    
    // 记录健康数据更新活动
    let logMessage = '录入了新的生理指标';
    if (heartRate) logMessage += ` (心率:${heartRate}bpm)`;
    if (oxygen) logMessage += ` (血氧:${oxygen}%)`;
    if (systolic && diastolic) logMessage += ` (血压:${systolic}/${diastolic}mmHg)`;
    if (bloodSugar) logMessage += ` (血糖:${bloodSugar}mmol/L)`;
    util.logActivity('数据更新', logMessage, '📈');
    
    // 保存到全局变量，供其他页面使用
    getApp().globalData.currentHealthData = historyData[0];
    
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