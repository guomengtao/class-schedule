var fs = require("fs")
var path = require("path")

var projectRoot = "/Users/Banner/Documents/guomengtao/tom/class/class"
var outputFile = path.join(projectRoot, "_rpk_check_result.txt")
var lines = []

function getDirSize(dirPath) {
  var total = 0
  if (!fs.existsSync(dirPath)) return 0
  var files = fs.readdirSync(dirPath)
  for (var i = 0; i < files.length; i++) {
    var fullPath = path.join(dirPath, files[i])
    var stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      total += getDirSize(fullPath)
    } else {
      total += stat.size
    }
  }
  return total
}

lines.push("=== RPK Check Results ===")
lines.push("")

// Check RPK files in dist/
var distDir = path.join(projectRoot, "dist")
if (fs.existsSync(distDir)) {
  var files = fs.readdirSync(distDir)
  for (var i = 0; i < files.length; i++) {
    var f = files[i]
    if (f.endsWith(".rpk")) {
      var fullPath = path.join(distDir, f)
      var stat = fs.statSync(fullPath)
      var sizeKB = (stat.size / 1024).toFixed(2)
      var sizeMB = (stat.size / 1024 / 1024).toFixed(2)
      lines.push("RPK: " + f)
      lines.push("  Size: " + stat.size + " bytes = " + sizeKB + " KB = " + sizeMB + " MB")
      if (parseFloat(sizeMB) > 1) {
        lines.push("  *** WARNING: RPK > 1MB! ***")
      } else {
        lines.push("  OK: RPK <= 1MB")
      }
    }
  }
} else {
  lines.push("dist/ not found")
}

lines.push("")

// Check extracted _rpk_check/
var checkDir = path.join(projectRoot, "_rpk_check")
if (fs.existsSync(checkDir)) {
  var extractedSize = getDirSize(checkDir)
  var sizeKB2 = (extractedSize / 1024).toFixed(2)
  var sizeMB2 = (extractedSize / 1024 / 1024).toFixed(2)
  lines.push("Extracted (_rpk_check/): " + extractedSize + " bytes = " + sizeKB2 + " KB = " + sizeMB2 + " MB")
  if (parseFloat(sizeMB2) > 2) {
    lines.push("*** WARNING: Extracted > 2MB! ***")
  } else {
    lines.push("OK: Extracted <= 2MB")
  }
} else {
  lines.push("_rpk_check/ not found")
}

var result = lines.join("\n")
fs.writeFileSync(outputFile, result)
console.log("CHECK_DONE")
console.log(result)