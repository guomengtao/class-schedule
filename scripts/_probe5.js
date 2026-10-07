const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const adb = path.join(os.homedir(), '.vela/sdk/tools/adb/mac/adb');
const outFile = path.join(__dirname, '_probe4_out.txt');
const lines = [];

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 20000 }).trim(); }
  catch (e) {
    return 'ERR: ' + String(e.stderr || e.message || e).split('\n')[0];
  }
}

lines.push('=== vapp process ===');
lines.push(run(adb + ' -s emulator-5554 shell ps'));
lines.push('');

lines.push('=== screenshot via gRPC 8554 ===');
try {
  run('node ' + path.join(__dirname, 'emulator-eye.js') + ' shot 8554 /tmp/shot_after_vapp.png');
  const st = fs.statSync('/tmp/shot_after_vapp.png');
  lines.push('PNG size: ' + st.size + ' bytes');
} catch(e) {
  lines.push('ERR: ' + String(e).split('\n')[0]);
}
lines.push('');

lines.push('=== LVGL log tail ===');
try {
  const log = execSync('tail -20 /tmp/vela_emu_xiaomi_band.log 2>/dev/null', { encoding: 'utf8' }).trim();
  lines.push(log);
} catch(e) {
  lines.push('ERR: ' + String(e).split('\n')[0]);
}

fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log('DONE');