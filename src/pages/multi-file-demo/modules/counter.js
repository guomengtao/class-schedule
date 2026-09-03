var COUNT_KEY = "multi_file_demo_counter"

function init(instance) {
  var storage = require("@system.storage")
  try {
    storage.get({
      key: COUNT_KEY,
      success: function(data) {
        instance.counter = parseInt(data) || 0
      },
      fail: function() {
        instance.counter = 0
      }
    })
  } catch (e) {
    instance.counter = 0
  }
}

function increment(instance) {
  instance.counter++
  saveCounter(instance.counter)
}

function decrement(instance) {
  if (instance.counter > 0) {
    instance.counter--
    saveCounter(instance.counter)
  }
}

function reset(instance) {
  instance.counter = 0
  saveCounter(instance.counter)
}

function saveCounter(value) {
  var storage = require("@system.storage")
  try {
    storage.set({
      key: COUNT_KEY,
      value: String(value)
    })
  } catch (e) {
    console.log("[counter] save failed: " + e)
  }
}

export default {
  init: init,
  increment: increment,
  decrement: decrement,
  reset: reset
}