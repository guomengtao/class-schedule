# 手环 9（胶囊屏）「编辑课程」页文字不可见 分析

> 反馈来源：用户 @Carp **多次反馈**
> 现象：小米手环 9 真机上，进入「编辑课程」页时「看不见字」
> 关键线索：**「还是」** —— 反复反馈，说明此前可能修过（颜色 / 主题 / 胶囊适配）但未根治，或用户手上仍是旧包
> 分析日期：2026-09-30
> 目标页面：`src/pages/detail/detail.ux`

---

## 0. TL;DR（先看结论）

| 结论 | 内容 |
|---|---|
| 设备 | 小米手环 9 = **胶囊屏（`pill-shaped`），192×490** |
| 页面 | 编辑课程 = `detail.ux`（4 步向导），非 `lab-edit-course.ux`（未进 manifest 的 Demo） |
| 文字来源 | 全页文字都是 `style="color: {{ theme.text }}"` 等 **theme token**，CSS 里**没有硬编码文字颜色** |
| 最可能根因（按概率） | ① 浅色主题下**文字色与背景色撞色** / theme 数据异常；② **旧包 + 胶囊 `@media` 历史未命中**导致方屏大字号溢出裁字；③ 宽度塌缩 → 未覆盖区黑屏（同「右侧黑板」机理） |
| 首要动作 | **先确认用户装机版本**（历史教训：改了代码、用户复测还是老样子，多半是旧包） |

---

## 1. 设备与页面定位

### 1.1 「9 手环」是哪台

用户表盘激活 URL 的 `device.getInfo()` 快照（`docs/手环9跑道屏课程表管理页右侧黑板分析.md` 有完整记录）：

```
p=Xiaomi Smart Band 9
s=pill-shaped     ← 屏幕形状：跑道屏（胶囊）
w=192  h=490      ← 物理宽高
t=band
```

| 字段 | 值 | 含义 |
|---|---|---|
| 机型 | Xiaomi Smart Band 9 | 小米手环 9 |
| `s` | **pill-shaped** | 胶囊屏 |
| `w×h` | **192×490** | 本项目胶囊屏设计基线 |

### 1.2 「编辑课程」是哪一页

| 页面 | 标题 | 是否本次问题页 |
|---|---|---|
| `src/pages/detail/detail.ux` | 编辑课程 | ✅ **是**（manifest 注册，4 步向导：选课→时间→位置与星期→确认） |
| `src/pages/lab-edit-course/lab-edit-course.ux` | 编辑课程(胶囊) | ❌ Demo 页，未注册进 manifest，不打包 |

`detail.ux` 根容器：`<scroll class="edit-course-page" scroll-y="true" style="background-color: {{ theme.bg }}">`。

---

## 2. 主题与文字颜色机制梳理（关键背景）

### 2.1 10 套主题，其中 2 套是浅色

`src/data/store.js` 的 `THEMES` 表：`blue / green / red / dark / gray / purple / light / warm / forest / amber`。

| 主题 | bg | text | 说明 |
|---|---|---|---|
| blue（默认） | `#1a1a2e` | `#ffffff` | 深底白字 |
| dark | `#000000` | `#cccccc` | 深底浅字 |
| **light** | **`#f0f0f0`** | **`#222222`** | **浅底深字** |
| **warm** | **`#f5f0e8`** | **`#332211`** | **浅底深字** |

### 2.2 detail.ux 的 theme 加载链路

```js
// detail.ux private 初始值 = 完整深色 blue（有 fallback，不会全空）
theme: { bg:'#1a1a2e', card:'#16213e', ..., text:'#ffffff', textSecondary:'#888899', textMuted:'#555566', ... }

onInit() { store.getTheme(function(t, themeName){ self.theme = t; self.updateIconSrc(themeName) }) }
onShow() { store.getTheme(function(t, themeName){ self.theme = t; self.updateIconSrc(themeName) }) }
```

```js
// store.js getTheme —— 缓存 + 白名单兜底
getTheme(callback, forceRefresh) {
  if (!forceRefresh && _cache.theme) { callback(_cache.theme, _cache.themeName); return }
  storage.get({ key:"appTheme",
    success(data){
      var name = data || def("appearance.theme")
      _cache.theme = THEMES[name] || THEMES.blue   // 非法值回退 blue
      _cache.themeName = name                       // ⚠️ 但 themeName 存的是原始 name
      callback(_cache.theme, name)
    }, ...
  })
}
```

