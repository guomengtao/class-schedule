#!/usr/bin/env node
/*
 * relaunch.js —— AIoT「调试/运行」黑屏兜底工具（宿主侧，无 --jsdebugger）
 *
 * 背景：IDE「调试」一键部署到最后一步，永远在设备端执行
 *     adb shell vapp --jsdebugger=10.0.2.15:101 app/<pkg> &
 * 导致黑屏的元凶（详见 docs/emulator-black-screen.md）：
 *   1) 设备端 `&` + adb 会话断开 → vapp 进程被 SIGHUP 掉，进程起不来；
 *   2) `--jsdebugger` 让引擎等 CDP 调试器连接（vapp 实为 aiotjs），等不到就黑屏。
 * 另外实测：
 *   - 仅手动部署 rpk 而解压目录缺失时，vapp 同样无法启动（进程秒退、黑屏）；
 *   - **debug 包（enableJsc=false，明文 JS）在宿主侧无 --jsdebugger 启动后，
 *     进程会起来但持续纯黑，无法独立渲染**——这正是项目规则「禁用 debug 包、
 *     用 release + --enable-jsc」的原因。
 *
 * 本工具是完整的宿主侧自愈兜底：
 *   步骤1 选 rpk（默认最新）；步骤2 push + 解压（补全 IDE 缺失的部署步骤）
 *   步骤3 清设备端旧 vapp 进程；步骤4 宿主后台 detached 启动
 *     `adb shell vapp app/<pkg>`（前台、无 &、无 --jsdebugger）
 *   步骤5 复查进程 + 截屏按 PNG 大小判断是否仍黑屏。
 *   兜底（autorelease）：以 debug 包启动仍黑屏时，自动切换到 release 包重试
 *     —— 优先用 dist 里已存在的 release 包；没有就自动 `npm run release` 构建，
 *     再重新部署 + 启动 + 验证。
 *
 * 用法：
 *   npm run relaunch
 *   node scripts/relaunch.js                        # 自动识别在建 emulator
 *   node scripts/relaunch.js --serial=emulator-5558
 *   node scripts/relaunch.js --rpk=./dist/xxx.rpk   # 指定 rpk（建议绝对路径）
 *   node scripts/relaunch.js --no-fix               # 黑屏时不自动切 release，只给提示
 *   node scripts/relaunch.js --auto-restart         # 最终兜底：release 仍黑屏时重启模拟器再试
 */
'use strict';

const { spawn, spawnSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PKG = 'com.application.watch.classschedule';
const APP_DIR = `/data/quickapp/app/${PKG}`;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// ---------- ADB 路径解析（与 emu-start.sh 同源） ----------
function resolveAdb() {
  const candidates = [
    path.join(os.homedir(), '.vela', 'sdk', 'tools', 'adb', 'mac', 'adb'),
    path.join(__dirname, '..', 'node_modules', '@aiot-toolkit', 'emulator',
      'node_modules', '@miwt', 'adb', 'bin', 'mac', 'adb'),
  ];
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); return c; } catch (_) {}
  }
  return 'adb';
}

function adbSync(adb, args, opts = {}) {
  try { return spawnSync(adb, args, { encoding: 'utf8', timeout: 30000, ...opts }).stdout || ''; }
  catch (_) { return ''; }
}

// 自动找一个已含本包 rpk、guest 存活的 emulator
function autoSerial(adb) {
  const lines = adbSync(adb, ['devices']).split('\n');
  const serials = [];
  for (const ln of lines) {
    const p = ln.trim().split(/\s+/);
    if (p.length >= 2 && p[0].startsWith('emulator-') && p[1] === 'device') serials.push(p[0]);
  }
  serials.sort();
  for (const s of serials) {
    if (adbSync(adb, ['-s', s, 'shell', 'ls', APP_DIR]).includes(PKG)) return s;
  }
  return serials[0] || '';
}

