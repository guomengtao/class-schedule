// 屏宽比例尺 —— 把「192 设计基准」的固定像素换算到当前屏幕（2026-10-25 +0800）
//
// 为什么不是 rpx：
//   Vela 官方《适配规范》给的自适应单位只有 px / % / dp，**没有 rpx**；
//   而 px 的缩放基准来自 manifest 的 config.designWidth —— 本项目写的是
//   "device-width"，也就是「1px = 1 物理像素，永不缩放」。
//   把 designWidth 改成数字（如 192）确实能让所有 px 自动按 屏宽/192 缩放，
//   但它是**全局**配置，会连带改掉 80 个页面的渲染（含 44px 状态栏留白），
//   与「只改这两个面板、改动面小可控」冲突，所以这里用页面级换算：
//     k = screenWidth / 192   ← 用户口径「按屏宽比例」
//     kv = screenHeight / 490 ← 纵向参考（10 Pro 480/490 ≈ 0.98，几乎不涨）
//
// 用法：
//   var fit = require("../../data/screen-fit.js")
//   var s = fit.scaleFor(d.screenWidth, d.screenHeight)
//   s.wide   → 是否宽屏（≥300，即 10 Pro 336 起）
//   s.k      → 横向比例
//   s.font   → 字号可用比例（受纵向预算压制，见下）
//
// 铁律：192 屏（手环 9）走「原样常量」分支，一个像素都不动；
//       只有 wide 屏才按比例重算，出问题也不会影响在售主力机型。

var BASE_W = 192
var BASE_H = 490

// 192×490 上正文档内容已占掉约 88% 高度（剩余面板实测 382/434），
// 所以字号不能直接乘 k（336 屏 k=1.75，字会撑破屏），
// 取 min(k, kv×1.14)：横向宽了但屏幕没变高时，宁可字小也不许溢出。
var V_CLAMP = 1.14

function num(v, dft) {
  var n = Number(v)
  return (isFinite(n) && n > 0) ? n : dft
}

function scaleFor(w, h) {
  var sw = num(w, BASE_W)
  var sh = num(h, BASE_H)
  var k = sw / BASE_W
  var kv = sh / BASE_H
  return {
    sw: sw,
    sh: sh,
    k: k,
    kv: kv,
    wide: sw >= 300,
    font: Math.min(k, kv * V_CLAMP)
  }
}

// 数值 → "NNpx"（Vela 只认 px，取整避免半像素模糊）
function px(n) {
  return Math.round(n) + "px"
}

module.exports = {
  BASE_W: BASE_W,
  BASE_H: BASE_H,
  scaleFor: scaleFor,
  px: px
}
