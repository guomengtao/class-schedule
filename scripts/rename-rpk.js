var fs = require("fs")
var path = require("path")

var distDir = path.join(__dirname, "..", "dist")
var version = require(path.join(__dirname, "..", "src", "data", "version"))

var files = fs.readdirSync(distDir)
  .filter(function(f) { return f.endsWith(".rpk") && !f.startsWith("ev-") })
  .sort()

if (files.length === 0) {
  console.log("No RPK found to rename")
  process.exit(0)
}

var src = path.join(distDir, files[files.length - 1])
var dst = path.join(distDir, "ev-v" + version.versionName + "-" + version.channel + ".rpk")

fs.copyFileSync(src, dst)
console.log("Channel package: ev-v" + version.versionName + "-" + version.channel + ".rpk")