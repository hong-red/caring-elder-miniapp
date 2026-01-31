const app = getApp();

Page({
  data: {
    navHeight: 0,
    messages: [],
    inputMessage: '',
    loadingMore: false,
    scrollTop: 0,
    scrollIntoView: '',
    quickQuestions: [
      '我的状态正常吗？',
      '心情不太好怎么办？',
      '如何保持良好的心态？',
      '今天适合去哪里散步？'
    ],
    currentHealthData: null,
    medicalHistory: [],
    showHealthData: false, // 是否展开健康数据卡片
    mode: '', // report, diagnosis
    settings: {
      bigFont: false,
      realtimeReading: false
    }
  },

  onLoad(options) {
    this.calculateNavHeight();
    this.loadData();
    
    const mode = options.mode || '';
    this.setData({ mode });

    if (mode === 'report') {
      this.addMessage('ai', '您好！正在为您深度解析最新的健康报告，请稍候...');
      setTimeout(() => this.generateReportAnalysis(), 500);
    } else if (mode === 'diagnosis') {
      this.addMessage('ai', '您好！我是您的私人医生。我正在整合您过去7天的健康趋势和既往病历，为您进行综合评估，请稍候...');
      setTimeout(() => this.generateDiagnosisAnalysis(), 500);
    } else {
      // 初始化默认欢迎消息
      this.addMessage('ai', '您好！我是您的生活陪伴助手，今天有什么开心的事情想和我分享，或者有什么生活上的小烦恼吗？');
    }
    
    // 进入页面自动滚动到底部
    this.setData({ scrollTop: 999999 });
    
    // 如果有最新健康数据，自动展开一次（可选）
    if (this.data.currentHealthData) {
      this.setData({ showHealthData: true });
      setTimeout(() => {
        this.setData({ showHealthData: false }); // 1.5秒后收起，留悬念
      }, 1500);
    }
  },

  onShow() {
    this.loadData();
  },





  calculateNavHeight() {
    try {
      const windowInfo = wx.getWindowInfo();
      let navHeight = windowInfo.statusBarHeight + 44;
      const menuButton = wx.getMenuButtonBoundingClientRect();
      if (menuButton) {
        navHeight = menuButton.bottom + (menuButton.top - windowInfo.statusBarHeight);
      }
      this.setData({ navHeight: Math.max(0, navHeight - 10) });
    } catch (e) {
      const systemInfo = wx.getSystemInfoSync();
      let navHeight = systemInfo.statusBarHeight + 44;
      this.setData({ navHeight: Math.max(0, navHeight - 10) });
    }
  },

  loadData() {
    const healthData = wx.getStorageSync('healthData') || [];
    const latestData = healthData.length > 0 ? healthData[0] : null;
    const medicalHistory = wx.getStorageSync('medicalHistory') || [];
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };
    this.setData({
      currentHealthData: latestData,
      medicalHistory: medicalHistory,
      settings: settings
    });
  },

  // 生成深度解析报告 (Flow 1: 首页进入)
  generateReportAnalysis() {
    const { currentHealthData, medicalHistory } = this.data;
    if (!currentHealthData) {
      this.addMessage('ai', '我还没有看到您最新的健康记录，您可以先去录入一下，或者直接问我您想了解的内容。');
      return;
    }

    const prompt = `请作为一名专业的健康管理专家，为用户深度解析其最新的健康生理数据。
    【重要：必须严格基于以下数据，严禁虚构任何未提供的数据（如血糖、具体地理位置等）】
    【当前生理数据】：血压:${currentHealthData.systolic}/${currentHealthData.diastolic}mmHg, 心率:${currentHealthData.heartRate}bpm, 脉搏:${currentHealthData.pulse}bpm
    【既往关注事项】：${medicalHistory.join('、') || '无'}
    
    要求：
    1. 语气亲切、自然，像是在和家里长辈聊天。
    2. **数据准确性**：只能解读上述提供的血压、心率和脉搏数据。如果数据中没有血糖、血氧等，绝对不要提及或虚构。
    3. **禁止虚构地址**：不要提及任何具体的街道、地区 or 空气质量信息。
    4. 给出1-2条针对上述数据的实用生活建议。
    5. 字数控制在200字以内，保持精简。
    6. 结尾提醒“以上分析仅供参考”。`;

    this.callAI(prompt, true);
  },

  // 生成医生诊断评估 (Flow 2: 健康页进入)
  generateDiagnosisAnalysis() {
    const { medicalHistory } = this.data;
    const healthData = wx.getStorageSync('healthData') || [];
    const recent7Days = healthData.slice(0, 7);

    if (recent7Days.length === 0) {
      this.addMessage('ai', '我还没有记录到您过去几天的详细数据。您可以先告诉我您最近感觉怎么样？');
      return;
    }

    const dataSummary = recent7Days.map(d => `[${d.date || '记录'}] 心率:${d.heartRate}bpm, 血压:${d.systolic}/${d.diastolic}mmHg`).join('\n');

    const prompt = `请模拟一位资深医生的角色，根据用户过去7天的健康数据趋势进行诊断。
    【重要：严禁虚构任何数据，严禁提及空气质量或具体地理位置】
    【过去7天趋势数据】：
    ${dataSummary}
    【既往关注事项】：${medicalHistory.join('、') || '暂无'}

    要求：
    1. **第一部分：综合诊断**。仅分析上述数据中的心率和血压波动规律，评估整体健康状况。
    2. **第二部分：个性化建议**。根据上述诊断结果，给出具体的指导方案。
    3. 语气要严谨、负责，同时充满长辈般的关怀。
    4. **禁止虚构**：不要提及血糖、血氧或任何未在数据中出现的指标。
    5. **精简回答**：总字数控制在250字以内。
    6. 结尾郑重提醒“诊断建议仅供参考，不作为医疗依据”。`;

    this.callAI(prompt, true);
  },

  // 统一 AI 调用逻辑
  callAI(userInput, isSystemAction = false) {
    this.setData({ loadingMore: true });

    const systemPrompt = `你是一位专业且温暖的健康管理专家和生活陪伴助手。
    你的任务是根据提供的健康生理数据，为长辈提供准确、通俗、充满关怀的建议。
    【禁令】：严禁虚构数据，严禁提及未在输入中出现的地理位置、天气或生理指标。`;

    const aiMessages = [{ role: 'system', content: systemPrompt }];

    if (!isSystemAction) {
      const { messages } = this.data;
      if (messages && messages.length > 0) {
        messages.slice(-5).forEach(msg => {
          aiMessages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        });
      }
      aiMessages.push({ role: 'user', content: userInput });
    } else {
      aiMessages.push({ role: 'user', content: userInput });
    }

    wx.cloud.callFunction({
      name: 'aiConsult',
      data: { messages: aiMessages },
      timeout: 60000,
      config: { env: 'cloud1-0gxromkr6a6480c4' },
      success: (res) => {
        this.setData({ loadingMore: false });
        if (res.result && res.result.success) {
          this.addMessage('ai', res.result.reply);
        } else {
          const errMsg = res.result ? res.result.error : '服务器响应异常';
          this.addMessage('ai', "抱歉，我现在遇到了一点问题（" + errMsg + "），请稍后再问我吧。");
        }
      },
      fail: (err) => {
        this.setData({ loadingMore: false });
        const isTimeout = err.errMsg && (err.errMsg.includes('timeout') || err.errMsg.includes('deadline exceeded') || err.errMsg.includes('-504003'));
        if (isTimeout) {
          this.addMessage('ai', "深度解析需要较长时间（约 10-30 秒），目前云端响应稍慢。请您耐心等待，或者稍后重新尝试。");
        } else {
          this.addMessage('ai', "网络连接似乎有点问题（" + (err.errMsg || '未知错误') + "），请检查您的网络设置或联系管理员。");
        }
      }
    });
  },

  handleInput(e) {
    const value = e.detail.value || '';
    this.setData({
      inputMessage: value
    });
  },

  // 兼容旧的方法名
  onInputChange(e) {
    this.handleInput(e);
  },

  sendMessage() {
    console.log('发送点击，当前 inputMessage：', this.data.inputMessage);
    if (!this.data.inputMessage.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    this.addMessage('user', this.data.inputMessage);
    this.setData({ inputMessage: '' });
    this.callAI(this.data.inputMessage);
  },



  addMessage(type, content) {
    const newMessage = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      type: type,
      content: content,
      timestamp: this.formatTime(new Date())
    };

    const index = this.data.messages.length;
    this.setData({
      [`messages[${index}]`]: newMessage
    }, () => {
      setTimeout(() => this.scrollToBottom(), 100);
      if (type === 'ai' && this.data.settings.realtimeReading) {
        this.speakText(content);
      }
    });
  },

  formatTime(date) {
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${hour}:${minute}`;
  },

  speakText(text) {
    if (app.voiceManager) {
      app.voiceManager.speak(text);
    }
  },

  scrollToBottom() {
    this.setData({ scrollIntoView: 'bottom-anchor' });
  },

  readMessage(e) {
    const text = e.currentTarget.dataset.text;
    if (text) this.speakText(text);
  },

  toggleHealthData() {
    this.setData({ showHealthData: !this.data.showHealthData });
  },

  sendQuickQuestion(e) {
    const { question } = e.currentTarget.dataset;
    if (question) {
      this.addMessage('user', question);
      this.callAI(question);
    }
  },

  readPageContent() {
    if (app.voiceManager && app.voiceManager.isSpeaking) {
      // 如果正在播放，暂停
      app.voiceManager.pause();
    } else if (app.voiceManager && app.voiceManager.innerAudioContext && app.voiceManager.innerAudioContext.src) {
      // 如果已经暂停，恢复播放
      app.voiceManager.resume();
    } else {
      // 否则开始新的朗读
      const messages = this.data.messages || [];
      let lastAiMsg = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].type === 'ai') {
          lastAiMsg = messages[i];
          break;
        }
      }

      let introText = lastAiMsg ? lastAiMsg.content : (app.pageDocs['health-consult'] || '这是 AI 健康助手页面，您可以输入您的问题进行咨询。');
      let title = lastAiMsg ? 'AI 最新诊断建议' : '本页功能说明';

      wx.showModal({
        title: title,
        content: introText,
        confirmText: '开始朗读',
        cancelText: '我知道了',
        success: (res) => {
          if (res.confirm && app.voiceManager) {
            app.voiceManager.speak(introText, lastAiMsg ? null : 'health-consult');
          }
        }
      });
    }
  },

  // 朗读指定文字
  readText(e) {
    const text = e.currentTarget.dataset.text;
    if (text) {
      this.speakText(text);
    }
  },

  // 加载更多消息
  loadMoreMessages() {
    console.log('加载更多消息');
    // 实现消息加载逻辑
    if (this.data.loadingMore) return;
    
    this.setData({ loadingMore: true });
    
    // 模拟加载延迟
    setTimeout(() => {
      this.setData({ loadingMore: false });
    }, 1000);
  }
});