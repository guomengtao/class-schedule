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

  instance.quickAddExpanded = false
  instance.quickCourseNames = []
  instance.quickAddDisabled = false
  instance.quickAddTime = ""

  instance.toggleQuickAdd = function() {
    var self = instance
    self.quickAddExpanded = !self.quickAddExpanded
  }

  instance.loadPresetCourses = function() {
    console.log("loadPresetCourses defined")
  }
}

module.exports = {
  init: init
}

console.log("[clock module] loaded successfully")