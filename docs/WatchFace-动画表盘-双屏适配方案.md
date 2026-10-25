# 动画表盘 watch-face-animated 双屏适配方案

- 任务单：`evtask-D-class-schedu-261026-btnper`
- 目标：手环10Pro **336×480** 观感对齐，手环9 **192×490** 零回归
- 涉及文件：`src/pages/watch-face-animated/watch-face-animated.ux`（433 行）

---

## §1 与前三块几何表盘的本质差异

evpointer / metal / gold 的盘内节点坐标**全写在 CSS 字面量类里**，父级 `scale()` 一放就完事。animated 不是：

| 差异 | 后果 |
|---|---|
| 秒环 60 格 `left/top` 由 `buildDots()` 用 `CX/CY/R` 常量算出，走**数据绑定** | 改 CSS 对 60 格完全无效，必须改 JS 常量并重跑 |
| 游标 + 两级拖尾每秒 `placeCur()` 按极坐标实时算 | 常量改了自动跟随，但**不能 scale**（scale 会把 60 个绑定坐标一起放大，圆心也偏） |
| `.dg` 的 `top` 写在**内联 style**（`style="top: 186px"`） | 内联优先级高于 class，`.w-dg { top: … }` 改不动，必须改成绑定 |
| `rollTo()` 里 `mmTop = -mmIdx * 100` 硬编码行高 100 | 改字号→改行高，**步长不同步就错位**（数字带滚半格） |

所以本块**不走 scale 路线**，走「JS 常量 + CSS 单类双改」。好处是不动结构。

## §2 硬约束（沿用头注释五条，全部仍生效）

① 禁 transform 数据绑定；② 禁 scroll+scrolltop；③ 禁群组选择器；④ `.page` 只 100%/relative；⑤ keyframes 只放字面量、只挂纯色无文字节点。

新增一条：**宽屏类必须全部单类**，且动态 class 混写 `class="dg {{ dgCls }}"`（纯动态丢父类样式）。

## §3 纵向预算（480 比 490 少 10px，纵向只能微调）

| 元素 | 192×490 | 336×480 | 说明 |
|---|---|---|---|
| `.brand` | top 6 / 12px / w192 | top 4 / 18px / w100% | 铭文，18px 即可 |
| `.halo` | 26,26 · 140 · r70 | 84,28 · **168** · r84 | 光带 10→12px |
| `.haloIn` | 36,36 · 120 · r60 | 96,40 · 144 · r72 | 与 halo 同心 |
| **CX / CY / R** | 96 / 96 / 66 | **168 / 112 / 80** | R = 84−4，与基线同口径 |
| DOT / DOT_M | 5 / 7 | 6 / 9 | 刻度略加粗 |
| CUR / T1 / T2 | 14 / 12 / 10 | 17 / 14 / 12 | 游标等比 |
| `.sec` | top 70 / 40px | top 87 / 44px / w100% | 中心 87+25=112=CY |
| `.seclab` | top 120 / 10px | top 141 / 16px / w100% | 铭文豁免 |
| `.dg` | **内联** 186 / 96 / lh100 | dgTop **196** / 100 / lh104 | 必须改绑定 |
| `.mmTen` | 42,290 · 55 / 96 | 110,300 · 58 / 100 / lh104 | 两字中心 168 |
| `.mmWin` | 95,290 · 55×100 | 168,300 · 58×**104** | 窗高 = 行高 |
| `.mmStrip/.mmDig` | 55×100 / 96 lh100 | 58×104 / 100 lh104 | ⚠ 行高 104 |
| `.date` | 404 / 14px | 406 / **24px** | 可读文字 |
| `.hint` | 432 / 11px | 440 / **24px** | 可读文字 |

验算：28–196（环）→ 196–300（HH）→ 300–404（MM）→ 406–436（date）→ 440–470（hint），底部余 10px。

## §4 代码改动

**模板 8 处**
1. `.brand` → `class="brand w-brand"`（或纯静态加绑定）
2. `.halo` / `.haloIn` → 加 `w-halo` / `w-haloIn`
3. `.sec` / `.seclab` → 加 `w-sec` / `w-seclab`
4. `.dg` → `class="dg {{ dgCls }}" style="top: {{ dgTop }}px"`（去内联常量）
5. `.mmTen` / `.mmWin` / `.mmStrip` / `.mmDig` → 加 w 类
6. `.date` / `.hint` → 加 w 类

