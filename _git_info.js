var cp = require("child_process");
var fs = require("fs");

try {
  var result = cp.execSync("git log --oneline -n 10 && echo '---' && git diff --stat", {
    cwd: "/Users/Banner/Documents/guomengtao/tom/class/class",
    encoding: "utf8",
    stdio: "pipe"
  });
  fs.writeFileSync("/Users/Banner/Documents/guomengtao/tom/class/class/.git_info.txt", result, "utf8");
  console.log("OK");
} catch (e) {
  fs.writeFileSync("/Users/Banner/Documents/guomengtao/tom/class/class/.git_info.txt", "ERROR: " + (e.stderr || e.message), "utf8");
  console.log("FAIL");
}