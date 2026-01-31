const app = getApp();

Page({
  data: {
    introText: '',
    isSpeaking: false
  },

  onLoad(options) {
    const { key, text } = options;
    let displayHtml = '';

    if (text && text !== 'undefined') {
      displayHtml = decodeURIComponent(text);
    } else if (key) {
      // 这里的 app.pageDocs 是在 app.js 中挂载的
      const pageDocs = getApp().pageDocs || {};
      displayHtml = pageDocs[key] || pageDocs['default'];
    }

    this.setData({
      introText: displayHtml || '暂无介绍信息'
    });
    
    // 自动触发一次朗读 (如果用户在设置中开启了云帮助(语音))
    const settings = wx.getStorageSync('notificationSettings') || {};
    if (settings.realtimeReading) {
      setTimeout(() => {
        this.toggleVoice();
      }, 500);
    }
  },

  onUnload() {
    if (app.voiceManager) {
      app.voiceManager.stop();
    }
  },

  toggleVoice() {
    const app = getApp();
    if (this.data.isSpeaking) {
      if (app.voiceManager) app.voiceManager.stop();
      this.setData({ isSpeaking: false });
    } else {
      if (app.voiceManager) {
        app.voiceManager.speak(this.data.introText);
        this.setData({ isSpeaking: true });

        // 监听结束 (简化版：根据字数大概预估时间，或者如果 voiceManager 有回调则更好)
        // 这里我们简单设置一个较长的安全时间
        const duration = Math.min(this.data.introText.length * 300, 15000); 
        setTimeout(() => {
          this.setData({ isSpeaking: false });
        }, duration);
      }
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