**脚本**
- 常量 `CX/CY/R/DOT/DOT_M/CUR/TRAIL1/TRAIL2/ROW` 由 `const` 改 `let`（默认 192 值）
- `rollTo()` 的 `-mmIdx * 100` → `-mmIdx * ROW`
- 新增 `fitScreen()`，**从 `onInit` 调**（本仓 `onReady` 可能不触发），页内 `require("@system.device")`：
  ```js
  onInit() {
    this.buildDots()
    this.tick()
    this.fitScreen()
  }
  fitScreen() {
    const self = this
    try {
      const dev = require("@system.device")
      dev.getInfo({ success: function(d) {
        const w = d && d.screenWidth ? d.screenWidth : 0
        if (w < 300) return
        CX = 168; CY = 112; R = 80
        DOT = 6; DOT_M = 9; CUR = 17; TRAIL1 = 14; TRAIL2 = 12; ROW = 104
        self.dgCls = "w-dg"; self.dgTop = 196
        self.buildDots()          // 重算 60 格
        self.placeCur(new Date().getSeconds())
      }, fail: function() {} })
    } catch (e) {}
  }
  ```

## §5 风险

| 风险 | 对策 |
|---|---|
| `buildDots()` 二次调用 60 节点全量重绘 → 首帧闪烁 | 一次性，且发生在初始化阶段（无动画进行中） |
| `mmWin` 窗高与行高不一致 → 数字被裁半 | 窗高/`mmStrip`/`mmDig` 三者都写 104 |
| 行高改了步长没改 → 数字带滚半格 | `rollTo` 用 `ROW` 常量，禁止再写字面量 |
| `.dg` 仍留内联 top → 宽屏无效 | 已改绑定 `{{ dgTop }}` |
| 光晕 keyframes 受影响 | 只改 opacity，未触碰 |

## §6 验收标准

- **336**：秒环外径 168、圆心 (168,112)、60 格沿环均匀（无椭圆）、三级游标压在环上；HH 与 MM 不重叠不截字，MM 个位窗内数字完整（不含上下邻字）；date / hint 24px 不截字
- **192**：除 date 13→24px、hint 11→24px 外像素零变化；秒环位置、圆心、走时、分钟滚动均与基线一致

## §7 部署账目预算

构建 1 次 + 双机部署 1 次 + 首屏黑屏重拉（固定动作）；若 336 需回改再次构建 1 次，合计 ≤3 次。

## §8 实施回填（2026-10-26 07:32–07:36）

**代码改动**（`src/pages/watch-face-animated/watch-face-animated.ux`，433 → 563 行）：

| 位置 | 改动 |
|---|---|
| 模板 | 11 处混写绑定 `brandCls / haloCls / haloInCls / secCls / seclabCls / dgCls / mmTenCls / mmWinCls / mmDigCls / dateCls / hintCls`；`.dg` 内联 `style="top: 186px"` → `style="top: {{ dgTop }}px"` |
| 常量 | `const CX/CY/R` → `let`（96/96/66），新增 `let ROW = 100` |
| data | 11 个 `*Cls: ""` + `dgTop: 186` |
| `onInit` | 末尾调 `this.fitScreen()` |
| 新增 `fitScreen` | 页内 `require("@system.device")` 异步取宽，`w < 300` 直接返回；命中时改写 `CX=168 / CY=112 / R=80 / ROW=104`、置 11 个类、`buildDots()` 重算 60 格、`placeCur()` 让游标立刻归位 |
| `rollTo` | `-mmIdx * 100` → `-mmIdx * ROW` |
| CSS | 新增 11 个 `.w-*` 单类块；`.date` 404/14px → **400/24px**；`.hint` 432/11px → **434/24px** |

**60 格与游标一行未改**：它们是数据绑定坐标，常量一改自动跟随（本块「盘内零改动」的等价物）。

**实测（像素量化，非目测）**

| 指标 | 336×480 | 192×490 | 结论 |
|---|---|---|---|
| 游标角度 | 59.4° → 第 10 秒 | 59.3° → 第 10 秒 | 与画面秒数 10 一致，两屏同形 |
| 游标半径 | 79.5（理论 80） | 65.7（理论 66） | 常数改写生效 |
| 环四向半径 | 右 82 / 左 84 / 下 82 | 右 68 / 左 70 / 下 68 | 正圆，无椭圆 |
| 刻度带中位半径 | 82 | 68 | 理论 80±4 / 66±4 |
| date 行 ink | 412–431 | 406–425 | 完整不裁 |
| hint 行 ink | 445–465 | 439–459 | 与 date 间距 14px，可读 |

> 注：测环时「上=104」是品牌 EV 文字被同一颜色阈值误判，不是刻度越界。

**部署账目**：构建 1 次（14s）+ 部署 1 次；首屏两台全黑（353 / 549 B），`am stop` 重拉 + 等 26s 即正常——与 metal / gold 完全同款，未改代码。

**遗留**：分钟个位上滚的「数字带整格滚动」无法在静态截图验证（需观察跨分钟瞬间）；已用「窗高 = mmDig 高 = ROW = 104」三点一致控制，逻辑上无裁切/半格风险。
