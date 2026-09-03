console.log("[test-module] loading...")

function init(instance) {
  console.log("[test-module] init called")

  instance.method1 = function() {
    console.log("method1")
  }

  instance.method2 = function() {
    console.log("method2")
  }

  instance.method3 = function() {
    console.log("method3")
  }

  instance.method4 = function() {
    console.log("method4")
  }

  instance.method5 = function() {
    console.log("method5")
  }

  instance.method6 = function() {
    console.log("method6")
  }

  console.log("[test-module] init OK")
}

module.exports = {
  init: init
}

console.log("[test-module] loaded successfully")