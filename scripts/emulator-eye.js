#!/usr/bin/env node
/**
 * emulator-eye —— 用 gRPC 直连 Vela 模拟器：自主截图 + 自主点击（"AI 的眼睛和手指"）
 *
 * 原理：Vela/Android 模拟器内置 gRPC 控制服务 `android.emulation.control.EmulatorController`
 *      （端口 = 控制台端口 + 3000，例如 emulator-5554 → 8554，emulator-5556 → 8556）。
 *      工具链自带 proto 与 @grpc/grpc-js，本脚本直接复用，零额外依赖。
 *      这一点此前一直被误认为"自定义二进制协议"——其实是 HTTP/2 的 SETTINGS 帧。
 *
 * 用法：
 *   node scripts/emulator-eye.js ports                   # 列出在跑的模拟器与建议的 gRPC 端口
 *   node scripts/emulator-eye.js status   <grpcPort>
 *   node scripts/emulator-eye.js shot     <grpcPort> <out.png>
 *   node scripts/emulator-eye.js click    <grpcPort> <x> <y>
 *   node scripts/emulator-eye.js seq      <grpcPort> <outPrefix> <x,y> [x,y ...]   # 每步：点击→截图
 *   node scripts/emulator-eye.js key      <grpcPort> <keycode>                     # 可选
 *   node scripts/emulator-eye.js pages    <grpcPort> <outPrefix> <x,y> [...]       # 同 seq，命名更直观
 *
 * 说明：
 *   - 若模拟器开启了 token 校验，设环境变量 EYE_TOKEN=<token>；默认不带凭证先试。
 *   - 截图输出为 PNG；坐标是模拟器物理像素（手环 9 = 192×490）。
 */
'use strict'

const fs = require('fs')
const os = require('os')
const net = require('net')
const path = require('path')
const { execSync } = require('child_process')

/* ---------- 真·点击注入：模拟器控制台 event mouse（gRPC 的输入 RPC 在 Vela 上未实现） ----------
 * 控制台端口 = gRPC 端口 - 3000（即 emulator-5554 的 5554），需要 auth token：
 *   ~/.emulator_console_auth_token
 * 语法：event mouse <x> <y> <device> <buttonstate>（4 个整数；1=按下，0=抬起）
 * ⚠️ 坐标是**皮肤窗口坐标**，不是 LCD 坐标：LCD(x,y) → 窗口(x+part2.x, y+part2.y)
 *    part2 偏移从 ~/.vela/sdk/skins/builtin/<avd>/layout 读取，按 LCD 尺寸自动匹配 AVD。
 */
const SKIN_ROOT = path.join(os.homedir(), '.vela', 'sdk', 'skins', 'builtin')

function parseSkinLayout(avd) {
  try {
    const txt = fs.readFileSync(path.join(SKIN_ROOT, avd, 'layout'), 'utf8')
    const disp = /display\s*\{([^}]*)\}/.exec(txt)
    const part2 = /part2\s*\{([^}]*)\}/.exec(txt)
    const num = (s, k) => {
      const m = new RegExp(k + '\\s+(-?\\d+)').exec(s || '')
      return m ? Number(m[1]) : 0
    }
    return {
      avd,
      w: num(disp && disp[1], 'width'),
      h: num(disp && disp[1], 'height'),
      x: num(part2 && part2[1], 'x'),
      y: num(part2 && part2[1], 'y'),
    }
  } catch (e) {
    return null
  }
}

/** 按 LCD 尺寸找出对应 AVD 的皮肤偏移（212×520 → xiaomi_band_10，192×490 → xiaomi_band） */
function skinOffsetForSize(w, h) {
  if (process.env.EYE_AVD) {
    const s = parseSkinLayout(process.env.EYE_AVD)
    if (s) return s
  }
  let avds = []
  try {
    avds = fs.readdirSync(SKIN_ROOT)
  } catch (e) {}
  for (const a of avds) {
    const s = parseSkinLayout(a)
    if (s && s.w === w && s.h === h) return s
  }
  return null
}

