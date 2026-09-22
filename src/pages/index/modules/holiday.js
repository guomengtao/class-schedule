var store = require("../../../data/store.js")

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
                  if (dateEntry.type === "holiday") {
                    self.isHoliday = true
                    self.isWorkday = false
                    self.holidayName = dateEntry.name || ""
                    self.holidayGreeting = dateEntry.greeting || ""
                    self.overrideDayName = ""
                    if (callback) callback(-2)
                    return
                  } else if (dateEntry.type === "workday") {
                    self.isHoliday = false
                    self.isWorkday = true
                    self.holidayName = ""
                    self.holidayGreeting = ""
                    self.overrideDayName = dateEntry.dayName || ""
                    if (callback) callback(dateEntry.weekDay !== undefined ? dateEntry.weekDay : -1)
                    return
                  }
                }
              } catch (e) {
                console.error("[holiday] parse error: " + (e.message || e))
              }
            }
            self.isHoliday = false
            self.isWorkday = false
            self.holidayName = ""
            self.holidayGreeting = ""
            self.overrideDayName = ""
            if (callback) callback(-1)
          },
          fail: function() {
            self.isHoliday = false
            self.isWorkday = false
            self.holidayName = ""
            self.holidayGreeting = ""
            self.overrideDayName = ""
            if (callback) callback(-1)
          }
        })
      })
    })
  }
}

function destroy() {
}

module.exports = { init: init, destroy: destroy }