#!/usr/bin/env node
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

process.env.TRAE_USER_CLOUDIDE_TOKEN_BLOB = '';

console.log('=== KILLING PORT 8900 ===');
try { execSync('lsof -ti:8900 | xargs kill -9 2>/dev/null || true', { shell: true, stdio: 'pipe' }); } catch(e) {}

const start = Date.now();
console.log('=== BUILDING ===');
const result = spawnSync('mkdocs', ['build', '--strict'], {
  cwd: '/Users/Banner/Documents/guomengtao/ev/class-schedule',
  stdio: 'pipe',
  timeout: 90000,
  env: { ...process.env, TRAE_USER_CLOUDIDE_TOKEN_BLOB: '', PATH: process.env.PATH }
});
console.log('Duration:', Date.now() - start, 'ms');
console.log('Exit:', result.status);
if (result.stdout) console.log(result.stdout.toString().slice(-500));
if (result.stderr) console.log(result.stderr.toString().slice(-500));

console.log('\n=== VERIFY ===');
if (fs.existsSync('/Users/Banner/Documents/guomengtao/ev/class-schedule/site/page-doc-system-analysis/index.html')) {
  console.log('[OK] page-doc-system-analysis');
} else {
  console.log('[MISS] page-doc-system-analysis');
}
if (fs.existsSync('/Users/Banner/Documents/guomengtao/ev/class-schedule/site/pages/core/index.html')) {
  console.log('[OK] pages/core/index');
} else {
  console.log('[MISS] pages/core/index');
}

console.log('\n=== DONE ===');