function pngSize(buf) {
  // PNG: 8 字节签名 + 4 长度 + 'IHDR' + width(4) + height(4)
  if (buf.length < 24 || buf.toString('latin1', 12, 16) !== 'IHDR') return null
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

function getScreenshotBuffer(port) {
  const client = makeClient(port)
  return new Promise((resolve, reject) => {
    client.getScreenshot(IMAGE_FORMAT_PNG, authMeta(), (err, res) => {
      client.close()
      if (err) return reject(err)
      resolve(res.image)
    })
  })
}

async function consoleTap(grpcPort, lcdX, lcdY) {
  // 2026-09-27 标定结论：控制台 event mouse 直接吃 **LCD 坐标**，不需要皮肤偏移！
  // （曾经按 part2 加偏移，结果点击落点整体偏右下、返回键点不中；改用原始 LCD 坐标后一切正常）
  // 需要偏移的机种可用 EYE_SKIN_OFFSET=1 打开。
  const size = pngSize(await getScreenshotBuffer(grpcPort))
  const skin = process.env.EYE_SKIN_OFFSET && size ? skinOffsetForSize(size.w, size.h) : null
  const x = lcdX + (skin ? skin.x : 0)
  const y = lcdY + (skin ? skin.y : 0)
  const token = fs
    .readFileSync(path.join(os.homedir(), '.emulator_console_auth_token'), 'utf8')
    .trim()
  const port = grpcPort - 3000

  const s = net.connect(port, '127.0.0.1')
  await new Promise((r, j) => {
    s.on('connect', r)
    s.on('error', j)
  })
  const write = (l) => s.write(l + '\n')
  await sleep(250)
  write('auth ' + token)
  await sleep(300)
  write(`event mouse ${x} ${y} 0 1`)
  await sleep(130)
  write(`event mouse ${x} ${y} 0 0`)
  await sleep(200)
  write('quit')
  await sleep(150)
  s.end()
  await sleep(450)
  return { lcdX, lcdY, x, y, skin: skin ? skin.avd : '(无皮肤偏移)' }
}

const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

const PROTO = path.join(
  __dirname, '..', 'node_modules', '@aiot-toolkit', 'emulator', 'lib', 'static', 'proto', 'emulator_controller.proto'
)

const pkg = grpc.loadPackageDefinition(
  protoLoader.loadSync(PROTO, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true })
).android.emulation.control

