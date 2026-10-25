# 字体表盘 watch-face-font · 336×480 双屏适配方案

> 单号：evtask-D-class-schedu-261025-gxfcpp
> 基线：手环 9 · 192×490 ｜ 目标：手环 10Pro · 336×480
> 前置：`watch-face-background`（a71c64c）、`watch-face-vibrate`（535a360）双屏适配已完成，
> 本文复用其探针手法与三条 Vela 限制结论，见 `docs/WatchFace-方形机械表盘-双屏适配方案.md` §10。

---

## §0 模拟器预算（先立字据）

| 阶段 | 模拟器部署 | 截图 | 说明 |
|---|---|---|---|
| 写方案（本文） | **0** | 0 | 只用源码 + 字体度量推算 |
| 实现 | 0 | 0 | 纯代码改，不上机 |
| 验收 | **2**（13000 / 13004 各一次冷部署） | 192 屏 1 张 · 336 屏 8 张 | 一次启动内靠点击遍历变体，不反复重启 |
| 合计 | **2** | 9 | 目标 ≤2 次部署；超 4 次即判方案有硬伤，回退改路子 |

上一块（方形机械）因三个 Vela 坑烧了 7 次部署。本块的风险点只有两个（变体 6 的行高常量、变体 7 的旋转原点），都已在下文给出确定做法，**不再用探针试错**。

---

## §1 现状解剖

页面 428 行，9 个变体靠 `if="{{ isXxx }}"` 互斥挂载，`mode` 存 `wf_font_style`。全部是「文字块 + flex 居中」，**没有表壳、没有刻度、没有绝对定位的图形**（唯一例外是变体 7）。

| # | 变体 | 容器/元素 | 192 基线 | 定位方式 |
|---|---|---|---|---|
| 0 | 巨型加粗 | `.d-clock`（单 text "88:88"） | 68px bold · ls 4 | flex 居中 |
| 1 | 等宽数码 | `.dgt-mono`×4 + `.colon-blink` | 48 / 44 · 冒号 opacity 动画 | flex row |
| 2 | 逐字渐变 | `.digit`×4 + `.colon` | 60 / 44 · 内联 color | flex row |
| 3 | 错落双行 | `.st-h` / `.st-m` | 72 ls8 / 40 ls12 mt8 | flex column |
| 4 | 细边描签 | `.thin-t` | 64 ls6 | flex 居中 |
| 5 | 等宽秒带 | `.m-time` + `.m-track`/`.m-bar` | 52 mb18 / 轨 90×6 | flex column，`secPct` 动态 width |
| 6 | 翻页滚动 | `.col`×4 + `.di`×40 + `.c` | 列 26×56 · 字 40 · `ITEM_H=56` | **JS 常量与 CSS 行高硬耦合** |
| 7 | 横铺跑道 | `.rot` > `.line` > `.d`/`.colon` | 60 lh64 / 44 · rotate(-90°) origin **96,245** | **绝对定位 + 硬编码原点** |
| — | 按钮 | `.btn-switch` / `.back` | 24 / 22 | flex column 尾部 |

**结论：这不是「缩放的活」，是「字号分档 + 两个常量动态化 + 一个原点重算」的活。**

---

## §2 路线选择

| 路线 | 做法 | 判定 |
|---|---|---|
| A 整体 `transform: scale(1.75)` | 套在 `.page` 或包一层 stage | ❌ 否决。① 480 < 490，等比放大必然纵向溢出；② 文字位图缩放会发虚（软件渲染，前两块是图形缩放所以没暴露）；③ origin 默认 0 0，flex 居中块缩放后会偏移 |
| B 逐元素宽屏类（15 个 `.w-*`） | `fitScreen()` 异步探针填 class 名 | ✅ **采用**。文字按 px 重排 = 原生清晰；不动结构 = 不动 40 个 `.di` 的 `for`；沿用前两块已跑通的「单类选择器 + 动态 class 字段」范式 |
| C 不放大，只修变体 7 原点 | 最小改动 | ⚠️ 保底。192 屏零回归，但 336 屏上"88:88"只占 234/336 宽、上下大片空 —— 用户明确要「适配」不是「能显示」，仅作为 B 失败时的回退 |

