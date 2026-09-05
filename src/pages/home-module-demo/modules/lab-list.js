var storage = require("@system.storage")
var STORAGE_KEY = "lab_settings"

var ALL_PAGES = [
  { name: "📌 已钉首页",  uri: "/pages/pinned-pages" },
  { name: "🗄 数据表展示", uri: "/pages/storage-viewer" },
  { name: "🏠 首页模块版", uri: "/pages/home-module-demo" },
  { name: "📱 二维码生成器", uri: "/pages/qrcode-generator" },
  { name: "📳 震动实验室", uri: "/pages/vibration-lab" },
  { name: "☑️ 勾选 Demo", uri: "/pages/check-demo" },
  { name: "📅 课程表管理 V2", uri: "/pages/schedule-manager" },
  { name: "💻 设备信息", uri: "/pages/device-info" },
  { name: "🎵 手风琴 Demo", uri: "/pages/accordion-demo" },
  { name: "🧩 组件化测试", uri: "/pages/comp-demo" },
  { name: "📦 多模块加载测试", uri: "/pages/lab-module-test" },
  { name: "🏠 首页 Pro", uri: "/pages/home-pro" },
  { name: "📅 今日课程", uri: "/pages/today-demo" },
  { name: "📋 首页课程Demo", uri: "/pages/homepage-classes-demo" },
  { name: "🎭 弹窗遮罩 Demo", uri: "/pages/overlay-demo" },
  { name: "🖥 命令行 Debug", uri: "/pages/debug-demo" },
  { name: "🎭 遮罩模块测试", uri: "/pages/premium-test" },
  { name: "🪟 弹窗直接测试", uri: "/pages/overlay-test" },
  { name: "💾 数据备份与恢复", uri: "/pages/backup-restore" },
  { name: "🔤 中文输入", uri: "/pages/chinese-input" },
  { name: "📊 统计", uri: "/pages/statistics" },
  { name: "⚙️ 首页设置", uri: "/pages/homepage-settings" },
  { name: "📅 周视图", uri: "/pages/week-view" },
  { name: "📋 课程管理", uri: "/pages/course-manager" },
  { name: "🔑 激活", uri: "/pages/activation" },
  { name: "📅 课表二维码", uri: "/pages/schedule-qrcode" },
  { name: "🔄 重置数据", uri: "/pages/reset-data" },
  { name: "✏️ 昵称编辑", uri: "/pages/nickname-edit" },
  { name: "📋 课程详情", uri: "/pages/detail" },
  { name: "⚙️ 设置", uri: "/pages/settings" }
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
  var pinHelper = require("../../../data/pin-helper.js")

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

function getAvailablePages(activeItems, callback) {
  var activeUris = []
  for (var i = 0; i < activeItems.length; i++) {
    activeUris.push(activeItems[i].uri)
  }

  getStorage(function(settings) {
    var hidden = settings.hidden || []
    var available = []
    for (var j = 0; j < ALL_PAGES.length; j++) {
      if (activeUris.indexOf(ALL_PAGES[j].uri) === -1 && hidden.indexOf(ALL_PAGES[j].uri) === -1) {
        available.push({
          name: ALL_PAGES[j].name,
          desc: buildDesc(ALL_PAGES[j].uri),
          uri: ALL_PAGES[j].uri
        })
      }
    }
    if (callback) callback(available)
  })
}

function togglePin(instance, idx, callback) {
  var pinHelper = require("../../../data/pin-helper.js")
  var item = instance.labItems[idx]
  if (!item) return

  if (item.pinned) {
    pinHelper.unpinPage(item.uri, function() {
      item.pinned = false
      if (callback) callback()
    })
  } else {
    pinHelper.pinPage(item.name, item.uri, function() {
      item.pinned = true
      if (callback) callback()
    })
  }
}

function moveUp(instance, idx) {
  if (idx <= 0) return
  var items = instance.labItems
  var tmp = items[idx]
  items.splice(idx, 1)
  items.splice(idx - 1, 0, tmp)
  persistOrder(instance)
}

function moveDown(instance, idx) {
  var items = instance.labItems
  if (idx >= items.length - 1) return
  var tmp = items[idx]
  items.splice(idx, 1)
  items.splice(idx + 1, 0, tmp)
  persistOrder(instance)
}

function persistOrder(instance) {
  getStorage(function(settings) {
    var order = []
    for (var i = 0; i < instance.labItems.length; i++) {
      order.push(instance.labItems[i].uri)
    }
    saveSettings({ hidden: settings.hidden || [], order: order })
  })
}

function deleteItem(instance, idx, callback) {
  var items = instance.labItems
  if (idx < 0 || idx >= items.length) return
  var uri = items[idx].uri

  getStorage(function(settings) {
    var hidden = settings.hidden || []
    if (hidden.indexOf(uri) === -1) {
      hidden.push(uri)
    }
    var order = []
    for (var i = 0; i < items.length; i++) {
      order.push(items[i].uri)
    }
    saveSettings({ hidden: hidden, order: order }, function() {
      items.splice(idx, 1)
      if (callback) callback()
    })
  })
}

function addItem(instance, uri, callback) {
  getStorage(function(settings) {
    var hidden = settings.hidden || []
    var idx = hidden.indexOf(uri)
    if (idx !== -1) {
      hidden.splice(idx, 1)
    }
    saveSettings({ hidden: hidden, order: settings.order || [] }, function() {
      for (var i = 0; i < ALL_PAGES.length; i++) {
        if (ALL_PAGES[i].uri === uri) {
          var newItem = {
            name: ALL_PAGES[i].name,
            desc: buildDesc(uri),
            uri: uri,
            pinned: false
          }
          instance.labItems.push(newItem)
          break
        }
      }
      if (callback) callback()
    })
  })
}

module.exports = {
  init: init,
  getItems: function() { return ALL_PAGES },
  togglePin: togglePin,
  moveUp: moveUp,
  moveDown: moveDown,
  deleteItem: deleteItem,
  addItem: addItem,
  getAvailablePages: getAvailablePages
}