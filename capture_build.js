#!/usr/bin/env node
var cp = require('child_process');
var fs = require('fs');

try {
  var result = cp.execSync('npx aiot release --enable-jsc', {
    cwd: '/Users/Banner/Documents/guomengtao/tom/class/class',
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000
  });
  fs.writeFileSync('/tmp/build_stdout.txt', result || '(empty stdout)');
  console.log('BUILD DONE');
} catch (e) {
  fs.writeFileSync('/tmp/build_stdout.txt', 'STDOUT: ' + (e.stdout || '') + '\nSTDERR: ' + (e.stderr || '') + '\nERROR: ' + e.message);
  console.log('BUILD FAILED');
}