#!/usr/bin/env node
/**
 * deploy-lock.js —— 模拟器「独占写锁」：防止多个 AI/人 对同一台 vvd 并发部署(打包/install)互相覆盖。
 *
 * 背景：Vela 的 AVD 机制没有「多用户排它锁」，startVvd 谁都能叫。多人/多 AI 对同一台
 *       xiaomi_band_pro 同时 build+install，后装覆盖先装、画面被抢，导致「都打不开」。
 *
 * 本工具提供应用层排它锁。判活分两种模式（这是 v2 的核心改动）：
 *
 *   1) manual 模式（acquire/release 手动夹住）：
 *      CLI 是短命进程，acquire 一退出 pid 就死了，所以 pid 判据天然失效，
 *      只能靠「租期」兜底 —— 租期内一律算有人在用（哪怕他其实早走了）。
 *      → 用 renew 显式续租，把租期往回推，避免长部署被误抢。
 *
 *   2) run 模式（推荐）：
 *      node scripts/deploy-lock.js run --avd X --owner F -- <部署命令...>
 *      把「acquire → 心跳 → 执行命令 → release」绑成一条生命周期：
 *        持锁进程 = 跑部署命令的那个长命进程，活着就每 10s 刷心跳；
 *        命令退出 → 立刻释放（别人秒接，不用等 30 分钟）；
 *        命令被杀/卡死 → 心跳停 → 45s 判卡死、进程退出后 15s 宽限即可回收。
 *      → 「锁有效」等价于「部署进程还活着且在跳」，不再靠墙钟猜。
 *
 * 用法：
 *   # 推荐：整个部署包在 run 里，锁随命令生灭
 *   node scripts/deploy-lock.js run --avd xiaomi_band_pro --owner "AI-A" -- aiot build --watch
 *
 *   # 手动：拿锁 / 续租 / 放锁
 *   node scripts/deploy-lock.js acquire --avd xiaomi_band_pro --owner "AI-A" [--ttl 1800]
 *   node scripts/deploy-lock.js renew   --avd xiaomi_band_pro --owner "AI-A" [--ttl 1800]
 *   node scripts/deploy-lock.js release --avd xiaomi_band_pro --owner "AI-A"
 *
 *   # 只读查看（谁占着、占用多久、心跳几秒前、还剩多久、该等还是该抢）
 *   node scripts/deploy-lock.js status [--json]
 *
 *   # 强制清锁（只在确认占锁者确实已死/任务真结束才用）
 *   node scripts/deploy-lock.js clear --avd xiaomi_band_pro
 *
 * 铁律（项目规则见 .trae/rules/project_rules.md §deploy-lock）：
 *   1. 凡是对模拟器做「写操作」（build / install / 部署 rpk / vapp 重启），
 *      必须先持有同一台 vvd 的锁；释放前不得被他人部署。
 *   2. 同一时刻同一台 vvd 只允许一个「写者」；只读(截图/查看)者不受锁限制。
 *   3. 锁是软锁（自觉遵守），真正硬隔离 = 不同写者用不同 vvd（physical per-writer）。
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const LOCK_DIR = path.join(os.homedir(), '.vela', 'devops')
const LOCK_FILE = (avd) => path.join(LOCK_DIR, `deploy-${avd}.lock`)

const DEFAULT_TTL_MS = 30 * 60 * 1000 // manual 模式租期
const HB_INTERVAL_MS = 10 * 1000 // run 模式心跳间隔
const HB_TIMEOUT_MS = 45 * 1000 // 有进程但心跳超这个时长 → 判卡死
const HB_GRACE_MS = 15 * 1000 // 持锁进程刚退出 → 宽限这么久再判死

function nowISO() { return new Date().toISOString().replace('T', ' ').slice(0, 19) }

function pidAlive(pid) {
  const n = Number(pid)
  if (!pid || !Number.isInteger(n) || n <= 0) return false
  try { process.kill(n, 0); return true } catch (e) { return e.code === 'EPERM' }
}

function fmtDur(ms) {
  if (!isFinite(ms)) return '—'
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  if (m < 60) return rs ? `${m}m${rs}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm ? `${h}h${String(rm).padStart(2, '0')}m` : `${h}h`
}

function readLock(avd) {
  try { return JSON.parse(fs.readFileSync(LOCK_FILE(avd), 'utf8')) } catch (_) { return null }
}

function writeAtomic(file, rec) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(rec, null, 2))
  fs.renameSync(tmp, file)
}

/** 原子创建：已存在则返回 false（不覆盖）。并发抢锁的唯一正确姿势。 */
function createAtomic(file, rec) {
  let fd
  try {
    fd = fs.openSync(file, 'wx')
  } catch (e) {
    if (e.code === 'EEXIST') return false
    throw e
  }
  try { fs.writeSync(fd, JSON.stringify(rec, null, 2)) } finally { fs.closeSync(fd) }
  return true
}

