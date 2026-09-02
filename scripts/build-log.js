var fs = require("fs")
var execSync = require("child_process").execSync

var log = ""

try {
  log += "=== Starting build ===\n"
  var result = execSync("npx aiot build", {
    cwd: "/Users/Banner/Documents/guomengtao/tom/class/class",
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 120000,
    env: Object.assign({}, process.env, {
      TRAE_USER_CLOUDIDE_TOKEN_BLOB: "",
      USER_CLOUDIDE_TOKEN_BLOB: ""
    })
  })
  log += "=== stdout ===\n" + result + "\n"
  log += "=== Build succeeded ===\n"
} catch (e) {
  log += "=== stderr ===\n" + (e.stderr || "") + "\n"
  log += "=== stdout ===\n" + (e.stdout || "") + "\n"
  log += "=== Build failed ===\n" + e.message + "\n"
}

fs.writeFileSync("/Users/Banner/Documents/guomengtao/tom/class/class/build.log", log)
console.log("Build log written to build.log")