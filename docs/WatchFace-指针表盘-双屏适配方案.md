# 指针表盘 watch-face-evpointer · 双屏适配方案（192×490 → 336×480）

> 单号：`evtask-D-class-schedu-261026-s7rswk`　认领：`workbuddy-20261025-1929-53bf-x26`
> 状态：**方案阶段**（代码未动，0 次模拟器）

## §0 模拟器预算

| 阶段 | 部署次数 | 内容 |
|---|---|---|
| 方案 | **0** | 只读代码 + 算几何 |
| 实现 | 0 | 构建不做，等开工一起 |
| 验收 | **2** | 192 屏 1 张（零回归）+ 336 屏 1 张（单状态页，无变体可遍历） |

超过 **4 次**即判方案有根本问题，停下来复盘。参照：前五块实际 1 / 1 / 1 / 7 / 8 / 12 次，最后两块主要烧在取证链路上（见项目 MEMORY.md 的取证方法论）。

## §1 现状

`src/pages/watch-face-evpointer/watch-face-evpointer.ux`，422 行，未适配。

**结构**（全部是 184×184 固定像素坐标系）：

| 区块 | 节点数 | 内容 |
|---|---|---|
| 品牌 | 2 | `.brand`（EV，22px）+ `.brand-sub`（指针表盘，11px） |
| 盘壳 | 3 | `.ring-outer` 184 / `.ring-mid` 168@8 / `.dial-face` 148@18，三层同心 |
| 刻度 | 12 | `.tick` 2×10，静态字面量 `rotate(0…330deg)`，`left/top` 内联 |
| 地支 | 12 | `.gan` 20×20 / 14px，内联 `left/top` |
| 三针 | 3 | `.hour` 89.5,92 / `.minute` 90,92 / `.second` 91,92，顶部中点压盘心 (92,92) 向下延伸 |
| 盘心 | 2 | `.hub` 16×16@84 / `.ev` 铭文 10px |
| 底部 | 3 | `.date-line` 13px@360 / `.time-line` 34px@386 / `.back` 12px@444 |

**合计盘内 32 个节点**，坐标全部相对 `.dial-wrap`（184×184，位于 `left:4px; top:153px`）。

**走针机制**（注释里写死的三条引擎坑，2026-10-19 标定）：
- 不用 `transform: rotate({{deg}})` 数据绑定 → 整页黑屏；
- 不用 `@keyframes` 承载当前时刻 → 指针角度与盘面时间对不上、周期性消失；
- 引擎旋转轴 = **元素顶部中点**，`transform-origin` 不按 CSS 语义生效；
- 角度走 **60 档字面量类 `.r0…​.r59`**（内部 `rotate(180 + 6N)`），时钟只改 class 名。

## §2 判断：走父级 scale，不做字号分档

**这块和背景/字体两块不同，反而和方形机械表盘同族。**

- 字体表盘是纯文字 + flex 居中，scale 会让文字位图发虚 → 只能逐字分档；
- 本页是**几何图形**：三层同心环、刻度、地支、指针，全部在 184 坐标系里，且有严格的圆心/半径关系。若逐节点改坐标（32 个节点 × 2 个值 = 64 个数），几何必崩。
- **父级 `transform: scale()` 一次放大整个 `.dial-wrap`，32 个盘内节点零改动**，圆心、半径、刻度角、针长比例天然全部正确。

已验证能力（2026-10-25 方形机械表盘实测）：
- `transform: scale()` 可用；
- `transform-origin` 默认 `0 0`（左上），**不是中心** → 视觉左上 = 布局左上，`left/top` 直接写目标位置，不用算中心补偿；
- **父级 scale 带动绝对定位子块**，子块 `left/top` 按同一比例缩放；
- **子元素自身 `rotate` + 父级 `scale` 叠加正常**（方形机械 9 根指针宽屏指位正确）。

第四条是本页最关键的前置结论：三针的 `.rN` 字面量旋转不需要任何改动。

### 为什么取 1.5 而不是 1.7

| scale | 盘径 | 左右余量 | 纵向余量 | 备注 |
|---|---|---|---|---|
| 1.5 | **276** | 30 / 侧 | 480−276=204 | 2px 刻度 → 3px，**整数倍**，不出半像素 |
| 1.7 | 313 | 11.5 / 侧 | 167 | 表盘贴边；2px → 3.4px 出半像素；六行文字只剩 167 装 157，擦线 |

取 **1.5**。

## §3 纵向预算（336×480）

| 元素 | 192 屏 top | 宽屏 top | 宽屏字号 | ink 高 | 占位区间 | 间距 |
|---|---|---|---|---|---|---|
| `.brand` | 52 | **18** | 28 | 21 | 18–39 | |
| `.brand-sub` | 78 | **46** | 24 | 18 | 46–64 | 7 |
| `.dial-wrap` | 153 | **78** | — | **276** | 78–354 | 14 |
| `.date-line` | 360 | **362** | 24 | 18 | 362–380 | 8 |
| `.time-line` | 386 | **388** | 56 | 42 | 388–430 | 8 |
| `.back` | 444 | **442** | 24 | 18 | 442–460 | 12 |

