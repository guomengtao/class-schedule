console.log("[custom-content] loading...")

var _timer = null

function init(instance) {
  instance.showCustomContent = false
  instance.customContent = ""
  instance._customContentList = []
  instance._customContentIndex = 0

  loadAndRotate(instance)
  console.log("[custom-content] init OK")
}

function loadAndRotate(instance) {
  stopRotation()
  var storage = require("@system.storage")

  storage.get({
    key: "customContentList",
    success: function(data) {
      if (data) {
        try {
          var list = JSON.parse(data)
          if (list && list.length > 0) {
            instance._customContentList = list
            instance._customContentIndex = 0
            instance.customContent = list[0]
            checkSettingsToggle(instance)
            if (list.length > 1) {
              startRotation(instance)
            }
            return
          }
        } catch (e) {}
      }
      loadLegacy(instance)
    },
    fail: function() {
      loadLegacy(instance)
    }
  })
}

function checkSettingsToggle(instance) {
  var storage = require("@system.storage")
  storage.get({
    key: "homepage_settings",
    success: function(data) {
      if (data) {
        try {
          var settings = JSON.parse(data)
          if (settings.showCustomContent === false) {
            instance.showCustomContent = false
          } else {
            instance.showCustomContent = true
          }
        } catch (e) {
          instance.showCustomContent = true
        }
      } else {
        instance.showCustomContent = true
      }
    },
    fail: function() {
      instance.showCustomContent = true
    }
  })
}

function loadLegacy(instance) {
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
}

function startRotation(instance) {
  stopRotation()
  var storage = require("@system.storage")
  storage.get({
    key: "customContentInterval",
    success: function(data) {
      var interval = parseInt(data) || 3
      if (interval < 1) interval = 1
      if (interval > 10) interval = 10
      _timer = setInterval(function() {
        var list = instance._customContentList
        if (!list || list.length <= 1) {
          stopRotation()
          return
        }
        instance._customContentIndex = (instance._customContentIndex + 1) % list.length
        instance.customContent = list[instance._customContentIndex]
      }, interval * 1000)
    },
    fail: function() {
      _timer = setInterval(function() {
        var list = instance._customContentList
        if (!list || list.length <= 1) {
          stopRotation()
          return
        }
        instance._customContentIndex = (instance._customContentIndex + 1) % list.length
        instance.customContent = list[instance._customContentIndex]
      }, 3000)
    }
  })
}

function stopRotation() {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
  }
}

function refresh(instance) {
  loadAndRotate(instance)
}

function destroy() {
  stopRotation()
}

module.exports = { init: init, refresh: refresh, destroy: destroy }
console.log("[custom-content] loaded")