选 B，理由：页面本体是纯文字，横向空间是唯一约束，逐类给字号最可控，且失败面小（某一变体超宽只影响那一变体，不影响其他）。

---

## §3 宽屏数值表（含字宽验算）

字宽模型：Roboto 类无衬线，数字 advance ≈ 0.5686em、等宽 ≈ 0.60em、冒号 ≈ 0.2727em；`letter-spacing` 按 n+1 份计入。**判定线：横向占宽 ≤ 296px（两侧各留 ≥20px）**。

| 元素 | 192 | 336 目标 | 系数 | 占宽验算 | 判定 |
|---|---|---|---|---|---|
| `.d-clock` | 68 / ls4 | **96 / ls6** | 1.41 | 4×54.6 + 26.2 + 6×6 ≈ **280** | ✅ 余 28 |
| `.dgt-mono` | 48 | **72** | 1.50 | 4×43.2 = 173 | ✅ |
| `.colon-blink` | 44 / m0 4 | **66 / m0 6** | 1.50 | 39.6 + 12 | ✅ |
| `.digit` | 60 | **90** | 1.50 | 4×51.2 + 24.5 ≈ **229** | ✅ |
| `.colon`（**仅变体 2**） | 44 | **66** | 1.50 | 同上组内 | ✅ |
| `.st-h` | 72 / ls8 | **108 / ls12** | 1.50 | "88" → 2×61.4 + 24 ≈ 147 | ✅ |
| `.st-m` | 40 / ls12 / mt8 | **60 / ls18 / mt12** | 1.50 | 2×34.1 + 36 ≈ 104 | ✅ |
| `.thin-t` | 64 / ls6 | **96 / ls8** | 1.50 | 同变体 0 ≈ 290（细体略窄） | ✅ |
| `.m-time` | 52 / mb18 | **78 / mb26** | 1.50 | "88:88" 5×46.8 ≈ **234** | ✅ |
| `.m-track` | 90×6 | **156×6** | 1.73 | 居中于 234 文字下方 | ✅ |
| `.col` | 26×56 | **44×84** | 1.50 | 4 列 + 冒号 ≈ 44×4+30 ≈ 206 | ✅ |
| `.di` | 26×56 / f40 / lh56 | **44×84 / f56 / lh84** | 1.50 | 单字 31.8 < 44 | ✅ |
| `.c` | 40 | **56** | 1.40 | — | ✅ |
| `.rot` | origin 96,245 | **origin 168,240** | — | 见下 | ✅ |
| `.btn-switch` | 24 / mt40 | **28 / mt52** | — | ≥24 合规 | ✅ |
| `.back` | 22 | **24（全局改，不分屏）** | — | 22 < 24 下限，顺手修 | ✅ |

**两处刻意不按 1.5 走**：

1. **变体 0 / 4 只用 1.41**：单 text 连写含冒号，1.5 倍（102px）占宽 296+，擦线。96px 留 28px 余量，视觉上与 108px 的双行 H 仍是同一量级。
2. **变体 7 完全不放大**：`.line` 是 4 字 × lh64 + 冒号 ≈ **309px 高的竖列**，rotate(-90°) 后横长 ≈309。192 屏上本来就溢出（两侧各切 ~58px，这是"跑道"的设计意图）；放到 336 屏刚好两侧余 13px —— **不放大反而是正确解**，只需把原点换到屏心。

**变体 7 原点推导**：`.rot` 是 `left/top/right/bottom:0` 撑满页面的绝对定位块，`transform-origin: 96px 245px` = 旧屏心（192/2, 490/2）。新屏心 = (336/2, 480/2) = **(168, 240)**。注意纵向是 **240 不是 245**——480 比 490 矮 10px，这里必须改。

---

## §4 改动清单

### 4.1 模板（15 处 class 绑定，结构零改动）

