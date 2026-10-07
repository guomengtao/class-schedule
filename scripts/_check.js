const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const adb = path.join(os.homedir(), '.vela/sdk/tools/adb/mac/adb');
const out = [];

function run(cmd, timeout = 15000) {
  try { return execSync(cmd, { encoding: 'utf8', timeout }).trim(); } catch(e) { return 'ERR'; }
}

out.push('=== [1] vapp process ===');
const ps = run(adb + ' -s emulator-5554 shell ps');
const vappLines = ps.split('\n').filter(l => /vapp|classschedule/i.test(l));
out.push(vappLines.length > 0 ? vappLines.join('\n') : 'NO VAPP PROCESS');

out.push('');
out.push('=== [2] screenshot ===');
const r = spawnSync('node', [path.join(__dirname, 'emulator-eye.js'), 'shot', '8554', '/tmp/shot_now.png'], {
  timeout: 30000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
});
out.push('stdout: ' + (r.stdout || '').split('\n').filter(l => l && !l.includes('BLOB')).join('; '));
out.push('stderr: ' + (r.stderr || '').split('\n').filter(l => l && !l.includes('BLOB')).join('; '));
try {
  const s = fs.statSync('/tmp/shot_now.png');
  out.push('PNG exists: ' + s.size + ' bytes');
} catch(e) {
  out.push('PNG missing');
}

out.push('');
out.push('=== [3] LVGL framebuffer log ===');
out.push(run('tail -15 /tmp/vela_emu_xiaomi_band.log'));

fs.writeFileSync(path.join(__dirname, '_status_final.txt'), out.join('\n'), 'utf8');
console.log('OK');