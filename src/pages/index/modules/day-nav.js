var store = require("../../../data/store.js")

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
var weekdayNames = ["星期一", "星期二", "星期三", "星期四", "星期五"]

var dayShortMap = {
  "星期日": "周日", "星期一": "周一", "星期二": "周二", "星期三": "周三",
  "星期四": "周四", "星期五": "周五", "星期六": "周六"
}

function pad(n) {
  return n < 10 ? "0" + n : "" + n
}

function dateToDateStr(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
}

function formatDateShort(d) {
  return pad(d.getMonth() + 1) + "-" + pad(d.getDate())
}

// 顶部第一行用中文月日：10月25日。比 10-25 更易读，也不会和时分混淆。
function formatDateCn(d) {
  return (d.getMonth() + 1) + "月" + d.getDate() + "日"
}

function formatClock(d) {
  var t = d || new Date()
  return pad(t.getHours()) + ":" + pad(t.getMinutes())
}

function getRealTodayIndex() {
  return new Date().getDay()
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

function updateDayDisplay(instance) {
  instance.dayDisplayText = instance.isCapsule
    ? (dayShortMap[instance.currentDay] || instance.currentDay)
    : instance.currentDay
}

// 顶部第一行：看今天 → 当前时分（12:16）；切到别的日期 → 中文月日（10月25日）。
// 二者宽度接近（5~6 字符），胶囊屏顶部圆弧下可用宽约 103px，切换时不跳动。
function updateTopLabel(instance) {
  var label = instance.isTodayDate
    ? formatClock()
    : formatDateCn(instance.currentDate || new Date())
  if (instance.topLabel !== label) {
    instance.topLabel = label
  }
}

// 顶部时间要跟着真实分钟走，但只在页面可见时计时：
// onShow 启动、onHide/onDestroy 清除，禁止页面外空转。
function startClock(instance) {
  stopClock(instance)
  updateTopLabel(instance)
  instance._clockTimer = setInterval(function() {
    updateTopLabel(instance)
  }, 20000)
}

function stopClock(instance) {
  if (instance._clockTimer) {
    clearInterval(instance._clockTimer)
    instance._clockTimer = null
  }
}

function syncDayFromDate(instance, d) {
  instance.currentDayIndex = d.getDay()
  instance.currentDay = fullDayNames[instance.currentDayIndex]
  instance.currentDateStr = formatDateShort(d)
  instance.isTodayDate = sameDate(d, new Date())
  updateDayDisplay(instance)
  updateTopLabel(instance)
}

function persistDateToHoliday(instance, d) {
  var dateStr = dateToDateStr(d)
  if (instance.reloadHolidayState) {
    instance.reloadHolidayState(dateStr, function(overrideWeekDay) {
      if (overrideWeekDay === -2) {
        instance.currentClasses = []
        instance.isToday = true
      } else if (instance.loadDayClasses) {
        instance.loadDayClasses(overrideWeekDay)
      }
      if (instance.updateStatus) instance.updateStatus()
      try { instance.$forceUpdate && instance.$forceUpdate() } catch (e) {}
    })
  } else if (instance.loadDayClasses) {
    instance.loadDayClasses()
    if (instance.updateStatus) instance.updateStatus()
    try { instance.$forceUpdate && instance.$forceUpdate() } catch (e) {}
  }
}

function init(instance) {

  instance.dayNavNames = fullDayNames
  instance.hideWeekend = false

  var now = new Date()
  instance.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  syncDayFromDate(instance, instance.currentDate)

  instance.updateDayDisplay = function() {
    updateDayDisplay(instance)
  }

  // index.ux 的 goToTomorrow 直接改 currentDateStr/isTodayDate，不走 syncDayFromDate，
  // 所以单独给一个刷新入口。
  instance.updateTopLabel = function() {
    updateTopLabel(instance)
  }

  instance.prevDay = function() {
    var self = instance
    self.currentDate.setDate(self.currentDate.getDate() - 1)
    syncDayFromDate(self, self.currentDate)
    persistDateToHoliday(self, self.currentDate)
  }

  instance.nextDay = function() {
    var self = instance
    self.currentDate.setDate(self.currentDate.getDate() + 1)
    syncDayFromDate(self, self.currentDate)
    persistDateToHoliday(self, self.currentDate)
  }

  instance.goToToday = function() {
    var self = instance
    var today = new Date()
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (sameDate(self.currentDate, today)) return
    self.currentDate = today
    syncDayFromDate(self, self.currentDate)
    persistDateToHoliday(self, self.currentDate)
  }

  instance.updateHideWeekend = function() {
    var self = instance
    store.getHideWeekend(function(hide) {
      self.hideWeekend = hide
      self.dayNavNames = hide ? weekdayNames : fullDayNames
    })
  }
}

module.exports = { init: init, startClock: startClock, stopClock: stopClock }