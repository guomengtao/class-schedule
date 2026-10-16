const { execSync } = require('child_process');
const fs = require('fs');

const logPath = '/tmp/mkdocs-build-result.txt';

try {
  execSync('lsof -ti:8900 | xargs kill -9 2>/dev/null || true', { shell: true });
} catch(e) {}

try {
  const out = execSync('cd /Users/Banner/Documents/guomengtao/ev/class-schedule && mkdocs build --strict 2>&1', {
    timeout: 120000,
    encoding: 'utf8',
    shell: '/bin/bash',
    env: { PATH: process.env.PATH, HOME: process.env.HOME }
  });
  fs.writeFileSync(logPath, 'BUILD_OK\n' + out.slice(-2000));
} catch(e) {
  fs.writeFileSync(logPath, 'BUILD_FAIL\n' + (e.stdout || '').slice(-2000) + '\n' + (e.stderr || '').slice(-2000));
}

const pageCheck = [];
const checks = [
  'site/page-doc-system-analysis/index.html',
  'site/pages/core/index.html',
  'site/pages/core/add-course.html',
];
for (const p of checks) {
  pageCheck.push((fs.existsSync('/Users/Banner/Documents/guomengtao/ev/class-schedule/' + p) ? '[OK] ' : '[MISS] ') + p);
}
fs.appendFileSync(logPath, '\n\n' + pageCheck.join('\n'));