模式统一为 `class="原类 {{ 宽屏类字段 }}"`（**混写，不能整个替换** —— 纯动态 class 会丢父类样式，前两块已各踩一次）：

```html
<text class="d-clock {{ bigCls }}">            <!-- 变体 0 -->
<text class="dgt-mono {{ monoCls }}">          <!-- 变体 1 ×4 -->
<text class="colon-blink {{ blinkCls }}">      <!-- 变体 1 -->
<text class="digit {{ digitCls }}" ...>        <!-- 变体 2 / 8 ×8 共用 -->
<text class="colon {{ colonCls }}" ...>        <!-- ⚠️ 仅变体 2 加；变体 7 的 .colon 不加 -->
<text class="st-h {{ sthCls }}"> / <text class="st-m {{ stmCls }}">
<text class="thin-t {{ thinCls }}">
<text class="m-time {{ mtimeCls }}"> / <div class="m-track {{ trackCls }}">
<div class="col {{ colCls }}"> ×4 / <div for=... class="di {{ diCls }}"> / <text class="c {{ cCls }}">
<div class="rot {{ rotCls }}">                 <!-- 仅换 origin -->
<text class="btn-switch {{ btnCls }}">
```

变体 7 内部 `.d` / `.colon` **一个字不动**。

### 4.2 CSS（15 个单类块，全部追加在文件尾部）

```css
/* ── 宽屏 336×480（手环 10Pro）── 单类选择器：Vela 不支持后代选择器 */
.w-big   { font-size: 96px;  letter-spacing: 6px; }
.w-mono  { font-size: 72px; }
.w-blink { font-size: 66px;  margin: 0 6px; }
.w-digit { font-size: 90px; }
.w-colon { font-size: 66px; }
.w-sth   { font-size: 108px; letter-spacing: 12px; }
.w-stm   { font-size: 60px;  letter-spacing: 18px; margin-top: 12px; }
.w-thin  { font-size: 96px;  letter-spacing: 8px; }
.w-mtime { font-size: 78px;  margin-bottom: 26px; }
.w-track { width: 156px; }
.w-col   { width: 44px;  height: 84px; }
.w-di    { width: 44px;  height: 84px; font-size: 56px; line-height: 84px; }
.w-c     { font-size: 56px; }
.w-rot   { transform-origin: 168px 240px; }
.w-btn   { font-size: 28px; margin-top: 52px; }
```

同类名同权重、写在 `.rot` 之后 → `.w-rot` 覆盖 `transform-origin`（与 `.w-dial` 覆盖 `scale` 同款，已验证）。

### 4.3 JS（3 处）

**① 新增 2 个数值字段 + 15 个类名字段**（默认值 = 192 基线，即空串 / 56 / 90）：

```js
// data
bigCls: "", monoCls: "", blinkCls: "", digitCls: "", colonCls: "",
sthCls: "", stmCls: "", thinCls: "", mtimeCls: "", trackCls: "",
colCls: "", diCls: "", cCls: "", rotCls: "", btnCls: "",
rowH: ITEM_H,     // 56 → 84
trackW: 90        // 秒带宽度 90 → 156
```

**② 两个常量吃掉 `this`**（这是本块唯一的算法改动）：

```js
// tick() 内
const p = Math.round(s / 60 * this.trackW)      // 原：* 90 硬编码
const y0 = Math.floor(h / 10) * this.rowH       // 原：* ITEM_H
const y1 = (h % 10) * this.rowH
const y2 = Math.floor(m / 10) * this.rowH
const y3 = (m % 10) * this.rowH
```

`ITEM_H` 常量保留（作 `rowH` 初值），避免其他位置引用断裂。

**③ `onReady` 里调 `fitScreen()`**，异步探针（**必须异步**，同步 `getInfo()` 在 192 屏会读到 ≥300）：

