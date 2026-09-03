var counter = 0

function init(instance) {
  counter = getSavedCount()
  instance.counter = counter
}

function getSavedCount() {
  var storage = require("@system.storage")
  var val = storage.getSync("lab_counter")
  return val ? parseInt(val) : 0
}

function saveCount() {
  var storage = require("@system.storage")
  storage.setSync("lab_counter", String(counter))
}

function increment(instance) {
  counter++
  instance.counter = counter
  saveCount()
}

function decrement(instance) {
  counter--
  instance.counter = counter
  saveCount()
}

function reset(instance) {
  counter = 0
  instance.counter = counter
  saveCount()
}

export default {
  init: init,
  increment: increment,
  decrement: decrement,
  reset: reset
}