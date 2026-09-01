var execSync = require("child_process").execSync
var fs = require("fs")

try {
  var stdout = execSync("npx aiot build", {
    cwd: "/Users/Banner/Documents/guomengtao/tom/class/class",
    encoding: "utf8",
    timeout: 120000,
    stdio: ["ignore", "pipe", "pipe"]
  })
  var output = "BUILD SUCCESS:\n" + stdout
  fs.writeFileSync("/Users/Banner/Documents/guomengtao/tom/class/class/build_result.txt", output)
} catch (e) {
  var output = "BUILD FAILED:\nSTDOUT: " + (e.stdout || "") + "\nSTDERR: " + (e.stderr || "") + "\nERROR: " + (e.message || "")
  fs.writeFileSync("/Users/Banner/Documents/guomengtao/tom/class/class/build_result.txt", output)
}