```js
fitScreen() {
  const self = this
  try {
    device.getInfo({
      success: function (d) {
        const w = (d && d.screenWidth) || 0
        if (w < 300) return          /* 192 屏：一个字段都不填，零回归 */
        self.bigCls = "w-big";   self.monoCls = "w-mono"
        self.blinkCls = "w-blink"; self.digitCls = "w-digit"
        self.colonCls = "w-colon"; self.sthCls = "w-sth"
        self.stmCls = "w-stm";   self.thinCls = "w-thin"
        self.mtimeCls = "w-mtime"; self.trackCls = "w-track"
        self.colCls = "w-col";   self.diCls = "w-di"
        self.cCls = "w-c";       self.rotCls = "w-rot"
        self.btnCls = "w-btn"
        self.rowH = 84
        self.trackW = 156
        self.tick()                  /* 立刻按新 rowH/trackW 重算一次，不等下一秒 */
      }
    })
  } catch (e) {}
}
```

新增 `import device from "@system.device"`。

---

## §5 零回归口径（192 屏）

1. `w < 300` → `fitScreen` 直接 return，15 个类名保持 `""`、`rowH=56`、`trackW=90` → 模板解析出的 class 与 style 与改前**逐字节相同**。
2. CSS 只新增 `.w-*`，不改任何既有规则 → 192 屏不命中。
3. 唯一有意改动：`.back` 22 → 24px（可读文字下限，全局）。
4. 变体 6 的 `ITEM_H` 引用仍在，`rowH` 初值即 `ITEM_H` → 192 屏算法结果不变（56×n）。

---

## §6 已知坑（沿用前两块结论，不重新试错）

| 坑 | 表现 | 规避 |
|---|---|---|
| 不支持后代选择器 | `.w-page .dial { }` 退化为 `.dial { }`，宽屏样式污染 192 屏 | 全部单类 `.w-xxx` |
| 纯动态 class 丢父类 | `class="{{ cls }}"` 丢 `.page` 的 flex/position | 一律混写 `class="原类 {{ 字段 }}"` |
| 同步 `getInfo()` 取错宽 | 192 屏读到 ≥300 | 只用异步回调 |
| 变体 6 行高双写 | `.w-di` 里 84 与 `rowH` 84 必须同改，改一处 = 数字跳位/错行 | 代码旁加注释互指 |
| 变体 2/7 共用 `.colon` | 给 `.colon` 加宽屏字号会连带放大变体 7 | 宽屏类只挂在**变体 2 那个元素**上，变体 7 不加 |
| 变体 7 竖排长度 | lh64×4+冒号 ≈ 309，放大到 1.5 就是 380 > 336 必切字 | 变体 7 保持原生尺寸 |

---

## §7 验收

**功能**：9 个变体在 336 屏逐个可见、无切字、无重叠；`mode` 存储跨页返回仍生效；192 屏回归默认态不变形。

**截图预算（2 次部署）**：

- `emulator-13000`（192）：冷部署 → 截 **1 张**（默认态变体 0）。其余变体 CSS 未命中，靠 §5 逻辑论证，不实拍。
- `emulator-13004`（336）：冷部署 → 截变体 0（0 次点击）、2（2 次）、3（+1）、5（+2）、6（+1）、7（+1）共 **6-8 张**，逐张 md5 去重、非空校验（0 字节废片 = 假证据）。

**判定**：变体 6 看四列数字是否落在同一水平线（rowH 对齐）、变体 7 看斜跑道是否居中不偏（origin）。

---

## §8 风险与未闭环

| 项 | 风险 | 处置 |
|---|---|---|
| 字宽估算误差 | Roboto 模型 ±10%，变体 0 占宽 280 → 最坏 308，仍 <336 | 验收实拍确认；超宽则 96→88 一档下调 |
| 变体 6 `scrolltop` 与 84 行高 | 若 Vela 内部按像素吸附，可能有 1-2px 抖动 | 实拍逐列比对；不接受则退回 56 行原尺寸（变体 6 单独不放大） |
| 长按/点击遍历效率 | 模拟器无 `input` 命令，只能人工点 | 一次启动内点完，不重启 |
| `wf_font_style` 跨重启 | `page` 命令清应用存储，持久化无法验证 | 与前两块同，记录为已知未闭环 |
