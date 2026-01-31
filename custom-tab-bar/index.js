Component({
  data: {
    selected: 0,
    color: "#A0AEC0",
    selectedColor: "#0066FF",
    list: [
      {
        pagePath: "pages/main/main",
        text: "首页",
        icon: "🏠"
      },
      {
        pagePath: "pages/health/health",
        text: "健康",
        icon: "📊"
      },
      {
        pagePath: "pages/medication/medication",
        text: "用药",
        icon: "💊"
      },
      {
        pagePath: "pages/family/family",
        text: "通讯录",
        icon: "👥"
      },
      {
        pagePath: "pages/profile/profile",
        text: "我的",
        icon: "👤"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({
        url: '/' + url
      })
    }
  }
})
