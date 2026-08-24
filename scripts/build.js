var execSync = require("child_process").execSync

var args = process.argv.slice(2).filter(function (arg) {
  return !arg.startsWith("--devtool")
})

var cmd = "aiot build " + args.join(" ")
console.log("Running: " + cmd)
execSync(cmd, { stdio: "inherit" })