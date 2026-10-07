const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const adb = path.join(os.homedir(), '.vela/sdk/tools/adb/mac/adb');
const outFile = path.join(__dirname, '_probe4_out.txt');
const lines = [];

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 15000 }).trim(); }
  catch (e) {
    const msg = String(e.stderr || e.message || e).split('\n')[0];
    return 'ERR: ' + msg;
  }
}

// 1. adb devices
lines.push('=== adb devices ===');
lines.push(run(adb + ' devices'));
lines.push('');

// 2. qemu processes
lines.push('=== qemu-system processes ===');
const ps = run('ps aux');
ps.split('\n').filter(l => l.includes('qemu-system') && !l.includes('grep')).forEach(l => {
  lines.push(l.replace(/TRAE_USER_CLOUDIDE_TOKEN_BLOB=\S+/g, '[TOKEN_REDACTED]'));
});
lines.push('');

// 3. emulator gRPC ports
lines.push('=== emulator listen ports (grep TCP | emulator pid) ===');
lines.push(run("lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(8[0-9]{3}|10[0-9]{3})' | head -20"));
lines.push('');

// 4. emulator serial → avd name
lines.push('=== emulator serial → avd name ===');
const devs = run(adb + ' devices');
devs.split('\n').filter(l => l.includes('emulator')).forEach(l => {
  const s = l.split(/\s+/)[0];
  if (!s) return;
  const name = run(adb + ' -s ' + s + ' emu avd name');
  lines.push(s + ' → ' + name.split('\n')[0]);
});
lines.push('');

// 5. vapp process on any emulator
lines.push('=== vapp process on emulators ===');
devs.split('\n').filter(l => l.includes('emulator')).forEach(l => {
  const s = l.split(/\s+/)[0];
  if (!s) return;
  const ps2 = run(adb + ' -s ' + s + ' shell ps');
  lines.push('--- ' + s + ' ---');
  ps2.split('\n').filter(ll => /vapp|classschedule|quickapp/i.test(ll)).forEach(ll => {
    lines.push(ll);
  });
});
lines.push('');

fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log('WROTE ' + outFile);