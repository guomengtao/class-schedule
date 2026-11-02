/**
 * 首页手势模块（2026-11-02）
 *
 * 只做两个手势，且都是「与列表纵向滚动正交」的：
 *   左滑  → 总课程（/pages/full-schedule）
 *   下拉  → 回到今天（复用 dayNav 的 goToToday）
 *
 * ── 为什么没有上滑 / 下滑 ────────────────────────────────
 * 中间课程列表是 scroll-y，占屏高 78%（192×490 上约 380px）。
 * 在滚动区里，上滑的第一语义永远是「继续往下看还有没有课」，
 * 和「换页面」抢同一块语义区 —— 位移一过阈值就必然误触，
 * 而且用户会连续三次预期落空（滑不动 → 再滑 → 才明白到底了）。
 * 这是语义冲突，不是参数没调好，所以纵向手势在首页一律不做。
 *
 * 左滑是横向位移，与纵向滚动正交；下拉只在 listTop 为真时判定，
 * 用户在列表中间下拉时仍然老老实实滚列表。
 *
 * ── 三条红线（照抄 countdown 仓的实证，勿改）──────────────
 * ① touchmove 里绝不 setData：判定全程只写闭包变量，只有真正跳转才动路由。
 *    countdown 实测「touch 回调里连续 setData → 应用退出」。
 * ② 不做 opacity / transform / 位移动画：整页 transform 会触发设备级重启。
 * ③ 阈值宁紧勿松：横向要求 ax >= ay*2 且 ax >= 40px。
 *    漏判只是「这次没滑动」，误判是「用户想滚列表，页面却被翻走了」，
 *    两者代价差一个数量级。
 */

var router = require("@system.router")

// ── 阈值（192px 宽屏上的物理量，改之前先读文件头）──────────
var MIN_DX = 40      // 左滑最小横向位移，约占屏宽 21%，防抖
var MIN_DY = 60      // 下拉最小纵向位移，约占屏高 12%
var DOMINANCE = 2    // 主轴位移必须达到次轴的整数倍

// 闭包状态：刻意不放进 data —— 每移动一次就 setData 正是历史崩溃的成因
var G = {
  tx: 0,
  ty: 0,
  lx: 0,
  ly: 0,
  armed: false,     // 本手势已认定方向，后续 move 不再重复判定
  dir: '',          // 'left' | 'down' | ''
  inH: false,       // 起点落在「快速添加」的横向滚动区 → 不参与手势
  listTop: true     // 课程列表是否在顶部
}

// 「已是今天」提示的定时器。放闭包里而不是挂到实例上，
// 避免给 vm 增加未声明属性（会走 setData 路径）
var tipTimer = null

function buzz() {
  try {
    var vibrator = require("@system.vibrator")
    vibrator.vibrate({ mode: "short" })
  } catch (e) {
    // 手环无马达或权限缺失时静默，不影响手势本身
  }
}

function reset() {
  G.armed = false
  G.dir = ''
}

function init(instance) {
  var self = instance

  /** 快速添加横向滚动条：横向滑动要留给它，不能被我们判成「左滑进总课程」。
   *  子节点 touchstart 先于父节点触发（冒泡由内向外），所以这里置的 flag
   *  父节点在 onPageTouchStart 时能读到。
   *  ⚠️ 若真机上在快速添加条上左滑仍然误跳，说明 Vela 的冒泡顺序或
   *  quick-add 的 touch 不透传，改成「按起点 y 坐标排除该区域高度带」。 */
  instance.onHScrollStart = function () {
    G.inH = true
  }
  instance.onHScrollEnd = function () {
    G.inH = false
  }

  /** 记录列表滚动位置。高频回调，只写闭包变量，绝不 setData */
  instance.onListScroll = function (evt) {
    var y = evt && evt.scrollY
    if (typeof y === 'number') G.listTop = y <= 0
  }

  instance.onPageTouchStart = function (evt) {
    var t = evt && evt.touches && evt.touches[0]
    if (!t) return
    G.tx = t.clientX
    G.ty = t.clientY
    G.lx = t.clientX
    G.ly = t.clientY
    reset()
  }

  instance.onPageTouchMove = function (evt) {
    var t = evt && evt.touches && evt.touches[0]
    if (!t) return
    G.lx = t.clientX
    G.ly = t.clientY
    if (G.armed) return

    var dx = G.lx - G.tx
    var dy = G.ly - G.ty
    var ax = dx < 0 ? -dx : dx
    var ay = dy < 0 ? -dy : dy

    // 左滑：横向主导，且起点不在快速添加的横向滚动区
    if (!G.inH && dx <= -MIN_DX && ax >= ay * DOMINANCE) {
      G.armed = true
      G.dir = 'left'
      buzz()
      return
    }

    // 下拉：纵向主导 + 列表已在顶部 + 手指向下
    // listTop 是必要条件：用户在列表中间下拉时，那是「滚回上面看」，不是「回今天」
    if (dy >= MIN_DY && ay >= ax * DOMINANCE && G.listTop) {
      G.armed = true
      G.dir = 'down'
      buzz()
    }
  }

  instance.onPageTouchEnd = function () {
    var dir = G.dir
    var armed = G.armed
    var dx = G.lx - G.tx
    var dy = G.ly - G.ty

    // 注意：reset() 不清 inH —— 子在父之前触发 touchstart，
    // 若这里清掉会把快速添加区刚上报的标记抹掉。
    // inH 只在本函数末尾复位：手指从哪里抬起都能归零，不会泄漏到下一次触摸。
    reset()
    G.inH = false

    if (!armed) return

    // 松手时位移仍然够才算数：滑一半缩回去 = 放弃，不跳转
    if (dir === 'left' && dx <= -MIN_DX) {
      self.goFullSchedule()
      return
    }
    if (dir === 'down' && dy >= MIN_DY) {
      self.pullToToday()
    }
  }

  /** 左滑目标：总课程。这是唯一值得用手势表达的导航 ——
   *  它是个「一眼看全周」的内容页，放在按钮区又挤又低频。 */
  instance.goFullSchedule = function () {
    try {
      router.push({ uri: '/pages/full-schedule' })
    } catch (e) {}
  }

  /** 下拉目标：回到今天。goToToday 已内置「已在今天则不动」，
   *  这里补一层反馈 —— 无反应会被当成功能坏了。 */
  instance.pullToToday = function () {
    var changed = false
    try {
      changed = self.goToToday()
    } catch (e) {}

    buzz()

    if (changed === false) {
      // 已在今天：手势被收到了，但没什么可动的。给个可见确认。
      self.showPullTip = true
      if (tipTimer) clearTimeout(tipTimer)
      tipTimer = setTimeout(function () {
        tipTimer = null
        self.showPullTip = false
      }, 1200)
      return
    }

    // 切日期后内容重建，滚动位置可能停在旧偏移，主动回顶
    setTimeout(function () {
      try {
        self.$element('classList').scrollTo({ top: 0, behavior: 'instant' })
      } catch (e) {}
    }, 60)
  }
}

module.exports = { init: init }