### 2.3 ⚠️ `appTheme` 是「手机端可写」域

`src/app.ux` 的 interconnect 数据开放表里：

```js
SYNC_ACCESS = {
  appearance: { read: "always", write: true },   // 模板 + 字号 + 主题：可读**可写**
  ...
}
SYNC_FIELD_SCOPE = {
  appTheme: "appearance",     // ← 主题色（手机端可远程切换）
  ...
}
// 写路径：
if (payload.appTheme !== undefined && syncCanWrite("appTheme")) {
  store.setTheme(String(payload.appTheme), finish)
}
```

**含义**：安卓同步器 APK 通过 interconnect 可以把 `appTheme` 写进手环 storage。一旦写入了一个 `THEMES` 白名单之外的值（例如 `"system"`、`"auto"`、大小写不一致、或未来新增但手环端没同步的主题名），`getTheme` 会回退 `THEMES.blue`，但 `_cache.themeName` 仍存非法名——表现为「手机端显示选了某主题，手环端实际渲染成深色 blue」，产生认知错位。

---

## 3. 根因候选（按可能性排序）

### 候选 A（最可能）：浅色主题下「文字色」与「背景色」撞色 / theme 字段异常

**机理**：detail.ux 的背景和文字虽然都取同一个 `theme` 对象，但「看不见字」只会在**文字色 ≈ 背景色**时发生。可能的触发点：

1. **theme 对象字段缺失**：`homepage-white-screen-analysis.md` 已明确记录——若 `theme.bg` / `theme.text` 为 `undefined`，`style="background-color: undefined"` 会落到引擎默认（手环上默认背景白、默认文字在深色引擎下可能也是白）→ **白字白底 → 看不见**。
2. **appTheme 写入非法值**（见 2.3）：部分字段回退不一致，出现「背景一个色、文字另一个色」的错位。
3. **浅色主题下 `textSecondary` / `textMuted` 对比度不足**：light 主题 `textMuted: #aaaaaa` 在白色 card 上虽能看出但很淡；若叠加手环屏幕亮度低，观感接近「看不见」。

> 判别关键：detail.ux 所有文字色都来自 `theme.text/textSecondary/textMuted`，**只要 theme 对象本身正确，深/浅主题都不会撞色**。所以一旦复现，重点查「theme 对象当时到底是什么」。

### 候选 B（历史根因，已修但需确认版本）：胶囊 `@media` 未命中 → 方屏大字号溢出裁字

**机理**：手环 9 上报的 shape 是 `pill-shaped`，而历史上全仓 27~33 处写的是 `@media (shape: capsule)`——**在手环 9 上从未命中**（第 16 轮 QA 的根因级结论，`class-schedule-QA-20260929-0739.md` P1-11 已记录并修复）。

- 当前 `detail.ux:1380` 已是 `@media (shape: capsule), (shape: pill-shaped)`，**应能命中**。
- 但若未命中，编辑页回落到方屏样式：标题 `34px`、`stepper-val` 40px、课程卡 200px 等，在 192px 宽下**文字溢出可视区 / 被裁**，观感就是「看不见字」。

> **重点**：这依赖「用户装了修复后的包」。若用户还是旧包（历史上出现过 `r=1.6.100` 落后 7 个版本），此根因依然成立。

### 候选 C（次要）：宽度塌缩 → 未覆盖区域黑屏

**机理**：`docs/手环9跑道屏课程表管理页右侧黑板分析.md` 记录的「stack/scroll 子元素不自动撑满 → 宽度退化为内容宽 → 未覆盖区域不绘制即黑屏」。`detail.ux` 根容器是 `<scroll>`，若同样存在宽度/高度未显式声明的问题，文字可能落在未绘制的黑区外。

### 候选 D（次要，非主诉）：`text` 组件承载进度点

