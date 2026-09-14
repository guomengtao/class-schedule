import storage from "@system.storage"
var STORAGE_KEY = "lab_settings"

var ALL_PAGES = [
  { name: "添加课程V2", uri: "/pages/add-course-v2" },
  { name: "添加胶囊版", uri: "/pages/lab-add-course" }
]

function getStorage(callback) {
  storage.get({
    key: STORAGE_KEY,
    success: function(data) {
      var result = { hidden: [], order: [] }
      if (data) {
        try { result = JSON.parse(data) } catch (e) {}
      }
      callback(result)
    },
    fail: function() {
      callback({ hidden: [], order: [] })
    }
  })
}

function saveSettings(settings, callback) {
  storage.set({
    key: STORAGE_KEY,
    value: JSON.stringify(settings),
    success: function() {
      if (callback) callback()
    }
  })
}

function buildDesc(uri) {
  var parts = uri.split("/")
  return parts[parts.length - 1] || "unknown"
}

function init(instance, callback) {
  var pinHelper = require("./pin-helper.js")

  getStorage(function(settings) {
    var hidden = settings.hidden || []
    var order = settings.order || []

    var items = []
    for (var i = 0; i < ALL_PAGES.length; i++) {
      if (hidden.indexOf(ALL_PAGES[i].uri) !== -1) continue
      items.push({
        name: ALL_PAGES[i].name,
        desc: buildDesc(ALL_PAGES[i].uri),
        uri: ALL_PAGES[i].uri,
        pinned: false
      })
    }

    if (order.length > 0) {
      var ordered = []
      for (var o = 0; o < order.length; o++) {
        for (var j = 0; j < items.length; j++) {
          if (items[j].uri === order[o]) {
            ordered.push(items[j])
            items.splice(j, 1)
            break
          }
        }
      }
      items = ordered.concat(items)
    }

    pinHelper.getList(function(pinnedList) {
      var pinnedUris = []
      for (var p = 0; p < pinnedList.length; p++) {
        pinnedUris.push(pinnedList[p].uri)
      }
      for (var k = 0; k < items.length; k++) {
        items[k].pinned = pinnedUris.indexOf(items[k].uri) !== -1
      }

      if (instance) {
        instance.labItems = items
        instance.labStatus = "ok"
      }
      if (callback) callback(items)
    })
  })
}

function getVisibleItems(callback) {
  getStorage(function(settings) {
    var hidden = settings.hidden || []
    var order = settings.order || []

    var items = []
    for (var i = 0; i < ALL_PAGES.length; i++) {
      if (hidden.indexOf(ALL_PAGES[i].uri) !== -1) continue
      items.push({
        name: ALL_PAGES[i].name,
        desc: buildDesc(ALL_PAGES[i].uri),
        uri: ALL_PAGES[i].uri
      })
    }

    if (order.length > 0) {
      var ordered = []
      for (var o = 0; o < order.length; o++) {
        for (var j = 0; j < items.length; j++) {
          if (items[j].uri === order[o]) {
            ordered.push(items[j])
            items.splice(j, 1)
            break
          }
        }
      }
      items = ordered.concat(items)
    }
    callback(items)
  })
}

function getAllPages() {
  return ALL_PAGES
}

export default {
  init: init,
  getVisibleItems: getVisibleItems,
  getStorage: getStorage,
  saveSettings: saveSettings,
  getAllPages: getAllPages
}