console.log("[custom-content module] loading...")

function init(instance) {
  console.log("[custom-content module] init called")
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
      console.log("[custom-content module] loaded, show=" + instance.showCustomContent + ", content=" + instance.customContent)
    },
    fail: function() {
      instance.showCustomContent = false
      instance.customContent = ""
      console.log("[custom-content module] no homepage settings")
    }
  })

  console.log("[custom-content module] init OK")
}

module.exports = {
  init: init
}

console.log("[custom-content module] loaded successfully")