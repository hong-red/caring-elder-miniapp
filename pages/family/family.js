Page({
  data: {
    navHeight: 0,
    familyMembers: [],
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad(options) {
    this.calculateNavHeight();
    this.loadData();
    
    // 处理邀请逻辑
    if (options && options.invite_from) {
      this.handleInvite(options.invite_from, options.invite_name);
    }
  },

  // 处理收到邀请
  handleInvite(openid, name) {
    const currentUser = wx.getStorageSync('currentUser');
    if (!currentUser) {
      wx.showModal({
        title: '请先登录',
        content: `您收到了来自 ${name} 的亲情绑定邀请。请先登录小程序，再点击邀请链接完成绑定。`,
        showCancel: false,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }

    wx.showModal({
      title: '亲情绑定邀请',
    content: `您确定要绑定成为 ${name} 的守护人吗？绑定后，您将能实时查看长辈的健康状态，并在长辈发起呼叫时收到通知。`,
      confirmText: '接受绑定',
      cancelText: '暂时拒绝',
      success: (res) => {
        if (res.confirm) {
          this.processBinding(openid, name);
        }
      }
    });
  },

  // 执行绑定逻辑
  processBinding(openid, name) {
    wx.showLoading({ title: '正在绑定...' });
    
    // 这里应该是调用云函数进行双向绑定
    // 在演示版本中，我们先模拟本地绑定
    const familyMembers = wx.getStorageSync('familyMembers') || [];
    
    // 检查是否已绑定
    if (familyMembers.some(m => m.openid === openid)) {
      wx.hideLoading();
      wx.showToast({ title: '您已绑定过该家人', icon: 'none' });
      return;
    }

    const newMember = {
      id: Date.now().toString(),
      openid: openid,
      name: name,
      relation: '长辈', // 被邀请者通常是守护人，所以对方是长辈
      phone: '', // 真实场景中可能需要对方提供手机号
      addedAt: new Date().toISOString()
    };

    familyMembers.push(newMember);
    wx.setStorageSync('familyMembers', familyMembers);
    
    // 模拟云端成功
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '绑定成功',
        content: `您已成功成为 ${name} 的守护人。`,
        showCancel: false
      });
      this.loadData();
    }, 1000);
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
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3
      })
    }
    this.loadData();
  },

  // 加载数据
  loadData() {
    // 获取联系人列表
    const familyMembers = wx.getStorageSync('familyMembers') || [];
    
    // 获取设置
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };

    this.setData({
      familyMembers: familyMembers,
      settings: settings
    });
  },

  // 绑定联系人
  bindFamily() {
    wx.navigateTo({
      url: '/pages/bind-family/bind-family'
    });
  },

  // 查看联系人详情
  viewFamilyDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/family-detail/family-detail?id=${id}`
    });
  },

  // 朗读当前页面主要内容
  readPageContent() {
    const app = getApp();
    const pageKey = 'family'; // 家人对应 family
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
  }
});