const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'check-result.txt');

try {
  const ps = execSync('/opt/homebrew/bin/adb -s emulator-5554 shell ps', {encoding:'utf8', timeout:10000});
  const lines = ps.split('\n').filter(l => /vapp|app\.com/i.test(l));
  fs.writeFileSync(out, 'VAPP_RUNNING: ' + (lines.length > 0 ? 'YES count=' + lines.length + '\n' + lines.join('\n') : 'NO'));
} catch(e) {
  fs.writeFileSync(out, 'VAPP_ERROR: ' + e.message);
}

try {
  const png = '/tmp/debug-check-now.png';
  if (fs.existsSync(png)) {
    const stat = fs.statSync(png);
    fs.appendFileSync(out, '\nPNG_EXISTS: YES size=' + stat.size + ' bytes');
  } else {
    fs.appendFileSync(out, '\nPNG_EXISTS: NO');
  }
} catch(e) {
  fs.appendFileSync(out, '\nPNG_CHECK_ERROR: ' + e.message);
}

console.log('DONE');