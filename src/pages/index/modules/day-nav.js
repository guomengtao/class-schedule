var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

function getRealTodayIndex() {
  return new Date().getDay()
}

function init(instance, deps) {
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
}

module.exports = { init: init }