// 取 dist 里最新的 rpk；explicit 优先
function newestRpk(explicit) {
  if (explicit) return fs.existsSync(explicit) ? explicit : null;
  let best = null, bestM = 0;
  for (const f of fs.readdirSync(DIST_DIR)) {
    if (!f.endsWith('.rpk')) continue;
    const p = path.join(DIST_DIR, f);
    const m = fs.statSync(p).mtimeMs;
    if (m > bestM) { bestM = m; best = p; }
  }
  return best;
}

const isDebugRpk = (name) => /\.debug\./.test(path.basename(name));

// 选 release 包：优先独立命名（.release. / ev-v），其次排除 debug 的任意包
function releaseRpk() {
  let names = [];
  try { names = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith('.rpk')); } catch (_) {}
  const byName = [
    names.filter((f) => /\.release\./.test(f)),
    names.filter((f) => /^ev-v/.test(f)),
    names.filter((f) => !/\.debug\./.test(f)),
  ];
  for (const arr of byName) {
    if (arr.length) return path.join(DIST_DIR, arr[arr.length - 1]);
  }
  return null;
}

// 安装 rpk：push + mkdir + 解压（等价于 IDE 部署的前半段，确保解压目录齐全）
function install(adb, serial, rpk) {
  adbSync(adb, ['-s', serial, 'push', rpk, `${APP_DIR}.rpk`]);
  adbSync(adb, ['-s', serial, 'shell', 'mkdir', '-p', APP_DIR]);
  adbSync(adb, ['-s', serial, 'shell', 'unzip', '-o', `${APP_DIR}.rpk`, '-d', APP_DIR]);
  const ok = adbSync(adb, ['-s', serial, 'shell', 'ls', APP_DIR]).length > 0;
  return ok;
}

// 清理设备端本包的旧 vapp 进程
function killOld(adb, serial) {
  const ps = adbSync(adb, ['-s', serial, 'shell', 'ps']);
  const pids = new Set();
  for (const ln of ps.split('\n')) {
    const t = ln.trim();
    if (t.includes(PKG) && /vapp|aiotjs|quickapp/.test(t)) {
      const id = t.split(/\s+/)[0];
      if (/^\d+$/.test(id)) pids.add(id);
    }
  }
  for (const pid of pids) adbSync(adb, ['-s', serial, 'shell', 'kill', pid], { stdio: 'ignore' });
  adbSync(adb, ['-s', serial, 'shell', 'pkill', 'vapp'], { stdio: 'ignore' });
  return pids.size;
}

// 宿主侧后台、前台、无 --jsdebugger 启动（detached + unref 保证存活）
function launch(adb, serial) {
  const child = spawn(adb, ['-s', serial, 'shell', 'vapp', 'app', PKG], {
    detached: true, stdio: 'ignore',
  });
  child.unref();
}

function isRunning(adb, serial) {
  const ps = adbSync(adb, ['-s', serial, 'shell', 'ps']);
  return ps.split('\n').some((l) => l.includes(PKG));
}

// 最多等 n 秒，直到 App 进程出现；返回是否等到
function waitForProcess(adb, serial, n) {
  for (let i = 0; i < n; i++) {
    spawnSync('sleep', ['1'], { stdio: 'ignore' });
    if (isRunning(adb, serial)) return true;
  }
  return false;
}

// 用截屏 PNG 字节数判断是否仍黑屏（纯黑 ≈ 1.3KB，有内容明显更大）
function shotSize(serial, outPng) {
  const grpcPort = parseInt(serial.replace('emulator-', ''), 10) + 3000;
  const s = path.join(__dirname, 'emulator-eye.js');
  try {
    spawnSync(process.execPath, [s, 'shot', String(grpcPort), outPng], { timeout: 30000, stdio: 'ignore' });
    const st = fs.statSync(outPng);
    return st.size;
  } catch (_) { return 0; }
}

