console.log("[day-nav] loading...")

var dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

function getRealTodayIndex() {
  return new Date().getDay()
}

function init(instance) {
  instance.currentDay = "星期日"
  instance.currentDayIndex = 0

  instance.currentDayIndex = getRealTodayIndex()
  instance.currentDay = dayNames[instance.currentDayIndex]

  function onDayChanged() {
    if (instance.loadDayClasses && typeof instance.loadDayClasses === 'function') {
      instance.loadDayClasses()
    }
    if (instance.updateStatus && typeof instance.updateStatus === 'function') {
      instance.updateStatus()
    }
  }

  instance.prevDay = function() {
    if (instance.currentDayIndex > 0) {
      instance.currentDayIndex--
    } else {
      instance.currentDayIndex = dayNames.length - 1
    }
    instance.currentDay = dayNames[instance.currentDayIndex]
    onDayChanged()
  }

  instance.nextDay = function() {
    if (instance.currentDayIndex < dayNames.length - 1) {
      instance.currentDayIndex++
    } else {
      instance.currentDayIndex = 0
    }
    instance.currentDay = dayNames[instance.currentDayIndex]
    onDayChanged()
  }

  instance.goToToday = function() {
    var todayIdx = getRealTodayIndex()
    if (instance.currentDayIndex === todayIdx) return
    instance.currentDayIndex = todayIdx
    instance.currentDay = dayNames[todayIdx]
    onDayChanged()
  }

  instance.goToTomorrow = function() {
    var todayIdx = getRealTodayIndex()
    var tomorrowIdx = todayIdx + 1
    if (tomorrowIdx >= dayNames.length) tomorrowIdx = 0
    if (instance.currentDayIndex === tomorrowIdx) return
    instance.currentDayIndex = tomorrowIdx
    instance.currentDay = dayNames[tomorrowIdx]
    onDayChanged()
  }

  console.log("[day-nav] init OK, day: " + instance.currentDay)
}

module.exports = { init: init }
console.log("[day-nav] loaded")