#!/usr/bin/env node
/**
 * png-measure —— 零依赖 PNG 像素测量：把"看起来靠左/歪/乱"变成可复核的数字
 *
 * 用法：
 *   node png-measure.js info  <a.png>                     # 尺寸
 *   node png-measure.js bands <a.png> <y0> <y1> [thr]     # 指定行区间内，每列的"亮像素"分布 → 找左右边界
 *   node png-measure.js rows  <a.png> <x0> <x1> [thr]     # 指定列区间内，每行的"亮像素"分布 → 找上下边界
 *   node png-measure.js color <a.png> <r> <g> <b> <tol>   # 某颜色的包围盒（如卡片底色）
 *
 * 说明：把像素当"亮"（>thr，默认 60）近似为"有内容/文字"；用于测量居中、边距、重叠。
 */
'use strict'
const fs = require('fs')
const zlib = require('zlib')

function decodePNG(file) {
  const buf = fs.readFileSync(file)
  if (buf.toString('latin1', 1, 4) !== 'PNG') throw new Error('不是 PNG')
  let pos = 8
  let w = 0, h = 0, bitDepth = 0, colorType = 0
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('latin1', pos + 4, pos + 8)
    const data = buf.slice(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') break
    pos += 12 + len
  }
  if (bitDepth !== 8) throw new Error('只支持 8bit，实际 ' + bitDepth)
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!ch) throw new Error('只支持 RGB/RGBA，colorType=' + colorType)
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(w * h * 3)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)]
    const line = Buffer.from(raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride))
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0
      const b = prev[i]
      const c = i >= ch ? prev[i - ch] : 0
      let v = line[i]
      if (ft === 1) v = (v + a) & 0xff
      else if (ft === 2) v = (v + b) & 0xff
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 0xff
      else if (ft === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
        v = (v + pr) & 0xff
      }
      line[i] = v
    }
    for (let x = 0; x < w; x++) {
      const s = x * ch
      const d = (y * w + x) * 3
      out[d] = line[s]
      out[d + 1] = line[s + 1]
      out[d + 2] = line[s + 2]
    }
    prev = line
  }
  return { w, h, px: out }
}

const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b

const [, , mode, file, ...rest] = process.argv
const img = decodePNG(file)
const { w, h, px } = img
const get = (x, y) => {
  const i = (y * w + x) * 3
  return [px[i], px[i + 1], px[i + 2]]
}

if (mode === 'info') {
  console.log(`${file}: ${w}×${h}`)
} else if (mode === 'bands') {
  // 行区间 [y0,y1] 内，统计每列亮像素数
  const y0 = +rest[0], y1 = +rest[1], thr = rest[2] ? +rest[2] : 60
  const cols = []
  for (let x = 0; x < w; x++) {
    let n = 0
    for (let y = y0; y <= Math.min(y1, h - 1); y++) {
      const [r, g, b] = get(x, y)
      if (lum(r, g, b) > thr) n++
    }
    cols.push(n)
  }
  const first = cols.findIndex((n) => n > 0)
  let last = -1
  cols.forEach((n, i) => { if (n > 0) last = i })
  const left = first, right = w - 1 - last
  console.log(`y∈[${y0},${y1}] 亮像素列范围: x=${first}..${last}  左边距=${first} 右边距=${right} 差=${first - right} (正=偏左)`)
  console.log('列直方(每列亮像素数): ' + cols.slice(Math.max(0, first - 3), last + 4).join(','))
} else if (mode === 'rows') {
  const x0 = +rest[0], x1 = +rest[1], thr = rest[2] ? +rest[2] : 60
  const rows = []
  for (let y = 0; y < h; y++) {
    let n = 0
    for (let x = x0; x <= Math.min(x1, w - 1); x++) {
      const [r, g, b] = get(x, y)
      if (lum(r, g, b) > thr) n++
    }
    rows.push(n)
  }
  const first = rows.findIndex((n) => n > 0)
  let last = -1
  rows.forEach((n, i) => { if (n > 0) last = i })
  console.log(`x∈[${x0},${x1}] 亮像素行范围: y=${first}..${last}  上边距=${first} 下边距=${h - 1 - last} 差=${first - (h - 1 - last)}`)
  console.log('行直方: ' + rows.slice(Math.max(0, first - 2), last + 3).join(','))
} else if (mode === 'runrow') {
  // 逐行色带：把一行按"颜色相近"合并成游程，用来判断卡片/遮罩/底页的真实边界
  const y = +rest[0]
  const tol = rest[1] ? +rest[1] : 12
  let start = 0
  const runs = []
  const close = (c1, c2) => Math.abs(c1[0] - c2[0]) <= tol && Math.abs(c1[1] - c2[1]) <= tol && Math.abs(c1[2] - c2[2]) <= tol
  let cur = get(0, y)
  for (let x = 1; x < w; x++) {
    const c = get(x, y)
    if (!close(cur, c)) {
      runs.push([start, x - 1, cur])
      start = x
      cur = c
    }
  }
  runs.push([start, w - 1, cur])
  console.log(`y=${y} 共 ${runs.length} 段色带（只列宽度≥8 的）：`)
  runs
    .filter((r) => r[1] - r[0] + 1 >= 8)
    .forEach((r) => {
      const [c1, c2, c3] = r[2]
      console.log(`  x=${String(r[0]).padStart(3)}..${String(r[1]).padStart(3)} 宽${String(r[1] - r[0] + 1).padStart(3)}  rgb(${c1},${c2},${c3})`)
    })
} else if (mode === 'color') {
  const [tr, tg, tb, tolRaw] = rest.map(Number)
  const tol = tolRaw || 12
  let minX = w, maxX = -1, minY = h, maxY = -1, cnt = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = get(x, y)
      if (Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol) {
        cnt++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (cnt === 0) console.log('未匹配到该颜色')
  else {
    console.log(
      `颜色 rgb(${tr},${tg},${tb})±${tol}: 命中 ${cnt} px，包围盒 x=${minX}..${maxX} (宽 ${maxX - minX + 1}) y=${minY}..${maxY} (高 ${maxY - minY + 1})` +
        `\n  左边距=${minX} 右边距=${w - 1 - maxX} 差=${minX - (w - 1 - maxX)} (正=偏左)`
    )
  }
} else {
  console.log('未知模式，见文件头用法')
}
