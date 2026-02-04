Page({
  data: {
    navHeight: 0,
    currentType: 'heart',
    recentRecords: [],
    settings: {
      bigFont: false,
      realtimeReading: false
    },
    userInfo: {},
    analysisText: '您的心率处于健康范围，继续保持良好心态。',
    chartData: [72, 75, 70, 78, 74, 72, 73],
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

    // 检查是否有异常，只基于type字段进行严格过滤
    const anomalies = {
      heart: sortedRecords.some(r => r.type === '心率' && (parseInt(r.value || r.heartRate) > 100 || parseInt(r.value || r.heartRate) < 60)),
      oxygen: sortedRecords.some(r => r.type === '血氧' && (parseInt(r.oxygen || 98) < 95)),
      bloodPressure: sortedRecords.some(r => r.type === '血压' && 
        ((parseInt(r.systolic) > 140 || parseInt(r.systolic) < 90) || (parseInt(r.diastolic) > 90 || parseInt(r.diastolic) < 60))),
      bloodSugar: sortedRecords.some(r => r.type === '血糖' && (parseFloat(r.value || r.bloodSugar) > 6.1 || parseFloat(r.value || r.bloodSugar) < 3.9))
    };

    const hasAnomaly = anomalies.heart || anomalies.oxygen || anomalies.bloodPressure || anomalies.bloodSugar;

    // 格式化生活关注事项文本显示
    const historyText = medicalHistory.map(h => h.name).join('、');

    this.setData({
      settings: settings,
      userInfo: userInfo,
      anomalies: anomalies,
      hasAnomaly: hasAnomaly,
      medicalHistory: medicalHistory,
      medicalHistoryText: historyText
    });

    this.updateAnalysis();
    this.updateChartData();
    this.updateRecentRecords();
  },

  // 切换类型
  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      currentType: type
    });
    this.updateAnalysis();
    this.updateChartData();
    this.updateRecentRecords();
  },

  // 更新最近记录
  updateRecentRecords() {
    const { currentType } = this.data;
    const healthData = wx.getStorageSync('healthData') || [];
    
    // 按时间排序
    const sortedRecords = healthData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 根据当前类型过滤记录，只基于type字段进行严格过滤
    let filteredRecords = sortedRecords;
    if (currentType === 'heart') {
      filteredRecords = sortedRecords.filter(r => r.type === '心率');
    } else if (currentType === 'oxygen') {
      filteredRecords = sortedRecords.filter(r => r.type === '血氧');
    } else if (currentType === 'bloodPressure') {
      filteredRecords = sortedRecords.filter(r => r.type === '血压');
    } else if (currentType === 'bloodSugar') {
      filteredRecords = sortedRecords.filter(r => r.type === '血糖');
    }
    
    // 更新最近记录
    this.setData({
      recentRecords: filteredRecords.slice(0, 10)
    });
  },

  // 更新图表数据
  updateChartData() {
    const { currentType } = this.data;
    const healthData = wx.getStorageSync('healthData') || [];
    
    // 获取最近7天的数据
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // 根据类型过滤并处理数据
    let processedData = [];
    
    // 按时间排序所有数据
    const sortedData = healthData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 只获取该类型的真实数据，不混合模拟数据，只基于type字段进行严格过滤
    const typeData = sortedData.filter(r => {
      if (currentType === 'heart') return r.type === '心率';
      if (currentType === 'oxygen') return r.type === '血氧';
      if (currentType === 'bloodPressure') return r.type === '血压';
      if (currentType === 'bloodSugar') return r.type === '血糖';
      return false;
    });
    
    // 为不同类型的数据设置合适的参考范围，用于归一化
    const referenceRanges = {
      heart: { min: 40, max: 120 },
      oxygen: { min: 90, max: 100 },
      bloodPressure: { min: 80, max: 160 }, // 收缩压参考范围
      bloodSugar: { min: 3, max: 8 }
    };
    
    const range = referenceRanges[currentType];
    
    // 提取最近7个数据点（如果有）
    const latestData = typeData.slice(0, 7).reverse();
    
    // 处理数据用于图表显示
    if (currentType === 'heart' || currentType === 'oxygen' || currentType === 'bloodSugar') {
      // 对于单值数据，直接提取数值并归一化
      processedData = latestData.map(record => {
        let value;
        if (currentType === 'heart') value = parseInt(record.value || record.heartRate);
        if (currentType === 'oxygen') value = parseInt(record.oxygen || record.value);
        if (currentType === 'bloodSugar') value = parseFloat(record.value || record.bloodSugar);
        
        // 归一化到0-100范围内，基于参考范围
        return Math.max(0, Math.min(100, ((value - range.min) / (range.max - range.min)) * 100));
      });
    } else if (currentType === 'bloodPressure') {
      // 对于血压，只显示收缩压，使用参考范围归一化
      processedData = latestData.map(record => {
        const systolic = parseInt(record.systolic);
        return Math.max(0, Math.min(100, ((systolic - range.min) / (range.max - range.min)) * 100));
      });
    }
    
    // 生成日期标签
    const dateLabels = latestData.map(record => {
      const date = new Date(record.timestamp);
      return date.getDate() + '日';
    });
    
    // 如果数据不足7条，用空数据填充，保持图表结构
    while (processedData.length < 7) {
      processedData.unshift(0);
      dateLabels.unshift('');
    }

    this.setData({
      chartData: processedData,
      dateLabels: dateLabels
    });
  },

  // 更新分析文字
  updateAnalysis() {
    const { medicalHistory, currentType } = this.data;
    const healthData = wx.getStorageSync('healthData') || [];
    
    // 获取最新的该类型数据，只基于type字段进行严格过滤
    const latestRecord = healthData.filter(r => {
      if (currentType === 'heart') return r.type === '心率';
      if (currentType === 'oxygen') return r.type === '血氧';
      if (currentType === 'bloodPressure') return r.type === '血压';
      if (currentType === 'bloodSugar') return r.type === '血糖';
      return false;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    
    let status = '健康';
    let analysisText = '';
    
    // 根据实际数据生成分析文字和状态
    if (latestRecord) {
      if (currentType === 'heart') {
        const value = parseInt(latestRecord.value || latestRecord.heartRate);
        if (value > 100) {
          status = '偏高';
          analysisText = '您的心率偏高，建议休息并监测心率变化。';
        } else if (value < 60) {
          status = '偏低';
          analysisText = '您的心率偏低，如有不适请及时就医。';
        } else {
          analysisText = '您的心率处于健康范围，继续保持良好心态。';
        }
      } else if (currentType === 'oxygen') {
        const value = parseInt(latestRecord.oxygen || latestRecord.value);
        if (value < 95) {
          status = '偏低';
          analysisText = '您的血氧浓度偏低，建议及时就医检查。';
        } else {
          analysisText = '您的血氧浓度保持在健康水平，继续保持良好的生活习惯。';
        }
      } else if (currentType === 'bloodPressure') {
        const systolic = parseInt(latestRecord.systolic);
        const diastolic = parseInt(latestRecord.diastolic);
        if (systolic > 140 || diastolic > 90) {
          status = '偏高';
          analysisText = '您的血压偏高，建议低盐饮食并适当运动。';
        } else if (systolic < 90 || diastolic < 60) {
          status = '偏低';
          analysisText = '您的血压偏低，建议适当增加盐分摄入并咨询医生。';
        } else {
          analysisText = '您的血压处于正常范围，继续保持健康的饮食和运动习惯。';
        }
      } else if (currentType === 'bloodSugar') {
        const value = parseFloat(latestRecord.value || latestRecord.bloodSugar);
        if (value > 6.1) {
          status = '偏高';
          analysisText = '您的血糖水平偏高，建议控制糖分摄入并监测血糖变化。';
        } else if (value < 3.9) {
          status = '偏低';
          analysisText = '您的血糖水平偏低，建议及时补充糖分并休息。';
        } else {
          analysisText = '您的血糖水平正常，注意合理饮食，适当运动。';
        }
      }
    } else {
      // 如果没有数据，使用默认文本
      const defaultTexts = {
        'heart': '您的心率处于健康范围，继续保持良好心态。',
        'oxygen': '您的血氧浓度保持在健康水平，继续保持良好的生活习惯。',
        'bloodPressure': '您的血压处于正常范围，继续保持健康的饮食和运动习惯。',
        'bloodSugar': '您的血糖水平正常，注意合理饮食，适当运动。'
      };
      analysisText = defaultTexts[currentType] || '';
    }
    
    // 如果有病史，增加关联提醒
    if (medicalHistory.length > 0) {
      const names = medicalHistory.map(h => h.name).join('、');
      analysisText = `结合您的${names}病史：${analysisText}`;
    }
    
    this.setData({
      analysisText: analysisText,
      currentTypeName: { 
        'heart': '心率', 
        'oxygen': '血氧',
        'bloodPressure': '血压',
        'bloodSugar': '血糖'
      }[currentType],
      currentStatusText: status
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
  },
  
  // 点击状态指示器
  onIndicatorClick(e) {
    const status = e.currentTarget.dataset.status;
    const { currentType, currentTypeName } = this.data;
    
    // 状态说明映射
    const statusDescriptions = {
      normal: {
        heart: `${currentTypeName}正常，保持适当运动。`,
        oxygen: `${currentTypeName}正常，呼吸状态良好。`,
        bloodPressure: `${currentTypeName}正常，继续保持健康的生活方式。`,
        bloodSugar: `${currentTypeName}正常，注意合理饮食。`
      },
      high: {
        heart: `${currentTypeName}偏高，建议休息并监测心率变化。`,
        oxygen: `${currentTypeName}偏高，属于正常生理现象。`,
        bloodPressure: `${currentTypeName}偏高，建议低盐饮食并适当运动。`,
        bloodSugar: `${currentTypeName}偏高，建议控制糖分摄入并监测血糖变化。`
      },
      low: {
        heart: `${currentTypeName}偏低，如有不适请及时就医。`,
        oxygen: `${currentTypeName}偏低，建议及时就医检查。`,
        bloodPressure: `${currentTypeName}偏低，建议适当增加盐分摄入并咨询医生。`,
        bloodSugar: `${currentTypeName}偏低，建议及时补充糖分并休息。`
      }
    };
    
    const description = statusDescriptions[status][currentType] || `${status}状态说明`;
    
    wx.showModal({
      title: `${currentTypeName}${status === 'normal' ? '正常' : status === 'high' ? '偏高' : '偏低'}说明`,
      content: description,
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});