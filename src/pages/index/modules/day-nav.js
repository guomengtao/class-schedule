console.log("[day-nav] loading...")

var store = require("../../../data/store.js")

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
var weekdayNames = ["星期一", "星期二", "星期三", "星期四", "星期五"]

function getRealTodayIndex() {
  return new Date().getDay()
}

function init(instance) {
  var self = instance

  store.getHideWeekend(function(hide) {
    var dayNames = hide ? weekdayNames : fullDayNames
    instance._dayNames = dayNames
    instance._hideWeekend = hide

    var todayIdx = getRealTodayIndex()
    if (hide && (todayIdx === 0 || todayIdx === 6)) {
      todayIdx = 0
    } else if (hide) {
      todayIdx = todayIdx - 1
    }
    instance.currentDay = dayNames[todayIdx]
    instance.currentDayIndex = todayIdx

    instance.prevDay = function() {
      var names = self._dayNames || dayNames
      if (self.currentDayIndex > 0) {
        self.currentDayIndex--
      } else {
        self.currentDayIndex = names.length - 1
      }
      self.currentDay = names[self.currentDayIndex]
      onDayChanged()
    }

    instance.nextDay = function() {
      var names = self._dayNames || dayNames
      if (self.currentDayIndex < names.length - 1) {
        self.currentDayIndex++
      } else {
        self.currentDayIndex = 0
      }
      self.currentDay = names[self.currentDayIndex]
      onDayChanged()
    }

    instance.goToToday = function() {
      var names = self._dayNames || dayNames
      var todayIdx = getRealTodayIndex()
      if (self._hideWeekend && (todayIdx === 0 || todayIdx === 6)) {
        todayIdx = 0
      } else if (self._hideWeekend) {
        todayIdx = todayIdx - 1
      }
      if (self.currentDayIndex === todayIdx) return
      self.currentDayIndex = todayIdx
      self.currentDay = names[todayIdx]
      onDayChanged()
    }

    console.log("[day-nav] init OK, day: " + instance.currentDay + ", hideWeekend: " + hide)

    if (instance.loadDayClasses && typeof instance.loadDayClasses === 'function') {
      instance.loadDayClasses()
    }
    if (instance.updateStatus && typeof instance.updateStatus === 'function') {
      instance.updateStatus()
    }
  })

  function onDayChanged() {
    if (instance.loadDayClasses && typeof instance.loadDayClasses === 'function') {
      instance.loadDayClasses()
    }
    if (instance.updateStatus && typeof instance.updateStatus === 'function') {
      instance.updateStatus()
    }
  }
}

module.exports = { init: init }
console.log("[day-nav] loaded")