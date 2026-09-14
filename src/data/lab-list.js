var storage = require("@system.storage")
var STORAGE_KEY = "lab_settings"

var ALL_PAGES = [
  { name: "倒数日", uri: "/pages/countdown-manage" },
  { name: "课程管理V2(胶囊)", uri: "/pages/course-manager-v2" },
  { name: "添加课程V2", uri: "/pages/add-course-v2" },
  { name: "添加胶囊版", uri: "/pages/lab-add-course" },
  { name: "编辑胶囊版", uri: "/pages/lab-edit-course" }
]

function getStorage(callback) {
  console.log("[LAB-DEBUG] getStorage() called")
  storage.get({
    key: STORAGE_KEY,
    success: function(data) {
      console.log("[LAB-DEBUG] getStorage() success, raw data:", data)
      var result = { hidden: [], order: [] }
      if (data) {
        try { result = JSON.parse(data) } catch (e) { console.log("[LAB-DEBUG] getStorage() JSON parse error:", e) }
      }
      console.log("[LAB-DEBUG] getStorage() result:", JSON.stringify(result))
      callback(result)
    },
    fail: function(code, msg) {
      console.log("[LAB-DEBUG] getStorage() fail, code:", code, "msg:", msg)
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
  console.log("[LAB-DEBUG] init() called, ALL_PAGES count:", ALL_PAGES.length)
  console.log("[LAB-DEBUG] init() ALL_PAGES:", JSON.stringify(ALL_PAGES))
  var pinHelper = require("./pin-helper.js")
  console.log("[LAB-DEBUG] init() pinHelper loaded:", typeof pinHelper)

  getStorage(function(settings) {
    var hidden = settings.hidden || []
    var order = settings.order || []
    console.log("[LAB-DEBUG] init() hidden:", JSON.stringify(hidden), "order:", JSON.stringify(order))

    var items = []
    for (var i = 0; i < ALL_PAGES.length; i++) {
      if (hidden.indexOf(ALL_PAGES[i].uri) !== -1) {
        console.log("[LAB-DEBUG] init() skipping hidden:", ALL_PAGES[i].uri)
        continue
      }
      items.push({
        name: ALL_PAGES[i].name,
        desc: buildDesc(ALL_PAGES[i].uri),
        uri: ALL_PAGES[i].uri,
        pinned: false
      })
    }
    console.log("[LAB-DEBUG] init() items after filter:", items.length)

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
      console.log("[LAB-DEBUG] init() items after reorder:", items.length)
    }

    pinHelper.getList(function(pinnedList) {
      console.log("[LAB-DEBUG] init() pinHelper.getList result:", JSON.stringify(pinnedList))
      var pinnedUris = []
      for (var p = 0; p < pinnedList.length; p++) {
        pinnedUris.push(pinnedList[p].uri)
      }
      for (var k = 0; k < items.length; k++) {
        items[k].pinned = pinnedUris.indexOf(items[k].uri) !== -1
      }
      console.log("[LAB-DEBUG] init() final items:", JSON.stringify(items))

      if (instance) {
        instance.labItems = items
        instance.labStatus = "ok"
        console.log("[LAB-DEBUG] init() instance.labItems set, status:", instance.labStatus)
      } else {
        console.log("[LAB-DEBUG] init() instance is null!")
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

function togglePin(instance, idx, callback) {
  var pinHelper = require("./pin-helper.js")
  var items = instance.labItems
  if (!items || idx >= items.length) return
  var item = items[idx]
  if (item.pinned) {
    pinHelper.unpinPage(item.uri, function() {
      item.pinned = false
      instance.labItems = items.slice()
      if (callback) callback()
    })
  } else {
    pinHelper.pinPage(item.name, item.uri, function() {
      item.pinned = true
      instance.labItems = items.slice()
      if (callback) callback()
    })
  }
}

function deleteItem(instance, idx, callback) {
  var items = instance.labItems
  if (!items || idx >= items.length) return
  var uri = items[idx].uri
  getStorage(function(settings) {
    var hidden = settings.hidden || []
    if (hidden.indexOf(uri) === -1) {
      hidden.push(uri)
    }
    settings.hidden = hidden
    saveSettings(settings, function() {
      init(instance, callback)
    })
  })
}

export default {
  init: init,
  getVisibleItems: getVisibleItems,
  getStorage: getStorage,
  saveSettings: saveSettings,
  getAllPages: getAllPages,
  togglePin: togglePin,
  deleteItem: deleteItem
}