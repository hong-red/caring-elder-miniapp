// edit-profile.js
Page({
  data: {
    navHeight: 0,
    userInfo: {},
    genderOptions: ['男', '女', '保密'],
    genderIndex: 0,
    birthday: '',
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad() {
    this.calculateNavHeight();
    this.loadUserInfo();
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
    const pageKey = 'profile'; // 编辑页也归类为 profile
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

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('currentUser') || {};
    const genderIndex = this.data.genderOptions.indexOf(userInfo.gender || '保密');
    
    this.setData({
      userInfo: userInfo,
      genderIndex: genderIndex !== -1 ? genderIndex : 0,
      birthday: userInfo.birthday || ''
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      'userInfo.nickname': e.detail.value
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      'userInfo.phone': e.detail.value
    });
  },

  // 性别选择
  onGenderChange(e) {
    const index = e.detail.value;
    this.setData({
      genderIndex: index,
      'userInfo.gender': this.data.genderOptions[index]
    });
  },

  // 生日选择
  onBirthdayChange(e) {
    this.setData({
      birthday: e.detail.value,
      'userInfo.birthday': e.detail.value
    });
  },

  // 保存个人资料
  saveProfile() {
    const { userInfo } = this.data;
    
    wx.showLoading({ title: '正在保存...' });

    // 1. 如果是微信登录用户，同步到云数据库
    if (userInfo.isWechat && userInfo._id) {
      const db = wx.cloud.database();
      db.collection('users').doc(userInfo._id).update({
        data: {
          nickname: userInfo.nickname,
          phone: userInfo.phone,
          gender: userInfo.gender,
          birthday: userInfo.birthday,
          updatedAt: db.serverDate()
        },
        success: () => {
          this.finishSave(userInfo);
        },
        fail: (err) => {
          console.error('同步云端资料失败', err);
          // 降级只保存到本地
          this.finishSave(userInfo);
        }
      });
    } else {
      // 普通账号用户，仅保存到本地（或者后续扩展账号系统云端同步）
      this.finishSave(userInfo);
    }
  },

  finishSave(userInfo) {
    // 保存到本地存储
    wx.setStorageSync('currentUser', userInfo);
    wx.setStorageSync('loginInfo', userInfo);
    
    // 更新用户列表（兼容普通登录）
    const users = wx.getStorageSync('users') || [];
    const index = users.findIndex(u => u.account === userInfo.account);
    if (index !== -1) {
      users[index] = { ...users[index], ...userInfo };
      wx.setStorageSync('users', users);
    }
    
    wx.hideLoading();
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
    
    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },
  
  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  }
});