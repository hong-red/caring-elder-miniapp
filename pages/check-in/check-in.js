const util = require('../../utils/util.js')

Page({
  data: {
    navHeight: 0,
    todayChecked: false,
    currentDate: '',
    checkInHistory: [],
    totalDays: 0,
    continuousDays: 0,
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad() {
    this.calculateNavHeight();
    // 设置当前日期
    this.setCurrentDate();
    
    // 加载打卡记录
    this.loadCheckInHistory();
    
    // 检查今日是否已打卡
    this.checkTodayStatus();
    
    // 计算打卡统计
    this.calculateStats();
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
    // 检查是否需要发送未打卡提醒
    this.checkMissingCheckIn();
  },

  loadSettings() {
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };
    this.setData({ settings });
  },

  // 朗读当前页面主要内容 (改为弹窗显示大字 + 语音)
  readPageContent() {
    const app = getApp();
    const pageKey = 'check-in'; // 打卡页面对应 check-in
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
    const text = e.currentTarget.dataset.text;
    if (text) {
      const app = getApp();
      if (app.voiceManager) {
        app.voiceManager.speak(text);
      }
    }
  },

  // 设置当前日期
  setCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    this.setData({
      currentDate: currentDate
    });
  },

  // 加载打卡记录
  loadCheckInHistory() {
    const checkInHistory = wx.getStorageSync('checkInHistory') || [];
    this.setData({
      checkInHistory: checkInHistory
    });
  },

  // 检查今日是否已打卡
  checkTodayStatus() {
    const { currentDate, checkInHistory } = this.data;
    const todayRecord = checkInHistory.find(item => item.date === currentDate);
    this.setData({
      todayChecked: todayRecord && todayRecord.checked
    });
  },

  // 打卡
  checkIn() {
    const { currentDate, checkInHistory } = this.data;
    const now = new Date();
    const time = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // 创建今日打卡记录
    const todayRecord = {
      date: currentDate,
      checked: true,
      time: time,
      timestamp: now.getTime()
    };

    // 查找是否已有今日记录
    const existingIndex = checkInHistory.findIndex(item => item.date === currentDate);
    
    let updatedHistory;
    if (existingIndex !== -1) {
      // 更新已有记录
      updatedHistory = checkInHistory.slice();
      updatedHistory[existingIndex] = todayRecord;
    } else {
      // 添加新记录
      updatedHistory = checkInHistory.concat([todayRecord]);
    }

    // 保存到本地存储
    wx.setStorageSync('checkInHistory', updatedHistory);
    
    // 更新状态
    this.setData({
      checkInHistory: updatedHistory,
      todayChecked: true
    });

    // 记录打卡活动
    util.logActivity('健康打卡', `已完成今日健康打卡 (${time})`, '📍');
    
    // 重新计算统计
    this.calculateStats();
    
    // 显示打卡成功
    wx.showModal({
      title: '打卡成功！',
      content: '您的平安信息已同步给子女，请放心。明天也记得来签到哦！',
      showCancel: false,
      confirmText: '太棒了',
      success: () => {
        if (this.data.settings.realtimeReading) {
          getApp().voiceManager.speak('打卡成功。平安信息已发送给您的子女。');
        }
      }
    });
  },

  // 计算打卡统计
  calculateStats() {
    const { checkInHistory } = this.data;
    
    // 计算总打卡天数
    const totalDays = checkInHistory.filter(item => item.checked).length;
    
    // 计算连续打卡天数
    let continuousDays = 0;
    if (totalDays > 0) {
      // 按日期排序，从新到旧
      const sortedHistory = checkInHistory.slice().sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      // 检查是否包含今天
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // 如果今天没打卡，从昨天开始计算
      let startIndex = 0;
      if (sortedHistory[0].date !== todayStr || !sortedHistory[0].checked) {
        startIndex = 1;
      }
      
      // 计算连续天数
      for (let i = startIndex; i < sortedHistory.length; i++) {
        if (!sortedHistory[i].checked) break;
        
        // 检查是否连续
        if (i === startIndex) {
          continuousDays++;
        } else {
          const prevDate = new Date(sortedHistory[i - 1].date);
          const currDate = new Date(sortedHistory[i].date);
          const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            continuousDays++;
          } else {
            break;
          }
        }
      }
    }
    
    this.setData({
      totalDays: totalDays,
      continuousDays: continuousDays
    });
  },

  // 检查缺卡并发送提醒
  checkMissingCheckIn() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];
    
    // 获取今日打卡状态
    const { checkInHistory } = this.data;
    const todayRecord = checkInHistory.find(item => item.date === todayStr);
    const isCheckedIn = todayRecord && todayRecord.checked;
    
    // 获取已绑定的家人
    const familyMembers = wx.getStorageSync('familyMembers') || [];
    const hasFamilyMembers = familyMembers.length > 0;
    
    // 只有在20:00之后且未打卡，并且绑定了家人时才需要发送提醒
    if (currentHour >= 20 && !isCheckedIn && hasFamilyMembers) {
      // 检查是否已经发送过提醒，避免重复发送
      const lastReminderDate = wx.getStorageSync('lastReminderDate');
      if (lastReminderDate !== todayStr) {
        // 发送提醒
        this.sendMissingCheckInReminder(familyMembers);
        // 记录发送日期
        wx.setStorageSync('lastReminderDate', todayStr);
      }
    }
  },
  
  // 发送未打卡提醒
  sendMissingCheckInReminder(familyMembers) {
    // 模拟发送提醒给家人
    const currentDate = this.data.currentDate;
    
    // 这里可以根据实际需求实现不同的提醒方式
    // 1. 本地消息提醒
    // 2. 云函数发送短信
    // 3. 微信订阅消息
    
    // 演示版本：显示提示并记录日志
    wx.showModal({
      title: '平安提醒',
      content: `今日${currentDate}您尚未打卡，系统已自动通知您的家人，确保您的安全。`,
      showCancel: false,
      confirmText: '我知道了',
      success: () => {
        if (this.data.settings.realtimeReading) {
          getApp().voiceManager.speak('您今日尚未打卡，系统已通知您的家人。');
        }
      }
    });
    
    // 记录提醒日志
    console.log(`发送未打卡提醒：${currentDate}，家人：${familyMembers.map(m => m.name).join(', ')}`);
    
    // 这里可以添加实际的通知发送逻辑
    // 例如调用云函数发送短信或微信消息
    // wx.cloud.callFunction({
    //   name: 'sendReminder',
    //   data: {
    //     familyMembers: familyMembers,
    //     date: currentDate
    //   }
    // });
  }
});