const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_probe_out.txt');

const candidates = [
  path.join(os.homedir(), '.vela', 'sdk', 'tools', 'adb', 'mac', 'adb'),
  path.join(__dirname, '..', 'node_modules', '@aiot-toolkit', 'emulator',
    'node_modules', '@miwt', 'adb', 'bin', 'mac', 'adb'),
];
let adb = 'adb';
for (const c of candidates) { try { fs.accessSync(c); adb = c; break; } catch (_) {} }

const lines = [];
function run(label, args) {
  try {
    const r = spawnSync(adb, args, { encoding: 'utf8', timeout: 30000 });
    lines.push(`== ${label} (rc=${r.status}) ==`);
    lines.push((r.stdout || '').trim());
    if (r.stderr) lines.push('[stderr] ' + (r.stderr || '').trim());
  } catch (e) {
    lines.push(`== ${label} == ERROR ${e.message}`);
  }
}

lines.push('ADB=' + adb);
run('adb devices', ['devices']);
const devs = (() => {
  const r = spawnSync(adb, ['devices'], { encoding: 'utf8', timeout: 30000 });
  return String(r.stdout || '');
})();
const serials = devs.split('\n').map(l => l.trim().split(/\s+/)[0]).filter(l => l.indexOf('emulator-') === 0 && l.length);
lines.push('SERIALS=' + serials.join(','));
for (const s of serials) {
  const grpc = parseInt(s.replace('emulator-', ''), 10) + 3000;
  lines.push(`SERIAL=${s} grpc=${grpc}`);
  const ps = spawnSync(adb, ['-s', s, 'shell', 'ps'], { encoding: 'utf8', timeout: 30000 });
  const hit = String(ps.stdout || '').split('\n').filter(l => l.indexOf('classschedule') >= 0 || /vapp/.test(l));
  lines.push(`  app-proc: ${hit.join(' | ') || '(none)'}`);
}

fs.writeFileSync(OUT, lines.join('\n'));
console.log('WROTE ' + OUT);