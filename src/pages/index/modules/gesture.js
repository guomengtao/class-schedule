/**
 * 首页手势模块（2026-11-03 修订版 · 四向完备）
 *
 * 四个方向，全部「与列表纵向滚动正交」或「有严格起手区」：
 *   左滑  → 总课表（/pages/week-view，与底部中间那颗圆钮完全同一目标）
 *   右滑  → 退出应用（= 页面 onBackPress → exitApp）
 *   下拉  → 回到今天，**只有从顶栏区域起手才认**
 *   上滑  → 设置页，**只有从底部按钮区起手才认**
 *
 * ── v2 修了三个真机问题（用户 2026-11-02 反馈）────────────
 * ① 目标页错了：上一版进 /pages/full-schedule（完整课表），
 *    而底部中间那颗「总课表」圆钮 onclick 是 goToWeekView → /pages/week-view。
 *    现在直接调 self.goToWeekView()，行为与点按钮逐字一致（含 weekview_index 落盘）。
 *
 * ② 下拉误触：上一版只判「列表在顶部」，于是用户在课程区上下滑找第一节课时，
 *    也会被判成下拉并强行跳回今天。现在新增 **起点必须在顶栏区** 的硬条件
 *    （G.ty <= headLimit）。顶栏区 = 日期行 + 前后翻页那一行，约占屏高 20%。
 *    用户在列表中间下滑，无论如何都不会触发。
 *
 * ③ 左滑范围窄：上一版只挂了根节点 touch。Vela 里 touch 与 onswipe 是两条独立通道，
 *    可点击的课程卡片等元素会把触摸流吃掉，导致「只有某一块能滑进去」。
 *    现在补上 onswipe 通道：class-list 容器与每张课程卡片都挂 onCardSwipe，
 *    系统级手势识别不依赖触摸冒泡，覆盖面接近全屏。
 *    两条通道都命中时用 navOnce() 去重，避免连开两页。
 *
 * ④ 右滑退出失效（v3，用户 2026-11-02 反馈）：③ 里挂上 onswipe 之后，
 *    列表区的滑动被交给 JS 手势通道，**系统返回手势不再触发**，
 *    而 onCardSwipe 当时只认 left → 列表区右滑成了死手势
 *    （顶栏/底部没有 scroll，系统手势照常，所以只有中间退不出去）。
 *    现在 onCardSwipe 补 right 分支，直接调页面 onBackPress（内含 exitApp），
 *    与系统触发的行为逐字一致。onswipe 这条通道**不能撤**：
 *    撤了左滑又只剩根 touch，回到 ③ 的老问题 —— 两条通道缺一不可。
 *
 * ⑤ 四向完备 + 触觉反馈（v4，用户 2026-11-03 反馈）：
 *    - 上滑进设置，起手区严格限定在底部按钮区（G.ty >= footY），
 *      与下拉的顶栏起手构成镜像；中间列表区上滑仍然归 scroll（那是「看后面的课」）。
 *    - 底部按钮区挂 onBottomSwipe 第二通道，因为圆钮是可点元素会吃掉触摸流。
 *      ⚠️ 这条通道同样要接 right → backOnce：否则底部右滑重演 ④ 的死手势。
 *    - 四个方向统一在「动作执行前」震一次（buzzOnce，300ms 去重）。
 *      原来只在 move 判定成立时震，手指还没抬起就震完，与跳转错开，感知模糊。
 *
 * ── 三条红线（照抄 countdown 仓实证，勿改）──────────────────
 * ① touchmove 里绝不 setData：判定全程只写闭包变量。
 * ② 不做 opacity / transform / 位移动画。
 * ③ 阈值宁紧勿松。
 */

var device = require("@system.device")

// ── 阈值（192px 宽屏上的物理量）──────────────────────────
var MIN_DX = 34      // 左/右滑最小横向位移，约占屏宽 18%
var MIN_DY = 60      // 下拉/上划最小纵向位移，约占屏高 12%
var DOMINANCE = 2    // 主轴位移必须达到次轴的整数倍
var HEAD_RATIO = 0.2 // 顶栏区占屏高的比例，超过这里起手一律不算下拉
var FOOT_RATIO = 0.2 // 底部区占屏高的比例，起手低于 H−footLimit 才算上划

// 闭包状态：刻意不放进 data —— 每移动一次就 setData 正是历史崩溃的成因
var G = {
  tx: 0,
  ty: 0,
  lx: 0,
  ly: 0,
  armed: false,
  dir: '',
  inH: false,
  listTop: true
}