// 部署 + 启动 + 校验一整轮；返回 { ok, size }（ok 是否渲染成功）
function deployAndVerify(adb, serial, rpkPath) {
  console.log(`[1/5] 安装 rpk：${path.basename(rpkPath)}（push + 解压兜底）…`);
  const installed = install(adb, serial, rpkPath);
  console.log(`  → 解压目录 ${installed ? '就绪' : '缺失（仍尝试启动）'}：${APP_DIR}`);

  console.log('[2/5] 清理设备端旧 vapp 进程…');
  console.log(`  → 清理 ${killOld(adb, serial)} 个`);

  console.log('[3/5] 宿主侧后台启动（无 --jsdebugger、无 &）…');
  launch(adb, serial);

  console.log('[4/5] 等待进程并复查…');
  let ok = waitForProcess(adb, serial, 12);
  if (!ok) {
    // 兜底一：首次未见进程 → 清进程 + 重启一次（可能是首启慢 / 被 IDE 残留抢占）
    console.log('[_] 首次未见进程 → 二次兜底重启（清残留 + 重新 launch）…');
    killOld(adb, serial);
    launch(adb, serial);
    ok = waitForProcess(adb, serial, 12);
  }
  if (!ok) return { ok: false, size: 0 };

  // 兜底二：进程在但画面纯黑 → 最多重截 3 次，每次等 5s（App 冷启动渲染可能偏慢）
  const outPng = path.join('/tmp', `relaunch-${serial}.png`);
  let size = shotSize(serial, outPng);
  let tries = 0;
  while (size > 0 && size < 4000 && tries < 3) {
    tries++;
    console.log(`[_] 第 ${tries} 次截屏仍偏黑（PNG ${size}B），再等 5s 重截…`);
    spawnSync('sleep', ['5'], { stdio: 'ignore' });
    size = shotSize(serial, outPng);
  }
  return { ok: size > 0 && size >= 4000, size };
}

// 最终兜底（--auto-restart 时才启用）：停+重启目标 AVD，重新解析 serial，重装 release 并验证。
// 当 debug/release 进程都活着、画面仍黑屏（quickapp 未绑到模拟器显示层）时使用——重启模拟器可
// 清掉显示/资源抢占问题；借 emu-start.sh 的 stop/start，保证 guest adb 健康后再部署。
function restartEmulatorRetry(adb, serial, rpkPath) {
  const sh = path.join(__dirname, 'emu-start.sh');
  const name = String(adbSync(adb, ['-s', serial, 'emu', 'avd', 'name'])).trim().split('\n')[0] || 'xiaomi_band';
  console.log(`[_] 最终兜底(--auto-restart)：重启 AVD=${name}（stop → start，模拟器显示层重启）…`);
  spawnSync('bash', [sh, 'stop', name], { stdio: 'inherit', timeout: 60000 });
  spawnSync('sleep', ['3'], { stdio: 'ignore' });

  // start（内部最多等 guest 60s 就绪），从 stdout 解析新 serial；失败则回头扫 adb devices
  let newSerial = '';
  for (let i = 0; i < 3 && !newSerial; i++) {
    const out = spawnSync('bash', [sh, 'start', name], { encoding: 'utf8', timeout: 220000 });
    const m = String(out.stdout).match(/\[OK\]\s+\S+\s*→\s*(emulator-\d+)/);
    if (m) newSerial = m[1];
    if (!newSerial) {
      for (const ln of adbSync(adb, ['devices']).split('\n')) {
        const p = ln.trim().split(/\s+/);
        if (p.length >= 2 && p[0].startsWith('emulator-') && p[1] === 'device' &&
            adbSync(adb, ['-s', p[0], 'emu', 'avd', 'name']).trim().startsWith(name)) newSerial = p[0];
        if (newSerial) break;
      }
    }
    if (!newSerial) spawnSync('sleep', ['4'], { stdio: 'ignore' });
  }
  if (!newSerial) { console.log('[_] 重启后仍未能识别新 serial，放弃。'); return { ok: false, size: 0 }; }
  console.log(`[_] 重启完成，新 serial=${newSerial}，重装 ${path.basename(rpkPath)} 并验证…\n`);
  return deployAndVerify(adb, newSerial, rpkPath);
}

