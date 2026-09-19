function safeParseJSON(str, fallback) {
  if (str === undefined || str === null || str === "") {
    return fallback !== undefined ? fallback : null
  }
  try {
    return JSON.parse(str)
  } catch (e) {
    console.error("[safeParseJSON] parse failed: " + (e.message || e) + ", input: " + String(str).substring(0, 80))
    return fallback !== undefined ? fallback : null
  }
}

// 尝试退出应用。不同快应用运行时暴露的退出入口不一致（exit / terminate / finish），
// 逐个探测，返回是否成功调用了其中一个。
// 注意：返回 true 仅表示"调用未抛异常"，不保证一定真正退出（部分运行时会最小化）。
function exitApp() {
  var app = null
  try {
    app = require("@system.app")
  } catch (e) {
    return false
  }
  if (!app) return false
  var methods = ["exit", "terminate", "finish"]
  for (var i = 0; i < methods.length; i++) {
    var name = methods[i]
    if (typeof app[name] === "function") {
      try {
        app[name]()
        return true
      } catch (e) {
        // 该入口在此运行时不可用，继续尝试下一个
      }
    }
  }
  return false
}

module.exports = {
  safeParseJSON: safeParseJSON,
  exitApp: exitApp
}