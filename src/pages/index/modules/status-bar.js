var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

function getRealTodayIndex() {
  return new Date().getDay()
}

function parseTime(timeStr) {
  var parts = timeStr.split(":")
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function init(instance, deps) {
  instance.statusTag = "暂无"
  instance.statusMainText = "今日无课程安排"
  instance.statusTimeText = ""
  instance._statusTimer = null

  instance.updateStatus = function() {
    var self = instance
    if (!self.schedule || self.schedule.length === 0) {
      self.statusTag = "暂无"
      self.statusMainText = "今日无课程安排"
      self.statusTimeText = ""
      return
    }
    var now = new Date()
    var nowMinutes = now.getHours() * 60 + now.getMinutes()
    var dayData = null
    for (var i = 0; i < self.schedule.length; i++) {
      if (self.schedule[i].day === self.currentDay) {
        dayData = self.schedule[i]
        break
      }
    }
    if (!dayData || !dayData.classes || dayData.classes.length === 0) {
      self.statusTag = "暂无"
      self.statusMainText = "今日无课程安排"
      self.statusTimeText = ""
      return
    }
    var classes = []
    for (var j = 0; j < dayData.classes.length; j++) {
      var c = dayData.classes[j]
      var parts = c.time.split("-")
      if (parts.length < 2) continue
      classes.push({ name: c.name, time: c.time, startMin: parseTime(parts[0].trim()), endMin: parseTime(parts[1].trim()) })
    }
    classes.sort(function(a, b) { return a.startMin - b.startMin })
    var statusTag = "未开始"
    var statusMainText = ""
    var statusTimeText = ""
    for (var k = 0; k < classes.length; k++) {
      var cls = classes[k]
      if (nowMinutes >= cls.startMin && nowMinutes < cls.endMin) {
        statusTag = "进行中"
        statusMainText = cls.name
        var remaining = cls.endMin - nowMinutes
        var remMin = Math.floor(remaining)
        statusTimeText = "剩余 " + remMin + " 分钟"
        break
      } else if (nowMinutes < cls.startMin) {
        statusTag = "即将开始"
        statusMainText = cls.name
        var wait = cls.startMin - nowMinutes
        var waitMin = Math.floor(wait)
        statusTimeText = "还有 " + waitMin + " 分钟"
        break
      }
    }
    if (!statusMainText) {
      statusTag = "已结束"
      statusMainText = "今日课程已全部结束"
      statusTimeText = ""
    }
    self.statusTag = statusTag
    self.statusMainText = statusMainText
    self.statusTimeText = statusTimeText
  }

  instance.startStatusTimer = function() {
    var self = instance
    self.stopStatusTimer()
    self.updateStatus()
    self._statusTimer = setInterval(function() {
      self.updateStatus()
    }, 30000)
  }

  instance.stopStatusTimer = function() {
    if (instance._statusTimer) {
      clearInterval(instance._statusTimer)
      instance._statusTimer = null
    }
  }
}

module.exports = { init: init }