var tipTimer = null
var lastNav = 0
var lastBack = 0      // 右滑退出通道的去重（见 backOnce）
var lastBuzz = 0      // 触觉反馈去重：卡片 + 顶层容器会各报一次 swipe
var headLimit = 100   // 顶栏下边界，init 时按真实屏高算
var footY = 392       // 底部区上边界（490 − 98），init 时按真实屏高算

function buzz() {
  try {
    var vibrator = require("@system.vibrator")
    vibrator.vibrate({ mode: "short" })
  } catch (e) {}
}

/** 手势确认的统一反馈：300ms 内只震一次。
 *  双通道（touch + onswipe）与冒泡会把同一次滑动报多次，
 *  不去重会连震两三下，用户会以为手势触发了好几回。 */
function buzzOnce() {
  var now = Date.now()
  if (now - lastBuzz < 300) return
  lastBuzz = now
  buzz()
}

function reset() {
  G.armed = false
  G.dir = ''
}

/** 导航去重：touch 与 onswipe 双通道、以及冒泡重复触发，
 *  都可能让同一次滑动调用两次跳转。700ms 内的第二次一律丢弃。 */
function navOnce(fn) {
  var now = Date.now()
  if (now - lastNav < 700) return
  lastNav = now
  fn()
}

/** 右滑退出：与系统返回手势同一条语义链（页面 onBackPress → exitApp）。
 *
 *  为什么需要自己实现：列表区（<scroll> + 每张课程卡）挂了 onswipe 之后，
 *  Vela 把这次滑动交给 JS 手势通道，**系统返回手势不再触发**，
 *  而 onCardSwipe 只认 left，于是右滑在这块区域变成死手势
 *  —— 顶栏与底部没有 scroll，系统手势照常，用户看到的就是
 *  「上面下面能退出，中间列表退不出去」。
 *
 *  去重：一张卡 + 外层 scroll 会各报一次 swipe，700ms 内只处理第一次。
 *  失败兜底：onBackPress 返回 false（退出入口一个都不存在）时才退回 router.back()，
 *  与 docs/cannot-exit-analysis.md §7.2 同口径 —— 绝不 return true 却不做事。
 */
function backOnce(self) {
  var now = Date.now()
  if (now - lastBack < 700) return
  lastBack = now

  var handled = false
  try {
    if (typeof self.onBackPress === 'function') {
      handled = self.onBackPress() === true
    } else {
      // onBackPress 在本运行时不是实例方法时，直接走同一条退出链
      handled = require("../../data/utils.js").exitApp() === true
    }
  } catch (e) {}

  if (handled) return

  try {
    require("@system.router").back()
  } catch (e2) {}
}

