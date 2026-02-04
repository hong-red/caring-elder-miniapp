// pages/login/login.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    loginType: 'elder', // 默认长辈模式
    account: '',
    password: '',
    showPassword: false,
    navHeight: 0,
    currentUser: {}, // 初始化为空对象，防止undefined
    settings: {
      bigFont: false,
      realtimeReading: false
    },
    agreed: false // 协议同意状态，默认未同意
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 预加载currentUser，防止undefined
    const currentUser = wx.getStorageSync('currentUser') || {};
    this.setData({ currentUser });
    
    this.calculateNavHeight();
    this.loadSettings();
    // 页面加载时自动执行静默登录
    this.silentLogin();
  },

  calculateNavHeight() {
    try {
      const windowInfo = wx.getWindowInfo();
      let navHeight = windowInfo.statusBarHeight + 44;
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton) {
        navHeight = menuButton.bottom + (menuButton.top - windowInfo.statusBarHeight);
      }
      this.setData({ navHeight: Math.max(0, navHeight + 10) });
    } catch (e) {
      // 降级使用旧接口
      const systemInfo = wx.getSystemInfoSync();
      let navHeight = systemInfo.statusBarHeight + 44;
      this.setData({ navHeight: Math.max(0, navHeight + 10) });
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
    this.setData({ settings });
  },

  // 静默登录函数
  silentLogin() {
    wx.login({
      success: res => {
        if (res.code) {
          // 调用云函数获取openid
          wx.cloud.callFunction({
            name: 'login',
            data: {
              code: res.code,
              role: this.data.loginType
            },
            success: cloudRes => {
              if (cloudRes.result && cloudRes.result.success) {
              const userInfo = cloudRes.result.data;
              
              // 检查并设置默认值
              if (!userInfo.nickname) {
                userInfo.nickname = '微信用户';
              }
              
              // 存入本地缓存
              wx.setStorageSync('currentUser', userInfo);
              wx.setStorageSync('loginInfo', userInfo);
              
              // 更新页面数据
              this.setData({ currentUser: userInfo });
              
              // 只有当用户已有手机号绑定时，才直接跳转到主页面
              // 否则留在登录页面，等待用户主动点击微信一键登录按钮来完善资料
              if (userInfo.phone) {
                wx.reLaunch({
                  url: '/pages/main/main'
                });
              }
            }
            },
            fail: err => {
              console.error('静默登录失败:', err);
              // 静默登录失败不影响后续操作，用户可以选择其他登录方式
            }
          });
        }
      },
      fail: err => {
        console.error('wx.login调用失败:', err);
      }
    });
  },

  // 朗读当前页面主要内容
  readPageContent() {
    if (!this.data.settings.realtimeReading) return;
    
    const { loginType } = this.data;
    let content = `您正在登录页面。`;
    content += `当前处于${loginType === 'elder' ? '长辈' : '亲友'}模式。`;
    content += `请输入账号和密码，或者使用微信一键登录。`;
    
    const app = getApp();
    if (app.voiceManager) {
      app.voiceManager.speak(content);
    } else {
      wx.showToast({
        title: '正在朗读登录页...',
        icon: 'none'
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 选择登录类型
  selectLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      loginType: type
    });
  },

  // 账号输入
  onAccountInput(e) {
    this.setData({
      account: e.detail.value
    });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 切换密码显示/隐藏
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    });
  },

  // 忘记密码
  onForgotPassword() {
    wx.showModal({
      title: '提示',
      content: '请联系您的家属或社区工作人员重置密码',
      showCancel: false,
      confirmText: '我知道了'
    });
  },

  // 登录
  // 跳转注册页面
  onRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  // 微信授权完善资料
  onWechatLogin() {
    const { agreed } = this.data;
    
    // 协议同意验证
    if (!agreed) {
      wx.showToast({
        title: '请阅读并同意用户协议和隐私政策',
        icon: 'none'
      });
      return;
    }
    
    // 1. 先获取用户头像和昵称
    wx.getUserProfile({
      desc: '用于完善个人资料，提供更好服务', // 12个字符，符合10-30字符要求
      success: (profileRes) => {
        const { nickName, avatarUrl } = profileRes.userInfo;
        
        // 更新本地用户信息
        let currentUser = wx.getStorageSync('currentUser') || {};
        let updatedUser = { ...currentUser };
        updatedUser.nickname = nickName || '微信用户';
        updatedUser.avatarUrl = avatarUrl || '';
        updatedUser.isWechat = true;
        
        // 更新页面数据
        this.setData({ currentUser: updatedUser });
        
        // 保存到本地存储
        wx.setStorageSync('currentUser', updatedUser);
        wx.setStorageSync('loginInfo', updatedUser);
        
        // 2. 从微信地址簿选择收货地址
        wx.chooseAddress({
          success: (addressRes) => {
            console.log('获取收货地址成功:', addressRes);
            
            // 将地址信息添加到用户数据中
            updatedUser.address = {
              name: addressRes.userName,
              phone: addressRes.telNumber,
              province: addressRes.provinceName,
              city: addressRes.cityName,
              district: addressRes.countyName,
              detail: addressRes.detailInfo,
              fullAddress: `${addressRes.provinceName}${addressRes.cityName}${addressRes.countyName}${addressRes.detailInfo}`
            };
            
            // 将地址中的电话号码设为用户默认电话号码
            updatedUser.phone = addressRes.telNumber;
            
            // 更新本地存储
            wx.setStorageSync('currentUser', updatedUser);
            wx.setStorageSync('loginInfo', updatedUser);
            this.setData({ currentUser: updatedUser });
            
            // 调用云函数更新用户信息
            this.updateUserInfo(updatedUser, nickName);
          },
          fail: (err) => {
            console.error('获取收货地址失败:', err);
            
            // 即使获取地址失败，也继续更新其他用户信息
            wx.showToast({
              title: '获取收货地址失败，将继续更新其他信息',
              icon: 'none',
              duration: 2000
            });
            
            // 调用云函数更新用户信息（不包含地址）
            this.updateUserInfo(updatedUser, nickName);
          }
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        
        // 具体错误提示
        let errorMsg = '授权取消';
        if (err.errMsg.includes('desc length')) {
          errorMsg = '授权说明文字格式错误';
        } else if (err.errMsg.includes('fail')) {
          errorMsg = '授权失败，请重试';
        } else if (err.errMsg.includes('permission denied')) {
          errorMsg = '您拒绝了授权，请在设置中允许';
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  // 更新用户信息到云端
  updateUserInfo(updatedUser, nickName) {
    wx.cloud.callFunction({
      name: 'login',
      data: {
        role: updatedUser.role || this.data.loginType,
        nickname: nickName,
        avatarUrl: updatedUser.avatarUrl,
        address: updatedUser.address,
        updateOnly: true // 标记为仅更新用户信息
      },
      success: (res) => {
        wx.hideLoading();
        console.log('云函数login调用成功:', res);
        
        if (res.result && res.result.success) {
          // 更新成功
          wx.showToast({
            title: '资料更新成功',
            icon: 'success'
          });
          
          // 更新本地存储的用户信息（包含云端返回的最新数据）
          if (res.result.data) {
            wx.setStorageSync('currentUser', res.result.data);
            wx.setStorageSync('loginInfo', res.result.data);
            this.setData({ currentUser: res.result.data });
          }
          
          // 朗读欢迎语
          if (getApp().voiceManager) {
            const welcomeMsg = `资料更新成功，欢迎您，${nickName}`;
            getApp().voiceManager.speak(welcomeMsg);
          }
        } else {
          console.error('云函数返回失败:', res.result);
          wx.showToast({
            title: '资料已更新（本地）',
            icon: 'success'
          });
        }
        
        // 无论云函数是否成功，都跳转到主页面
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/main/main'
          });
        }, 1500);
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('更新用户信息失败:', err);
        
        // 云函数调用失败不影响本地更新
        wx.showToast({
          title: '资料已更新（本地）',
          icon: 'success'
        });
        
        // 跳转到主页面
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/main/main'
          });
        }, 1500);
      }
    });
  },

  onLogin() {
    const { account, password, loginType, agreed } = this.data;
    
    // 协议同意验证
    if (!agreed) {
      wx.showToast({
        title: '请阅读并同意用户协议和隐私政策',
        icon: 'none'
      });
      return;
    }
    
    // 表单验证
    if (!account) {
      wx.showToast({
        title: '请输入手机号/账号',
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
    
    // 模拟登录请求
    wx.showLoading({
      title: '登录中...'
    });
    
    // 获取本地存储的用户数据
    const users = wx.getStorageSync('users') || [];
    
    // 查找匹配的用户 (支持账号或手机号登录)
    const user = users.find(u => (u.account === account || u.phone === account) && u.password === password);
    
    setTimeout(() => {
      wx.hideLoading();
      
      if (user) {
        // 登录成功
        const loginInfo = {
          ...user,
          role: loginType
        };
        
        // 保存登录信息
        wx.setStorageSync('loginInfo', loginInfo);
        wx.setStorageSync('currentUser', loginInfo);
        
        // 更新页面数据
        this.setData({ currentUser: loginInfo });
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
        
        // 跳转到主页面
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/main/main'
          });
        }, 1500);
      } else {
        // 登录失败
        wx.showToast({
          title: '账号或密码错误',
          icon: 'none'
        });
      }
    }, 1500);
  },

  // 跳转到用户协议
  navigateToAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 跳转到隐私政策
  navigateToPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  }
})