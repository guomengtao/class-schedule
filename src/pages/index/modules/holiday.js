var store = require("../../../data/store.js")
var holidayPreset = require("../../../data/holiday-preset.js")

// 每次 App 启动只需检查一次内置数据是否补齐
var presetChecked = false

function ensurePresetOnce(callback) {
  if (presetChecked) {
    callback()
    return
  }
  presetChecked = true
  try {
    holidayPreset.ensurePreset(function() {
      callback()
    })
  } catch (e) {
    callback()
  }
}

function applyEntry(self, dateEntry, callback) {
  if (dateEntry.type === "holiday") {
    self.isHoliday = true
    self.isWorkday = false
    self.holidayName = dateEntry.name || ""
    self.holidayGreeting = dateEntry.greeting || ""
    self.overrideDayName = ""
    if (callback) callback(-2)
    return
  }
  if (dateEntry.type === "workday") {
    self.isHoliday = false
    self.isWorkday = true
    self.holidayName = ""
    self.holidayGreeting = ""
    self.overrideDayName = dateEntry.dayName || ""
    if (callback) callback(dateEntry.weekDay !== undefined ? dateEntry.weekDay : -1)
    return
  }
  resetState(self, callback)
}

function resetState(self, callback) {
  self.isHoliday = false
  self.isWorkday = false
  self.holidayName = ""
  self.holidayGreeting = ""
  self.overrideDayName = ""
  if (callback) callback(-1)
}

function readHolidayState(self, dateStr, callback) {
  var storage = require("@system.storage")
  storage.get({
    key: "holiday_data",
    success: function(data) {
      console.log("[holiday] storage.get holiday_data raw:", data, "looking for dateStr:", dateStr)
      if (data) {
        try {
          var holidayData = JSON.parse(data)
          var dateEntry = holidayData[dateStr]
          console.log("[holiday] parsed holidayData keys:", Object.keys(holidayData), "dateEntry:", JSON.stringify(dateEntry))
          if (dateEntry) {
            applyEntry(self, dateEntry, callback)
            return
          }
        } catch (e) {
          console.error("[holiday] parse error: " + (e.message || e))
        }
      }
      resetState(self, callback)
    },
    fail: function() {
      resetState(self, callback)
    }
  })
}

function init(instance) {
  instance.isHoliday = false
  instance.isWorkday = false
  instance.holidayGreeting = ""
  instance.holidayName = ""
  instance.overrideDayName = ""
  instance.holidayReminderOn = false

  instance.reloadHolidayState = function(dateStr, callback) {
    var self = instance
    store.getCurrentScheduleIndex(function(idx) {
      store.getHolidayReminderEnabled(idx, function(enabled) {
        self.holidayReminderOn = enabled
        ensurePresetOnce(function() {
          readHolidayState(self, dateStr, callback)
        })
      })
    })
  }
}

function destroy() {
}

module.exports = { init: init, destroy: destroy }
