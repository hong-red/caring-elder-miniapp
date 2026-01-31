Page({
  data: {
    isPlaying: false,
    statusText: '等待测试',
    logs: []
  },

  onLoad() {
    this.audioCtx = wx.createInnerAudioContext();
    this.audioCtx.onPlay(() => {
      this.addLog('▶️ 开始播放');
      this.setData({ isPlaying: true, statusText: '正在播放...' });
    });
    this.audioCtx.onEnded(() => {
      this.addLog('⏹️ 播放结束');
      this.setData({ isPlaying: false, statusText: '播放完成' });
    });
    this.audioCtx.onError((res) => {
      this.addLog('❌ 播放错误: ' + res.errMsg);
      console.error('音频测试错误详情:', res);
      this.setData({ isPlaying: false, statusText: '播放出错' });
    });
  },

  onUnload() {
    if (this.audioCtx) {
      this.audioCtx.destroy();
    }
  },

  addLog(msg) {
    const time = new Date().toLocaleTimeString();
    const newLogs = [time + ' ' + msg].concat(this.data.logs);
    this.setData({
      logs: newLogs
    });
  },

  playStandard() {
    this.stopAll();
    const url = 'https://www.w3schools.com/html/horse.mp3';
    this.addLog('尝试播放标准 MP3...');
    this.audioCtx.src = url;
    this.audioCtx.play();
  },

  playTencent() {
    this.stopAll();
    const url = 'https://web-assets.tencentmusic.com/files/test.mp3';
    this.addLog('尝试播放腾讯示例...');
    this.audioCtx.src = url;
    this.audioCtx.play();
  },

  playBaiduTTS() {
    this.stopAll();
    const text = '测试语音功能是否正常，这是一段测试音频。';
    const url = `https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&text=${encodeURIComponent(text)}`;
    this.addLog('尝试【先下载后播放】百度 TTS...');
    
    wx.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200) {
          this.addLog('下载成功，开始解码播放');
          this.audioCtx.src = res.tempFilePath;
          this.audioCtx.play();
        } else {
          this.addLog('下载失败，状态码: ' + res.statusCode);
        }
      },
      fail: (err) => {
        this.addLog('下载过程异常: ' + err.errMsg);
      }
    });
  },

  playYoudaoTTS() {
    this.stopAll();
    const text = '有道语音测试。';
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=zh`;
    this.addLog('尝试【先下载后播放】有道 TTS...');
    
    wx.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200) {
          this.addLog('下载成功，开始解码播放');
          this.audioCtx.src = res.tempFilePath;
          this.audioCtx.play();
        }
      }
    });
  },

  stopAll() {
    if (this.audioCtx) {
      this.audioCtx.stop();
    }
    this.setData({ isPlaying: false, statusText: '已停止' });
  }
});
