var fs = require("fs")
var path = require("path")
var execSync = require("child_process").execSync

var logFile = "/Users/Banner/Documents/guomengtao/tom/class/class/_jsc_test.txt"
var lines = []

var jscPath = "/Users/Banner/Documents/guomengtao/tom/class/class/node_modules/@aiot-toolkit/jsc/lib/jsc/darwin_aiotjsc"

lines.push("JSC path: " + jscPath)
lines.push("JSC exists: " + fs.existsSync(jscPath))

try {
  var stat = fs.statSync(jscPath)
  lines.push("JSC size: " + stat.size + " bytes")
} catch(e) {
  lines.push("JSC stat error: " + e.message)
}

lines.push("")

try {
  var output = execSync("file \"" + jscPath + "\"", { encoding: "utf8" })
  lines.push("file output: " + output.trim())
} catch(e) {
  lines.push("file command error: " + e.message)
}

lines.push("")

try {
  var output2 = execSync("arch -x86_64 \"" + jscPath + "\" --help 2>&1", { encoding: "utf8", timeout: 5000 })
  lines.push("JSC --help output: " + output2.trim())
} catch(e) {
  lines.push("JSC --help error: " + e.message)
  lines.push("JSC --help stderr: " + (e.stderr || ""))
}

var result = lines.join("\n")
fs.writeFileSync(logFile, result)
console.log("DONE - check " + logFile)