console.log("[clock-daynav module] loading...")

var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

function getRealTodayIndex() {
  return new Date().getDay()
}

function init(instance) {
  console.log("[clock-daynav module] init called")

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

  instance.currentDay = "星期日"
  instance.currentDayIndex = 0

  instance.currentDayIndex = getRealTodayIndex()
  instance.currentDay = dayNames[instance.currentDayIndex]

  instance.prevDay = function() {
    var self = instance
    if (self.currentDayIndex > 0) {
      self.currentDayIndex--
    } else {
      self.currentDayIndex = dayNames.length - 1
    }
    self.currentDay = dayNames[self.currentDayIndex]
  }

  instance.nextDay = function() {
    var self = instance
    if (self.currentDayIndex < dayNames.length - 1) {
      self.currentDayIndex++
    } else {
      self.currentDayIndex = 0
    }
    self.currentDay = dayNames[self.currentDayIndex]
  }

  instance.goToToday = function() {
    var self = instance
    var todayIdx = getRealTodayIndex()
    if (self.currentDayIndex === todayIdx) return
    self.currentDayIndex = todayIdx
    self.currentDay = dayNames[todayIdx]
  }

  console.log("[clock-daynav module] init OK, day: " + instance.currentDay + ", clock started")
}

module.exports = {
  init: init
}

console.log("[clock-daynav module] loaded successfully")