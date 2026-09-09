console.log("[week-indicator module] loading...")

var store = require("../../../data/store.js")

function init(instance) {
  console.log("[week-indicator module] init called")
  instance.currentScheduleName = "课程表1"

  store.getCurrentScheduleIndex(function(idx) {
    store.getScheduleNames(function(names) {
      if (names && idx < names.length) {
        instance.currentScheduleName = names[idx]
      } else {
        instance.currentScheduleName = "课程表" + (idx + 1)
      }
      console.log("[week-indicator module] schedule: " + instance.currentScheduleName)
    })
  })

  instance.openScheduleManager = function() {
    var router = require("@system.router")
    router.push({ uri: "/pages/schedule-manager" })
  }

  console.log("[week-indicator module] init OK")
}

module.exports = {
  init: init
}

console.log("[week-indicator module] loaded successfully")