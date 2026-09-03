function init(instance, deps) {
  instance.showCustomContent = false
  instance.customContent = ""

  deps.storage.get({
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
}

module.exports = { init: init }