function init(instance) {
  var self = instance

  // 顶栏下边界 / 底部区上边界：按真实屏高算。
  // 192×490 → 顶 98 / 底 392；212×520 → 顶 104 / 底 416。
  // 拿不到就退回 100 / 392（两种手环都够用）。
  try {
    device.getInfo({
      success: function (info) {
        var h = info && (info.screenHeight || info.windowHeight)
        if (h > 0) {
          headLimit = Math.round(h * HEAD_RATIO)
          footY = h - Math.round(h * FOOT_RATIO)
        }
      }
    })
  } catch (e) {}

  /** 快速添加横向滚动条：横向滑动留给它自己。
   *  只有展开、且出现课程标签条时才会走到这里，
   *  收起状态根本不会渲染该节点，所以不影响其他区域的左滑。 */
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
      return
    }

    // 右滑：与系统返回手势同义（退出应用）。
    // 顶栏/底部本来由系统直接处理，这里再挂一条是为了列表区 ——
    // 那一块被 <scroll> 与卡片吃掉，系统手势收不到（见文件头 ④）。
    if (!G.inH && dx >= MIN_DX && ax >= ay * DOMINANCE) {
      G.armed = true
      G.dir = 'right'
      return
    }

    // 下拉：三个条件同时成立才认
    //   ① 起点在顶栏区（v2 新增的硬条件，挡掉课程区里的误触）
    //   ② 列表已在顶部（否则那是「滚回上面看」）
    //   ③ 纵向主导且手指向下
    if (G.ty <= headLimit && G.listTop &&
        dy >= MIN_DY && ay >= ax * DOMINANCE) {
      G.armed = true
      G.dir = 'down'
      return
    }

    // 上划（v4）：起点必须落在底部区 —— 与下拉的顶栏起手镜像。
    // 中间列表区上划仍然归 scroll：那是「看后面的课」，不是导航。
    if (G.ty >= footY && dy <= -MIN_DY && ay >= ax * DOMINANCE) {
      G.armed = true
      G.dir = 'up'
    }
  }

  instance.onPageTouchEnd = function () {
    var dir = G.dir
    var armed = G.armed
    var dx = G.lx - G.tx
    var dy = G.ly - G.ty

    // reset() 不清 inH：子在父之前触发 touchstart，
    // 这里清掉会把快速添加区刚上报的标记抹掉。
    reset()
    G.inH = false

    if (!armed) return

    // 触觉反馈统一放在「动作执行前」：手指抬起那一刻震，与跳转同时发生。
    // 下拉交给 pullToToday 内部去震（它还要区分「已在今天」的提示态）。
    if (dir === 'left' && dx <= -MIN_DX) {
      buzzOnce()
      navOnce(function () { self.goWeekView() })
      return
    }
    if (dir === 'right' && dx >= MIN_DX) {
      buzzOnce()
      backOnce(self)
      return
    }
    if (dir === 'up' && dy <= -MIN_DY) {
      buzzOnce()
      navOnce(function () { self.goSettings() })
      return
    }
    if (dir === 'down' && dy >= MIN_DY) {
      self.pullToToday()
    }
  }

  /**
   * onswipe 通道：系统级快速滑动识别，不依赖触摸冒泡。
   * 挂在 class-list 与每张课程卡片上，补上 touch 收不到的区域。
   *
   * 左滑 → 总课表；
   * 右滑 → 退出（2026-11-02 补）：这条通道会把系统返回手势吃掉，
   *        不自己处理就等于把列表区的右滑变成死手势。上下划仍交给滚动。
   */
  instance.onCardSwipe = function (evt) {
    var dir = (evt && evt.direction) || ''
    if (dir === 'right') {
      buzzOnce()
      backOnce(self)
      return
    }
    if (dir !== 'left') return
    buzzOnce()
    navOnce(function () { self.goWeekView() })
  }

  /**
   * 底部区的 onswipe 通道（2026-11-03）。
   *
   * 为什么需要：上划进设置的起手区在底部按钮区，而三颗圆钮都是可点元素，
   * 会把触摸流吃掉 —— 只靠根节点 touch，起手落在圆钮上就永远认不到上划。
   *
   * ⚠️ 挂上 onswipe 就等于把这块区域的滑动从系统手势手里拿走，
   *    所以 right 必须自己接 backOnce（否则底部右划重演 11-02 的死手势）。
   *    这条与 onCardSwipe 是同一条教训，别只处理想加的那个方向。
   */
  instance.onBottomSwipe = function (evt) {
    var dir = (evt && evt.direction) || ''
    if (dir === 'up') {
      buzzOnce()
      navOnce(function () { self.goSettings() })
      return
    }
    if (dir === 'right') {
      buzzOnce()
      backOnce(self)
      return
    }
    if (dir === 'left') {
      buzzOnce()
      navOnce(function () { self.goWeekView() })
    }
  }

  /** 总课表：与底部圆钮同一目标、同一入口方法（含 weekview_index 落盘） */
  instance.goWeekView = function () {
    try {
      if (typeof self.goToWeekView === 'function') {
        self.goToWeekView()
        return
      }
    } catch (e) {}
    try {
      require("@system.router").push({ uri: "/pages/week-view" })
    } catch (e2) {}
  }

  /** 设置页：与底部右侧齿轮圆钮同一入口（openSettings）。
   *  页面没有这个方法时退回直跳 /pages/settings（路由已在 manifest 声明）。 */
  instance.goSettings = function () {
    try {
      if (typeof self.openSettings === 'function') {
        self.openSettings()
        return
      }
    } catch (e) {}
    try {
      require("@system.router").push({ uri: "/pages/settings" })
    } catch (e2) {}
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
      self.showPullTip = true
      if (tipTimer) clearTimeout(tipTimer)
      tipTimer = setTimeout(function () {
        tipTimer = null
        self.showPullTip = false
      }, 1200)
      return
    }

    setTimeout(function () {
      try {
        self.$element('classList').scrollTo({ top: 0, behavior: 'instant' })
      } catch (e) {}
    }, 60)
  }
}

module.exports = { init: init }
