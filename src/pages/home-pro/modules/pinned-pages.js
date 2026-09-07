console.log("[pinned-pages module] loading...")

var pinHelper = require("../../../data/pin-helper.js")

function init(instance) {
  console.log("[pinned-pages module] init called")
  instance.pinnedPages = []
  instance.hasPinned = false

  instance.loadPinnedPages = function() {
    var self = instance
    pinHelper.getList(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].name && list[i].name.length > 10) {
          list[i].name = list[i].name.substring(0, 10)
        }
      }
      self.pinnedPages = list
      self.hasPinned = list.length > 0
      console.log("[pinned-pages module] loaded " + list.length + " pages")
    })
  }

  instance.openPinnedPage = function(uri) {
    var router = require("@system.router")
    router.push({ uri: uri })
  }

  instance.loadPinnedPages()
  console.log("[pinned-pages module] init OK")
}

module.exports = {
  init: init
}

console.log("[pinned-pages module] loaded successfully")