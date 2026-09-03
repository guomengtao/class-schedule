console.log("[module3] loading...")

function init(instance) {
  console.log("[module3] init called")
  instance.text3 = "模块3- ok-1"
  console.log("[module3] text3 set to: " + instance.text3)
}

module.exports = {
  init: init
}

console.log("[module3] loaded successfully")