/**
 * 判活。返回 { valid, tag, text, action, ageMs, hbAgeMs, leftMs }
 * valid=false 表示「可以回收」，调用方可以直接抢。
 */
function judge(rec) {
  const t = Date.now()
  const ts = Number(rec.ts) || t
  const ttl = Number(rec.ttl) > 0 ? Number(rec.ttl) : DEFAULT_TTL_MS
  const ageMs = Math.max(0, t - ts)
  const hb = Number(rec.hb) || 0
  const hbAgeMs = hb ? Math.max(0, t - hb) : Infinity
  const base = { ageMs, hbAgeMs, ttl, leftMs: Math.max(0, ttl - ageMs) }

  // —— run 模式：心跳即生命 ——
  if (rec.mode === 'run') {
    const alive = pidAlive(rec.hbPid)
    if (alive && hbAgeMs <= HB_TIMEOUT_MS) {
      return Object.assign(base, {
        valid: true, tag: 'run-live',
        text: `✅ 真忙中（持锁进程 ${rec.hbPid} 存活，心跳 ${fmtDur(hbAgeMs)}前）`,
        action: '等它跑完即可，不要抢',
      })
    }
    if (alive) {
      return Object.assign(base, {
        valid: false, tag: 'run-hung',
        text: `⚠️ 进程 ${rec.hbPid} 还活着但心跳停了 ${fmtDur(hbAgeMs)}（疑似卡死）`,
        action: '再等 30s 观察；仍不动则 clear 接管',
      })
    }
    if (hbAgeMs > HB_GRACE_MS) {
      return Object.assign(base, {
        valid: false, tag: 'run-dead',
        text: `⚠️ 持锁进程 ${rec.hbPid} 已退出，心跳停在 ${fmtDur(hbAgeMs)}前`,
        action: '可直接 acquire，会自动回收',
      })
    }
    return Object.assign(base, {
      valid: true, tag: 'run-grace',
      text: `⏳ 持锁进程刚退出（${fmtDur(hbAgeMs)}前），宽限中`,
      action: `等 ${fmtDur(HB_GRACE_MS - hbAgeMs)} 再试`,
    })
  }

  // —— manual 模式：pid 活 或 租期未尽 ——
  if (pidAlive(rec.pid)) {
    return Object.assign(base, {
      valid: true, tag: 'manual-live',
      text: `✅ 占用中（pid ${rec.pid} 存活）`,
      action: '等它 release',
    })
  }
  if (ageMs <= ttl) {
    return Object.assign(base, {
      valid: true, tag: 'manual-lease',
      text: `⏳ 占用中（pid 已退，租期剩 ${fmtDur(base.leftMs)}）`,
      action: `等它 release；若确认人已走，可 clear 接管`,
    })
  }
  return Object.assign(base, {
    valid: false, tag: 'manual-stale',
    text: `⚠️ 僵尸（pid 已死，超租期 ${fmtDur(ageMs - ttl)}）`,
    action: '可直接 acquire，会自动回收',
  })
}

