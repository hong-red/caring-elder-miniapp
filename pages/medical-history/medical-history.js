Page({
  data: {
    navHeight: 0,
    settings: {},
    userInfo: {},
    historyList: [],
    historyNames: '',
    showModal: false,
    formData: {
      newName: '',
      newStatus: '进行中',
      newDate: '',
      newNote: ''
    }
  },

  onLoad() {
    this.calculateNavHeight();
    this.loadSettings();
    this.loadHistory();
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
      this.setData({ navHeight });
    } catch (e) {
      // 降级使用旧接口
      const systemInfo = wx.getSystemInfoSync();
      let navHeight = systemInfo.statusBarHeight + 44;
      this.setData({ navHeight });
    }
  },

  loadSettings() {
    const settings = wx.getStorageSync('notificationSettings') || { bigFont: false, realtimeReading: false };
    const userInfo = wx.getStorageSync('currentUser') || {};
    this.setData({ 
      settings,
      userInfo
    });
  },

  loadHistory() {
    const historyList = wx.getStorageSync('medicalHistory') || [];
    const historyNames = historyList.map(item => item.name).join('、');
    this.setData({ 
      historyList,
      historyNames 
    });
  },

  showAddModal() {
    this.setData({ 
      showModal: true,
      formData: {
        newName: '',
        newStatus: '进行中',
        newDate: '',
        newNote: ''
      }
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  submitAdd() {
    const { newName, newStatus, newDate, newNote } = this.data.formData;
    if (!newName) {
      wx.showToast({ title: '请输入事项名称', icon: 'none' });
      return;
    }

    const newRecord = {
      id: Date.now(),
      name: newName,
      status: newStatus,
      date: newDate,
      note: newNote
    };

    const historyList = [newRecord].concat(this.data.historyList);
    wx.setStorageSync('medicalHistory', historyList);
    
    this.setData({ 
      historyList,
      historyNames: historyList.map(item => item.name).join('、'),
      showModal: false 
    });

    wx.showToast({ title: '保存成功', icon: 'success' });
    
    // 同步更新上一页
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage && prevPage.loadData) {
      prevPage.loadData();
    }
  },

  deleteItem(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条事项记录吗？',
      success: (res) => {
        if (res.confirm) {
          const historyList = this.data.historyList.filter(item => item.id !== id);
          wx.setStorageSync('medicalHistory', historyList);
          this.setData({ 
            historyList,
            historyNames: historyList.map(item => item.name).join('、')
          });
          
          // 同步更新上一页
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && prevPage.loadData) {
            prevPage.loadData();
          }
        }
      }
    });
  },

  // 朗读当前页面主要内容 (改为弹窗显示大字 + 语音)
  readPageContent() {
    const app = getApp();
    const pageKey = 'medical-history'; // 既往病史对应 medical-history
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
  }
});