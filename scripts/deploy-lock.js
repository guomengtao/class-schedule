#!/usr/bin/env node
/**
 * deploy-lock.js —— 模拟器「独占写锁」：防止多个 AI/人 对同一台 vvd 并发部署(打包/install)互相覆盖。
 *
 * 背景：Vela 的 AVD 机制没有「多用户排它锁」，startVvd 谁都能叫。多人/多 AI 对同一台
 *       xiaomi_band_pro 同时 build+install，后装覆盖先装、画面被抢，导致「都打不开」。
 *       本项目也实测爆过（2026-10-19：3 人共用一台 → 包互相覆盖、画面乱跳）。
 *
 * 本工具提供一个应用层排它锁，语义 = 红灯/绿灯信号灯：
 *   - 谁先 acquire 成功，谁独占；别人 acquire 到已被占用 → 报错退出并告知占用者是谁。
 *   - 用「进程 PID 验尸」防僵尸锁：占锁的 pid 已死（崩溃/被杀）→ 自动回收、放后来者接管。
 *
 * 用法：
 *   # 部署前先拿锁（占住一台 vvd）。成功返回 0，被占用返回非 0 并打印占用者。
 *   node scripts/deploy-lock.js acquire --avd xiaomi_band_pro --owner "AI-A"
 *
 *   # 部署完成后释放锁（返回 0）
 *   node scripts/deploy-lock.js release --avd xiaomi_band_pro --owner "AI-A"
 *
 *   # 只读查看当前谁占着哪台、锁是否有效（谁都能看，不影响锁）
 *   node scripts/deploy-lock.js status
 *
 *   # 强制清锁（只在确认占锁者确实已死/任务真结束才用）
 *   node scripts/deploy-lock.js clear --avd xiaomi_band_pro
 *
 * 铁律（项目规则见 .trae/rules/project_rules.md §deploy-lock）：
 *   1. 凡是会对模拟器做「写操作」（build / install / 部署 rpk / vapp 重启）的步骤，
 *      必须先 acquire 同一台 vvd 的锁；释放前不得被他人部署。
 *   2. 同一时刻同一台 vvd 只允许一个「写者」；只读(截图/查看)者不受锁限制。
 *   3. 锁是软锁（自觉遵守），真正硬隔离 = 不同写者用不同 vvd（physical per-writer）。
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')

const LOCK_DIR = path.join(os.homedir(), '.vela', 'devops')
const LOCK_FILE = (avd) => path.join(LOCK_DIR, `deploy-${avd}.lock`)

function now() { return new Date().toISOString().replace('T', ' ').slice(0, 19) }
function pidAlive(pid) {
  if (!pid || !Number.isInteger(Number(pid)) || Number(pid) <= 0) return false
  try { process.kill(Number(pid), 0); return true } catch (e) { return e.code === 'EPERM' }
}

function readLock(avd) {
  try { return JSON.parse(fs.readFileSync(LOCK_FILE(avd), 'utf8')) } catch (_) { return null }
}

function acquire(must, avd, owner) {
  fs.mkdirSync(LOCK_DIR, { recursive: true })
  const file = LOCK_FILE(avd)
  const existing = readLock(avd)
  if (existing && pidAlive(existing.pid)) {
    // ★ 已被活着的写者占用 —— 拒绝
    console.error(`❌ 独占失败：${avd} 已被占用`)
    console.error(`   占用者: ${existing.owner || '?'}`)
    console.error(`   进程PID: ${existing.pid}（存活）`)
    console.error(`   占用起始: ${existing.at}`)
    console.error(`   请等它 release，或换一台 vvd；不要在未释放前部署！`)
    process.exit(1)
  }
  if (existing) {
    // 占锁 pid 已死 → 判定僵尸锁，自动回收（验尸成功）
    console.warn(`⚠️ 回收僵尸锁：${avd} 原锁 pid=${existing.pid} 已失效，自动接管`)
  }
  const rec = { avd, owner: owner || 'unknown', pid: process.pid, at: now() }
  fs.writeFileSync(file, JSON.stringify(rec, null, 2))
  console.log(`✅ 已独占：${avd}（owner=${rec.owner}, pid=${rec.pid}, 自 ${rec.at}）`)
  console.log(`   开始部署；完成后务必: node scripts/deploy-lock.js release --avd ${avd} --owner "${owner}"`)
  void must
}

function release(avd, owner) {
  const existing = readLock(avd)
  if (!existing) { console.log(`ℹ️ 无可释放：${avd} 原本就没有锁`); process.exit(0) }
  if (owner && existing.owner && owner !== existing.owner) {
    console.error(`❌ 释放失败：${avd} 的锁属于 ${existing.owner}，而你自称 ${owner}，不能代放`)
    process.exit(1)
  }
  fs.unlinkSync(LOCK_FILE(avd))
  console.log(`✅ 已释放：${avd}（原 owner=${existing.owner}, pid=${existing.pid}）`)
}

function status() {
  if (!fs.existsSync(LOCK_DIR)) { console.log('ℹ️ 暂无任何 deploy 锁'); return }
  const files = fs.readdirSync(LOCK_DIR).filter((f) => f.endsWith('.lock'))
  if (!files.length) { console.log('ℹ️ 暂无任何 deploy 锁'); return }
  console.log('当前 deploy 锁：')
  for (const f of files) {
    const avd = f.replace(/^deploy-/, '').replace(/\.lock$/, '')
    const rec = readLock(avd)
    if (!rec) continue
    const alive = pidAlive(rec.pid)
    console.log(`  - ${avd}: owner=${rec.owner} pid=${rec.pid} at=${rec.at} 状态=${alive ? '有效(占用中)' : '⚠️ 僵尸(pid已死)'}`)
  }
}

function clearLock(avd) {
  const file = LOCK_FILE(avd)
  if (!fs.existsSync(file)) { console.log(`ℹ️ ${avd} 无锁可清`); return }
  fs.unlinkSync(file)
  console.log(`🟢 已强制清掉 ${avd} 的锁`)
}

const [cmd, ...args] = process.argv.slice(2)
const opt = (k) => {
  const i = args.indexOf('--' + k)
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined
}

switch (cmd) {
  case 'acquire': acquire(false, opt('avd'), opt('owner') || process.env.LOCK_OWNER || 'unknown'); break
  case 'release': release(opt('avd'), opt('owner') || process.env.LOCK_OWNER); break
  case 'status': status(); break
  case 'clear': clearLock(opt('avd')); break
  default:
    console.log(`
deploy-lock — 模拟器独占写锁（防多人并发部署互相覆盖）

用法：
  node scripts/deploy-lock.js acquire --avd <vvd> --owner <who>
  node scripts/deploy-lock.js release --avd <vvd> --owner <who>
  node scripts/deploy-lock.js status
  node scripts/deploy-lock.js clear  --avd <vvd>

说明：acquire 前先确保当前没有 <vvd> 的活锁；有则报错退出。
      支持 PID 验尸：占锁进程已死则自动回收、接管。
`)
    process.exit(cmd ? 2 : 0)
}