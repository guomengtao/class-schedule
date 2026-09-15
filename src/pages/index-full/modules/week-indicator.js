var store = require("../../../data/store.js")

function init(instance) {
  instance.currentScheduleName = "课程表1"

  store.getCurrentScheduleIndex(function(idx) {
    store.getScheduleNames(function(names) {
      if (names && idx < names.length) {
        instance.currentScheduleName = names[idx]
      } else {
        instance.currentScheduleName = "课程表" + (idx + 1)
      }
    })
  })

  instance.openScheduleManager = function() {
    var router = require("@system.router")
    router.push({ uri: "/pages/schedule-manager" })
  }
}

module.exports = {
  init: init
}