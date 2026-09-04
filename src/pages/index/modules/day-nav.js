console.log("[day-nav] loading...")

var store = require("../../../data/store.js")

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
var weekdayNames = ["星期一", "星期二", "星期三", "星期四", "星期五"]

function getRealTodayIndex() {
  return new Date().getDay()
}

function init(instance) {
  console.log("[day-nav] init called")
  instance._dayNames = fullDayNames
  instance._hideWeekend = false

  var todayIdx = getRealTodayIndex()
  instance.currentDay = fullDayNames[todayIdx]
  instance.currentDayIndex = todayIdx

  instance.prevDay = function() {
    var self = instance
    var names = self._dayNames || fullDayNames
    if (self.currentDayIndex > 0) {
      self.currentDayIndex--
    } else {
      self.currentDayIndex = names.length - 1
    }
    self.currentDay = names[self.currentDayIndex]
    if (self.loadDayClasses) self.loadDayClasses()
    if (self.updateStatus) self.updateStatus()
  }

  instance.nextDay = function() {
    var self = instance
    var names = self._dayNames || fullDayNames
    if (self.currentDayIndex < names.length - 1) {
      self.currentDayIndex++
    } else {
      self.currentDayIndex = 0
    }
    self.currentDay = names[self.currentDayIndex]
    if (self.loadDayClasses) self.loadDayClasses()
    if (self.updateStatus) self.updateStatus()
  }

  instance.goToToday = function() {
    var self = instance
    var names = self._dayNames || fullDayNames
    var todayIdx = getRealTodayIndex()
    if (self._hideWeekend && (todayIdx === 0 || todayIdx === 6)) {
      todayIdx = 0
    } else if (self._hideWeekend) {
      todayIdx = todayIdx - 1
    }
    if (self.currentDayIndex === todayIdx) return
    self.currentDayIndex = todayIdx
    self.currentDay = names[todayIdx]
    if (self.loadDayClasses) self.loadDayClasses()
    if (self.updateStatus) self.updateStatus()
  }

  instance.updateHideWeekend = function() {
    var self = instance
    store.getHideWeekend(function(hide) {
      self._hideWeekend = hide
      self._dayNames = hide ? weekdayNames : fullDayNames
      var todayIdx = getRealTodayIndex()
      if (hide && (todayIdx === 0 || todayIdx === 6)) {
        todayIdx = 0
      } else if (hide) {
        todayIdx = todayIdx - 1
      }
      if (self.currentDayIndex !== todayIdx) {
        self.currentDayIndex = todayIdx
        self.currentDay = self._dayNames[todayIdx]
        if (self.loadDayClasses) self.loadDayClasses()
        if (self.updateStatus) self.updateStatus()
      }
      console.log("[day-nav] hideWeekend updated: " + hide + ", day: " + self.currentDay)
    })
  }

  console.log("[day-nav] init OK, day: " + instance.currentDay)
}

module.exports = { init: init }
console.log("[day-nav] loaded")