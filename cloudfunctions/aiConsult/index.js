// 云函数入口文件
const cloud = require('wx-server-sdk')

const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 智能健康咨询云函数
 * 接入通义千问 API
 */
exports.main = async (event, context) => {
  const { messages, model = "qwen-turbo" } = event
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return {
      success: false,
      error: '消息格式不正确'
    }
  }
  
  console.log('收到 AI 咨询请求，消息数:', messages.length)
  console.log('请求模型:', model)

  try {
    const response = await axios({
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-b7a5e6803e7c46bd80c3ab5bb7b6e1a6'
      },
      data: {
        model: model,
        messages: messages,
        max_tokens: 1500, // 深度解析可能需要更多 token
        temperature: 0.7
      },
      timeout: 50000 // 增加 axios 超时到 50s
    })

    console.log('API 响应状态:', response.status)

    if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
      const reply = response.data.choices[0].message.content
      console.log('AI 回复内容长度:', reply.length)
      return {
        success: true,
        reply: reply,
        timestamp: Date.now()
      }
    } else {
      console.error('API 返回异常结构:', JSON.stringify(response.data))
      return {
        success: false,
        error: 'API 返回数据异常',
        detail: response.data
      }
    }
  } catch (err) {
    console.error('AI 云函数调用失败详情:', err)
    
    // 处理 axios 错误
    let errorMessage = err.message
    if (err.response) {
      errorMessage = `接口错误(${err.response.status}): ${JSON.stringify(err.response.data)}`
    }

    return {
      success: false,
      error: '咨询助手暂时休息了，请稍后再试',
      detail: errorMessage
    }
  }
}
