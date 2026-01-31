Page({
  data: {
    navHeight: 0,
    currentType: 'bp',
    recentRecords: [],
    settings: {
      bigFont: false,
      realtimeReading: false
    },
    userInfo: {},
    analysisText: '您的血压近期波动平稳，建议保持目前的作息习惯。',
    chartData: [60, 45, 75, 50, 65, 80, 55],
    medicalHistory: [],
    medicalHistoryText: ''
  },

  onLoad() {
    this.calculateNavHeight();
    this.loadData();
  },

  navigateToMedicalHistory() {
    wx.navigateTo({
      url: '/pages/medical-history/medical-history'
    });
  },

  navigateToHealthConsult() {
    wx.navigateTo({
      url: '/pages/health-consult/health-consult?mode=diagnosis'
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
      // 降级处理
      const systemInfo = wx.getSystemInfoSync();
      let navHeight = systemInfo.statusBarHeight + 44;
      this.setData({ navHeight });
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
    this.loadData();
  },

  // 加载数据
  loadData() {
    // 获取记录
    const healthData = wx.getStorageSync('healthData') || [];
    const medicalHistory = wx.getStorageSync('medicalHistory') || [];
    const userInfo = wx.getStorageSync('currentUser') || {};
    
    // 按时间排序
    const sortedRecords = healthData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 获取设置
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };

    // 检查是否有异常
    const anomalies = {
      bp: sortedRecords.some(r => r.type === '血压' && (parseInt(r.value) > 140 || parseInt(r.value) < 90)),
      bg: sortedRecords.some(r => r.type === '血糖' && (parseFloat(r.value) > 10 || parseFloat(r.value) < 3.9)),
      heart: sortedRecords.some(r => r.type === '心率' && (parseInt(r.value) > 100 || parseInt(r.value) < 60))
    };

    const hasAnomaly = anomalies.bp || anomalies.bg || anomalies.heart;

    // 格式化生活关注事项文本显示
    const historyText = medicalHistory.map(h => h.name).join('、');

    this.setData({
      recentRecords: sortedRecords.slice(0, 10),
      settings: settings,
      userInfo: userInfo,
      anomalies: anomalies,
      hasAnomaly: hasAnomaly,
      medicalHistory: medicalHistory,
      medicalHistoryText: historyText
    });

    this.updateAnalysis();
    this.updateChartData();
  },

  // 切换类型
  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      currentType: type
    });
    this.updateAnalysis();
    this.updateChartData();
  },

  // 更新图表数据
  updateChartData() {
    const { currentType } = this.data;
    const healthData = wx.getStorageSync('healthData') || [];
    
    // 根据类型过滤数据
    let filteredData = [];
    if (currentType === 'bp') {
      filteredData = healthData.filter(r => r.systolic).map(r => parseInt(r.systolic));
    } else if (currentType === 'bg') {
      filteredData = healthData.filter(r => r.type === '血糖').map(r => parseFloat(r.value));
    } else if (currentType === 'heart') {
      filteredData = healthData.filter(r => r.heartRate).map(r => parseInt(r.heartRate));
    }

    // 如果数据不足 7 条，用随机数据补全（模拟效果）
    if (filteredData.length < 7) {
      const mockData = {
        'bp': [120, 118, 122, 125, 121, 119, 120],
        'bg': [5.6, 6.1, 5.8, 6.2, 5.9, 5.7, 6.0],
        'heart': [72, 75, 70, 78, 74, 72, 73],
        'sleep': [80, 75, 85, 90, 80, 85, 88]
      };
      const baseMock = mockData[currentType] || [60, 60, 60, 60, 60, 60, 60];
      filteredData = filteredData.concat(baseMock.slice(filteredData.length));
    }

    // 归一化到 0-100 用于简单柱状图显示
    const maxVal = Math.max.apply(Math, filteredData.concat([1]));
    const chartData = filteredData.slice(0, 7).map(v => (v / maxVal) * 100);

    this.setData({
      chartData: chartData.reverse()
    });
  },

  // 更新分析文字
  updateAnalysis() {
    const { medicalHistory, currentType } = this.data;
    
    const typeMap = {
      'bp': '您的血压近期波动平稳，建议保持目前的作息习惯。',
      'bg': '您的血糖在餐后略有升高，建议饭后适当散步。',
      'heart': '您的心率处于健康范围，继续保持良好心态。',
      'sleep': '昨晚睡眠深度充足，早起精神状态良好。',
      'weight': '体重指数稳定，建议继续保持均衡饮食。'
    };
    
    let analysisText = typeMap[currentType] || '';
    
    // 如果有病史，增加关联提醒
    if (medicalHistory.length > 0) {
      const names = medicalHistory.map(h => h.name).join('、');
      analysisText = `结合您的${names}病史：${analysisText}`;
    }
    
    this.setData({
      analysisText: analysisText,
      currentTypeName: { 'bp': '血压', 'bg': '血糖', 'heart': '心率', 'sleep': '睡眠', 'weight': '体重' }[currentType],
      currentStatusText: '健康'
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
    const pageKey = 'health'; // 健康档案对应 health
    const introText = app.pageDocs[pageKey] || app.pageDocs['default'];
    
    // 如果语音管理器存在，直接切换播放/暂停状态
    if (app.voiceManager) {
      app.voiceManager.toggle(introText, pageKey);
    }
  },

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  navigateToHealthInput() {
    wx.navigateTo({
      url: '/pages/health-input/health-input'
    });
  },

  navigateToHealthConsult() {
    wx.navigateTo({
      url: '/pages/health-consult/health-consult?mode=diagnosis'
    });
  }
});