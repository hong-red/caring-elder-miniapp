const formatTime = date => {
  const now = new Date()
  const targetDate = new Date(date)
  
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth() + 1
  const day = targetDate.getDate()
  const hour = targetDate.getHours()
  const minute = targetDate.getMinutes()
  const second = targetDate.getSeconds()
  
  // 格式化时间部分
  const timeStr = `${[hour, minute, second].map(formatNumber).join(':')}`
  
  // 检查是否是今天
  if (year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate()) {
    return timeStr
  }
  
  // 检查是否是昨天
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (year === yesterday.getFullYear() && month === yesterday.getMonth() + 1 && day === yesterday.getDate()) {
    return `昨天 ${timeStr}`
  }
  
  // 其他情况显示完整日期
  return `${[year, month, day].map(formatNumber).join('/')} ${timeStr}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const logActivity = (action, detail, icon = '📝') => {
  const logs = wx.getStorageSync('activity_logs') || [];
  logs.push({
    action,
    detail,
    icon,
    timestamp: Date.now()
  });
  // 最多保留 100 条记录
  if (logs.length > 100) {
    logs.shift();
  }
  wx.setStorageSync('activity_logs', logs);
}

module.exports = {
  formatTime,
  logActivity
}
