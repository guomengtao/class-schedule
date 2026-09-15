var pinHelper = require("../../../data/pin-helper.js")

function init(instance) {
  instance.pinnedPages = []
  instance.hasPinned = false

  instance.loadPinnedPages = function() {
    var self = instance
    pinHelper.getList(function(list) {
      self.pinnedPages = list
      self.hasPinned = list.length > 0
    })
  }

  instance.openPinnedPage = function(uri) {
    var router = require("@system.router")
    router.push({ uri: uri })
  }

  instance.loadPinnedPages()
}

module.exports = { init: init }