`detail.ux:11-17` 用 `<text class="step-dot">` + `background-color` 渲染 4 步进度点。Vela 的 `text` 不一定支持 `background-color` 成块渲染，可能进度点「看不见」。但这是「点」不是「字」，不属于主诉，仅顺带记录。

---

## 4. 真机诊断取证步骤（按顺序做，务必先做第 0 步）

### 0. 先确认装机版本（历史教训，最优先）

- 进入「设备信息」页看版本号；或读激活 URL 的 `r=` 参数。
- 对照当前仓库 `manifest.json` 的 `versionName`。
- **若落后于修复版本（尤其 1.6.145 之前的胶囊适配、或本轮主题修复），先装新包再复测**，否则结论无效。

### 1. 红字法：定位是「颜色问题」还是「渲染/布局问题」

临时把 `detail.ux` 的 `<text ... style="color: {{ theme.text }}">` 换成硬编码 `color: #ff0000`：

| 现象 | 结论 |
|---|---|
| 红字出现 | 文字能渲染 → 是**颜色 token 撞色/theme 数据问题**（候选 A） |
| 红字不出现 | 文字根本没渲染 / 被裁出屏 → **布局/@media 问题**（候选 B/C） |

### 2. 红底法：定位是否宽度塌缩

临时把根 `<scroll>` 背景换成 `#ff0000`：

| 现象 | 结论 |
|---|---|
| 红色只铺一部分、其余黑 | 宽度/高度塌缩（候选 C，同「右侧黑板」） |
| 红色铺满 | 宽度正常，回到候选 A/B |

### 3. 切主题复测：定位是否浅色主题撞色

在「设置」页切到 `blue`（深色默认），再进编辑页：

| 现象 | 结论 |
|---|---|
| 恢复可见 | 撞色根因（候选 A，浅色主题下文字色错） |
| 仍不可见 | 布局/溢出根因（候选 B/C） |

---

## 5. 修复建议（分级）

### P0 — 主题健壮性（防「文字与背景同色」）

1. **`store.getTheme` 的 fallback 补全字段合并**：即使 storage 里 `appTheme` 指向的对象缺字段，也用 `THEMES.blue` 逐字段补齐，保证 `text/textSecondary/textMuted/bg/card/...` 永不 `undefined`。
2. **`setTheme` 加白名单校验**：`app.ux` 写 `appTheme` 前、`store.setTheme` 内部，都校验值 ∈ 10 主题 key；非法值拒绝写入或强制落回 `def("appearance.theme")`，而不是「写进去再靠 getTheme 回退」（回退会导致 `themeName` 与实际渲染主题不一致）。
3. **手机端（APK 同步器）写 appTheme 前同样校验**：只在 10 主题白名单内才下发，避免脏值经 interconnect 进入手环。

### P1 — 胶囊适配兜底确认

4. 确认 `detail.ux` 内**所有** `@media (shape: capsule)` 都带 `pill-shaped`（当前主块已带，需全量自查无遗漏）。
5. 关键文字类补 `lines:1; text-overflow: ellipsis` 与 `line-height ≥ font-size + 8px`，避免溢出被硬裁（对照 `docs/文本显示问题分析报告.md`）。

### P2 — 渲染兜底

6. 根 `<scroll>` 显式声明 `width:100%`（若怀疑宽度塌缩，参照「右侧黑板」分析的最小修复）。
7. `step-indicator` 的进度点从 `<text>` 改为 `<div>`（`div` 的 `background-color` 渲染更可靠），顺带排除候选 D。

---

## 6. 相关历史文档

- `docs/手环9跑道屏课程表管理页右侧黑板分析.md` —— 宽度塌缩→黑屏机理 + 「先确认装机版本」教训
- `docs/homepage-white-screen-analysis.md` —— 主题颜色撞色 / theme 数据损坏 → 白字白底
- `docs/胶囊屏文字遮挡分析报告.md`、`docs/文本显示问题分析报告.md` —— 行高裁剪 / 溢出裁字
- `docs/编辑课程页面优化方案.md`、`docs/edit-page-capsule-redesign.md` —— 本页胶囊适配的历史设计
- `docs/qa-reports/class-schedule-QA-20260929-0739.md` —— 第 16 轮，`@media (shape: capsule)` 未命中的根因级结论与修复
