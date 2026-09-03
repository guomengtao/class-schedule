console.log("[module2] loading...")

function init(instance) {
  console.log("[module2] init called")
  instance.text2 = "模块2"
  console.log("[module2] text2 set to: " + instance.text2)
}

module.exports = {
  init: init
}

console.log("[module2] loaded successfully")