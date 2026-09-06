console.log("[custom-content] loading...")

function init(instance) {
  instance.showCustomContent = false
  instance.customContent = ""
  instance.customContentList = []

  var store = require("../../../data/store.js")
  store.getEnabledCustomContents(function(list) {
    instance.customContentList = list
    if (list && list.length > 0) {
      instance.showCustomContent = true
      instance.customContent = list[0].text
    } else {
      instance.showCustomContent = false
      instance.customContent = ""
    }
  })
  console.log("[custom-content] init OK")
}

function refresh(instance) {
  var store = require("../../../data/store.js")
  store.getEnabledCustomContents(function(list) {
    instance.customContentList = list
    if (list && list.length > 0) {
      instance.showCustomContent = true
      instance.customContent = list[0].text
    } else {
      instance.showCustomContent = false
      instance.customContent = ""
    }
  })
}

function destroy() {
}

module.exports = { init: init, refresh: refresh, destroy: destroy }
console.log("[custom-content] loaded")