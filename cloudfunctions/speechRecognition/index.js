// 云函数入口文件 index.js
const cloud = require('wx-server-sdk');
const tencentcloud = require('tencentcloud-sdk-nodejs');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const AsrClient = tencentcloud.asr.v20190614.Client;

exports.main = async (event, context) => {
  try {
    const { tempFilePath } = event;

    // 1. 下载录音文件
    const downloadResult = await cloud.downloadFile({
      fileID: tempFilePath
    });

    const buffer = downloadResult.fileContent;
    const base64Data = buffer.toString('base64');

    // 2. 配置客户端（密钥已移除，后续应通过环境变量配置）
    const clientConfig = {
      credential: {
        secretId: '',
        secretKey: '',
      },
      region: 'ap-beijing',
      profile: {
        httpProfile: {
          endpoint: 'asr.tencentcloudapi.com',
        },
      },
    };

    const client = new AsrClient(clientConfig);

    // 3. 构造请求参数
    const params = {
      ProjectId: 0,
      SubServiceType: 2,              // 实时识别
      EngSerViceType: '16k_zh',       // 16k 中文普通话
      VoiceFormat: 'pcm',             // 匹配前端的pcm格式
      Data: base64Data,
      DataLen: buffer.length,
      VoiceId: `voice_${Date.now()}`,
      SourceType: 1,                  // 1=一次性上传
      CutLength: 0                    // 0=不切割
    };

    // 4. 调用 SentenceRecognition 接口
    const result = await client.SentenceRecognition(params);

    // 5. 处理响应结果
    if (result.Result) {
      return {
        success: true,
        text: result.Result.trim(),
        requestId: result.RequestId,
      };
    } else {
      throw new Error(result.Error?.Message || '识别结果为空');
    }

  } catch (error) {
    console.error('语音识别失败:', error);
    return {
      success: false,
      error: error.message || error.toString(),
    };
  }
};