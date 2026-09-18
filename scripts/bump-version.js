var fs = require("fs")
var path = require("path")

var manifestPath = path.join(__dirname, "..", "src", "manifest.json")
var versionPath = path.join(__dirname, "..", "src", "data", "version.js")

var manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))

var parts = manifest.versionName.split(".")
var major = parseInt(parts[0])
var minor = parseInt(parts[1])
var patch = parseInt(parts[2]) + 1

var newVersionName = major + "." + minor + "." + patch
var newVersionCode = manifest.versionCode + 1

var oldVersionName = manifest.versionName
var oldVersionCode = manifest.versionCode

manifest.versionName = newVersionName
manifest.versionCode = newVersionCode
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")

var channel = "t-9p-d"
try {
  var oldContent = fs.readFileSync(versionPath, "utf8")
  var match = oldContent.match(/channel:\s*"([^"]+)"/)
  if (match) channel = match[1]
} catch (e) {}
var versionContent = "module.exports = { versionName: \"" + newVersionName + "\", versionCode: " + newVersionCode + ", channel: \"" + channel + "\" }\n"
fs.writeFileSync(versionPath, versionContent)

console.log("Version bumped: " + oldVersionName + " -> " + newVersionName)
console.log("Version code: " + oldVersionCode + " -> " + newVersionCode)