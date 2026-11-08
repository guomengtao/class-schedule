function parseTime(timeStr) {
  var parts = timeStr.split(":")
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function getRealTodayName() {
  var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
  return dayNames[new Date().getDay()]
}

function init(instance) {
  instance.statusTag = "暂无"
  instance.statusMainText = "今日无课"   // 铁律四：短文案保证一行放得下，不靠省略号
  instance.statusTimeText = ""
  instance.statusIconName = ""           // 状态灯文件名后缀：now/soon/holiday，空=不显示
  instance.statusTimer = null

  instance.updateStatus = function() {
    var self = instance

    // 方案 D3：状态条必须感知假期 —— 假期日不再渲染「即将上课」，
    // 否则与下方「国庆假期」卡在同一屏互相打脸（正确性 bug）
    if (self.isHoliday) {
      self.statusTag = "假期"
      // 铁律四：胶囊内容区仅 ≈133px，主文案 ≤4 字（22px 字号）才不截断
      self.statusMainText = self.holidayName || "假期中"
      self.statusTimeText = ""
      self.statusIconName = "holiday"
      self.showStatusBar = (self.statusBarSetting !== false)
      return
    }

    // 【2026-11-09 同源改造】状态条不再自己遍历 self.schedule，一律读 currentClasses。
    // 根因：两边各自算课，状态条用 schedule + currentDay，列表用 loadDayClasses 的结果，
    // 任意一次刷新只更新其中一边（切天、onShow 重读、初始化竞态）就会出现
    // 「上面写 上课·早自习·55m、下面写 今天没有课」的同屏矛盾。
    // 现在 currentClasses 就是这一帧真正渲染的列表：列表空 → 状态条必然隐藏，
    // 结构上不可能再互相打脸，同时省掉一次全表遍历。
    if (!self.isToday || !self.currentClasses || self.currentClasses.length === 0) {
      self.showStatusBar = false
      return
    }

    var now = new Date()
    var nowMinutes = now.getHours() * 60 + now.getMinutes()
    var classes = []
    for (var i = 0; i < self.currentClasses.length; i++) {
      var item = self.currentClasses[i]
      var parts = String(item.time || "").split("-")
      if (parts.length < 2) continue
      var s = parseTime(parts[0].trim())
      var e = parseTime(parts[1].trim())
      if (isNaN(s) || isNaN(e)) continue
      classes.push({ name: item.name, startMin: s, endMin: e })
    }
    classes.sort(function(a, b) { return a.startMin - b.startMin })
    var current = null
    var next = null
    for (var k = 0; k < classes.length; k++) {
      var cls = classes[k]
      if (nowMinutes >= cls.startMin && nowMinutes < cls.endMin) {
        current = cls
        if (k + 1 < classes.length) next = classes[k + 1]
        break
      }
      if (nowMinutes < cls.startMin && !next) next = cls
    }
    // 2026-11-02 状态条单行化 + lucide 状态灯（胶囊 165px 硬预算）：
    //   一行 = 状态灯 18 + 间距 6 + 「127m」约 38 + 间距 6 + 课名 97（20px 约 5 字）。
    //   时间与灯都是定宽，课名 flex:1 + ellipsis 兜底，任何课名/分钟数都不可能溢出。
    //   状态灯：now=实心绿 disc（上课中）/ soon=橙 timer（即将）/ holiday=灰 sun（假期）。
    if (current) {
      self.statusTag = "上课"
      self.statusMainText = current.name
      self.statusTimeText = Math.ceil(current.endMin - nowMinutes) + "m"
      self.statusIconName = "now"
      self.showStatusBar = (self.statusBarSetting !== false)
    } else if (next) {
      self.statusTag = "即将"
      self.statusMainText = next.name
      self.statusTimeText = Math.ceil(next.startMin - nowMinutes) + "m"
      self.statusIconName = "soon"
      self.showStatusBar = (self.statusBarSetting !== false)
    } else {
      self.showStatusBar = false
    }
  }

  instance.startStatusTimer = function() {
    var self = instance
    self.stopStatusTimer()
    self.updateStatus()
    self.statusTimer = setInterval(function() {
      self.updateStatus()
    }, 60000)
  }

  instance.stopStatusTimer = function() {
    if (instance.statusTimer) {
      clearInterval(instance.statusTimer)
      instance.statusTimer = null
    }
  }
}

module.exports = { init: init }