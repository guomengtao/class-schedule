console.log("[bottom-buttons module] loading...")

function init(instance) {
  console.log("[bottom-buttons module] init called")

  instance.openAddCoursePage = function() {
    var router = require("@system.router")
    var storage = require("@system.storage")
    var self = instance
    storage.set({
      key: "add_course_day",
      value: self.currentDay,
      success: function() {
        router.push({ uri: "/pages/add-course" })
      },
      fail: function() {
        router.push({ uri: "/pages/add-course" })
      }
    })
  }

  instance.openSettings = function() {
    var router = require("@system.router")
    router.push({ uri: "/pages/settings" })
  }

  console.log("[bottom-buttons module] init OK")
}

module.exports = {
  init: init
}

console.log("[bottom-buttons module] loaded successfully")