底部余 **20px**。全部六行文字在 480 内闭合。

横向：`left = (336 − 276) / 2 = 30`，盘心落在 **(168, 216)**。

## §4 宽屏单类清单（6 个）

**全部单类选择器**——Vela 不支持后代选择器，`.w-page .dial-wrap{}` 会退化成 `.dial-wrap{}` 套到所有屏（方形机械表盘踩过，192 盘心从 96 跑到 167）。

```css
/* ── 手环10Pro 336×480 宽屏档 ── */
.w-brand {
  top: 18px;
  width: 100%;          /* 原 192px 定宽会让文字中心停在 96，必须改 */
  font-size: 28px;
  letter-spacing: 6px;
}

.w-bsub {
  top: 46px;
  width: 100%;
  font-size: 24px;
  letter-spacing: 3px;
}

/* 盘体整体放大 1.5：origin 默认 0 0（左上），left/top 即视觉左上 */
.w-dial {
  transform: scale(1.5);
  left: 30px;
  top: 78px;
}

.w-date { top: 362px; width: 100%; font-size: 24px; }
.w-time { top: 388px; width: 100%; font-size: 56px; }
.w-back { top: 442px; width: 100%; font-size: 24px; }
```

**没写 `transform-origin`**：引擎默认就是 `0 0`，写了也是同值（方形机械表盘实测 P2 已验）。变体 7 那种需要非左上原点的情况才显式写。

**绝不碰 `.page`**：注释里的铁律——`.page` 只给 width/height:100% + flex 列，禁止 `justify-content` / `align-items`，加了会与 absolute 子元素共同触发黑屏。

## §5 JS 改动

三处：

1. **模板 6 处混写**：`class="brand {{ brandCls }}"` 这样写，**不能** `class="{{ brandCls }}"`——纯动态 class 会丢父类样式（`.page` 丢 `position:relative`/`100%` 后整页白屏，方形机械表盘踩过）。

2. **data 加 6 个空串**：`brandCls / bsubCls / dialCls / dateCls / timeCls / backCls`。

3. **`fitScreen()`**，从 **`onInit`** 调起（不是 `onReady`）：

```js
onInit() {
  this.fitScreen()
  this.syncHands()
  this.tick()
},

/* 宽屏探针：手环10Pro 336×480 专用。
   ① 用页内 require 而非顶部 import —— 与 watch-face-functional 口径统一，
      避免同模块两种引入方式互相干扰（那边踩过：import 绑定取不到，调用静默抛错被 catch 吞）。
   ② 从 onInit 调起 —— watch-face-functional 实测 onReady 不触发。
   本页 onShow 也会调 syncHands+tick，所以 onReady 死了也看不出来，别被假象骗。
   192 屏 w < 300 直接 return，6 个类全空 = 零回归。 */
fitScreen() {
  const self = this
  try {
    const dev = require("@system.device")
    dev.getInfo({
      success: function (d) {
        const w = d && d.screenWidth ? d.screenWidth : 0
        if (w < 300) return
        self.brandCls = "w-brand"
        self.bsubCls = "w-bsub"
        self.dialCls = "w-dial"
        self.dateCls = "w-date"
        self.timeCls = "w-time"
        self.backCls = "w-back"
      },
      fail: function () {}
    })
  } catch (e) {}
}
```

**为什么不用 `this.dialCls` 之外的钩子**：三针 `.rN` 由 `syncHands()` 算，宽度无关，一行不改。

## §6 192 屏零回归口径

`w < 300` 直接 return，6 个类名全空，模板解析结果与改前逐字节相同。

**唯一有意改动两处**（可读文字下限 24px，与 vibrate / font 两块口径一致）：

| 选择器 | 原 | 新 | 影响 |
|---|---|---|---|
| `.date-line` | 13px | **24px** | top 360 起，ink 360–378，下一个 time-line 386 起，gap 8 ✓ |
| `.back` | 12px | **24px** | top 444 起，ink 444–462，490 屏余 28 ✓ |

`.time-line` 34px 已过 24 下限，不动（避免动 192 屏主视觉）。

## §7 风险

