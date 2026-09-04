console.log("[class-list] loading...")

var store = require("../../../data/store.js")

var fullDayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

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
  instance._progressTimer = null

  store.getCurrentScheduleIndex(function(idx) {
    store.getScheduleNames(function(names) {
      if (names && idx < names.length) {
        instance.currentScheduleName = names[idx]
      } else {
        instance.currentScheduleName = "课程表" + (idx + 1)
      }
    })
  })

  instance.loadDayClasses = function() {
    var self = instance
    var dayData = null
    for (var i = 0; i < self.schedule.length; i++) {
      if (self.schedule[i].day === self.currentDay) {
        dayData = self.schedule[i]
        break
      }
    }
    var rawClasses = dayData ? dayData.classes : []
    var classes = []
    for (var j = 0; j < rawClasses.length; j++) {
      var src = rawClasses[j]
      classes.push({
        id: src.id,
        name: src.name,
        time: src.time,
        teacher: src.teacher || "",
        location: src.location || "",
        progress: 0,
        progressColor: "transparent"
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
    instance.loadDayClasses()
    if (instance.updateStatus && typeof instance.updateStatus === 'function') {
      instance.updateStatus()
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
    if (instance._progressTimer) clearInterval(instance._progressTimer)
    instance._progressTimer = setInterval(function() {
      instance.updateClassProgress()
    }, 60000)
  }

  instance.stopProgressTimer = function() {
    if (instance._progressTimer) {
      clearInterval(instance._progressTimer)
      instance._progressTimer = null
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
          fail: function() { router.push({ uri: "/pages/detail" }) }
        })
      },
      fail: function() { router.push({ uri: "/pages/detail" }) }
    })
  }

  console.log("[class-list] init OK")
}

module.exports = { init: init }
console.log("[class-list] loaded")