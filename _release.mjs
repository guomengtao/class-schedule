import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

process.chdir('/Users/Banner/Documents/guomengtao/tom/class/class');

const LOG = [];

function log(msg) {
  LOG.push(msg);
  console.log(msg);
}

function saveLog() {
  writeFileSync('/tmp/_release_log.txt', LOG.join('\n'));
}

try {
  log('=== Building release RPK ===');
  execSync('npx aiot release --enable-jsc', { stdio: 'inherit' });
  
  log('=== Checking RPK ===');
  const rpks = execSync('ls -la dist/*.rpk 2>/dev/null || echo "no rpk found"', { encoding: 'utf8' });
  log(rpks);
  
  log('ALLDONE');
  saveLog();
} catch(e) {
  log('ERROR: ' + e.message);
  saveLog();
  process.exit(1);
}