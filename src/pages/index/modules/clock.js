console.log("[clock module] loading...")

function init(instance) {
  instance.currentTime = ""
  instance.showTime = true
  instance.timeFormat = { year: false, month: false, day: false, hour: true, minute: true, second: false }
  instance._clockTimer = null

  instance.startClockTimer = function() {
    var self = instance
    self.stopClockTimer()
    self._clockTimer = setInterval(function() {
      self.updateClock()
    }, 1000)
    self.updateClock()
  }

  instance.stopClockTimer = function() {
    if (instance._clockTimer) {
      clearInterval(instance._clockTimer)
      instance._clockTimer = null
    }
  }

  instance.updateClock = function() {
    var now = new Date()
    var h = now.getHours()
    var m = now.getMinutes()
    var s = now.getSeconds()
    var hs = h < 10 ? "0" + h : "" + h
    var ms = m < 10 ? "0" + m : "" + m
    var ss = s < 10 ? "0" + s : "" + s
    instance.currentTime = hs + ":" + ms + ":" + ss
  }

  instance.startClockTimer()

  instance.quickAdd = {
    expanded: false,
    courseNames: [],
    disabled: false,
    time: "",
    toggle: function() {
      var self = instance
      self.quickAdd.expanded = !self.quickAdd.expanded
      if (self.quickAdd.expanded) {
        self.quickAdd.loadPreset()
        self.quickAdd.time = self.quickAdd.calcNext()
      }
    },
    loadPreset: function() {
      var self = instance
      var storage = require("@system.storage")
      storage.get({
        key: "course_preset_list",
        success: function(data) {
          try {
            var list = JSON.parse(data)
            var names = []
            for (var i = 0; i < list.length; i++) {
              var name = list[i].name || list[i]
              names.push(name)
            }
            self.quickAdd.courseNames = names
          } catch (e) {
            self.quickAdd.courseNames = []
          }
        },
        fail: function() {
          self.quickAdd.courseNames = []
        }
      })
    },
    calcNext: function() {
      var self = instance
      var now = new Date()
      var nowMinutes = now.getHours() * 60 + now.getMinutes()
      var lastEndMin = 0
      var classes = self.currentClasses || []
      for (var i = 0; i < classes.length; i++) {
        var parts = classes[i].time.split("-")
        if (parts.length < 2) continue
        var endMin = self.quickAdd._parseTime(parts[1].trim())
        if (endMin > lastEndMin) lastEndMin = endMin
      }
      var startMin = lastEndMin > 0 ? lastEndMin + 10 : 8 * 60
      if (startMin < nowMinutes) startMin = nowMinutes + 5
      if (startMin >= 24 * 60) {
        self.quickAdd.disabled = true
        return "已排满"
      }
      var endMin = startMin + 45
      if (endMin > 24 * 60) endMin = 24 * 60
      self.quickAdd.disabled = false
      return self.quickAdd._fmt(startMin) + " - " + self.quickAdd._fmt(endMin)
    },
    _fmt: function(minutes) {
      var h = Math.floor(minutes / 60)
      var m = minutes % 60
      return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m
    },
    _parseTime: function(timeStr) {
      var parts = timeStr.split(":")
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
  }
}

module.exports = {
  init: init
}

console.log("[clock module] loaded successfully")