var storage = require("@system.storage")
var INBOX_KEY = "ev_chat_inbox"
var MAX_ITEMS = 50

function getInbox(callback) {
  storage.get({
    key: INBOX_KEY,
    success: function (val) {
      var list = []
      try { list = JSON.parse(val || "[]") } catch (e) { list = [] }
      if (typeof callback === "function") { callback(list) }
    },
    fail: function () {
      if (typeof callback === "function") { callback([]) }
    }
  })
}

function saveInbox(list, callback) {
  storage.set({
    key: INBOX_KEY,
    value: JSON.stringify(list),
    success: function () {
      if (typeof callback === "function") { callback(true) }
    },
    fail: function () {
      if (typeof callback === "function") { callback(false) }
    }
  })
}

function updateItem(id, updater, callback) {
  getInbox(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        updater(list[i])
        break
      }
    }
    saveInbox(list, callback)
  })
}

function toggleRead(id, callback) {
  updateItem(id, function (item) {
    item.read = !item.read
  }, callback)
}

function deleteItem(id, callback) {
  getInbox(function (list) {
    var filtered = []
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) {
        filtered.push(list[i])
      }
    }
    saveInbox(filtered, callback)
  })
}

function clearAll(callback) {
  saveInbox([], callback)
}

function unreadCount(list) {
  if (!list || !list.length) return 0
  var n = 0
  for (var i = 0; i < list.length; i++) {
    if (!list[i].read) n++
  }
  return n
}

function formatTime(ts) {
  var d = new Date(ts)
  var y = d.getFullYear()
  var M = d.getMonth() + 1
  var day = d.getDate()
  var h = d.getHours()
  var m = d.getMinutes()
  if (M < 10) M = "0" + M
  if (day < 10) day = "0" + day
  if (h < 10) h = "0" + h
  if (m < 10) m = "0" + m
  return y + "-" + M + "-" + day + " " + h + ":" + m
}

module.exports = {
  getInbox: getInbox,
  toggleRead: toggleRead,
  deleteItem: deleteItem,
  clearAll: clearAll,
  unreadCount: unreadCount,
  formatTime: formatTime,
  MAX_ITEMS: MAX_ITEMS
}