Page({
  data: {
    registerType: 'elder', // 默认老年组
    account: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    phone: '',
    navHeight: 0,
    settings: {
      bigFont: false,
      realtimeReading: false
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
    this.setData({ navHeight: Math.max(0, navHeight - 10) });
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

  // 朗读当前页面主要内容
  readPageContent() {
    if (!this.data.settings.realtimeReading) return;
    
    const { registerType } = this.data;
    let content = `您正在注册页面。`;
    content += `当前选择的身份是${registerType === 'elder' ? '长辈' : '亲友'}。`;
    content += `请填写账号、密码和手机号来完成注册。`;
    
    const app = getApp();
    if (app.voiceManager) {
      app.voiceManager.speak(content);
    } else {
      wx.showToast({
        title: '正在朗读注册页...',
        icon: 'none'
      });
    }
  },

  // 选择注册类型
  selectRegisterType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      registerType: type
    });
  },

  // 账号输入
  onAccountInput(e) {
    this.setData({
      account: e.detail.value
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 确认密码输入
  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({ phone });
  },

  // 切换密码显示/隐藏
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 切换确认密码显示/隐藏
  toggleConfirmPassword() {
    this.setData({
      showConfirmPassword: !this.data.showConfirmPassword
    });
  },

  // 注册按钮点击
  register() {
    const { registerType, account, nickname, password, confirmPassword, phone } = this.data;
    
    // 表单验证
    if (!account) {
      wx.showToast({
        title: '请输入账号',
        icon: 'none'
      });
      return;
    }

    if (!nickname) {
      wx.showToast({
        title: '请告诉我们怎么称呼您',
        icon: 'none'
      });
      return;
    }
    
    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }
    
    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'none'
      });
      return;
    }
    
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    // 检查账号或手机号是否已存在
    const existingUsers = wx.getStorageSync('users') || [];
    const accountExists = existingUsers.some(user => user.account === account);
    const phoneExists = existingUsers.some(user => user.phone === phone);
    
    if (accountExists) {
      wx.showToast({
        title: '账号已存在',
        icon: 'none'
      });
      return;
    }

    if (phoneExists) {
      wx.showToast({
        title: '该手机号已注册',
        icon: 'none'
      });
      return;
    }
    
    // 创建新用户
    wx.showLoading({
      title: '注册中...'
    });
    
    setTimeout(() => {
      wx.hideLoading();
      
      // 创建新用户
      const newUser = {
        id: Date.now().toString(),
        account: account,
        nickname: nickname,
        password: password,
        phone: phone,
        registerType: registerType,
        createdAt: new Date().toISOString()
      };
      
      // 保存用户信息
      existingUsers.push(newUser);
      wx.setStorageSync('users', existingUsers);
      
      wx.showToast({
        title: '注册成功',
        icon: 'success'
      });
      
      // 跳转到登录页面
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }, 1500);
    }, 1000);
  },

  // 返回登录页面
  navigateToLogin() {
    wx.navigateBack({
      delta: 1
    });
  }
});