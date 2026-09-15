const { execSync } = require('child_process');
const { writeFileSync } = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '__output.txt');
const LOG = [];

function log(msg) { LOG.push(msg); }

try {
  process.chdir(__dirname);
  log('CWD: ' + process.cwd());
  log('=== Building release RPK ===');
  
  const out = execSync('npx aiot release --enable-jsc', { encoding: 'utf8', stdio: 'pipe', maxBuffer: 50 * 1024 * 1024 });
  log(out);
  
  log('=== Checking dist ===');
  const ls = execSync('ls -la dist/', { encoding: 'utf8' });
  log(ls);
  
  log('=== Finding RPK files ===');
  const rpks = execSync("ls dist/*.rpk 2>/dev/null || echo 'NO RPK FOUND'", { encoding: 'utf8' });
  log(rpks);
  
  log('=== RPK sizes ===');
  execSync("for f in dist/*.rpk; do echo \"$f: $(stat -f%z \"$f\") bytes\"; done 2>/dev/null || true", { encoding: 'utf8', stdio: 'pipe' })
    .split('\n').filter(l => l.trim()).forEach(l => log(l));
  
  log('=== DONE ===');
  writeFileSync(LOG_PATH, LOG.join('\n'));
  process.exit(0);
} catch(e) {
  log('ERROR: ' + e.message);
  if (e.stdout) log('STDOUT: ' + e.stdout);
  if (e.stderr) log('STDERR: ' + e.stderr);
  writeFileSync(LOG_PATH, LOG.join('\n'));
  process.exit(1);
}