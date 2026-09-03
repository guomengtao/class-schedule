console.log("[module1] loading...")

function init(instance) {
  console.log("[module1] init called")
  instance.text1 = "模块1"
  console.log("[module1] text1 set to: " + instance.text1)
}

module.exports = {
  init: init
}

console.log("[module1] loaded successfully")