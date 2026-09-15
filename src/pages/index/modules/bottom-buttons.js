function init(instance) {
  instance.openAddCoursePage = function() {
    var router = require("@system.router")
    var storage = require("@system.storage")
    var self = instance
    storage.set({
      key: "add_course_day",
      value: self.currentDay,
      success: function() {
        router.push({ uri: "/pages/add-course-v2" })
      },
      fail: function() {
        router.push({ uri: "/pages/add-course-v2" })
      }
    })
  }

  instance.openSettings = function() {
    var router = require("@system.router")
    router.push({ uri: "/pages/settings" })
  }
}

module.exports = { init: init }