const IMAGE_FORMAT_PNG = { format: 0, width: 0, height: 0, display: 0 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function makeClient(port) {
  return new pkg.EmulatorController(`127.0.0.1:${port}`, grpc.credentials.createInsecure())
}

function authMeta() {
  const md = new grpc.Metadata()
  if (process.env.EYE_TOKEN) md.set('Authorization', `Bearer ${process.env.EYE_TOKEN}`)
  return md
}

function listPorts() {
  try {
    const out = execSync("ps aux | grep qemu-system-armel | grep -v grep | sed -E 's/.*-avd ([^ ]+).*/\\1/'", {
      encoding: 'utf8',
    })
    const avds = out.split('\n').map((s) => s.trim()).filter(Boolean)
    const adb = execSync('ps aux | grep qemu-system-armel | grep -v grep', { encoding: 'utf8' })
    const ports = [...adb.matchAll(/127\.0\.0\.1:(\d{4,5})/g)].map((m) => Number(m[1]))
    console.log('运行中的 VVD:')
    avds.forEach((a, i) => {
      const candidates = ports.filter((p) => p >= 8550 && p <= 8600)
      console.log(`  - ${a}（gRPC 候选端口见下）`)
    })
    console.log('本机监听的候选端口（gRPC = 控制台端口 + 3000）:', candidates(candidates) || ports.join(','))
    console.log('提示：也可直接 `lsof -nP -iTCP -sTCP:LISTEN | grep qemu` 看 8554/8556 一类端口')
  } catch (e) {
    console.log('无法枚举（' + e.message + '）')
  }
  function candidates(a) {
    return a.length ? a.join(',') : ''
  }
}

function getStatus(client) {
  return new Promise((resolve, reject) => {
    client.getStatus({}, authMeta(), (err, res) => (err ? reject(err) : resolve(res)))
  })
}

function getScreenshot(client, out) {
  return new Promise((resolve, reject) => {
    client.getScreenshot(IMAGE_FORMAT_PNG, authMeta(), (err, res) => {
      if (err) return reject(err)
      if (!res || !res.image || res.image.length === 0) return reject(new Error('返回的 image 为空'))
      fs.writeFileSync(out, res.image)
      resolve(out)
    })
  })
}

function sendMouse(client, x, y, buttons) {
  return new Promise((resolve, reject) => {
    client.sendMouse({ x, y, buttons }, authMeta(), (err) => (err ? reject(err) : resolve()))
  })
}

function sendTouch(client, touches, display = 0) {
  return new Promise((resolve, reject) => {
    client.sendTouch({ touches, display }, authMeta(), (err) => (err ? reject(err) : resolve()))
  })
}

/** 真实触摸：touches 非空 = 按下/移动；空数组 = 全部抬起 */
async function touchDown(client, x, y, id = 0) {
  await sendTouch(client, [{ x, y, identifier: id, pressure: 1, touch_major: 5, touch_minor: 5, expiration: 1 }])
}

async function touchUp(client) {
  await sendTouch(client, [])
}

async function click(client, x, y, hold = 90) {
  await touchDown(client, x, y)
  await sleep(hold)
  await touchUp(client)
  await sleep(450)
}

async function mouseClick(client, x, y) {
  await sendMouse(client, x, y, 0)
  await sleep(40)
  await sendMouse(client, x, y, 1)
  await sleep(90)
  await sendMouse(client, x, y, 0)
  await sleep(450)
}

async function sendKey(client, keycode) {
  return new Promise((resolve, reject) => {
    client.sendKey({ eventType: 0, keyCode: String(keycode) }, authMeta(), (err) => (err ? reject(err) : resolve()))
  })
}

async function main() {
  const [mode, ...rest] = process.argv.slice(2)
  if (!mode || mode === 'help') {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\*?/, ''))
    return
  }
  if (mode === 'ports') return listPorts()

  const port = Number(rest[0])
  if (!port) throw new Error('缺少 grpcPort（见 `node scripts/emulator-eye.js ports`）')
  const client = makeClient(port)

  if (mode === 'status') {
    const s = await getStatus(client)
    console.log(JSON.stringify(s, null, 2).slice(0, 2000))
  } else if (mode === 'shot') {
    console.log('已保存 ' + (await getScreenshot(client, rest[1])))
  } else if (mode === 'click') {
    await click(client, Number(rest[1]), Number(rest[2]))
    console.log('已触摸点击 (' + rest[1] + ',' + rest[2] + ')')
  } else if (mode === 'mclick') {
    await mouseClick(client, Number(rest[1]), Number(rest[2]))
    console.log('已鼠标点击 (' + rest[1] + ',' + rest[2] + ')')
  } else if (mode === 'stouch') {
    // 流式输入：streamInputEvent(stream InputEvent) —— oneof { touch_event, mouse_event, key_event }
    const call = client.streamInputEvent(authMeta(), (e) => e && console.error('stream err: ' + e.message))
    const x = Number(rest[1])
    const y = Number(rest[2])
    call.write({
      touch_event: {
        touches: [{ x, y, identifier: 0, pressure: 1, touch_major: 5, touch_minor: 5, expiration: 1 }],
        display: 0,
      },
    })
    await sleep(150)
    call.write({ touch_event: { touches: [], display: 0 } })
    await sleep(150)
    call.end()
    await sleep(450)
    console.log('已流式触摸点击 (' + x + ',' + y + ')')
  } else if (mode === 'sseq') {
    const prefix = rest[1]
    const points = rest.slice(2).map((p) => p.split(',').map(Number))
    let i = 0
    console.log('已保存 ' + (await getScreenshot(client, `${prefix}-0.png`)))
    for (const [x, y] of points) {
      const call = client.streamInputEvent(authMeta(), (e) => e && console.error('stream err: ' + e.message))
      call.write({
        touch_event: {
          touches: [{ x, y, identifier: 0, pressure: 1, touch_major: 5, touch_minor: 5, expiration: 1 }],
          display: 0,
        },
      })
      await sleep(150)
      call.write({ touch_event: { touches: [], display: 0 } })
      await sleep(150)
      call.end()
      await sleep(450)
      i += 1
      console.log(`流式点击(${x},${y}) → 已保存 ` + (await getScreenshot(client, `${prefix}-${i}.png`)))
    }
  } else if (mode === 'key') {
    await sendKey(client, rest[1])
    console.log('已发送 keycode ' + rest[1])
  } else if (mode === 'ctap') {
    // ✅ 可用路径：控制台 event mouse（坐标自动加皮肤偏移）
    const r = await consoleTap(port, Number(rest[1]), Number(rest[2]))
    console.log(`已点击 LCD(${r.lcdX},${r.lcdY}) → 窗口(${r.x},${r.y})  [皮肤 ${r.skin}]`)
  } else if (mode === 'cseq') {
    const prefix = rest[1]
    const points = rest.slice(2).map((p) => p.split(',').map(Number))
    let i = 0
    console.log('已保存 ' + (await getScreenshot(client, `${prefix}-0.png`)))
    for (const [x, y] of points) {
      const r = await consoleTap(port, x, y)
      i += 1
      console.log(
        `点击 LCD(${x},${y}) → 窗口(${r.x},${r.y}) [皮肤 ${r.skin}] → 已保存 ` +
          (await getScreenshot(client, `${prefix}-${i}.png`))
      )
    }
  } else if (mode === 'seq' || mode === 'pages') {
    const prefix = rest[1]
    const points = rest.slice(2).map((p) => p.split(',').map(Number))
    let i = 0
    console.log('已保存 ' + (await getScreenshot(client, `${prefix}-0.png`)))
    for (const [x, y] of points) {
      await click(client, x, y)
      i += 1
      console.log(`点击(${x},${y}) → 已保存 ` + (await getScreenshot(client, `${prefix}-${i}.png`)))
    }
  } else {
    throw new Error('未知模式: ' + mode)
  }
  client.close()
}

main().catch((e) => {
  const msg = e && e.message ? e.message : String(e)
  console.error('❌ ' + msg)
  if (/UNAUTHENTICATED|TOKEN|PERMISSION/i.test(msg)) {
    console.error('提示：该模拟器可能需要 token，设置 EYE_TOKEN=<token> 再试（token 通常在 VVD 目录的 hardware-qemu.ini 或以 -grpc 参数启动时给出）')
  }
  process.exit(1)
})