| # | 风险 | 概率 | 应对 |
|---|---|---|---|
| R1 | 父级 scale 下三针旋转轴偏移 | 低 | 方形机械表盘已实测正常；本页更简单（字面量类，无动画） |
| R2 | `.page` 被误加 flex 对齐 → 黑屏 | 低 | 宽屏规则里完全不碰 `.page` |
| R3 | `onReady` 不触发导致探针不跑 | **中** | 已从 `onInit` 调起 |
| R4 | 纯动态 class 丢父类 → 白屏 | 低 | 6 处全部混写 `class="原类 {{ w类 }}"` |
| R5 | 1.5 倍后 2px 刻度/14px 地支偏糊 | 低 | 整数倍 2→3px；地支属盘内图形，随盘放大是设计意图，字号下限豁免 |
| R6 | 触摸滑动误切到 gold / metal | 中 | 验收时用 `tap` 而非 `drag`；截图前确认标题仍是「EV / 指针表盘」 |

## §8 验收判据

| 项 | 判据 |
|---|---|
| 盘径 | 336 屏实测左右边界 **x=30…306**，直径 276±2 |
| 盘心 | **(168, 216)** ±2 |
| 指针指位 | 截图时刻与指针角度误差 < 6°（1 档）；三针长度比例与 192 屏一致 |
| 品牌区 | `EV` 字号 28 视觉、居中于 168；子标「指针表盘」24px 不截字 |
| 底部三行 | date 24 / time 56 / back 24，全部 ≥24，不溢出、不压返回 |
| 192 屏 | 盘径 184、位置 (4,153) 不变；date/back 抬到 24 后不截断 |
| 无黑屏/白屏 | `.page` 结构未动 |

## §9 实施回填

### 9.1 部署次数：3 次（方案预算 2 次）

| # | 目标 | 结果 |
|---|---|---|
| 1 | 双机首验 | 192 屏一次通过；336 屏盘体/盘心/指针全对，**但底部三行挤住** |
| 2 | 336 复验 | **失败**——设备 `am stop` 超时 25s，13004 实例 adbd 彻底卡死，无产物 |
| 3 | 336 复验（新实例） | 通过 |

第 2 次不是代码问题，是**实例挂了**（见 9.4）。

### 9.2 数值偏差（6 个类里 2 个调整）

| 类 | 方案 | 落地 | 原因 |
|---|---|---|---|
| `.w-time` | font-size 56 | **52** | 56px 时时间 ink 底沿 444 与返回顶沿 442 相连，实测扫描成 **67px 一段**（视觉贴住）。126px 装三行只剩 40px 分三个间距，56px 就是极限之外 |
| `.w-back` | top 442 | **446** + `color:#9a8f72` | 下移到 472 收底（余 8px）；原 `#6f6650` 在 24px 上对比度不足，几乎不可见 |
| `.w-dial` / `.w-brand` / `.w-bsub` / `.w-date` | 按方案 | **零偏差** | 实测盘径 277、盘心 (168,216)、各段中心 167–168 |

### 9.3 方案预测准确的部分

- **父级 scale 不影响子元素旋转轴**——三针 `top:92px` 的"顶部中点"轴放大后仍在盘心，07:04 与 07:13 两次实拍指位均与盘面时间一致。这是本方案最大的不确定性，一次验证通过。
- **32 个盘内节点零改动**成立：三层环、12 刻度、12 地支、三针、hub、铭文全部未碰。
- **1.5 的取舍正确**：276 盘 + 30/侧留白，2px 刻度 → 3px 整数倍，无半像素。
- **`onInit` 调起探针**：一次成功，未复现 functional 的 `onReady` 不触发。
- **页内 `require`**：一次成功，无 import/require 冲突。

### 9.4 新增环境坑（写进项目 MEMORY.md）

**实例 adbd 会彻底卡死，且 `adb reconnect` 救不回来。**
症状链：`am stop` 卡住超 25s → `adb devices` 显示 `emulator-13004 offline` → `adb reconnect` 仍 offline → `kill-server` + `start-server` 后**所有实例都从列表消失**（TCP 注册丢失）。
恢复路径：
1. `adb connect 127.0.0.1:<console端口+1>` 把还活着的实例接回来（13000→13001、13002→13003）；卡死的那个端口连上仍 offline；
2. `ps -Ao pid,command | grep qemu-system` 找到卡死实例的 PID（`-port 13004` 对应 `evc-xiaomi_band_pro-1`），`kill -TERM` 只杀它；
3. `vela up <avd> --rpk <包> --wait --ttl 2h` 重新拉起，**新实例端口会变**（这次 13004 → **11000**），`adb devices` 里以新名字出现，需重新 push manifest。

**教训：不要用 `adb kill-server` 恢复单个实例。** 它会让全部实例失联，成本远高于直接重起那一个。

### 9.5 未闭环

1. `.w-time` 上限 52px（受 126px 纵向预算约束），要更大只能压盘体或删返回提示。
2. 地支「巳」在 21px（scale 1.5 后）字形接近「己」，属字体渲染，未处理。
3. 192 屏 `.date-line` / `.back` 抬到 24px 是对基线版面的有意改动（可读下限），不是零回归；实测不截断不溢出。
