var fs = require("fs")
var path = require("path")

var pagesDir = path.join(__dirname, "..", "src", "pages")
var dataDir = path.join(__dirname, "..", "src", "data")

console.log("=".repeat(60))
console.log("  钉首页数据检查脚本")
console.log("=".repeat(60))
console.log("")

var total = 0

function findPinToHome(dir) {
  var results = []
  try {
    var files = fs.readdirSync(dir)
    for (var i = 0; i < files.length; i++) {
      var fullPath = path.join(dir, files[i])
      var stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        results = results.concat(findPinToHome(fullPath))
      } else if (files[i].endsWith(".ux")) {
        var content = fs.readFileSync(fullPath, "utf-8")
        if (content.indexOf("pinToHome") !== -1) {
          var pinName = ""
          var pinUri = ""
          var nameMatch = content.match(/pinPage\("([^"]+)"\s*,\s*"([^"]+)"/)
          if (nameMatch) {
            pinName = nameMatch[1]
            pinUri = nameMatch[2]
          }
          var hasPinBtn = content.indexOf("pin-link") !== -1 || content.indexOf("pin-btn") !== -1
          results.push({
            file: path.relative(pagesDir, fullPath),
            pinName: pinName,
            pinUri: pinUri,
            hasPinButton: hasPinBtn
          })
        }
      }
    }
  } catch (e) {}
  return results
}

var pinnedPages = findPinToHome(pagesDir)

console.log("1. 支持钉首页的页面 (共 " + pinnedPages.length + " 个):")
console.log("")
for (var i = 0; i < pinnedPages.length; i++) {
  var p = pinnedPages[i]
  total++
  console.log("  [" + (i + 1) + "] " + p.pinName)
  console.log("      文件: " + p.file)
  console.log("      URI:  " + p.pinUri)
  console.log("      按钮: " + (p.hasPinButton ? "有 ✓" : "无 ✗"))
  console.log("")
}

console.log("")
console.log("2. 存储 key: pinned_pages")
console.log("   位置: @system.storage")
console.log("   格式: JSON 数组 [{name, uri}, ...]")
console.log("")

var pinHelperPath = path.join(dataDir, "pin-helper.js")
if (fs.existsSync(pinHelperPath)) {
  var pinHelperContent = fs.readFileSync(pinHelperPath, "utf-8")
  console.log("3. pin-helper.js 状态: 存在 ✓")
  console.log("   路径: src/data/pin-helper.js")
  console.log("   方法: pinPage(), isPinned(), getList()")
  console.log("")
} else {
  console.log("3. pin-helper.js 状态: 不存在 ✗")
  console.log("")
}

var indexPath = path.join(pagesDir, "index", "index.ux")
if (fs.existsSync(indexPath)) {
  var indexContent = fs.readFileSync(indexPath, "utf-8")
  var hasLoadPinned = indexContent.indexOf("loadPinnedPages") !== -1
  var hasPinHelper = indexContent.indexOf("pin-helper") !== -1
  var hasPinnedBar = indexContent.indexOf("pinned-bar") !== -1 || indexContent.indexOf("pinned-item") !== -1

  console.log("4. 首页加载钉页面状态:")
  console.log("   loadPinnedPages: " + (hasLoadPinned ? "有 ✓" : "无 ✗"))
  console.log("   pin-helper 引用: " + (hasPinHelper ? "有 ✓" : "无 ✗"))
  console.log("   钉页面 UI 区域: " + (hasPinnedBar ? "有 ✓" : "无 ✗"))
  console.log("")
}

console.log("=".repeat(60))
console.log("  总结")
console.log("=".repeat(60))
console.log("")
console.log("  支持钉首页的页面: " + total + " 个")
console.log("  存储数据格式:     [{name, uri}, ...]")
console.log("  存储 key:         pinned_pages")
console.log("")

var hasPinnedBar2 = false
try {
  var idx = fs.readFileSync(indexPath, "utf-8")
  hasPinnedBar2 = idx.indexOf("pinned-bar") !== -1 || idx.indexOf("pinned-item") !== -1
} catch (e) {}

if (hasPinnedBar2) {
  console.log("  ✅ 首页有钉页面展示区域")
} else {
  console.log("  ❌ 首页缺少钉页面展示区域！")
  console.log("     需要在 index.ux 中添加上下文：")
  console.log("     - 引入 pin-helper.js")
  console.log("     - 在 onShow() 中调用 loadPinnedPages()")
  console.log("     - 添加 pinned-bar 模板区域")
}
console.log("")
console.log("  💡 提示: 设备上的实际钉页面数据存储在 @system.storage")
console.log("     需要用真机/模拟器打开页面才能查看运行时数据")
console.log("")