function buildRec(avd, owner, mode, ttlMs) {
  const t = Date.now()
  return {
    avd,
    owner: owner || 'unknown',
    mode,
    pid: process.pid,
    at: nowISO(),
    ts: t,
    hbPid: mode === 'run' ? process.pid : null,
    hb: mode === 'run' ? t : 0,
    ttl: ttlMs || DEFAULT_TTL_MS,
    host: os.hostname(),
  }
}

function printBusy(avd, rec, j) {
  console.error(`❌ 独占失败：${avd} 正在被占用`)
  console.error(`   占用者: ${rec.owner || '?'}${rec.host ? ` @${rec.host}` : ''}  [模式=${rec.mode || 'manual'}]`)
  console.error(`   占用起始: ${rec.at}  已占用 ${fmtDur(j.ageMs)}`)
  if (rec.mode === 'run') console.error(`   持锁进程: ${rec.hbPid}  最近心跳: ${fmtDur(j.hbAgeMs)}前`)
  else console.error(`   租期剩余: ${fmtDur(j.leftMs)}（可用 renew 续租）`)
  console.error(`   状态: ${j.text.split('\n')[0]}`)
  console.error(`   建议: ${j.action}`)
  console.error(`   铁律：不要在未释放前部署；换一台 vvd 或等对方 release。`)
}

/** 拿锁；拿不到直接退出。返回 rec 供 run 使用。 */
function acquireLock(avd, owner, mode, ttlMs) {
  if (!avd) { console.error('❌ 缺少 --avd'); process.exit(2) }
  fs.mkdirSync(LOCK_DIR, { recursive: true })
  const file = LOCK_FILE(avd)
  const rec = buildRec(avd, owner, mode, ttlMs)

  for (let attempt = 0; attempt < 3; attempt++) {
    if (createAtomic(file, rec)) {
      console.log(`✅ 已独占：${avd}（owner=${rec.owner}, ${mode === 'run' ? `持锁进程=${process.pid}` : `pid=${process.pid}`}, 自 ${rec.at}）`)
      if (mode !== 'run') {
        console.log(`   开始部署；完成后务必: node scripts/deploy-lock.js release --avd ${avd} --owner "${rec.owner}"`)
        console.log(`   预计超过 ${fmtDur(rec.ttl)} 时，中途用 renew 续租。`)
      }
      return rec
    }
    const cur = readLock(avd)
    if (!cur) continue // 刚好被释放，重试创建
    const j = judge(cur)
    if (j.valid) { printBusy(avd, cur, j); process.exit(1) }

    // 僵尸回收：先 rename 走（原子），再重建；rename 失败说明被别人抢先
    const grave = `${file}.stale-${process.pid}-${Date.now()}`
    try {
      fs.renameSync(file, grave)
    } catch (e) {
      if (e.code === 'ENOENT') continue
      throw e
    }
    try { fs.unlinkSync(grave) } catch (_) { /* 忽略 */ }
    console.warn(`⚠️ 回收僵尸锁：${avd} 原 owner=${cur.owner}（${j.text}）`)
  }
  console.error(`❌ 抢锁失败：${avd} 反复被抢占，请稍后重试`)
  process.exit(1)
}

function releaseLock(avd, owner, opts) {
  const quiet = opts && opts.quiet
  const existing = readLock(avd)
  if (!existing) {
    if (!quiet) console.log(`ℹ️ 无可释放：${avd} 原本就没有锁`)
    return { ok: true, code: 0 }
  }
  if (owner && existing.owner && owner !== existing.owner) {
    console.error(`❌ 释放失败：${avd} 的锁属于 ${existing.owner}，而你自称 ${owner}，不能代放`)
    return { ok: false, code: 1 }
  }
  try { fs.unlinkSync(LOCK_FILE(avd)) } catch (_) { /* 已被别人清掉 */ }
  if (!quiet) console.log(`✅ 已释放：${avd}（原 owner=${existing.owner}, 模式=${existing.mode || 'manual'}）`)
  return { ok: true, code: 0 }
}