// release 构建（enable-jsc，符合项目规则）：走 npm run release
function buildRelease() {
  console.log('[*] 自动构建 release 包（npm run release，--enable-jsc）…');
  const r = spawnSync('npm', ['run', 'release'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_OPTIONS: '' },
    encoding: 'utf8', timeout: 300000,
  });
  if (r.status !== 0) {
    console.log('[_] release 构建失败：');
    console.log(String(r.stderr || r.stdout || '（无输出）').slice(-2000));
    return null;
  }
  const rpk = newestRpk('');
  return rpk && !isDebugRpk(rpk) ? rpk : rpk;
}

function main() {
  let serial = '', rpk = '', autoFix = true, autoRestart = false;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--serial=')) serial = a.split('=')[1];
    if (a.startsWith('--rpk=')) rpk = a.split('=')[1];
    if (a === '--no-fix') autoFix = false;
    if (a === '--auto-restart') autoRestart = true;
  }
  const adb = resolveAdb();

  if (!serial) serial = autoSerial(adb);
  if (!serial) {
    console.log('[_] 未找到在建 emulator（adb devices 无 emulator-*）。请先用 scripts/emu-start.sh start 启动。');
    process.exit(1);
  }

  let rpkPath = rpk || newestRpk(rpk);
  if (!rpkPath || !fs.existsSync(rpkPath)) {
    console.log('[_] dist/ 下没有 rpk。请先构建：npm run build:dev 或 npm run release。');
    process.exit(1);
  }

  const grpcPort = parseInt(serial.replace('emulator-', ''), 10) + 3000;
  console.log(`[*] adb      = ${adb}`);
  console.log(`[*] serial   = ${serial}（gRPC 截屏端口 ${grpcPort}）`);
  console.log(`[*] rpk      = ${rpkPath}（${isDebugRpk(rpkPath) ? 'DEBUG' : 'release'}）`);

  let result = deployAndVerify(adb, serial, rpkPath);

  // 兜底三（autorelease）：debug 包独立渲染不了 → 切 release 包重试
  if (!result.ok && isDebugRpk(rpkPath) && autoFix) {
    console.log('\n[_] 当前为 debug 包且画面黑屏。debug（enableJsc=false）包通常无法独立渲染，');
    console.log('   按项目规则改用 release（--enable-jsc）包兜底 …');
    let rel = releaseRpk();
    if (!rel) {
      rel = buildRelease();
    }
    if (rel && fs.existsSync(rel)) {
      console.log(`[_] 改用 release 包：${path.basename(rel)}\n`);
      result = deployAndVerify(adb, serial, rel);
    } else {
      console.log('[_] 未能得到 release 包，跳过兜底。');
    }
  }

  // 兜底四（--auto-restart）：release 进程活着仍黑屏 → 重启模拟器显示层
  const finalRpk = isDebugRpk(rpkPath) ? (releaseRpk() || rpkPath) : rpkPath;
  if (!result.ok && autoRestart) {
    console.log('\n[_] 兜底四：release 进程活着但画面仍黑，重启模拟器（--auto-restart）…');
    result = restartEmulatorRetry(adb, serial, finalRpk);
  }

  if (!result.ok) {
    console.log('\n[_] 启动兜底仍未成功。请手动确认：');
    console.log('   1) 已用 release 构建：npm run release');
    console.log(`   2) 重新运行本脚本：node scripts/relaunch.js --serial=${serial}`);
    console.log('   3) 若出现的是 debug 会话，IDE 端请改点「运行」而非「调试」。');
    process.exit(result.size ? 3 : 2);
  }

  console.log(`\n[OK] ${PKG} 已跑起来，截图 /tmp/relaunch-${serial}.png（PNG ${result.size}B）`);
  console.log(`     验证：node scripts/emulator-eye.js shot ${grpcPort} /tmp/check.png`);
  process.exit(0);
}

main();