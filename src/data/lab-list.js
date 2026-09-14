import storage from "@system.storage"
var STORAGE_KEY = "lab_settings"

var ALL_PAGES = [
  { name: "已钉首页",  uri: "/pages/pinned-pages" },
  { name: "二维码生成器", uri: "/pages/qrcode-generator" },
  { name: "震动实验室", uri: "/pages/vibration-lab" },
  { name: "打赏支持", uri: "/pages/donate" },
  { name: "课程表管理 V2", uri: "/pages/schedule-manager" },
  { name: "设备信息", uri: "/pages/device-info" },
  { name: "数据备份与恢复", uri: "/pages/backup-restore" },
  { name: "中文输入", uri: "/pages/chinese-input" },
  { name: "统计", uri: "/pages/statistics" },
  { name: "首页设置", uri: "/pages/homepage-settings" },
  { name: "周视图", uri: "/pages/week-view" },
  { name: "课程管理", uri: "/pages/course-manager" },
  { name: "激活", uri: "/pages/activation" },
  { name: "课表二维码", uri: "/pages/schedule-qrcode" },
  { name: "重置数据", uri: "/pages/reset-data" },
  { name: "昵称编辑", uri: "/pages/nickname-edit" },
  { name: "添加课程", uri: "/pages/add-course" },
  { name: "设置", uri: "/pages/settings" },
  { name: "胶囊屏隐藏测试", uri: "/pages/capsule-hide-test" },
  { name: "添加课程(胶囊)", uri: "/pages/lab-add-course" }
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