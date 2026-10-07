const { execSync } = require('child_process');
const adb = process.env.HOME + '/.vela/sdk/tools/adb/mac/adb';
function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }); } catch (e) { return 'ERR:' + String(e.message).split('\n')[0]; }
}
let out = [];
out.push('=== adb devices ===');
out.push(run(adb + ' devices'));
out.push('=== ps qemu avd ===');
const ps = run('ps aux');
ps.split('\n').filter(l => l.includes('qemu-system')).forEach(l => {
  const m = l.match(/-avd (\S+)/);
  out.push('  pid=' + l.trim().split(/\s+/)[1] + ' avd=' + (m ? m[1] : '?'));
});
out.push('=== emulator gRPC and console ports listening ===');
out.push(run("lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(8554|5554|5555|5556|8555|8558|8559|1005[0-9]) '") || 'NONE');
out.push('=== emulator serials avd name ===');
const devs = run(adb + ' devices');
devs.split('\n').filter(l => l.includes('emulator')).forEach(l => {
  const s = l.split(/\s+/)[0];
  if (s) out.push('  ' + s + ' -> ' + run(adb + ' -s ' + s + ' emu avd name').split('\n')[0]);
});
const fs = require('fs');
fs.writeFileSync('/Users/Banner/Documents/guomengtao/ev/class-schedule/scripts/_tmp_state.js', 'module.exports=' + JSON.stringify(out));
console.log('done');