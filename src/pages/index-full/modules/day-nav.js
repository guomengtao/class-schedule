var store = require("../../../data/store.js")
var device = require("@system.device")

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
var weekdayNames = ["星期一", "星期二", "星期三", "星期四", "星期五"]
var isCapsule = false

var dayShortMap = {
  "星期日": "日", "星期一": "一", "星期二": "二", "星期三": "三",
  "星期四": "四", "星期五": "五", "星期六": "六"
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
      updateDayDisplay(instance)
    },
    fail: function() {}
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
      })
  }

module.exports = { init: init }