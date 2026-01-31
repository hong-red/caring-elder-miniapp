Page({
  data: {
    navHeight: 0,
    userInfo: {},
    settings: {
      bigFont: false,
      realtimeReading: false
    },
    currentTimeStr: '',
    lastUpdateTime: '',
    weather: {
      temp: '--',
      desc: '获取中',
      icon: '☁️',
      city: '定位中'
    },
    healthStats: {
      status: 'normal',
      overallText: '状态良好，请继续保持',
      heartRate: 72,
      heartRateStatus: 'normal',
      heartRatePercent: 72,
      bloodPressure: '120/80',
      bpStatus: 'normal',
      bpPercent: 80,
      oxygen: 98,
      oxStatus: 'normal',
      oxPercent: 98,
      score: 92,
    sourceName: 'Apple Watch',
    sourceIcon: '⌚',
    sourceType: 'device',
    aiSummary: '您的心率和血压非常稳定，今日活动量适中，建议下午增加 15 分钟散步。',
    todayChecked: false
  },
  callTimer: null,
  isCallActive: false,
  isCallSent: false,
    lastCallLocation: null,
    currentLocation: {
      address: '正在获取定位...',
      latitude: 0,
      longitude: 0,
      updateTime: ''
    }
  },

  onLoad() {
    this.calculateNavHeight();
    this.updateTimeGreeting();
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
      this.setData({ navHeight });
    } catch (e) {
      // 降级使用旧接口
      const systemInfo = wx.getSystemInfoSync();
      let navHeight = systemInfo.statusBarHeight + 44;
      this.setData({ navHeight });
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
    this.loadData();
    this.updateTimeGreeting();
    this.checkAlerts();
    // 自动刷新：如果已有保存的位置则更新天气，否则保持现状
    const lastCity = wx.getStorageSync('last_known_city');
    const lastAddress = wx.getStorageSync('last_known_address');
    const lastLat = wx.getStorageSync('last_known_latitude');
    const lastLng = wx.getStorageSync('last_known_longitude');

    if (lastLat && lastLng) {
      this.setData({
        'currentLocation.latitude': lastLat,
        'currentLocation.longitude': lastLng,
        'currentLocation.address': lastAddress || '平安守护中',
        'currentLocation.updateTime': '已记住'
      });
      // 优先根据 adcode 获取天气，如果没 adcode 就按城市名
      const lastAdcode = wx.getStorageSync('last_known_adcode');
      if (lastAdcode) {
        this.getAmapWeather(lastAdcode, '5364a72f17dbb80f48a8369439b336ef', lastCity || '定位中');
      } else if (lastCity) {
        this.updateWeatherData(lastCity);
      }
    }
  },

  // 刷新当前位置
  refreshLocation(interactive = true) {
    // 优先尝试获取当前坐标作为地图中心点
    wx.getLocation({
      type: 'gcj02',
      success: (loc) => {
        this.openMapPicker(loc.latitude, loc.longitude);
      },
      fail: () => {
        // 如果定位失败，尝试使用上次选过的点
        const lastLat = wx.getStorageSync('last_known_latitude');
        const lastLng = wx.getStorageSync('last_known_longitude');
        this.openMapPicker(lastLat || 32.622, lastLng || 110.778); // 默认十堰
      }
    });
  },

  // 抽取地图选择逻辑
  openMapPicker(lat, lng) {
    wx.chooseLocation({
      latitude: lat,
      longitude: lng,
      success: (res) => {
        const { latitude, longitude, name, address } = res;
        const finalAddress = address || name;
        this.setData({
          'currentLocation.latitude': latitude,
          'currentLocation.longitude': longitude,
          'currentLocation.address': finalAddress,
          'currentLocation.updateTime': new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})
        });
        
        // 关键修复：持久化经纬度，不再只是地址
        wx.setStorageSync('last_known_address', finalAddress);
        wx.setStorageSync('last_known_latitude', latitude);
        wx.setStorageSync('last_known_longitude', longitude);

        // 使用高德地图 API 获取城市码和天气
        this.getAmapLocation(latitude, longitude, true);
      },
      fail: (err) => {
        console.log('用户取消或地图打开失败', err);
      }
    });
  },

  // 调用高德地图 API 获取位置和天气
  getAmapLocation(latitude, longitude, interactive) {
    const key = '5364a72f17dbb80f48a8369439b336ef'; // ⚠️ 用户提供的高德Key
    
    if (!key || key.includes('填入')) {
      console.warn('未配置高德地图Key，使用模拟数据');
      if (interactive) {
        this.autoUpdateLocationAndWeather(latitude, longitude, true);
      } else {
        this.inferCityAndWeather(latitude, longitude);
      }
      return;
    }

    // 1. 逆地理编码（获取详细地址）
    wx.request({
      url: `https://restapi.amap.com/v3/geocode/regeo?location=${longitude},${latitude}&key=${key}&radius=1000&extensions=all`,
      success: (res) => {
        if (res.data && res.data.status === '1' && res.data.regeocode) {
          const component = res.data.regeocode.addressComponent;
          const formattedAddress = res.data.regeocode.formatted_address;
          // 处理直辖市和普通城市
          let city = '';
          if (Array.isArray(component.city) && component.city.length === 0) {
            city = component.province; // 直辖市
          } else {
            city = typeof component.city === 'string' ? component.city : component.province;
          }
          const adcode = component.adcode;

          console.log('高德逆地址解析成功:', city, adcode);

          this.setData({
            'currentLocation.address': formattedAddress,
            'weather.city': city.replace(/[市区县]/g, '')
          });
          
          // 存储供下次使用
          wx.setStorageSync('last_known_city', city);
          wx.setStorageSync('last_known_adcode', adcode);
          wx.setStorageSync('last_known_address', formattedAddress);
          
          // 2. 获取天气
          this.getAmapWeather(adcode, key, city);
        } else {
           console.error('高德逆地理编码返回异常', res.data);
           this.inferCityAndWeather(latitude, longitude);
        }
      },
      fail: (err) => {
        console.error('高德API请求失败', err);
        this.inferCityAndWeather(latitude, longitude);
      }
    });
  },

  // 获取高德天气
  getAmapWeather(adcode, key, cityName) {
    wx.request({
      url: `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${key}`,
      success: (res) => {
        if (res.data && res.data.status === '1' && res.data.lives && res.data.lives.length > 0) {
          const weather = res.data.lives[0];
          this.setData({
            'weather.city': cityName.replace(/[市区县]/g, ''), // 简化城市名
            'weather.temp': weather.temperature,
            'weather.desc': weather.weather,
            'weather.icon': this.getWeatherIcon(weather.weather)
          });
        }
      }
    });
  },
  
  // 简单的天气图标映射
  getWeatherIcon(desc) {
    if (desc.includes('晴')) return '☀️';
    if (desc.includes('云') || desc.includes('阴')) return '☁️';
    if (desc.includes('雨')) return '🌧️';
    if (desc.includes('雪')) return '❄️';
    if (desc.includes('雷')) return '⛈️';
    return '🌤️';
  },

  // 推断城市并更新天气（静默）- 降级方案
  inferCityAndWeather(lat, lng) {
    // 优先使用缓存的城市名，避免在模拟器中反复跳回“杭州”
    const cachedCity = wx.getStorageSync('last_known_city');
    let city = cachedCity || '十堰市'; // 默认改为十堰，更符合用户当前场景
    
    // 如果没有缓存，再根据经纬度做极简判定
    if (!cachedCity) {
      // 湖北十堰 经纬度范围大致：31.5-33.5N, 109.5-111.5E
      if (lat > 31 && lat < 34 && lng > 109 && lng < 112) {
        city = '十堰市';
      } 
      // 深圳 经纬度范围大致：22.5N, 114E
      else if (lat > 22 && lat < 23 && lng > 113 && lng < 115) {
        city = '深圳市';
      }
      // 北京
      else if (lat > 39 && lat < 41 && lng > 115 && lng < 117) {
        city = '北京市';
      }
    }

    this.updateWeatherData(city);
    
    // 如果是静默刷新，不强制更新 address 文本，除非之前是空的
    if (this.data.currentLocation.address === '正在获取定位...') {
      this.setData({
        'currentLocation.address': `平安守护中 (${city})`
      });
    }
  },

  // 自动更新位置和天气
  autoUpdateLocationAndWeather(latitude, longitude, isInteractive = false) {
    if (isInteractive) {
      wx.chooseLocation({
        latitude,
        longitude,
        success: (res) => {
          if (res.address) {
            this.setData({
              'currentLocation.address': res.address
            });
            
            // 从地址中提取城市或行政区名
            const cityMatch = res.address.match(/(.+?[市|州|盟|区|县])/);
            const city = cityMatch ? cityMatch[1] : '未知位置';
            
            if (city !== '未知位置') {
              this.updateWeatherData(city);
            }
          }
        }
      });
    }
  },

  // 更新天气数据
  updateWeatherData(city) {
    // 模拟天气API调用
    // 实际开发中可对接和风天气等API: https://dev.qweather.com/
    const mockWeather = {
       '十堰市': { temp: '15', desc: '多云', icon: '☁️' },
       '张湾区': { temp: '15', desc: '多云', icon: '☁️' },
       '茅箭区': { temp: '15', desc: '多云', icon: '☁️' },
       '深圳市': { temp: '25', desc: '晴', icon: '☀️' },
       '杭州市': { temp: '22', desc: '阴', icon: '☁️' },
       '北京市': { temp: '10', desc: '晴', icon: '☀️' },
       '上海市': { temp: '18', desc: '多云', icon: '☁️' },
       '武汉市': { temp: '16', desc: '小雨', icon: '🌧️' }
     };

    const weatherInfo = mockWeather[city] || { temp: '20', desc: '晴', icon: '☀️' };
    
    this.setData({
      'weather.city': city.replace('市', ''),
      'weather.temp': weatherInfo.temp,
      'weather.desc': weatherInfo.desc,
      'weather.icon': weatherInfo.icon
    });
  },

  // 加载数据
  loadData() {
    const currentUser = wx.getStorageSync('currentUser') || {};
    const settings = wx.getStorageSync('notificationSettings') || {
      bigFont: false,
      realtimeReading: false
    };

    // 检查今日打卡状态
    const checkInHistory = wx.getStorageSync('checkInHistory') || [];
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const todayChecked = checkInHistory.some(item => item.date === todayStr && item.checked);

    // 获取真实健康数据
    const healthData = wx.getStorageSync('healthData') || [];
    const latestRecord = healthData.length > 0 ? healthData[0] : null;
    
    // 如果没有真实数据，使用模拟数据
    const dataToProcess = latestRecord ? {
      heartRate: parseInt(latestRecord.heartRate) || 75,
      bloodPressure: latestRecord.systolic ? `${latestRecord.systolic}/${latestRecord.diastolic}` : '128/82',
      oxygen: parseInt(latestRecord.oxygen) || 98,
      source: { type: 'manual', name: '手动记录', icon: '📝' }
    } : this.getMockHealthData();

    const processedStats = this.processHealthData(dataToProcess);
    processedStats.todayChecked = todayChecked;

    this.setData({
      userInfo: currentUser,
      settings: settings,
      healthStats: processedStats
    });
    this.updateRefreshTime();
  },

  // 模拟数据获取 (实际开发中这里会调用 API 或读取缓存)
  getMockHealthData() {
    // 随机模拟一种接入方式
    const sources = [
      { type: 'device', name: '智能手表', icon: '⌚' },
      { type: 'manual', name: '手动记录', icon: '📝' },
      { type: 'family', name: '家人录入', icon: '👨‍👩‍👦' }
    ];
    const source = sources[Math.floor(Math.random() * sources.length)];

    return {
      heartRate: 75 + Math.floor(Math.random() * 10),
      bloodPressure: '128/82',
      oxygen: 98,
      source: source
    };
  },

  // 处理健康数据并生成 AI 建议
  processHealthData(data) {
    let status = 'normal';
    let overallText = '正常 👍';
    let hrStatus = 'normal';
    let bpStatus = 'normal';
    let oxStatus = 'normal';
    let aiSummary = '心率血压稳定，生理指标表现优秀，请继续保持健康的生活习惯。';

    // 心率判断
    if (data.heartRate > 100 || data.heartRate < 50) {
      status = 'danger';
      hrStatus = 'danger';
    } else if (data.heartRate > 90 || data.heartRate < 60) {
      status = status === 'danger' ? 'danger' : 'warning';
      hrStatus = 'warning';
    }

    // 血压判断 (简单判断收缩压)
    const systolic = parseInt(data.bloodPressure.split('/')[0]);
    if (systolic > 140 || systolic < 90) {
      status = 'danger';
      bpStatus = 'danger';
    } else if (systolic > 130) {
      status = status === 'danger' ? 'danger' : 'warning';
      bpStatus = 'warning';
    }

    // 血氧判断
    if (data.oxygen < 95) {
      status = 'danger';
      oxStatus = 'danger';
    }

    if (status === 'danger') {
      overallText = '请尽快检查！';
      aiSummary = '注意！您的某些生理指标偏离正常范围，请及时休息，并联系医生或家人。';
    } else if (status === 'warning') {
      overallText = '需注意 ⚠️';
      aiSummary = '您的生理指标有轻微波动，建议观察休息，不要过度劳累。';
    }

    return {
      heartRate: data.heartRate,
      heartRateStatus: hrStatus,
      bloodPressure: data.bloodPressure,
      bpStatus: bpStatus,
      oxygen: data.oxygen,
      oxStatus: oxStatus,
      status: status,
      overallText: overallText,
      aiSummary: aiSummary,
      sourceType: data.source.type,
      sourceName: data.source.name,
      sourceIcon: data.source.icon
    };
  },

  updateRefreshTime() {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    this.setData({
      lastUpdateTime: timeStr
    });
  },

  // 检查是否有异常并播报
  checkAlerts() {
    const { healthStats, settings } = this.data;
    if (healthStats.status === 'abnormal' && settings.realtimeReading) {
      const app = getApp();
      if (app.voiceManager) {
        app.voiceManager.speak(healthStats.aiSummary);
      }
    }
  },

  // 更新时间问候语
  updateTimeGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 12) greeting = '上午';
    else if (hour < 18) greeting = '下午';
    else greeting = '晚上';
    
    this.setData({
      currentTimeStr: greeting
    });
  },

  // 跳转逻辑
  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.navigateTo({ url });
    }
  },
  navigateToHealth() {
    wx.navigateTo({ url: '/pages/health/health' });
  },
  navigateToHealthConsult() {
    wx.navigateTo({ url: '/pages/health-consult/health-consult?mode=report' });
  },
  navigateToMedication() {
    wx.switchTab({ url: '/pages/medication/medication' });
  },
  navigateToFamily() {
    wx.switchTab({ url: '/pages/family/family' });
  },
  navigateToCheckIn() {
    wx.navigateTo({ url: '/pages/check-in/check-in' });
  },

  showDataEntry() {
    wx.showActionSheet({
      itemList: ['智能设备同步', '手动添加记录', '查看家人同步'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showToast({ title: '正在搜索设备...', icon: 'loading' });
        } else if (res.tapIndex === 1) {
          wx.navigateTo({ url: '/pages/health-input/health-input' });
        } else {
          this.navigateToFamily();
        }
      }
    });
  },

  // 呼叫处理逻辑
  handleCallStart() {
    this.setData({ isCallActive: true });
    this.data.callTimer = setTimeout(() => {
      this.triggerCall();
    }, 3000);
  },

  handleCallEnd() {
    clearTimeout(this.data.callTimer);
    this.setData({ isCallActive: false });
  },

  // 长按呼叫
  handleCallLongPress() {
    this.setData({ isCallActive: true });
    
    // 震动反馈
    wx.vibrateShort({ type: 'heavy' });

    // 开始倒计时触发
    this.data.callTimer = setTimeout(() => {
      this.triggerCall();
    }, 1500); // 长按 1.5 秒触发
  },

  // 触发呼叫逻辑
  triggerCall() {
    const app = getApp();
    const guardianPhone = app.getPrimaryGuardian();
    const familyMembers = wx.getStorageSync('familyMembers') || [];
    const healthStats = this.data.healthStats;

    // 关键修复：优先使用用户在“平安位置守护”中选定的位置
    const savedLat = wx.getStorageSync('last_known_latitude');
    const savedLng = wx.getStorageSync('last_known_longitude');
    const savedAddress = wx.getStorageSync('last_known_address');

    wx.vibrateLong();
    
    if (app.voiceManager) {
      app.voiceManager.speak('正在为您呼叫家人，并同步您的位置和生活状态。');
    }

    wx.showLoading({
      title: '正在发出呼叫信号...',
      mask: true
    });

    // 如果有选定的“家”的位置，直接使用，不再重新定位（避免室内定位偏移）
    if (savedLat && savedLng) {
      console.log('使用用户选定的守护位置:', savedAddress);
      this.sendCallWithLocation(savedLat, savedLng, savedAddress, familyMembers, healthStats, guardianPhone);
    } else {
      // 如果从来没选过，才去获取实时位置
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        success: (res) => {
          this.sendCallWithLocation(res.latitude, res.longitude, '实时定位位置', familyMembers, healthStats, guardianPhone);
        },
        fail: (err) => {
          wx.hideLoading();
          this.handleLocationFail(guardianPhone);
        }
      });
    }
  },

  // 统一发送呼叫与位置
  sendCallWithLocation(latitude, longitude, address, familyMembers, healthStats, guardianPhone) {
    this.setData({
      lastCallLocation: { latitude, longitude },
      'currentLocation.latitude': latitude,
      'currentLocation.longitude': longitude,
      'currentLocation.address': address
    });

    this.sendCallNotification(familyMembers, { 
      latitude, 
      longitude,
      address,
      healthData: {
        heartRate: healthStats.heartRate,
        bloodPressure: healthStats.bloodPressure,
        oxygen: healthStats.oxygen
      }
    });

    wx.hideLoading();
    this.showCallActionSheet(guardianPhone);
  },

  // 抽取呼叫失败处理
  handleLocationFail(guardianPhone) {
    wx.showModal({
      title: '定位失败',
      content: '无法获取您的位置，但仍可直接拨打电话。',
      confirmText: '拨打电话',
      success: (res) => {
        if (res.confirm) {
          this.makeGuardianCall(guardianPhone);
        }
      }
    });
  },

  // 抽取动作菜单
  showCallActionSheet(guardianPhone) {
    const isGuardianSet = guardianPhone && guardianPhone !== '未设置';
    const phoneDisplay = isGuardianSet ? `拨打守护人 (${guardianPhone})` : '设置守护人电话';

    wx.showActionSheet({
      itemList: [
        phoneDisplay,
        '发送位置给微信好友',
        '查看家属处理进度',
        '取消呼叫'
      ],
      itemColor: '#1890ff',
      success: (action) => {
        if (action.tapIndex === 0) {
          if (isGuardianSet) {
            this.makeGuardianCall(guardianPhone);
          } else {
            wx.navigateTo({ url: '/pages/settings/settings' });
            wx.showToast({ title: '请先设置守护人电话', icon: 'none' });
          }
        } else if (action.tapIndex === 1) {
          this.shareLocationToWechat();
        } else if (action.tapIndex === 2) {
          wx.showToast({ title: '已通知家属，请保持电话畅通', icon: 'none' });
        }
      }
    });
  },

  // 实际拨打电话
  makeGuardianCall(phone) {
    if (!phone || phone === '未设置') {
      wx.showToast({ title: '请先在设置中绑定家人电话', icon: 'none' });
      return;
    }
    wx.makePhoneCall({
      phoneNumber: phone,
      fail: (err) => {
        console.error('拨打电话失败', err);
      }
    });
  },

  // 发送呼叫通知
  sendCallNotification(familyMembers, data) {
    const { latitude, longitude, healthData } = data;
    
    if (familyMembers.length === 0) {
      console.log('未绑定家人，无法发送订阅消息');
      this.setData({ isCallSent: true });
      return;
    }

    // --- 接入云开发：正式发送通知逻辑 ---
    wx.cloud.callFunction({
      name: 'sendSOS',
      data: {
        location: { latitude, longitude },
        healthData: healthData,
        familyMembers: familyMembers,
        userInfo: this.data.userInfo,
        type: 'family_call',
        time: new Date().toLocaleString()
      },
      success: (res) => {
        console.log('[云函数] [sendSOS] 调用成功', res);
        this.setData({ isCallSent: true });
        wx.showToast({
          title: '已通过云端通知家人',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('[云函数] [sendSOS] 调用失败', err);
        this.fallbackLocalNotify(familyMembers, data);
      }
    });
  },

  // 降级本地通知逻辑 (用于云函数未部署时的演示)
  fallbackLocalNotify(familyMembers, data) {
    console.log('正在执行本地降级通知逻辑...');
    const { latitude, longitude, healthData } = data;
    
    // 记录到呼叫日志
    this.logCallActivity('wechat_subscription');
    
    // 更新本地记录状态
    const callAlerts = wx.getStorageSync('call_alerts') || [];
    const newAlert = {
      id: Date.now(),
      time: new Date().toLocaleString(),
      location: { latitude, longitude },
      healthData: healthData,
      status: 'pending',
      user: this.data.userInfo.nickname || this.data.userInfo.account || '长辈'
    };
    callAlerts.unshift(newAlert);
    wx.setStorageSync('call_alerts', callAlerts);

    this.setData({ isCallSent: true });

    wx.showToast({ 
      title: '已模拟发送云端通知', 
      icon: 'none' 
    });

    if (getApp().voiceManager) {
      getApp().voiceManager.speak(`呼叫信息已通过模拟云端发送给您的家人。`);
    }
  },

  // 取消呼叫状态
  cancelCall() {
    wx.showModal({
      title: '确认取消？',
      content: '如果您现在已经安全，可以取消呼叫状态。系统会通知家人您已安全。',
      success: (res) => {
        if (res.confirm) {
          this.setData({ isCallSent: false });
          wx.showToast({
            title: '已取消呼叫状态',
            icon: 'success'
          });
          if (getApp().voiceManager) {
            getApp().voiceManager.speak('已为您取消呼叫状态。');
          }
        }
      }
    });
  },

  // 再次拨打守护电话
  callGuardianAgain() {
    const app = getApp();
    const guardianPhone = app.getPrimaryGuardian();
    this.makeGuardianCall(guardianPhone);
  },

  // 拨打守护电话
  makeGuardianCall(phoneNumber) {
    wx.makePhoneCall({
      phoneNumber: phoneNumber,
      success: () => {
        this.logCallActivity('phone');
      }
    });
  },

  // 分享位置到微信
  shareLocationToWechat() {
    const loc = this.data.lastCallLocation;
    if (!loc) return;

    wx.showModal({
      title: '发送位置',
      content: '我们将为您打开微信转发页面，请选择您的家人或家人群进行发送。',
      confirmText: '去发送',
      success: (res) => {
        if (res.confirm) {
          // 在小程序中，“发送给微信好友”通常通过页面分享实现
          // 这里可以引导用户点击右上角的分享，或者如果页面有分享按钮则触发
          wx.showShareMenu({
            withShareTicket: true,
            menus: ['shareAppMessage']
          });
          
          wx.showToast({
            title: '请点击右上角...发送',
            icon: 'none',
            duration: 3000
          });

          this.logCallActivity('wechat_share');
        }
      }
    });
  },

  // 记录呼叫活动日志
  logCallActivity(method) {
    const methodMap = {
      'phone': '电话呼叫',
      'wechat_share': '微信分享',
      'wechat_subscription': '一键呼叫'
    };
    const methodText = methodMap[method] || method;
    
    // 添加到家庭互动页面的记录中（模拟数据库写入）
    // 实际项目中应写入云数据库
    const app = getApp();
    if (app.globalData.sosRecords) {
      app.globalData.sosRecords.unshift({
        type: 'CALL',
        title: '亲情呼叫',
        content: `通过${methodText}发起了亲情呼叫`,
        time: new Date().toLocaleString(),
        status: '已发出'
      });
    }
  },

  // 朗读当前页面主要内容 (改为弹窗显示大字 + 语音)
  readPageContent() {
    const app = getApp();
    const pageKey = 'index'; // 首页对应 index.mp3
    const introText = app.pageDocs[pageKey] || app.pageDocs['default'];
    
    // 如果语音管理器存在，直接切换播放/暂停状态
    if (app.voiceManager) {
      app.voiceManager.toggle(introText, pageKey);
    }
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

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { userInfo, lastSOSLocation, healthData } = this.data;
    const name = userInfo.nickname || userInfo.nickName || '您的家人';
    const latestHealth = healthData && healthData.length > 0 ? healthData[0] : null;
    
    if (lastSOSLocation) {
      let title = `🚨【紧急求助】${name}的位置更新，请立即查看！`;
      if (latestHealth) {
        title = `🚨【紧急求助】${name}心率${latestHealth.heartRate},血压${latestHealth.systolic}/${latestHealth.diastolic},请立即查看！`;
      }
      
      // 如果有 SOS 位置信息，分享紧急位置
      return {
        title: title,
        path: `/pages/main/main?lat=${lastSOSLocation.latitude}&lng=${lastSOSLocation.longitude}&sos=1&health=${JSON.stringify(latestHealth || {})}`,
        imageUrl: '/assets/images/sos-share.png' // 假设有一个紧急求助的分享图
      };
    }

    return {
      title: '智享养老 - 守护长辈健康每一天',
      path: '/pages/main/main'
    };
  }
});