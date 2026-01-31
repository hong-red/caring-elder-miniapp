/**
 * 语音朗读管理工具
 * 稳定版：优先使用 MP3 映射表 + 在线 MP3 接口兜底
 * 彻底移除对微信同声传译插件的依赖，避免插件未授权导致的启动失败
 */

class VoiceManager {
  constructor() {
    this.innerAudioContext = null;
    this.isSpeaking = false;
    this.currentText = '';
    this.currentPageKey = null;
    this.serviceIndex = 0;
  }

  /**
   * 获取或初始化音频上下文
   */
  getAudioContext() {
    if (typeof wx === 'undefined') return null;
    
    if (!this.innerAudioContext && wx.createInnerAudioContext) {
      try {
        this.innerAudioContext = wx.createInnerAudioContext();
        
        if (wx.setInnerAudioOption) {
          wx.setInnerAudioOption({
            obeyMuteSwitch: false,
            speakerOn: true
          });
        }

        this.innerAudioContext.onPlay(() => {
          this.isSpeaking = true;
          console.log('语音开始播放');
        });
        this.innerAudioContext.onEnded(() => {
          this.isSpeaking = false;
          console.log('播放自然结束');
        });
        this.innerAudioContext.onPause(() => {
          this.isSpeaking = false;
          console.log('语音暂停播放');
        });
        this.innerAudioContext.onError((res) => {
          this.isSpeaking = false;
          console.warn('播放发生错误:', res);
          
          const errMsg = (res.errMsg || '').toLowerCase();
          const isDecodeError = errMsg.indexOf('decode') !== -1 || res.errCode === 10001 || res.errCode === 10002 || res.errCode === -1;
          
          // 如果是解码错误或者接口失效，自动尝试下一个备份接口
          if (isDecodeError || !res.errCode) {
            console.log('检测到音频解码失败或接口异常，正在切换备份接口...');
            this.tryBackupService();
          }
        });
      } catch (e) {
        console.error('音频上下文初始化失败:', e);
        this.innerAudioContext = null;
      }
    }
    return this.innerAudioContext;
  }

  /**
   * 朗读文字
   */
  speak(text, pageKey = null) {
    if (!text || typeof wx === 'undefined') return;
    
    this.currentText = text;
    this.currentPageKey = pageKey;
    this.stop();
    const audioCtx = this.getAudioContext();
    if (!audioCtx) return;

    // 1. 优先尝试使用预设的 MP3 链接
    if (pageKey) {
      try {
        const pageAudio = require('./page-audio.js');
        if (pageAudio[pageKey]) {
          console.log('正在播放预设 MP3 源:', pageKey);
          audioCtx.src = pageAudio[pageKey];
          audioCtx.play();
          this.isSpeaking = true;
          return;
        }
      } catch (e) {
        console.warn('读取预设音频映射失败:', e);
      }
    }

    // 2. 使用动态接口
    this.isSpeaking = true;
    this.serviceIndex = 0;
    this.fallbackSpeak(text);
  }

  /**
   * 暂停播放
   */
  pause() {
    try {
      if (this.innerAudioContext && this.isSpeaking) {
        this.innerAudioContext.pause();
        this.isSpeaking = false;
        console.log('语音暂停播放');
      }
    } catch (e) {
      console.warn('暂停播放失败:', e);
    }
  }

  /**
   * 恢复播放
   */
  resume() {
    try {
      if (this.innerAudioContext && !this.isSpeaking && this.innerAudioContext.src) {
        this.innerAudioContext.play();
        this.isSpeaking = true;
        console.log('语音恢复播放');
      }
    } catch (e) {
      console.warn('恢复播放失败:', e);
    }
  }

  /**
   * 停止播放
   */
  stop() {
    try {
      if (this.innerAudioContext) {
        this.innerAudioContext.stop();
        // 重置状态，避免重复错误
        this.innerAudioContext.src = '';
      }
    } catch (e) {
      console.warn('停止播放失败:', e);
    }
    this.isSpeaking = false;
    this.serviceIndex = 0;
  }
  
  /**
   * 切换播放/暂停状态
   */
  toggle(text, pageKey = null) {
    if (!text || typeof wx === 'undefined') return;
    
    // 如果没有当前播放内容或内容不同，直接开始播放
    if (!this.currentText || this.currentText !== text || this.currentPageKey !== pageKey) {
      this.speak(text, pageKey);
      return;
    }
    
    // 如果正在播放，暂停
    if (this.isSpeaking) {
      this.pause();
    } 
    // 如果已经暂停，恢复播放
    else if (this.innerAudioContext && this.innerAudioContext.src) {
      this.resume();
    }
    // 如果没有播放源，重新开始
    else {
      this.speak(text, pageKey);
    }
  }

  /**
   * 销毁当前音频上下文
   */
  destroyContext() {
    if (this.innerAudioContext) {
      try {
        this.innerAudioContext.destroy();
      } catch (e) {}
      this.innerAudioContext = null;
    }
  }

  /**
   * 尝试备用语音服务
   */
  tryBackupService() {
    if (!this.currentText || this.serviceIndex >= 3) {
      console.warn('所有语音接口均不可用，已自动停止');
      this.isSpeaking = false;
      return;
    }
    
    this.serviceIndex++;
    console.log(`尝试第 ${this.serviceIndex + 1} 个备用语音接口...`);
    
    // 如果是解码错误，有时需要重置上下文才能继续播放下一个源
    this.destroyContext();
    
    this.fallbackSpeak(this.currentText);
  }

  /**
   * 兜底方案：使用在线语音接口
   */
  fallbackSpeak(text) {
    let audioCtx = this.getAudioContext();
    if (!audioCtx) {
      console.warn('音频上下文初始化失败，无法播放语音');
      this.isSpeaking = false;
      return;
    }

    const safeText = text.substring(0, 500);
    let url = '';
    
    // 轮询不同的接口
    if (this.serviceIndex === 0) {
      // 接口 1: 有道接口 A (相对稳定)
      url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(safeText)}&le=zh&type=2`;
    } else if (this.serviceIndex === 1) {
      // 接口 2: 谷歌 TTS 备用接口 (稳定但部分网络可能慢)
      url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=zh-CN&client=tw-ob`;
    } else if (this.serviceIndex === 2) {
      // 接口 3: 百度公共接口 (兜底)
      url = `https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd=5&text=${encodeURIComponent(safeText)}`;
    } else {
      // 接口 4: 有道备用接口
      url = `https://tts.youdao.com/fanyivoice?word=${encodeURIComponent(safeText)}&le=zh&keyfrom=speaker-target`;
    }
    
    console.log(`使用接口 ${this.serviceIndex + 1} 朗读:`, safeText.substring(0, 10) + '...');
    
    try {
      // 确保音频上下文存在且有效
      if (!this.innerAudioContext) {
        this.destroyContext();
        audioCtx = this.getAudioContext();
        if (!audioCtx) {
          throw new Error('音频上下文不可用');
        }
      }
      
      // 安全停止当前播放
      if (this.innerAudioContext) {
        this.innerAudioContext.stop();
      }
      
      this.innerAudioContext.src = url;
      
      setTimeout(() => {
        if (this.innerAudioContext && this.innerAudioContext.src === url) {
          this.innerAudioContext.play();
        }
      }, 150);
    } catch (e) {
      console.error('播放过程发生异常:', e);
      // 尝试下一个备用服务
      this.tryBackupService();
    }
  }
}

module.exports = new VoiceManager();