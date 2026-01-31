Page({
  data: {
    navHeight: 0,
    medications: [],
    historicalMedications: [],
    progress: 0,
    remainingCount: 0,
    settings: {
      bigFont: false,
      realtimeReading: false
    },
    userInfo: {}
  },

  onLoad: function(options) {
    this.calculateNavHeight();
    this.refreshData();
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

  onShow: function() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
    this.refreshData();
  },

  refreshData: function() {
    this.loadMedications();
    this.loadSettings();
    this.calculateProgress();
  },

  loadSettings: function() {
    const settings = wx.getStorageSync('notificationSettings') || { bigFont: false, realtimeReading: false };
    const userInfo = wx.getStorageSync('currentUser') || {};
    this.setData({ 
      settings: settings,
      userInfo: userInfo
    });
  },

  loadMedications: function() {
    let allMedications = wx.getStorageSync('medications') || [];
    
    // 限制处理数量，防止数据过大导致性能问题
    if (allMedications.length > 100) {
      allMedications = allMedications.slice(0, 100);
    }

    const now = new Date();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    
    const processedMedications = allMedications.map(m => {
      let isExpired = false;
      let isExpiringSoon = false;
      let daysLeft = null;

      if (m.expiryDate) {
        const expiry = new Date(m.expiryDate);
        const diffTime = expiry.getTime() - now.getTime();
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffTime < 0) {
          isExpired = true;
        } else if (diffTime < thirtyDaysInMs) {
          isExpiringSoon = true;
        }
      }
      return { 
        ...m, 
        isExpired, 
        isExpiringSoon, 
        daysLeft 
      };
    });

    this.setData({ 
      medications: processedMedications.filter(m => m.status === '服用中'),
      historicalMedications: processedMedications.filter(m => m.status === '已停药')
    });
  },

  // 朗读当前页面主要内容
  readPageContent() {
    const app = getApp();
    const pageKey = 'medication'; // 用药对应 medication
    const introText = app.pageDocs[pageKey] || app.pageDocs['default'];
    
    // 如果语音管理器存在，直接切换播放/暂停状态
    if (app.voiceManager) {
      app.voiceManager.toggle(introText, pageKey);
    }
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

  calculateProgress: function() {
    // 模拟计算进度
    const medications = this.data.medications;
    if (medications.length === 0) {
      this.setData({ progress: 0, remainingCount: 0 });
      return;
    }
    
    // 假设每个药每天3次，随机生成已服用次数
    let totalDoses = medications.length * 3;
    let takenDoses = Math.floor(totalDoses * 0.6); // 模拟 60% 左右
    
    this.setData({
      progress: Math.floor((takenDoses / totalDoses) * 100),
      remainingCount: totalDoses - takenDoses
    });
  },

  addMedication: function() {
    wx.navigateTo({
      url: '/pages/medication/edit/edit'
    });
  },

  editMedication: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/medication/edit/edit?id=${id}`
    });
  },

  deleteMedication: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除药品',
      content: '确定要删除这个药品吗？',
      success: (res) => {
        if (res.confirm) {
          let allMedications = wx.getStorageSync('medications') || [];
          allMedications = allMedications.filter(m => m.id !== id);
          wx.setStorageSync('medications', allMedications);
          this.refreshData();
        }
      }
    });
  },

  restoreMedication: function(e) {
    const id = e.currentTarget.dataset.id;
    let allMedications = wx.getStorageSync('medications') || [];
    const index = allMedications.findIndex(m => m.id === id);
    if (index !== -1) {
      allMedications[index].status = '服用中';
      wx.setStorageSync('medications', allMedications);
      this.refreshData();
      wx.showToast({ title: '已恢复服用' });
    }
  }
});
