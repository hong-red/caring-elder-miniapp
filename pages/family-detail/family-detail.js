// family-detail.js
const util = require('../../utils/util.js')

Page({
  data: {
    navHeight: 0,
    familyMember: null,
    familyId: '',
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad(options) {
    this.calculateNavHeight();
    this.loadSettings();
    if (options.id) {
      this.setData({
        familyId: options.id
      });
      this.loadFamilyInfo();
    }
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

  loadSettings() {
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };
    this.setData({ settings });
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
  },

  // 朗读当前页面主要内容 (改为弹窗显示大字 + 语音)
  readPageContent() {
    const app = getApp();
    const pageKey = 'family-connect'; // 暂用 family-connect
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

  // 加载家人信息
  loadFamilyInfo() {
    const { familyId } = this.data;
    const familyMembers = wx.getStorageSync('familyMembers') || [];
    const familyMember = familyMembers.find(member => member.id === familyId);
    
    if (familyMember) {
      this.setData({
        familyMember: familyMember
      });
    }
  },

  // 格式化时间
  formatTime(date) {
    if (!date) return '未知';
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  },

  // 编辑家人信息
  editFamilyInfo() {
    const { familyId } = this.data;
    wx.navigateTo({
      url: `/pages/bind-family/bind-family?id=${familyId}`
    });
  },

  // 解除绑定
  unbindFamily() {
    wx.showModal({
      title: '删除联系人',
      content: '确定要从通讯录中删除该联系人吗？',
      confirmText: '确定删除',
      confirmColor: '#E53E3E',
      success: (res) => {
        if (res.confirm) {
          const { familyId } = this.data;
          let familyMembers = wx.getStorageSync('familyMembers') || [];
          familyMembers = familyMembers.filter(member => member.id !== familyId);
          wx.setStorageSync('familyMembers', familyMembers);
          
          wx.showToast({
            title: '已删除',
            icon: 'success',
            success: () => {
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
        }
      }
    });
  }
});