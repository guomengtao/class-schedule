# position:fixed 黑屏方案 — 根因裁定（核实报告）

- 核实时间：2026-09-12 21:35
- 核实对象：position: fixed 导致手环黑屏的分析方案（含 `<stack>` 改造建议）
- 被核实代码：class-schedule HEAD 1197642（v1.4.203 / code 703）
- 裁定结论：方向部分对，根因与范围错。该方案不足以解决黑屏，且其中一条关键论据被本仓库自己证伪。

## 一、先说结论

| 问题 | 裁定 |
|------|------|
| 「黑屏元凶是 position: fixed 浮层」 | ❌ 不成立。代码里已经没有 fixed，且浮层在进页时根本不渲染 |
| 「不要改用 absolute，1000 下同样失效」 | ❌ 被本仓库证伪。全仓 absolute 用在 9 页 + 键盘近 200 处，且 4 个同写法页面不黑屏 |
| 「改用 `<stack>` 做浮层」 | 🟡 无害、可做，但不是这条 bug 的解 |
| 「以后禁用 fixed 就够了吗」 | 🟡 禁用可以做（已经做到了，0 处），但远远不够，它治不了这个黑屏 |

**真正的可疑方向**：根容器尺寸塌缩（min-height:100% / 缺显式宽高）+ 屏幕形状适配缺失

## 二、逐条取证

### 证据 1：前提已过期 —— 全仓 position: fixed = 0 处

commit c490e47  2026-09-12 19:29
"fix: remove position:fixed from overlays to fix black screen on bracelets"

```
-  position: fixed;
+  position: absolute;     (unlock-dialog.ux + premium-overlay.ux)
+  position: relative;     (5 个引用页的根容器)
```

被核实的方案写的是 `.sheet-overlay { position: fixed; }`——这是 19:29 修复前的快照。
当前实际：unlock-dialog.ux:98 与 premium-overlay.ux:75 均为 `position: absolute`。

也就是说：这份分析反对的「absolute + 父 relative」方案，作者已经在 19:29 上线了。

### 证据 2：因果链第一环就断了 —— 浮层进页时不渲染

unlock-dialog.ux：
```
private: { visible: false, ... }        // :35  初值 false
<div class="sheet-overlay" show="{{ visible }}" ...>   
```

visible:false → show 为假 → 不进渲染树。那么它什么时候才渲染？

全仓只有两处主动唤起，且都是用户点击付费功能时：
- qrcode-generator.ux:130  store.showUnlockDialog({...})
- vibration-lab.ux:368     store.showUnlockDialog({...})

5 个挂载页里，4 个（settings / qrcode-generator / vibration-lab / schedule-qrcode）没有任何进页自动弹窗逻辑。

schedule-manager 虽然在 onInit/onShow 调了 checkAndShowOverlay()（:129/:158），但它设置的是 self.showDialog = true（:164），弹的是它自己的本地浮层，不是 unlock-dialog。

→ 「进页即黑屏」不可能是 unlock-dialog 造成的——那一刻它不存在。

### 证据 3：「absolute 在 1000 下失效」被本仓库证伪

被核实方案的核心论据：absolute 从 1060 起才生效，minPlatformVersion:1000 下不生效，改完仍黑屏。

但本仓库里 position: absolute 的使用量：

| 位置 | 用量 |
|------|------|
| InputMethod.ux（自绘键盘） | 近 200 处，整块键盘就是 absolute 搭的 |
| 9 个页面 | schedule-manager / reset-data / homepage-settings / statistics / backup-restore / settings / lab / index-full / donation |

若 absolute 整体失效，键盘根本不可用。键盘能用（用户一直在录入课程名），就是 absolute 生效的直接反证。

更关键的是横向对照——「没报黑屏」的 4 个页面，浮层写法与「黑屏」页完全相同：

```css
/* backup-restore:561 / reset-data:416 / lab:246 / homepage-settings — 均为此写法 */
.overlay-modal {
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 100%;
  z-index: 1000;
}
```

settings.ux 自己也有一个同款 .overlay-bottom-sheet（:646-654，absolute + width/height 100%）。

同样的 absolute、同样的相对定位父级，4 个没事 5 个有事 → 变量不是 absolute。

### 证据 4：机理自相矛盾

方案说 absolute「不生效 / 被引擎忽略」。

「被忽略」= 元素退回普通文档流 = 布局错位，不会黑屏。

要产生「塌缩到左上角」，必须是引擎应用了 absolute、但忽略 right/bottom —— 这跟「不生效」是两种完全不同的失效。方案把两者混为一谈了，所以推不出它描述的症状。

### 证据 5：引用了错误的引擎

方案通篇引用华为快应用 FAQ（1060 / 1078 门槛）与 quickapp.cn（联盟）文档。

目标设备是小米手环 = Vela，是另一套运行时。华为 / 联盟的版本门槛不能套到 Vela 上。

仓库自己的描述才是 Vela 视角：docs/band9pro-black-screen-fix-plan.md ——「Vela 渲染引擎不支持 min-height:100%」「模拟器欺骗你」。

## 三、但方案蒙对了一个真问题

