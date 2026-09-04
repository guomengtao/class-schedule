console.log("[pinned-pages] loading...")

var pinHelper = require("../../../data/pin-helper.js")

function init(instance) {
  instance.pinnedPages = []
  instance.hasPinned = false

  instance.loadPinnedPages = function() {
    var self = instance
    pinHelper.getList(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].name && list[i].name.length > 4) {
          list[i].name = list[i].name.substring(0, 4) + "..."
        }
      }
      self.pinnedPages = list
      self.hasPinned = list.length > 0
    })
  }

  instance.openPinnedPage = function(uri) {
    var router = require("@system.router")
    router.push({ uri: uri })
  }

  instance.loadPinnedPages()
  console.log("[pinned-pages] init OK")
}

module.exports = { init: init }
console.log("[pinned-pages] loaded")