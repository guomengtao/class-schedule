#!/usr/bin/env node
/**
 * 激活链路契约测试（跨仓库）
 *
 * 目的：锁住「签发端编码 → 客户端解密 → 设备本地比对」这条链路的唯一不变式：
 *
 *   同一台设备，无论设备号以大写还是小写参与签发，
 *   签发出来的码都必须能被客户端判定为该设备。
 *
 * 这个不变式在 2026-11-04 12:35 被打破过一次：签发端（app-auth）改成大写归一，
 * 客户端 activation-code.ux 仍做严格字符串比较，导致尾号含 a-f 的设备全部激活失败。
 * 详见 docs/ACTIVATION-FREEZE.md。
 *
 * 用法：node test/activation-contract.test.js
 * 退出码：0 全绿 / 1 有失败
 */

var path = require('path');

var EV_ROOT = path.join(__dirname, '..', '..');

var issuer = require(path.join(EV_ROOT, 'app-auth', 'lib', 'crypto.js'));
var csCrypto = require(path.join(EV_ROOT, 'class-schedule', 'src', 'lib', 'crypto.js'));
var boxCrypto = require(path.join(EV_ROOT, 'evbox', 'src', 'lib', 'crypto.js'));

var pass = 0, fail = 0, failures = [];

function ok(name, cond, detail) {
  if (cond) {
    pass++;
    console.log('  \u2714 ' + name);
  } else {
    fail++;
    failures.push(name + (detail ? '  [' + detail + ']' : ''));
    console.log('  \u2718 ' + name + (detail ? '  [' + detail + ']' : ''));
  }
}

/** 与客户端 activation-code.ux 现在的判定口径一致（双侧大写归一） */
function matches(decodedDeviceId, localLast4) {
  return String(decodedDeviceId).toUpperCase() === String(localLast4).toUpperCase();
}

function last4(deviceId) {
  var s = String(deviceId);
  return s.substring(s.length - 4);
}

console.log('\n=== Part 1 \u00b7 端到端契约（签发 → 解密 → 比对）===\n');

// 用例集：覆盖「尾号含字母」这个此前炸掉的分支，以及纯数字尾号回归
var DEVICES = [
  { name: '小写字母尾号（真实设备形态）', id: 'uuid-382d5d14f520c409eb56508ca0136e44' },
  { name: '大写字母尾号（用户手抄成大写）', id: 'uuid-382D5D14F520C409EB56508CA0136E44' },
  { name: '纯数字尾号（回归）', id: 'uuid-aaaaaaaaaaaaaaaaaaaaaaaa00003456' },
  { name: '字母数字混合尾号', id: 'uuid-aaaaaaaaaaaaaaaaaaaaaaaaaaa1b2' }
];

['class-schedule', 'evbox'].forEach(function (which) {
  var client = which === 'class-schedule' ? csCrypto : boxCrypto;
  console.log('  -- ' + which + ' --');
  DEVICES.forEach(function (d) {
    var code;
    try {
      code = issuer.generateActivationCode(1, d.id, 12, 'A1B2');
    } catch (e) {
      ok(d.name + ' \u00b7 签发', false, 'generate 抛错: ' + e.message);
      return;
    }
    var dec = client.decryptActivationCode(code);
    if (!dec || !dec.valid) {
      ok(d.name + ' \u00b7 解密', false, 'decrypt 返回无效: ' + JSON.stringify(dec).slice(0, 80));
      return;
    }
    var local = last4(d.id);
    var hit = matches(dec.deviceId, local);
    ok(
      d.name + ' \u00b7 码=' + code + ' 码内设备=' + dec.deviceId + ' 本机=' + local,
      hit,
      hit ? '' : '不匹配 → 该设备会被判「设备不匹配」'
    );
  });
  console.log('');
});

// 存量码硬编码：这张真实码曾把用户拦在门外，必须永久可用
console.log('  -- 存量码回归 --');
var LEGACY = '003220910257139192';
var legacyDec = csCrypto.decryptActivationCode(LEGACY);
ok(
  '存量码 ' + LEGACY + ' 对设备 6e44 判定通过（码内=' + (legacyDec && legacyDec.deviceId) + '）',
  legacyDec && legacyDec.valid && matches(legacyDec.deviceId, '6e44')
);

console.log('\n=== Part 2 \u00b7 两端 deviceIdToNumber 归一守卫（判失败）===\n');
console.log('  2026-11-04 已把客户端归一到与签发端一致。本节作为回归守卫：');
console.log('  任何一项出现 \u26a0\ufe0f 都说明归一路径被改坏，等同激活链路可能再次分裂。');
console.log('  该函数不参与真实解密（解密走 numberToDeviceId），但同名不同行为是事故温床。\n');

['6e44', '6E44', '3456'].forEach(function (seg) {
  var up = seg.toUpperCase();
  var a = issuer.normalizeDeviceIdSegment(seg);
  var cs = csCrypto.deviceIdToNumber(seg);
  var bx = boxCrypto.deviceIdToNumber(seg);
  var csSame = cs === csCrypto.deviceIdToNumber(up);
  var bxSame = bx === boxCrypto.deviceIdToNumber(up);
  var cross = cs === bx;
  ok(
    '设备段=' + seg + ' | 签发端归一=' + a + ' | cs=' + cs + ' | evbox=' + bx,
    csSame && bxSame && cross,
    (csSame && bxSame && cross) ? '' : ('大小写写法算出不同数值 csSame=' + csSame + ' bxSame=' + bxSame + ' cs==evbox:' + cross)
  );
});
console.log('\n  期望：同一设备段的大写与小写写法必须算出同一数值。');
console.log('  若此项报警，先看 crypto.js 的 deviceIdToNumber 是否丢了 toUpperCase。\n');

console.log('=== 结果：' + pass + ' 通过 / ' + fail + ' 失败 ===\n');
if (fail > 0) {
  console.log('失败项：');
  failures.forEach(function (f) { console.log('  - ' + f); });
  console.log('\n激活链路已破损，不要发版。参见 docs/ACTIVATION-FREEZE.md');
  process.exit(1);
}
process.exit(0);
