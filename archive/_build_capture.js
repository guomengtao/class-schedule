#!/usr/bin/env node
var cp = require("child_process");
var fs = require("fs");

try {
  var result = cp.execSync("aiot build", {
    cwd: "/Users/Banner/Documents/guomengtao/tom/class/class",
    encoding: "utf8",
    stdio: "pipe"
  });
  fs.writeFileSync("/Users/Banner/Documents/guomengtao/tom/class/class/.build_log.txt", "SUCCESS\n" + result, "utf8");
  console.log("OK");
} catch (e) {
  var msg = "FAILED\nSTDOUT: " + (e.stdout || "") + "\nSTDERR: " + (e.stderr || "");
  fs.writeFileSync("/Users/Banner/Documents/guomengtao/tom/class/class/.build_log.txt", msg, "utf8");
  console.log("FAIL");
}