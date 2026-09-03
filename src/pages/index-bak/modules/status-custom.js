console.log("[status-custom module] loading...")

var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

function getRealTodayIndex() {
  return new Date().getDay()
}

function parseTime(timeStr) {
  var parts = timeStr.split(":")
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function init(instance) {
  console.log("[status-custom module] init called")

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
      classes.push({
        name: c.name,
        startMin: parseTime(parts[0].trim()),
        endMin: parseTime(parts[1].trim()),
        startTime: parts[0].trim()
      })
    }
    classes.sort(function(a, b) { return a.startMin - b.startMin })
    var current = null
    var next = null
    for (var k = 0; k < classes.length; k++) {
      var cls = classes[k]
      if (nowMinutes >= cls.startMin && nowMinutes < cls.endMin) {
        current = cls
        if (k + 1 < classes.length) {
          next = classes[k + 1]
        }
        break
      }
      if (nowMinutes < cls.startMin && !next) {
        next = cls
      }
    }
    if (current) {
      self.statusTag = "上课中"
      self.statusMainText = current.name
      var remaining = Math.ceil((current.endMin - nowMinutes))
      self.statusTimeText = remaining + "min"
    } else if (next) {
      self.statusTag = "即将上课"
      self.statusMainText = next.name
      self.statusTimeText = Math.ceil((next.startMin - nowMinutes)) + "min后"
    } else {
      self.statusTag = "暂无"
      self.statusMainText = "今日无课程安排"
      self.statusTimeText = ""
    }
  }

  instance.startStatusTimer = function() {
    var self = instance
    self.stopStatusTimer()
    self.updateStatus()
    self._statusTimer = setInterval(function() {
      self.updateStatus()
    }, 60000)
  }

  instance.stopStatusTimer = function() {
    if (instance._statusTimer) {
      clearInterval(instance._statusTimer)
      instance._statusTimer = null
    }
  }

  instance.showCustomContent = false
  instance.customContent = ""

  var storage = require("@system.storage")
  storage.get({
    key: "homepage_settings",
    success: function(data) {
      try {
        var settings = JSON.parse(data)
        instance.showCustomContent = settings.showCustomContent || false
        instance.customContent = settings.customContent || ""
      } catch (e) {
        instance.showCustomContent = false
        instance.customContent = ""
      }
      console.log("[status-custom module] custom-content loaded, show=" + instance.showCustomContent + ", content=" + instance.customContent)
    },
    fail: function() {
      instance.showCustomContent = false
      instance.customContent = ""
      console.log("[status-custom module] no homepage settings")
    }
  })

  console.log("[status-custom module] init OK")
}

module.exports = {
  init: init
}

console.log("[status-custom module] loaded successfully")