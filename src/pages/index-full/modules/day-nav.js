console.log("[day-nav] loading...")

var store = require("../../../data/store.js")
var device = require("@system.device")

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
var weekdayNames = ["星期一", "星期二", "星期三", "星期四", "星期五"]
var isCapsule = false

var dayShortMap = {
  "星期日": "周日", "星期一": "周一", "星期二": "周二", "星期三": "周三",
  "星期四": "周四", "星期五": "周五", "星期六": "周六"
}

function getRealTodayIndex() {
  return new Date().getDay()
}

function updateDayDisplay(instance) {
  instance.dayDisplayText = isCapsule
    ? (dayShortMap[instance.currentDay] || instance.currentDay)
    : instance.currentDay
}

function init(instance) {
  console.log("[day-nav] init called")

  instance.dayNavNames = fullDayNames
  instance.hideWeekend = false

  var todayIdx = getRealTodayIndex()
  instance.currentDay = fullDayNames[todayIdx]
  instance.currentDayIndex = todayIdx
  instance.dayDisplayText = fullDayNames[todayIdx]

  device.getInfo({
    success: function(data) {
      var shape = data.screenShape || ""
      isCapsule = (shape === "capsule" || shape === "pill-shaped")
      console.log("[day-nav] screenShape=" + shape + " isCapsule=" + isCapsule)
      updateDayDisplay(instance)
    },
    fail: function() {
      console.log("[day-nav] device.getInfo failed")
    }
  })

  instance.prevDay = function() {
    var self = instance
    var names = self.dayNavNames || fullDayNames
    if (self.currentDayIndex > 0) {
      self.currentDayIndex--
    } else {
      self.currentDayIndex = names.length - 1
    }
    self.currentDay = names[self.currentDayIndex]
    updateDayDisplay(self)
    if (self.loadDayClasses) self.loadDayClasses()
    if (self.updateStatus) self.updateStatus()
  }

  instance.nextDay = function() {
    var self = instance
    var names = self.dayNavNames || fullDayNames
    if (self.currentDayIndex < names.length - 1) {
      self.currentDayIndex++
    } else {
      self.currentDayIndex = 0
    }
    self.currentDay = names[self.currentDayIndex]
    updateDayDisplay(self)
    if (self.loadDayClasses) self.loadDayClasses()
    if (self.updateStatus) self.updateStatus()
  }

  instance.goToToday = function() {
    var self = instance
    var names = self.dayNavNames || fullDayNames
    var todayIdx = getRealTodayIndex()
    if (self.hideWeekend && (todayIdx === 0 || todayIdx === 6)) {
      todayIdx = 0
    } else if (self.hideWeekend) {
      todayIdx = todayIdx - 1
    }
    if (self.currentDayIndex === todayIdx) return
    self.currentDayIndex = todayIdx
    self.currentDay = names[todayIdx]
    updateDayDisplay(self)
    if (self.loadDayClasses) self.loadDayClasses()
    if (self.updateStatus) self.updateStatus()
  }

  instance.updateHideWeekend = function() {
    var self = instance
    store.getHideWeekend(function(hide) {
      self.hideWeekend = hide
      self.dayNavNames = hide ? weekdayNames : fullDayNames
      var todayIdx = getRealTodayIndex()
      if (hide && (todayIdx === 0 || todayIdx === 6)) {
        todayIdx = 0
      } else if (hide) {
        todayIdx = todayIdx - 1
      }
      if (self.currentDayIndex !== todayIdx) {
        self.currentDayIndex = todayIdx
        self.currentDay = self.dayNavNames[todayIdx]
        updateDayDisplay(self)
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