function renew(avd, owner, ttlMs) {
  const cur = readLock(avd)
  if (!cur) {
    console.error(`❌ 续租失败：${avd} 没有锁，请先 acquire`)
    process.exit(1)
  }
  if (owner && cur.owner && owner !== cur.owner) {
    console.error(`❌ 续租失败：${avd} 的锁属于 ${cur.owner}，不能代续`)
    process.exit(1)
  }
  if (cur.mode === 'run' && cur.hbPid !== process.pid) {
    console.error(`❌ 续租失败：${avd} 是 run 模式，由持锁进程 ${cur.hbPid} 自动续约，外部不能代续（否则会掩盖它卡死）`)
    process.exit(1)
  }
  const j = judge(cur)
  if (!j.valid) {
    console.error(`❌ 续租失败：${avd} 的锁已失效（${j.text}），请重新 acquire`)
    process.exit(1)
  }
  const t = Date.now()
  cur.hb = t
  if (cur.mode !== 'run') cur.ts = t // 手动模式续租 = 重新计时
  if (ttlMs) cur.ttl = ttlMs
  writeAtomic(LOCK_FILE(avd), cur)
  const nLeft = Math.max(0, (Number(cur.ttl) || DEFAULT_TTL_MS) - (t - Number(cur.ts)))
  console.log(`🫀 已续租：${avd}（owner=${cur.owner}，心跳 ${nowISO()}，租期剩 ${fmtDur(nLeft)}）`)
}

function runCmd(avd, owner, argv, ttlMs) {
  if (!argv.length) {
    console.error('❌ run 需要 -- 之后的命令，例：run --avd X --owner F -- aiot build')
    process.exit(2)
  }
  const rec = acquireLock(avd, owner, 'run', ttlMs)
  const file = LOCK_FILE(avd)
  let finished = false
  let stopped = false
  let timer = null

  const beat = () => {
    if (stopped) return
    const cur = readLock(avd)
    if (!cur || cur.mode !== 'run' || cur.hbPid !== process.pid) {
      console.error(`⚠️ 心跳中断：${avd} 的锁已不属于本进程（被 clear/抢走），停止续约`)
      stopped = true
      if (timer) clearInterval(timer)
      return
    }
    cur.hb = Date.now()
    try { writeAtomic(file, cur) } catch (_) { /* 单次写失败不致命，下轮再补 */ }
  }
  timer = setInterval(beat, HB_INTERVAL_MS)
  if (timer.unref) timer.unref()

  const child = spawn(argv[0], argv.slice(1), { stdio: 'inherit', env: process.env })

  const finish = (code) => {
    if (finished) return
    finished = true
    stopped = true
    if (timer) clearInterval(timer)
    const r = releaseLock(avd, rec.owner, { quiet: true })
    if (r.ok) console.log(`✅ 已自动释放：${avd}（run 结束，退出码 ${code}）`)
    process.exitCode = code
  }

  child.on('exit', (code, sig) => finish(code === null ? (sig ? 128 + 15 : 1) : code))
  child.on('error', (e) => {
    console.error(`❌ 启动命令失败：${e.message}`)
    finish(127)
  })
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
      try { child.kill(sig) } catch (_) { /* 子进程可能已退出 */ }
      finish(130)
    })
  }
}

