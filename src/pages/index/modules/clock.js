function init(instance, deps) {
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

  instance.quickAddExpanded = false
  instance.quickCourseNames = []
  instance.quickAddDisabled = false
  instance.quickAddTime = ""

  instance.toggleQuickAdd = function() {
    var self = instance
    self.quickAddExpanded = !self.quickAddExpanded
    if (self.quickAddExpanded) {
      self.refreshQuickAdd()
    }
  }

  instance.refreshQuickAdd = function() {
    var self = instance
    self.loadPresetCourses()
    self.quickAddTime = self.calcNextTimeSlot()
  }

  instance.loadPresetCourses = function() {
    var self = instance
    deps.storage.get({
      key: "course_preset_list",
      success: function(data) {
        try {
          var list = JSON.parse(data)
          var names = []
          for (var i = 0; i < list.length; i++) {
            names.push(list[i].name)
          }
          self.quickCourseNames = names
        } catch (e) {
          self.quickCourseNames = []
        }
      },
      fail: function() {
        self.quickCourseNames = []
      }
    })
  }

  instance.calcNextTimeSlot = function() {
    var self = instance
    var now = new Date()
    var nowMinutes = now.getHours() * 60 + now.getMinutes()
    var lastEndMin = 0
    var classes = self.currentClasses || []
    for (var i = 0; i < classes.length; i++) {
      var parts = classes[i].time.split("-")
      if (parts.length < 2) continue
      var endMin = parseTimeQuick(parts[1].trim())
      if (endMin > lastEndMin) lastEndMin = endMin
    }
    var startMin = lastEndMin > 0 ? lastEndMin + 10 : 8 * 60
    if (startMin < nowMinutes) startMin = nowMinutes + 5
    if (startMin >= 24 * 60) {
      self.quickAddDisabled = true
      return "已排满"
    }
    var endMin = startMin + 45
    if (endMin > 24 * 60) endMin = 24 * 60
    self.quickAddDisabled = false
    return self.formatQuickTime(startMin) + " - " + self.formatQuickTime(endMin)
  }

  instance.formatQuickTime = function(minutes) {
    var h = Math.floor(minutes / 60)
    var m = minutes % 60
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m
  }

  function parseTimeQuick(timeStr) {
    var parts = timeStr.split(":")
    return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
}

module.exports = { init: init }