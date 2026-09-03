var LIST_KEY = "multi_file_demo_list"
var nextId = 1

function init(instance) {
  var storage = require("@system.storage")
  try {
    storage.get({
      key: LIST_KEY,
      success: function(data) {
        if (data) {
          try {
            var list = JSON.parse(data)
            if (list && list.length > 0) {
              instance.demoItems = list
              if (list.length > 0) {
                var lastId = list[list.length - 1].id
                nextId = parseInt(lastId) + 1
              }
            } else {
              instance.demoItems = []
            }
          } catch (e) {
            instance.demoItems = []
          }
        } else {
          instance.demoItems = []
        }
      },
      fail: function() {
        instance.demoItems = []
      }
    })
  } catch (e) {
    instance.demoItems = []
  }
}

function addItem(instance) {
  var item = {
    id: String(nextId),
    name: "Item " + nextId,
    time: getCurrentTime()
  }
  nextId++
  var items = instance.demoItems.slice()
  items.push(item)
  instance.demoItems = items
  saveList(items)
}

function removeItem(instance, id) {
  var items = instance.demoItems.slice()
  var newItems = []
  for (var i = 0; i < items.length; i++) {
    if (items[i].id !== id) {
      newItems.push(items[i])
    }
  }
  instance.demoItems = newItems
  saveList(newItems)
}

function clearAll(instance) {
  instance.demoItems = []
  nextId = 1
  saveList([])
}

function getCurrentTime() {
  var now = new Date()
  var h = now.getHours()
  var m = now.getMinutes()
  var s = now.getSeconds()
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
}

function saveList(items) {
  var storage = require("@system.storage")
  try {
    storage.set({
      key: LIST_KEY,
      value: JSON.stringify(items)
    })
  } catch (e) {
    console.log("[list] save failed: " + e)
  }
}

export default {
  init: init,
  addItem: addItem,
  removeItem: removeItem,
  clearAll: clearAll
}