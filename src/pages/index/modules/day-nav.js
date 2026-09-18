var store = require("../../../data/store.js")

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
var weekdayNames = ["星期一", "星期二", "星期三", "星期四", "星期五"]

var dayShortMap = {
  "星期日": "日", "星期一": "一", "星期二": "二", "星期三": "三",
  "星期四": "四", "星期五": "五", "星期六": "六"
}

function getRealTodayIndex() {
  return new Date().getDay()
}

// 屏型由 index.ux 统一探测后回填到 instance.isCapsule，这里不再重复调用
// device.getInfo（异步 IPC，重复调用会拖慢首屏）。
function updateDayDisplay(instance) {
  instance.dayDisplayText = instance.isCapsule
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
  updateDayDisplay(instance)

  // 供 index.ux 拿到真实屏型后回调刷新（此时 isCapsule 才被回填）
  instance.updateDayDisplay = function() {
    updateDayDisplay(instance)
  }

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
    })
  }
}

module.exports = { init: init }