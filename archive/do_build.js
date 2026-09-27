#!/usr/bin/env node
var cp = require("child_process");
var fs = require("fs");
var path = require("path");

var projectDir = "/Users/Banner/Documents/guomengtao/tom/class/class";
var outFile = "/tmp/build_result_" + Date.now() + ".txt";

process.env.PATH = "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:" + (process.env.PATH || "");
process.env.HOME = process.env.HOME || "/Users/Banner";

// Clean env vars that cause issues
delete process.env.SU_EART_CLOUDIDE_TOKEN_BLOB;
delete process.env.SU_EARTUDIDE_TOKEN_BLOB;
// Delete other problematic vars
Object.keys(process.env).forEach(function(k) {
  if (k.indexOf("SU_EART") === 0 || k.indexOf("CLOUDIDE") >= 0) {
    delete process.env[k];
  }
});

try {
  console.log("Starting build at", new Date().toISOString());
  
  var result = cp.execFileSync(
    path.join(projectDir, "node_modules", ".bin", "aiot"),
    ["release", "--enable-jsc"],
    {
      cwd: projectDir,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000
    }
  );
  
  fs.writeFileSync(outFile, "BUILD SUCCESS:\n" + result);
  
  // List dist directory
  var distFiles = fs.readdirSync(path.join(projectDir, "dist"));
  fs.appendFileSync(outFile, "\n\ndist/ contents:\n");
  distFiles.forEach(function(f) { 
    var stat = fs.statSync(path.join(projectDir, "dist", f));
    fs.appendFileSync(outFile, "  " + f + " (" + stat.size + " bytes)\n");
  });
  
} catch (e) {
  var msg = "BUILD FAILED:\n";
  msg += "stdout: " + (e.stdout || "(none)") + "\n";
  msg += "stderr: " + (e.stderr || "(none)") + "\n";
  msg += "error: " + (e.message || e) + "\n";
  fs.writeFileSync(outFile, msg);
}

console.log("Output written to", outFile);
console.log(fs.readFileSync(outFile, "utf8"));