var cp = require("child_process")
var fs = require("fs")

try {
  var result = cp.execSync("node scripts/build.js", {
    cwd: __dirname,
    encoding: "utf-8",
    timeout: 120000,
    stdio: "pipe"
  })
  fs.writeFileSync(__dirname + "/_build_output.txt", "SUCCESS:\n" + result, "utf-8")
} catch (e) {
  var output = "ERROR:\n" + (e.stdout || "") + "\n" + (e.stderr || "") + "\n" + (e.message || "")
  fs.writeFileSync(__dirname + "/_build_output.txt", output, "utf-8")
}