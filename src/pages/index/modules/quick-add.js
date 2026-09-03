console.log("[quick-add] loading...")

var database = require("../../../data/database.js")

function init(instance) {
  instance.quickAdd = {
    expanded: false,
    courseNames: [],
    disabled: false,
    time: "",
    toggle: function() {
      var self = instance
      self.quickAdd.expanded = !self.quickAdd.expanded
      if (self.quickAdd.expanded) {
        self.quickAdd.loadPreset()
        self.quickAdd.time = self.quickAdd.calcNext()
      }
    },
    loadPreset: function() {
      var self = instance
      var storage = require("@system.storage")
      storage.get({
        key: "course_preset_list",
        success: function(data) {
          try {
            var list = JSON.parse(data)
            var names = []
            for (var i = 0; i < list.length; i++) {
              names.push(list[i].name || list[i])
            }
            self.quickAdd.courseNames = names
          } catch (e) {
            self.quickAdd.courseNames = []
          }
        },
        fail: function() {
          self.quickAdd.courseNames = []
        }
      })
    },
    addCourse: function(courseName) {
      var self = instance
      var time = self.quickAdd.calcNext()
      if (self.quickAdd.disabled) return
      var course = {
        id: String(Date.now()),
        name: courseName,
        time: time,
        day: self.currentDay,
        teacher: "",
        location: "",
        notes: ""
      }
      database.insertCourse(course, function(err) {
        if (err) {
          console.error("[quick-add] insert failed: " + err)
          return
        }
        console.log("[quick-add] added: " + courseName)
        self.loadDayClasses()
        if (self.quickAdd.loadPreset) self.quickAdd.loadPreset()
        self.quickAdd.time = self.quickAdd.calcNext()
      })
    },
    calcNext: function() {
      var self = instance
      var now = new Date()
      var nowMinutes = now.getHours() * 60 + now.getMinutes()
      var lastEndMin = 0
      var classes = self.currentClasses || []
      for (var i = 0; i < classes.length; i++) {
        var parts = classes[i].time.split("-")
        if (parts.length < 2) continue
        var endMin = self.quickAdd._parseTime(parts[1].trim())
        if (endMin > lastEndMin) lastEndMin = endMin
      }
      var startMin = lastEndMin > 0 ? lastEndMin + 10 : 8 * 60
      if (startMin < nowMinutes) startMin = nowMinutes + 5
      if (startMin >= 24 * 60) {
        self.quickAdd.disabled = true
        return "已排满"
      }
      var endMin = startMin + 45
      if (endMin > 24 * 60) endMin = 24 * 60
      self.quickAdd.disabled = false
      return self.quickAdd._fmt(startMin) + " - " + self.quickAdd._fmt(endMin)
    },
    _fmt: function(minutes) {
      var h = Math.floor(minutes / 60)
      var m = minutes % 60
      return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m
    },
    _parseTime: function(timeStr) {
      var parts = timeStr.split(":")
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
  }

  console.log("[quick-add] init OK")
}

module.exports = { init: init }
console.log("[quick-add] loaded")