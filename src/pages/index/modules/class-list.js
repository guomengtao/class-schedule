var store = require("../../../data/store.js")
var prompt = require("@system.prompt")

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

// 屏型由 index.ux 统一探测后通过 instance.isCapsule 传入，这里不再重复调用
// device.getInfo（它是异步 IPC，重复调用会拖慢首屏）。
// 胶囊屏只展示开始时间，避免时间文本过长把地点挤掉。
function shortenTime(timeStr, capsule) {
  if (!capsule) return timeStr
  return timeStr.replace(/ - /g, "-")
}

function getRealTodayName() {
  return fullDayNames[new Date().getDay()]
}

function parseTime(timeStr) {
  var parts = timeStr.split(":")
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

function init(instance) {
  instance.currentClasses = []
  instance.currentScheduleName = "课程表1"
  instance.progressTimer = null
  store.getCurrentScheduleIndex(function(idx) {
    store.getScheduleNames(function(names) {
      if (names && idx < names.length) {
        instance.currentScheduleName = names[idx]
      } else {
        instance.currentScheduleName = "课程表" + (idx + 1)
      }
    })
  })

  instance.loadDayClasses = function(overrideWeekDay) {
    if (overrideWeekDay === undefined) overrideWeekDay = -1
    var self = instance
    var dayData = null
    var queryDay = (overrideWeekDay >= 0) ? fullDayNames[overrideWeekDay] : self.currentDay
    for (var i = 0; i < self.schedule.length; i++) {
      if (self.schedule[i].day === queryDay) {
        dayData = self.schedule[i]
        break
      }
    }
    var rawClasses = dayData ? dayData.classes : []
    var classes = []
    var capsule = self.isCapsule === true
    var currentFontSize = self.displaySize
    var currentMetaFontSize = self.metaFontSize
    // 行高固定为字号的 1.2 倍，避免行高小于字号导致文字上下被裁切/重叠
    var currentLineHeight = Math.round(currentFontSize * 1.2)
    var currentMetaLineHeight = Math.round(currentMetaFontSize * 1.2)
    for (var j = 0; j < rawClasses.length; j++) {
      var src = rawClasses[j]
      // Capsule: always wrap location to a separate line for consistent layout
      var needsWrap = capsule && !!src.location
      classes.push({
        id: src.id,
        name: src.name,
        time: src.time,
        timeDisplay: shortenTime(src.time, capsule),
        teacher: src.teacher || "",
        location: src.location || "",
        locationWrap: needsWrap,
        progress: 0,
        progressColor: "transparent",
        fontSize: currentFontSize,
        metaFontSize: currentMetaFontSize,
        lineHeight: currentLineHeight,
        metaLineHeight: currentMetaLineHeight
      })
    }
    classes.sort(function(a, b) {
      var ta = a.time ? a.time.split(" - ")[0] : "00:00"
      var tb = b.time ? b.time.split(" - ")[0] : "00:00"
      var taParts = ta.split(":")
      var tbParts = tb.split(":")
      return (parseInt(taParts[0]) * 60 + parseInt(taParts[1])) - (parseInt(tbParts[0]) * 60 + parseInt(tbParts[1]))
    })
    self.currentClasses = classes
    self.isToday = (self.currentDay === getRealTodayName())
    self.updateClassProgress()
  }

  instance.refreshClasses = function() {
    var self = instance
    console.log("[refreshClasses] entering, has reloadHolidayState=" + (!!self.reloadHolidayState) + " holidayReminderOn=" + self.holidayReminderOn + " isHoliday=" + self.isHoliday)
    if (self.reloadHolidayState && typeof self.reloadHolidayState === 'function') {
      var d = self.currentDate
      console.log("[refreshClasses] currentDate=" + (d ? d.toDateString() : "null"))
      var m = (d.getMonth() + 1)
      var day = d.getDate()
      var dateStr = d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day)
      console.log("[refreshClasses] dateStr=" + dateStr + ", calling reloadHolidayState")
      self.reloadHolidayState(dateStr, function(overrideWeekDay) {
        console.log("[refreshClasses] reloadHolidayState callback, overrideWeekDay=" + overrideWeekDay)
        if (overrideWeekDay === -2) {
          self.currentClasses = []
        } else {
          self.loadDayClasses(overrideWeekDay >= 0 ? overrideWeekDay : -1)
        }
        console.log("[refreshClasses] after callback, isHoliday=" + self.isHoliday + " isWorkday=" + self.isWorkday + " holidayReminderOn=" + self.holidayReminderOn)
        if (self.updateStatus && typeof self.updateStatus === 'function') {
          self.updateStatus()
        }
        try { self.$forceUpdate && self.$forceUpdate() } catch (e) {}
      })
    } else {
      console.log("[refreshClasses] ⚠ FALLBACK: reloadHolidayState not available, using loadDayClasses directly")
      self.loadDayClasses()
      if (self.updateStatus && typeof self.updateStatus === 'function') {
        self.updateStatus()
      }
    }
  }

  instance.updateClassProgress = function() {
    var self = instance
    var classes = self.currentClasses
    var now = new Date()
    var nowMinutes = now.getHours() * 60 + now.getMinutes()
    for (var i = 0; i < classes.length; i++) {
      var course = classes[i]
      var parts = course.time.split("-")
      if (parts.length < 2) {
        course.progress = 0
        course.progressColor = "transparent"
        continue
      }
      var startMin = parseTime(parts[0].trim())
      var endMin = parseTime(parts[1].trim())
      if (nowMinutes < startMin) {
        course.progress = 0
        course.progressColor = "transparent"
      } else if (nowMinutes >= endMin) {
        course.progress = 100
        course.progressColor = "rgba(74,138,154,0.25)"
      } else {
        var total = endMin - startMin
        var elapsed = nowMinutes - startMin
        course.progress = Math.round((elapsed / total) * 100)
        course.progressColor = "rgba(126,200,227,0.2)"
      }
    }
  }

  instance.startProgressTimer = function() {
    if (instance.progressTimer) clearInterval(instance.progressTimer)
    instance.progressTimer = setInterval(function() {
      instance.updateClassProgress()
    }, 60000)
  }

  instance.stopProgressTimer = function() {
    if (instance.progressTimer) {
      clearInterval(instance.progressTimer)
      instance.progressTimer = null
    }
  }

  instance.openScheduleManager = function() {
    var router = require("@system.router")
    router.push({ uri: "/pages/schedule-manager" })
  }

  instance.goToClassDetail = function(course) {
    var router = require("@system.router")
    var storage = require("@system.storage")
    storage.set({
      key: "detail_classId",
      value: String(course.id),
      success: function() {
        storage.set({
          key: "detail_day",
          value: instance.currentDay,
          success: function() { router.push({ uri: "/pages/detail" }) },
          fail: function() { prompt.showToast({ message: "请重试" }) }
        })
      },
      fail: function() {
        prompt.showToast({ message: "请重试" })
      }
    })
  }
}

module.exports = { init: init }