function status(json) {
  let files = []
  try {
    files = fs.readdirSync(LOCK_DIR).filter((f) => f.endsWith('.lock'))
  } catch (_) {
    files = []
  }
  const rows = []
  for (const f of files) {
    const avd = f.replace(/^deploy-/, '').replace(/\.lock$/, '')
    const rec = readLock(avd)
    if (!rec) continue
    const j = judge(rec)
    rows.push({
      avd,
      owner: rec.owner,
      mode: rec.mode || 'manual',
      pid: rec.mode === 'run' ? rec.hbPid : rec.pid,
      since: rec.at,
      occupiedMs: j.ageMs,
      hbAgoMs: isFinite(j.hbAgeMs) ? j.hbAgeMs : null,
      leftMs: j.leftMs,
      valid: j.valid,
      tag: j.tag,
      state: j.text,
      action: j.action,
    })
  }

  if (json) { console.log(JSON.stringify(rows, null, 2)); return }

  if (!rows.length) { console.log('ℹ️ 暂无任何 deploy 锁'); return }
  console.log(`当前 deploy 锁（${LOCK_DIR}）：`)
  for (const r of rows) {
    const hbTxt = r.hbAgoMs === null ? '—' : `${fmtDur(r.hbAgoMs)}前`
    const leaseTxt = r.mode === 'run' ? '租期 —（心跳制）' : `租期剩余 ${fmtDur(r.leftMs)}`
    console.log('')
    console.log(`  ● ${r.avd}   owner=${r.owner}   模式=${r.mode}`)
    console.log(`    占用 ${fmtDur(r.occupiedMs)}（自 ${r.since}）  心跳 ${hbTxt}  ${leaseTxt}  进程 ${r.pid || '—'}`)
    console.log(`    状态：${r.state}`)
    console.log(`    建议：${r.action}`)
  }
  const bad = rows.filter((r) => !r.valid)
  if (bad.length) {
    console.log('')
    console.log(`⚠️ 其中 ${bad.length} 个可回收（${bad.map((r) => r.avd).join(', ')}），直接 acquire 即可自动接管。`)
  }
}

const raw = process.argv.slice(2)
const cmd = raw[0]
const sep = raw.indexOf('--')
const optArgs = sep > 0 ? raw.slice(1, sep) : raw.slice(1)
const rest = sep > 0 ? raw.slice(sep + 1) : []
const opt = (k) => {
  const i = optArgs.indexOf('--' + k)
  return i >= 0 && optArgs[i + 1] ? optArgs[i + 1] : undefined
}
const ttlMs = () => {
  const s = Number(opt('ttl'))
  return s > 0 ? s * 1000 : undefined
}

switch (cmd) {
  case 'acquire':
    acquireLock(opt('avd'), opt('owner') || process.env.LOCK_OWNER || 'unknown', 'manual', ttlMs())
    break
  case 'release': {
    const r = releaseLock(opt('avd'), opt('owner') || process.env.LOCK_OWNER)
    process.exit(r.code)
    break
  }
  case 'renew':
    renew(opt('avd'), opt('owner') || process.env.LOCK_OWNER, ttlMs())
    break
  case 'run':
    runCmd(opt('avd'), opt('owner') || process.env.LOCK_OWNER || 'unknown', rest, ttlMs())
    break
  case 'status':
    status(optArgs.includes('--json'))
    break
  case 'clear': {
    const avd = opt('avd')
    if (!avd) { console.error('❌ 缺少 --avd'); process.exit(2) }
    const file = LOCK_FILE(avd)
    if (!fs.existsSync(file)) { console.log(`ℹ️ ${avd} 无锁可清`); break }
    const cur = readLock(avd)
    fs.unlinkSync(file)
    console.log(`🟢 已强制清掉 ${avd} 的锁（原 owner=${(cur && cur.owner) || '?'}，模式=${(cur && cur.mode) || '?'}）`)
    break
  }
  default:
    console.log(`
deploy-lock — 模拟器独占写锁（防多人并发部署互相覆盖）

推荐（锁随命令生灭，最不容易占着毛坑不拉屎）：
  node scripts/deploy-lock.js run --avd <vvd> --owner <who> [--ttl 1800] -- <命令...>

手动：
  node scripts/deploy-lock.js acquire --avd <vvd> --owner <who> [--ttl 1800]
  node scripts/deploy-lock.js renew   --avd <vvd> --owner <who> [--ttl 1800]
  node scripts/deploy-lock.js release --avd <vvd> --owner <who>

查看 / 急救：
  node scripts/deploy-lock.js status [--json]
  node scripts/deploy-lock.js clear  --avd <vvd>

判活规则：
  run 模式    = 持锁进程活着且心跳 <45s → 有效；进程退出 15s 后 / 心跳停 45s → 可回收
  manual 模式 = pid 活 或 租期(默认30m)未尽 → 有效；两者都不成立 → 僵尸可回收

铁律：写操作前必须持有同一台 vvd 的锁；硬隔离靠「不同写者用不同 vvd」。
`)
    process.exit(cmd ? 2 : 0)
}
