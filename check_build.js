#!/usr/bin/env node
var fs = require("fs");
var path = require("path");

var distDir = path.join(__dirname, "dist");
console.log("=== dist/ directory contents ===");
try {
  var files = fs.readdirSync(distDir);
  files.forEach(function(f) {
    var stat = fs.statSync(path.join(distDir, f));
    console.log("  " + f + " (" + (stat.size / 1024).toFixed(1) + " KB)");
  });
} catch(e) {
  console.log("  ERROR: " + e.message);
}

console.log("\n=== Checking for release RPK ===");
// Look for release rpk
var releaseFiles = files.filter(function(f) { return f.indexOf(".release.") >= 0; });
if (releaseFiles.length > 0) {
  console.log("  FOUND: " + releaseFiles.join(", "));
} else {
  console.log("  No release RPK found");
}

// Look for any rpk
var rpkFiles = files.filter(function(f) { return f.endsWith(".rpk"); });
if (rpkFiles.length > 0) {
  console.log("\n  All RPK files: " + JSON.stringify(rpkFiles));
}

// Show manifest.json version
var manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "src", "manifest.json"), "utf8"));
console.log("\n=== Current version ===");
console.log("  versionName: " + manifest.versionName);
console.log("  versionCode: " + manifest.versionCode);