unlock-dialog 的 .sheet-overlay 是全仓唯一的结构性异类：

```css
/* unlock-dialog.ux:97-106 —— 四边定位，无显式宽高 */
.sheet-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;   /* ← 全仓唯一这么写的 */
}

/* 其它所有浮层：显式宽高 */
.overlay-modal / .overlay-bottom-sheet {
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 100%;
}
```

若引擎对 right/bottom 支持不全，这个浮层会塌缩到内容尺寸——这与「左上角一点可见」形态吻合。

但这只会在弹窗打开之后发生（用户点了付费功能），不是进页黑屏。且它塌缩时，背后应是页面内容而非黑屏。

→ 方案对了一个局部，错在了根因定性、影响范围和修复优先级。

## 四、真正的元凶更可能是：根容器塌缩

「内容全挤到左上角 + 其余是深色背景 #1a1a2e」是根容器没撑满的典型形态，与浮层无关。

仓库里早有两份针对同一症状的分析，根因都不是 fixed：

| 文档 | 根因 | 涉及页面 |
|------|------|----------|
| docs/index-band9pro-black-screen-analysis.md | 根容器无显式宽高（min-height:100% 依赖父高，方屏拿不到）+ 完全没有 @media (shape:) 适配 | index.ux（首页，无任何浮层） |
| docs/band9pro-black-screen-fix-plan.md | Vela 不支持 min-height:100%；config.json 的 window.backgroundColor 完全无效；Vela 固件条件渲染 bug 需 onShow 加 $forceUpdate() | 首页 |

**首页根本没有浮层却报同样症状——这是「浮层元凶论」最硬的反证。**

而且能与我第 10 轮的发现对上：全仓 27 处 @media (shape: capsule) 是无效值（Vela 官方是 pill-shaped），465 条声明从未生效。

→ 在米环 9/10 胶囊屏上，页面等于没有任何胶囊屏适配，这与当年 index.ux「完全没有 @media → 9 Pro 只渲染左上角」是同一类问题。

### min-height:100% 现存 8 处（Vela 风险项）：

donate:135、week-grid-demo:124、chinese-input-full:196、backup-restore:408、homepage-settings:335、vibration-lab:535、device-info:185、activation:604

⚠️ **诚实标注**：activation.ux:604 也有 min-height:100% 却据称正常，所以 min-height 是风险因素而非已证实的唯一原因。没有任何一个理论目前被真机证实。

## 五、回答「以后禁用 fixed 就够了吗」

不够。禁用 fixed 无害且已经做到（全仓 0 处），可以作为规范保留，但它治不了这个黑屏。

**真正该做的（按性价比排序）**：

1. 根容器一律 `width:100%; height:100%`，禁用 `min-height:100%` —— 清理上述 8 处
2. `@media (shape: capsule)` → `pill-shaped`（27 处）—— 否则胶囊屏零适配，465 条声明全是死的
3. 每个页面补 `@media (shape: rect)` —— 9 Pro 是 336×480 方屏
4. onShow 末尾加 `$forceUpdate()` —— 规避 Vela 固件条件渲染不重绘
5. `.sheet-overlay` 四边定位改成 `width:100%; height:100%` —— 与其它浮层统一（顺手：z-index:1000 留着无害，但快应用不支持 z-index，别指望它生效）
6. 不要依赖 `config.json` 的 `window.backgroundColor`（Vela 完全无效），背景必须靠 div 铺满

## 六、一个能一次性定案的真机实验（10 分钟）

| 步骤 | 操作 | 判读 |
|------|------|------|
| A | 打开 settings 页，不点任何东西 | 黑 → 浮层理论当场死亡（此刻浮层未渲染） |
| B | 在 settings 点一个付费功能，弹出解锁框 | 这时才黑 → 就是 .sheet-overlay 四边定位问题，改 width/height:100% 即可，与 fixed 无关 |
| C | 把 `<unlock-dialog>` 整行删掉，再进 settings | 还黑 → 与浮层完全无关，去查根容器（第 1/2/3 条） |

**建议先做 A，A 一旦为「黑」，整份方案就不用再讨论了。**

## 七、附：三份文档的根因冲突清单

仓库里现在有 4 份互相矛盾的黑屏根因文档，建议指定一份为准、其余标注废弃，否则下一轮还会重复争论：

| # | 文档 | 根因 | 修复 |
|---|------|------|------|
| 1 | docs/index-band9pro-black-screen-analysis.md | 无 @media 适配 + 根容器无显式宽高 | 补 media + 显式宽高 |
| 2 | docs/band9pro-black-screen-fix-plan.md | Vela 不支持 min-height:100% + 固件条件渲染 bug | 显式宽高 + $forceUpdate() |
| 3 | doc/position-fixed-手环渲染问题分析.md（19:29 新增） | position: fixed 塌缩 | fixed → absolute + 父 relative（已上线） |
| 4 | 本次被核实的方案 | fixed 版本不兼容，absolute 同样失效 | 改用 `<stack>` |

裁定：1 与 2 的证据强于 3 与 4（首页无浮层却同症状）。3 已上线且无害，可保留；4 建议不采纳。