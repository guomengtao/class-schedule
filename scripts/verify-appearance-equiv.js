#!/usr/bin/env node
// week-view 外观系统回归工具：对比两份 week-view.ux 的「渲染状态」是否等价
//
// 用法：node scripts/verify-appearance-equiv.js [基准ref] [模板id...]
//   node scripts/verify-appearance-equiv.js HEAD                  # 工作树 vs HEAD，全部 6 个旧 id
//   node scripts/verify-appearance-equiv.js HEAD minimal-char     # 只验一个模板
//
// 原理：.ux 的脚本段是纯 JS（`export default` 导出对象，private 段是初始状态），
// 故可在 Node 里剥离 import/require 后实例化两份对象，分别调用 applyTemplate(id)，
// 再逐字段 diff 全部状态字段。比截图比对更直接：截图只能覆盖默认模板的一帧，
// 状态比对可覆盖「6 模板 × 5/7 天 × 胶囊/方屏」的全部组合。
//
// 依赖：旧实现按 TEMPLATE_CONFIGS 单维表，新实现按 LAYOUT_CONFIGS + PALETTE_CONFIGS 双维表，
// 因此脚本对两者的 applyTemplate 都只做黑盒调用，不感知内部结构。
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const REPO = path.resolve(__dirname, '..')
const FILE = 'src/pages/week-view/week-view.ux'
const BASE_REF = process.argv[2] || 'HEAD'
const ONLY = process.argv.slice(3)

const ALL_IDS = ['minimal-char', 'minimal-clean', 'standard-block', 'compact-grid', 'minimal-en', 'color-pastel']
const IDS = ONLY.length ? ONLY : ALL_IDS

// 屏型档：胶囊/方屏 × 5 天/7 天。屏宽取真机值，hideWeekend 影响列宽均分
const PROFS = [
  { name: '胶囊 192 · 5天', isCapsule: true,  screenWidth: 192, screenShape: 'capsule', hideWeekend: true  },
  { name: '胶囊 192 · 7天', isCapsule: true,  screenWidth: 192, screenShape: 'capsule', hideWeekend: false },
  { name: '方屏 336 · 5天', isCapsule: false, screenWidth: 336, screenShape: 'rect',    hideWeekend: true  },
  { name: '方屏 336 · 7天', isCapsule: false, screenWidth: 336, screenShape: 'rect',    hideWeekend: false }
]

// 引入的新字段：旧实现不存在，不参与 diff
const NEW_KEYS = ['currentLayoutId', 'currentPaletteId', 'paletteEmptyDot', 'showExtraBadge']

function buildInstance(src) {
  const m = src.match(/<script>([\s\S]*?)<\/script>/)
  if (!m) throw new Error('未找到 <script> 段')
  let code = m[1]
    .replace(/^\s*import\s+[\s\S]*?from\s*["'][^"']*["']\s*$/gm, '')
    .replace(/^\s*import\s+["'][^"']*["']\s*$/gm, '')
    .replace(/^\s*(const|let|var)\s+\w+\s*=\s*require\([^)]*\)\s*$/gm, '')
    .replace(/export default/, 'return ')
  const mod = new Function('log', 'Date', '"use strict";' + code)(function () {}, Date)
  const inst = {}
  const priv = mod.private || {}
  for (const k in priv) inst[k] = JSON.parse(JSON.stringify(priv[k]))
  for (const k in mod) if (typeof mod[k] === 'function') inst[k] = mod[k].bind(inst)
  return inst
}

function snapshot(inst, drop) {
  const out = {}
  for (const k in inst) {
    if (typeof inst[k] === 'function') continue
    if (drop.indexOf(k) !== -1) continue
    out[k] = JSON.stringify(inst[k])
  }
  return out
}

const baseSrc = execSync('git show ' + BASE_REF + ':' + FILE, { cwd: REPO, maxBuffer: 1 << 24 }).toString()
const curSrc = fs.readFileSync(path.join(REPO, FILE), 'utf8')

let diffCount = 0
let combos = 0
for (const prof of PROFS) {
  for (const id of IDS) {
    const a = buildInstance(baseSrc)
    const b = buildInstance(curSrc)
    for (const i of [a, b]) {
      i.isCapsule = prof.isCapsule
      i.screenWidth = prof.screenWidth
      i.screenShape = prof.screenShape
      i.hideWeekend = prof.hideWeekend
      i.applyTemplate(id)
    }
    const sa = snapshot(a, [])
    const sb = snapshot(b, NEW_KEYS)
    const diffs = []
    for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
      if (sa[k] !== sb[k]) diffs.push('  ' + k + ': base=' + sa[k] + '  cur=' + sb[k])
    }
    // 模板表达式等价性：新字段须与旧内联条件同真同假
    const oldBadge = a.currentTplId !== 'minimal-char' && a.currentTplId !== 'minimal-clean'
    if (b.showExtraBadge !== oldBadge) diffs.push('  showExtraBadge: 旧条件=' + oldBadge + ' 新=' + b.showExtraBadge)
    if ('paletteEmptyDot' in b && b.paletteEmptyDot !== !a.transparentCells) {
      diffs.push('  paletteEmptyDot: 旧条件=' + !a.transparentCells + ' 新=' + b.paletteEmptyDot)
    }
    combos++
    if (diffs.length) {
      diffCount += diffs.length
      console.log('✗ ' + prof.name + ' / ' + id)
      console.log(diffs.join('\n'))
    } else {
      console.log('✓ ' + prof.name + ' / ' + id + '  一致（' + Object.keys(sb).length + ' 字段）')
    }
  }
}
console.log('\n' + combos + ' 组合 · ' + (diffCount === 0 ? '全部零差异' : diffCount + ' 处差异'))
process.exit(diffCount === 0 ? 0 : 1)
