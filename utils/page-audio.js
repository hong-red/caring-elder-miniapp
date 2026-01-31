/**
 * 页面功能介绍语音资源 (MP3 格式)
 * 采用标准 MP3 源，确保 Windows 模拟器与真机均能正常解码
 */
const pageDocs = require('./page-docs.js');

const audioSources = {};

// 为 page-docs 中的每一项生成对应的本地语音路径
Object.keys(pageDocs).forEach(key => {
  // 指向本地下载好的 MP3 文件，这样稳定性最高，模拟器完全不需要联网也能朗读
  audioSources[key] = `/assets/audio/${key}.mp3`;
});

module.exports = audioSources;
