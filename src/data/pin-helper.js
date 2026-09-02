var KEY = "pinned_pages"

function getList(callback) {
  var storage = require("@system.storage")
  storage.get({
    key: KEY,
    success: function(data) {
      var list = []
      if (data) {
        try { list = JSON.parse(data) } catch (e) {}
      }
      callback(list)
    },
    fail: function() {
      callback([])
    }
  })
}

function saveList(list, callback) {
  var storage = require("@system.storage")
  storage.set({
    key: KEY,
    value: JSON.stringify(list),
    success: function() {
      if (callback) callback()
    }
  })
}

function pinPage(name, uri, callback) {
  var prompt = require("@system.prompt")
  getList(function(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].uri === uri) {
        prompt.showToast({ message: "已钉在首页" })
        return
      }
    }
    list.push({ name: name, uri: uri })
    saveList(list, function() {
      prompt.showToast({ message: "已钉到首页" })
      if (callback) callback()
    })
  })
}

function isPinned(uri, callback) {
  getList(function(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].uri === uri) {
        callback(true)
        return
      }
    }
    callback(false)
  })
}

module.exports = {
  pinPage: pinPage,
  isPinned: isPinned,
  getList: getList
}