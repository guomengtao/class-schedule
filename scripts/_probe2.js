const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '..', '_preview_status.txt');

const adb = path.join(os.homedir(), '.vela', 'sdk', 'tools', 'adb', 'mac', 'adb');
const lines = [];
function run(label, args) {
  try {
    const r = spawnSync(adb, args, { encoding: 'utf8', timeout: 60000 });
    lines.push(`== ${label} (rc=${r.status}) ==\n${(r.stdout || '').trim()}\n${(r.stderr || '').trim()}`.trim());
  } catch (e) { lines.push(`== ${label} == ERROR ${e.message}`); }
}
run('adb devices', ['devices']);
run('ps classschedule', ['shell', 'ps', '']);
fs.writeFileSync(OUT, String(lines.join('\n\n')) + '\n');
console.log('WROTE_OK');