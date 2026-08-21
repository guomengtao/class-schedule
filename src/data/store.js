var storage = require("@system.storage")

var DEFAULT_NAMES = ["Schedule 1"]

module.exports = {
  setFontScale: function(scale, callback) {
    storage.set({
      key: "fontScale",
      value: String(scale),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },
  getFontScale: function(callback) {
    storage.get({
      key: "fontScale",
      success: function(data) {
        var scale = parseFloat(data)
        if (!scale || scale < 0.5) { scale = 1.0 }
        callback(scale)
      },
      fail: function() { callback(1.0) }
    })
  },

  getScheduleNames: function(callback) {
    storage.get({
      key: "scheduleNames",
      success: function(data) {
        if (data) {
          try {
            var names = JSON.parse(data)
            callback(names)
          } catch (e) {
            callback(DEFAULT_NAMES.slice())
          }
        } else {
          callback(DEFAULT_NAMES.slice())
        }
      },
      fail: function() {
        callback(DEFAULT_NAMES.slice())
      }
    })
  },

  setScheduleNames: function(names, callback) {
    storage.set({
      key: "scheduleNames",
      value: JSON.stringify(names),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  },

  getCurrentScheduleIndex: function(callback) {
    storage.get({
      key: "currentScheduleIndex",
      success: function(data) {
        var idx = parseInt(data)
        if (isNaN(idx) || idx < 0) { idx = 0 }
        callback(idx)
      },
      fail: function() { callback(0) }
    })
  },

  setCurrentScheduleIndex: function(index, callback) {
    storage.set({
      key: "currentScheduleIndex",
      value: String(index),
      success: function() { if (callback) callback() },
      fail: function() { if (callback) callback() }
    })
  }
}