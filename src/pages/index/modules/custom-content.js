console.log("[custom-content] loading...")

function init(instance) {
  instance.showCustomContent = false
  instance.customContent = ""

  var storage = require("@system.storage")
  storage.get({
    key: "homepage_settings",
    success: function(data) {
      try {
        var settings = JSON.parse(data)
        instance.showCustomContent = settings.showCustomContent || false
        instance.customContent = settings.customContent || ""
      } catch (e) {
        instance.showCustomContent = false
        instance.customContent = ""
      }
    },
    fail: function() {
      instance.showCustomContent = false
      instance.customContent = ""
    }
  })

  console.log("[custom-content] init OK")
}

module.exports = { init: init }
console.log("[custom-content] loaded")