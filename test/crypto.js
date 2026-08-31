const crypto = require("../lib/crypto");

var C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m"
};

function color(c, s) { return c + s + C.reset; }
function green(s) { return color(C.green, s); }
function yellow(s) { return color(C.yellow, s); }
function cyan(s) { return color(C.cyan, s); }
function red(s) { return color(C.red, s); }
function bold(s) { return color(C.bold, s); }

var input = process.argv[2];

if (!input) {
  console.log("");
  console.log("  " + red("Usage: node test/crypto.js <12-char-string>"));
  console.log("");
  console.log("  " + bold("Format: 2 digits + 4 uppercase/digits + 2 digits + 4 mixed case"));
  console.log("  " + bold("Example: node test/crypto.js 98ASDF39aA4D"));
  console.log("");
  process.exit(1);
}

var cleaned = input.replace(/\s/g, "");

var parsed = crypto.parseInput12(cleaned);
if (!parsed) {
  console.log("");
  console.log("  " + red("ERROR: Invalid input format."));
  console.log("  Expected: 12 characters (2 digits + 4 uppercase alphanumeric + 2 digits + 4 mixed case)");
  console.log("  Example: 98ASDF39aA4D");
  console.log("");
  process.exit(1);
}

var code = crypto.generateActivationCode(cleaned);
if (!code) {
  console.log("");
  console.log("  " + red("ERROR: Failed to generate activation code."));
  console.log("");
  process.exit(1);
}

var formatted = crypto.fmtCode18(code);
console.log("");
console.log("  " + bold("加密结果: ") + bold(yellow(formatted)));

var result = crypto.decryptActivationCode(code);
var decrypted = result.original;
console.log("  " + bold("解密结果: ") + bold(cyan(decrypted)));

var match = decrypted === cleaned;
console.log("  " + bold("对比一致 ") + (match ? green("✓") : red("✗")));
console.log("");

if (!match) {
  console.log("  " + red("Round-trip verification FAILED!"));
  console.log("  " + dim("  expected: " + cleaned));
  console.log("  " + dim("  got:      " + decrypted));
  console.log("");
  process.exit(1);
}

process.exit(0);