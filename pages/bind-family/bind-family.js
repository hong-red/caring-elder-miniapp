Page({
  data: {
    navHeight: 0,
    formData: {
      name: '',
      relation: '',
      phone: '',
      birthday: '',
      height: '',
      weight: ''
    },
    relationOptions: ['子女', '配偶', '父母', '兄弟姐妹', '朋友', '医生', '其他'],
    relationIndex: 0,
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad(options) {
    this.calculateNavHeight();
    this.loadSettings();
    if (options && options.id) {
      this.setData({
        isEdit: true,
        memberId: options.id
      });
      this.loadMemberData(options.id);
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

  loadMemberData(id) {
    const familyMembers = wx.getStorageSync('familyMembers') || [];
    const member = familyMembers.find(m => m.id === id);
    if (member) {
      const relationIndex = this.data.relationOptions.indexOf(member.relation);
      this.setData({
        formData: {
          name: member.name,
          relation: member.relation,
          phone: member.phone || '',
          birthday: member.birthday || '',
          height: member.height || '',
          weight: member.weight || ''
        },
        relationIndex: relationIndex !== -1 ? relationIndex : 0
      });
    }
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
    const pageKey = 'emergency-contacts'; // 绑定家人对应 emergency-contacts (文档中较接近的)
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

  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  },

  // 从微信/通讯录导入
  importFromWeChat() {
    const that = this;
    wx.showActionSheet({
      itemList: ['从手机通讯录导入', '发送邀请链接给微信好友', '从微信地址簿导入'],
      success(res) {
        if (res.tapIndex === 0) {
          // 手机通讯录
          wx.chooseContact({
            success: (contact) => {
              if (contact && contact.phoneNumber) {
                that.setData({
                  'formData.name': contact.displayName || (contact.firstName + (contact.lastName || '')),
                  'formData.phone': contact.phoneNumber.replace(/[^0-9]/g, '')
                });
                wx.showToast({ title: '导入成功', icon: 'success' });
              }
            },
            fail: (err) => {
              console.error('手机通讯录导入失败', err);
              if (err.errMsg.includes('auth deny') || err.errMsg.includes('deny')) {
                wx.showModal({
                  title: '需要通讯录权限',
                  content: '请在“设置-隐私-通讯录”中开启微信的权限，并在小程序设置中允许访问',
                  confirmText: '去设置',
                  success: (res) => {
                    if (res.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              }
            }
          });
        } else if (res.tapIndex === 1) {
          // 发送邀请链接给微信好友
          wx.showModal({
            title: '微信邀请',
            content: '点击“去邀请”后，请将小程序转发给您的家人。家人点击链接后即可完成自动绑定。',
            confirmText: '去邀请',
            success: (res) => {
              if (res.confirm) {
                // 触发分享
                wx.showShareMenu({
                  withShareTicket: true
                });
                wx.showToast({
                  title: '请点击右上角转发给好友',
                  icon: 'none',
                  duration: 3000
                });
              }
            }
          });
        } else {
          // 微信地址簿
          wx.chooseAddress({
            success: (address) => {
              that.setData({
                'formData.name': address.userName,
                'formData.phone': address.telNumber
              });
              wx.showToast({ title: '导入成功', icon: 'success' });
            },
            fail: (err) => {
              console.error('微信地址簿导入失败', err);
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '权限提示',
                  content: '需要您的授权才能从微信地址簿导入联系人',
                  confirmText: '去授权',
                  success: (res) => {
                    if (res.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              }
            }
          });
        }
      }
    });
  },

  /**
   * 用户点击右上角分享 (用于发送邀请)
   */
  onShareAppMessage() {
    const currentUser = wx.getStorageSync('currentUser') || {};
    const name = currentUser.nickname || '您的家人';
    
    return {
      title: `🌈【亲情绑定】${name} 邀请您成为守护人`,
      path: `/pages/family/family?invite_from=${currentUser.openid || ''}&invite_name=${name}`,
      imageUrl: '/images/family-invite.png' // 建议准备一张温馨的邀请图
    };
  },

  // 姓名输入
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    });
  },

  // 关系选择
  onRelationChange(e) {
    this.setData({
      relationIndex: e.detail.value,
      'formData.relation': this.data.relationOptions[e.detail.value]
    });
  },

  // 手机号输入
  onPhoneInput(e) {
    this.setData({
      'formData.phone': e.detail.value
    });
  },

  // 出生日期输入
  onBirthInput(e) {
    this.setData({
      'formData.birthday': e.detail.value
    });
  },

  // 身高输入
  onHeightInput(e) {
    this.setData({
      'formData.height': e.detail.value
    });
  },

  // 体重输入
  onWeightInput(e) {
    this.setData({
      'formData.weight': e.detail.value
    });
  },

  // 提交表单
  submitForm() {
    const { formData, isEdit, memberId } = this.data;
    
    // 表单验证
    if (!formData.name) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.relation) {
      wx.showToast({
        title: '请选择与您的关系',
        icon: 'none'
      });
      return;
    }
    
    // 从本地存储获取现有家人列表
    let familyMembers = wx.getStorageSync('familyMembers') || [];
    
    if (isEdit) {
      // 编辑模式
      const index = familyMembers.findIndex(m => m.id === memberId);
      if (index !== -1) {
        familyMembers[index] = {
          ...familyMembers[index],
          ...formData
        };
      }
    } else {
      // 添加模式
      const newFamilyMember = {
        id: Date.now().toString(),
        ...formData,
        online: false,
        hasUpdate: true,
        lastActive: '刚刚',
        createdAt: new Date().toISOString()
      };
      familyMembers.push(newFamilyMember);
    }
    
    // 保存到本地存储
    wx.setStorageSync('familyMembers', familyMembers);
    
    // 显示成功提示
    wx.showToast({
      title: isEdit ? '修改成功' : '添加成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  }
});