var nextId = 1

function init(instance) {
  nextId = getSavedId()
  instance.items = getSavedItems()
}

function getSavedId() {
  var storage = require("@system.storage")
  var val = storage.getSync("lab_next_id")
  return val ? parseInt(val) : 1
}

function getSavedItems() {
  var storage = require("@system.storage")
  var val = storage.getSync("lab_items")
  return val ? JSON.parse(val) : []
}

function save(instance) {
  var storage = require("@system.storage")
  storage.setSync("lab_items", JSON.stringify(instance.items))
  storage.setSync("lab_next_id", String(nextId))
}

function addItem(instance) {
  var now = new Date()
  var timeStr = (now.getHours() < 10 ? "0" : "") + now.getHours() + ":" +
                (now.getMinutes() < 10 ? "0" : "") + now.getMinutes() + ":" +
                (now.getSeconds() < 10 ? "0" : "") + now.getSeconds()
  var item = {
    id: nextId,
    name: "Item " + nextId,
    time: timeStr
  }
  nextId++
  instance.items.push(item)
  save(instance)
}

function removeItem(instance, id) {
  instance.items = instance.items.filter(function(item) {
    return item.id !== id
  })
  save(instance)
}

function clearAll(instance) {
  instance.items = []
  nextId = 1
  save(instance)
}

export default {
  init: init,
  addItem: addItem,
  removeItem: removeItem,
  clearAll: clearAll
}