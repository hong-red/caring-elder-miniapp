Page({
  data: {
    id: '',
    name: '',
    desc: '',
    dosage: '',
    navHeight: 0,
    settings: {},
    frequency: '',
    remindTime: '',
    syncToCalendar: true,
    expiryDate: ''
  },

  onLoad(options) {
    this.calculateNavHeight();
    if (options.id) {
      this.setData({ id: options.id });
      this.loadMedicationData(options.id);
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
    // 获取全局设置
    const settings = wx.getStorageSync('notificationSettings') || { bigFont: false, realtimeReading: false };
    this.setData({ settings });
  },

  // 朗读当前页面主要内容
  readPageContent() {
    if (!this.data.settings.realtimeReading) return;
    
    const { id, name } = this.data;
    let content = `您正在${id ? '编辑药品' : '添加药品'}页面。`;
    if (id && name) {
      content += `当前正在修改的药品是${name}。`;
    }
    content += `请填写药品名称、服用剂量、频率和提醒时间，完成后点击保存。`;
    
    const app = getApp();
    if (app.voiceManager) {
      app.voiceManager.speak(content);
    } else {
      wx.showToast({
        title: '正在朗读编辑页...',
        icon: 'none'
      });
    }
  },

  // 朗读指定文字
  readText(text) {
    if (!this.data.settings.realtimeReading) return;
    const app = getApp();
    if (app.voiceManager) {
      app.voiceManager.speak(text);
    }
  },

  // 加载药品详情
  loadMedicationData(id) {
    const medications = wx.getStorageSync('medications') || [];
    const medication = medications.find(m => m.id === id);
    if (medication) {
      this.setData({
        name: medication.name,
        desc: medication.desc,
        dosage: medication.dosage,
        frequency: medication.frequency,
        remindTime: medication.remindTime,
        syncToCalendar: medication.syncToCalendar !== undefined ? medication.syncToCalendar : true,
        expiryDate: medication.expiryDate || ''
      });
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 输入监听
  onNameInput(e) { this.setData({ name: e.detail.value }); },
  onDescInput(e) { this.setData({ desc: e.detail.value }); },
  onDosageInput(e) { this.setData({ dosage: e.detail.value }); },

  // 频率选择
  onFreqChange(e) {
    const frequencies = ['每日1次', '每日2次', '每日3次', '按需服用'];
    this.setData({
      frequency: frequencies[e.detail.value]
    });
  },

  // 提醒时间选择
  onTimeChange(e) {
    this.setData({
      remindTime: e.detail.value
    });
  },

  // 同步开关
  onSyncChange(e) {
    this.setData({
      syncToCalendar: e.detail.value
    });
  },

  // 有效期选择
  onExpiryChange(e) {
    this.setData({
      expiryDate: e.detail.value
    });
  },

  // 提交药品信息
  submitMedication: function(e) {
    const { name, desc, dosage, frequency, remindTime, expiryDate, syncToCalendar, id } = this.data;
    
    // 表单验证
    if (!name) {
      wx.showToast({
        title: '请输入药品名称',
        icon: 'none'
      });
      return;
    }

    const finalRemindTime = remindTime || '08:00';
    
    // 获取现有药品列表
    let medications = wx.getStorageSync('medications') || [];
    
    if (id) {
      // 编辑模式
      const index = medications.findIndex(m => m.id === id);
      if (index !== -1) {
        medications[index] = {
          ...medications[index],
          name: name,
          desc: desc || '餐后半小时服用',
          dosage: dosage || '1片',
          frequency: frequency || '每日3次',
          remindTime: finalRemindTime,
          syncToCalendar: syncToCalendar,
          expiryDate: expiryDate || ''
        };
      }
    } else {
      // 新增模式
      const newMedication = {
        id: Date.now().toString(),
        name: name,
        desc: desc || '餐后半小时服用',
        dosage: dosage || '1片',
        frequency: frequency || '每日3次',
        remindTime: finalRemindTime,
        syncToCalendar: syncToCalendar,
        expiryDate: expiryDate || '',
        status: '服用中',
        createdAt: new Date().toISOString()
      };
      medications.unshift(newMedication);
    }
    
    // 保存到本地存储
    wx.setStorageSync('medications', medications);

    // 如果开启了同步，则调用系统日历
    if (syncToCalendar) {
      this.addCalendarReminder(name, finalRemindTime, dosage);
    }
    
    // 显示成功提示并返回上一页
    wx.showToast({
      title: id ? '修改成功' : '添加成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    });
  },

  // 添加日历提醒 (模拟闹钟)
  addCalendarReminder(name, time, dosage) {
    if (!wx.addPhoneCalendar) {
      console.warn('当前环境不支持 addPhoneCalendar');
      return;
    }

    // 计算今天的提醒时间戳
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).getTime() / 1000;

    wx.addPhoneCalendar({
      title: `服用药品：${name}`,
      description: `服用剂量：${dosage}。请按时服药，祝您身体健康！`,
      startTime: startDate,
      endTime: startDate + 1800, // 默认持续30分钟
      alarm: true,
      success: () => {
        console.log('成功添加至系统日历');
      },
      fail: (err) => {
        console.error('添加至系统日历失败', err);
      }
    });
  }
});