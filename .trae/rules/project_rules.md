---
alwaysApply: true
---

# 项目规则（合并版）

> **说明**：本文件整合了之前所有独立规则文件（`chinese.md`、`jiaonang.md`、`running.md`、`terminal-fix.md`）的内容。
> 旧文件保留供参考，但本文件是唯一权威来源。
>
> ## ⚠️ 正式要求单一权威 = 总纲
> 跨项目「怎么干活」的正式要求一律以**总纲**为准，本文件只保留本地实现细节，冲突以总纲为准。任务单号：`task-register` 领 `evtask-`（写 Supabase `evops_tasks`），见总纲 §3.11 / §4.4。
> 总纲路径：`/Users/Banner/Documents/guomengtao/多人多AI统一协调开发总纲.md`

---

## 目录

1. [开发优先级](#1-开发优先级)
2. [构建与发布](#2-构建与发布)（含 Git 分步提交流程）
3. [每次开发完成必须提交 GitHub](#3-每次开发完成必须提交-github)
4. [文档语言](#4-文档语言)
5. [通知要求](#5-通知要求)
6. [文本显示规则](#6-文本显示规则新增)
7. [UI 修改截图规则](#7-ui-修改截图规则)
8. [旧规则问题](#8-旧规则问题)
9. [Trae 会话活动上报](#9-trae-会话活动上报补-trae-无编辑钩的观测断点)
12. [简单脚本执行偏好](#12-简单脚本执行偏好2026-10-17-新增用户指定)
13. [Trae 独立领单与花名（走 ev-mcp，不与 workbuddy 混用）](#13-trae-独立领单与花名走-ev-mcp不与-workbuddy-混用)
14. [胶囊屏头部与按钮规范](#14-胶囊屏头部与按钮规范2026-10-18-新增用户指定)

---

## 1. 开发优先级

- 始终优先开发 **胶囊版**，再适配方屏幕版。
- 胶囊版尺寸应为默认布局目标。

## 2. 构建与发布

### 3.0 构建类型铁律

> **🚫 绝对禁止打 debug 包！**
>
> - 所有构建**默认且强制**使用 **release** 模式（`npm run release` 或 `aiot release --enable-jsc`）。
> - **禁止**使用 `debug` 包、`npm run debug`、`aiot debug` 或任何 debug 变体，**无论理由为何**。
> - debug 包**唯一例外**：用户**明确书面指定**「打 debug 包」四个字，否则一律视为 release。
> - 构建命令中**不得出现** `debug` 字样。

- 标准构建命令：`NODE_OPTIONS= npm run release`（`--enable-jsc` 已内置在 scripts 中）。
- **发布 RPK 前必须先提交所有代码到 GitHub**，严格按以下步骤分步执行，每步必须检查 exit code：
  1. `git status` — 查看当前变更，确认无意外文件。
  2. `git add -A` — 暂存所有变更。
  3. `git status` — 确认暂存区内容正确，无遗漏、无多余文件（如 release/ 目录下的 RPK 应在 .gitignore 中）。
  4. `git commit -m "版本说明"` — 提交。
  5. `git status` — 确认工作区变为 clean（`nothing to commit, working tree clean`），如果仍有未提交文件说明上一步失败，需排查重试。
  6. `git push` — 推送到远程。
  7. `git status` + `git log --oneline -3` — 最终确认推送成功、本地与远程同步。
- **禁止使用 `&&` 串联 git 命令**（终端输出干扰时无法辨别哪一步失败），每一步必须独立执行并检查 exit code 为 0。
- 发布 RPK 前检查：
  - RPK 文件**不得超过 1 MB**。
  - 解压后内容**不得超过 2 MB**。
- **部署后（或 README 里跑启动前）黑屏兜底**：很多"黑屏"是模拟器启动/部署环节所致，不是代码问题。若构建后模拟器黑屏，**先按 [`docs/emulator-black-screen.md`](docs/emulator-black-screen.md) 第五节流程排查**（确认 vapp 是否在跑、截屏看是否纯黑），用宿主侧（node spawn 后台、不带 `--jsdebugger`）重启兜底；不要直接怀疑 UI 代码。

### 3.7 开工登记门禁（claim）说明

> 仓库配了开工登记门禁（未登记的改动会拦截 commit/push）。**`SKIP_CLAIM=1` 豁免已于 2026-10-08 永久移除，无逃生通道。**

- **所有改动必须登记**（通过 `ev-claim.sh claim` 领取 `evtask-` 正式单号），Git 提交时 pre-commit 钩子自动校验认领状态。
- 快速通道（单文件微改 ≤5 行 或 纯 .md 文档 ≤50 行）仍免登记。
- 该门禁逻辑不在本仓库内（由外部工具/挂钩加载），项目内无法直接改它；此处仅记录使用约定。

## 3. 每次开发完成必须提交 GitHub

> **强制规则**：**每一项开发任务结束时，必须立即将本次改动提交并推送到 GitHub**，且提交信息（commit message）必须注明改了什么内容。

- **提交时机**：任一开发任务完成后（新增/修改/修复/重构等），未提交不得视为任务完成。
- **提交信息规范**：用中文**简明描述本次改动内容**，明确「做了什么」，例如：
  - `修复课程表在胶囊屏显示截断的问题`
  - `新增周几快捷切换按钮`
  - `调整课表卡片上下间距`
- **禁止**使用含糊信息，如 `update`、`fix`、`change` 等无描述性提交。
- **执行步骤**：严格按「2. 构建与发布」中的 Git 分步提交流程执行，禁止用 `&&` 串联，每步检查 exit code 为 0。

## 4. 文档语言

- 所有文档（.md）文件必须使用**中文**书写。
- 项目规则文件可以使用英文以便 AI 理解。

## 5. 任务单号确认（每会话必弹窗，去 sh 脚本）

> **变更**：去掉 `ev-session-beat.sh` 脚本机制，不再靠手动跑 sh 上报。
> 改为**每次会话由本会话 AI 负责弹 Mac 弹窗**，明确告知用户「本会话是否领取任务单号」。**通知（弹窗）必须发**；是否领取由 AI 自行判断。

每次会话（首次动工前）执行：

1. **弹窗必发（通知必须发）**：用 `display dialog` 弹**模态对话框**，内容须声明本会话是否领取任务单号，并给用户**选择权 + 15 秒超时**——`giving up after 15`。**15 秒内用户未点确认 → 返回「超时 / gave up」→ 默认拒绝 → 本会话不继续**（视同会话结束，不领号不登记）。禁止用 `display notification`（会短暂消失）。语音（`say`）继续停用。
   - 弹窗用**两个按钮**（如 `{"拒绝","继续"}`），让用户明确「确认继续」还是「拒绝结束」。
2. **是否领取由 AI 判断**：
   - **需领取**（领 **`evtask-` 正式单号** = 调 **`task-register`**，走登记助手 `ev-add-task.js`；`ev-claim.sh claim` **只做软锁、不是单号**）：本会话有实质开发改动（改代码/多文件/需提交登记）。先领号，再把真实单号填进弹窗 =「已领取 + 单号」。
   - **无需领取**（不领单号）：仅咨询/问答/查代码，或纯 `.md` ≤50 行、单文件 ≤5 行的快速通道等。弹窗内容=「无需领取 + 原因」。

**领取正式单号的正解（不是 `ev-claim.sh`）**：总纲/§3.11 明确——正式单号 `evtask-{type}-{project}-{yymmdd}-{6位}` 必须由 `task-register` 领取。项目内跑登记助手（相对 `guomengtao` 根）：

```bash
node ev/ev-ops-android/scripts/ev-add-task.js \
  "<任务标题>" "<任务详情描述，≥50 字：目标+改动范围+验收方式>" \
  <type> <project> <priority>
# type: develop|feature|bug|docs|refactor|research|infra|git（默认 develop）
# project: ev/app-auth、ev/class-schedule 等（默认 ev/app-auth）
# priority: P1|P2
```

- `ev-add-task.js` 自动带**会话 sid**（负责人 = 会话 ID，后端强制）；返回的 `id` 即正式 `evtask-` 单号。
- **Trae 无钩子 sid 的兜底**：Trae 不跑 `ev-report.js`，`_sidmap.json` 里没有当前会话。此时显式设 `EV_SESSION_SID` 传给助手：
  `EV_SESSION_SID="trae-$(date +%Y%m%d)-$(date +%H%M)" node ev/ev-ops-android/scripts/ev-add-task.js ...`
  —— 用「trae + 会话开始时间戳」作稳定 sid，不编造 hash，格式符合 `tool-YYYYMMDD-HHMM`。
- 领号失败（409 规则1 / 400 missing_session / bad_description）时，按 `ev-add-task.js` 报错先收尾对应任务，再重跑或换手段。

示例（已领取，真实单号 + 15 秒超时 + 双按钮）：
```bash
osascript -e 'display dialog "本会话已领取任务单号：evtask-B-class-schedule-261008-xxxxxx" with title "Ev课程表 · 任务登记" buttons {"拒绝","继续"} default button "继续" giving up after 15'
```

示例（无需领取，快速通道）：
```bash
osascript -e 'display dialog "本会话无需领取任务单号（仅查询 / 快速通道）" with title "Ev课程表 · 任务登记" buttons {"拒绝","继续"} default button "继续" giving up after 15'
```

> **⚠️ mac 原生不支持数字倒计时**：macOS 的 `display dialog ... giving up after 15` **只会显示一个隐蔽的进度小圈，不显示剩余秒数数字**。不要试图用「每秒重建弹窗」的循环去模拟数字倒计时——那会闪屏、持续抢占屏幕且体验不佳。就用上面**普通弹窗 + `giving up after 15`** 的形式即可：15 秒内用户点「继续」则通过，超时或点「拒绝」则本会话结束。

> **说明**：`display dialog` 为 macOS 原生工具，无需第三方依赖。**前提**：需在「系统设置 → 隐私与安全性 → 辅助功能」授予运行进程弹窗权限；且必须在**登录 GUI 会话的可见进程**里运行。Trae 的 `RunCommand` 后台终端常无 GUI 弹窗条件（脚本 exit 0 但窗口弹不到屏幕）——若由此弹不出来，由用户在 macOS 自带「终端」App 里手动跑上述命令弹窗告知。任务登记与门禁详见 §9。

---

## 6. 文本显示规则

- **禁止任何导致文字显示不全的做法**。所有 UI 文本必须在**胶囊屏（198px 宽，24px 字号）**上完整可见，不得出现 `text-overflow: ellipsis` 截断。
- 优先使用 **颜色变化、图标变化、位置变化** 等非文字变更方式作为状态反馈。
- 如需变更文字，确保变更后的文字长度与原始文字相同或更短（例如「删除」→「确认」均为 2 字），不得变长。

---

## 7. UI 修改截图规则

### 8.1 适用场景（按需截图，非强制）

> **核心原则**：截图仅在「确有布局/字号变更且依赖肉眼复核」时使用。日常小改动（CSS 重构、抽象断点、命名调整、逻辑改动等不改变可见外观，或变更可由构建成功 + 规则自检覆盖的场景）**不需要强制截图**。

涉及以下 UI 变更且**需要肉眼复核布局/视觉效果**时，才执行修改前后截图对比：
- 字号（font-size）调整且需确认是否截断/溢出
- 多元素排布、间距、对齐等**视觉可见**的布局调整
- 颜色、样式变更且需确认观感
- 组件位置、排列方式变更且需确认对齐
- 修复显示类 bug（截断、错位、安全区等）

**无需截图的场景（明确豁免）**：
- 纯 CSS 触底自适应重构（BASE → width 断点），不改变既有外观参数（构建成功 + 清除 `lines:`/`text-overflow` 等规则自检可覆盖）
- 逻辑/数据改动，不涉及可见 UI
- 通用 class 抽取、类名/命名规范化
- 仅改动字号数值但由「字号设置」动态驱动、无固定截断风险的场景

### 8.2 操作流程

> **截图前先排除黑屏**：若模拟器黑屏、App 没显示，截图流程本身会失败。先按 [`docs/emulator-black-screen.md`](docs/emulator-black-screen.md) 用宿主侧重启兜底，确认 App 正常渲染后再截图。

#### Step 1：修改前截图
在开始任何代码修改之前：
1. 启动模拟器（确保 adb `emulator-5554` 已连接）
2. 导航到目标页面
3. 执行截图命令：
   ```bash
   node scripts/emulator-eye.js shot <port> before-<功能名>
   ```
4. 立即用 macOS 打开截图展示给用户确认：
   ```bash
   open screenshots/before-<功能名>.png
   ```

#### Step 2：执行修改
按用户需求修改代码（UX 文件、样式等）。

#### Step 3：修改后截图
修改完成并重新加载应用后：
1. 导航到同一目标页面
2. 执行截图命令：
   ```bash
   node scripts/emulator-eye.js shot <port> after-<功能名>
   ```
3. 立即用 macOS 打开截图展示修改结果：
   ```bash
   open screenshots/after-<功能名>.png
   ```

#### Step 4：核对清单（眼睛检查）
对照「眼睛核对清单」逐项检查修改后的截图：
- [ ] 左右对称
- [ ] 字号/截断
- [ ] 底部安全区
- [ ] 热区整行
- [ ] 弹窗几何
- [ ] 多屏完整性

### 8.3 命名规范
```
screenshots/before-<功能名>.png    # 修改前
screenshots/after-<功能名>.png     # 修改后
```
功能名用英文短横线命名，如：`before-font-size`、`after-header-layout`

### 8.4 快速命令速查
```bash
# 单张截图
node scripts/emulator-eye.js shot 8554 <name>

# 滚动连拍（多屏页）
node scripts/emulator-eye.js scrollshot 8554 <prefix> <maxScreens> <gapMs> <x> <y1> <y2>

# 流程步骤截图
node scripts/emulator-eye.js flow <步骤表.json>

# 标定坐标
node scripts/png-measure.js rows <图>          # 行坐标
node scripts/png-measure.js bands <图> <width>  # 列坐标
node scripts/png-measure.js runrow <图> <y>     # 量化左右边距
```

---

## 8. 旧规则问题

### 9.1 空规则文件

- **`running.md`** 设置了 `alwaysApply: true` 但内容完全为空，已删除。

### 9.2 非规则文件混入规则目录

- **`terminal-fix.md`** 设置为 `alwaysApply: false`，内容是 VS Code 终端故障修复指南。这不是规则而是参考文档，已移至 `docs/`。

---

## 9. 触底自适应方案（CSS 多屏适配标准）

> **方案代号**：**「触底自适应」**（Bottom-Touch Adaptive）
>
> 含义：base CSS 从最窄屏幕（手环 9，160px 内容区）"触底"起步，屏幕越宽逐步"递增"调整，杜绝大屏优先的设计惯性。

### 10.1 为什么需要这个方案

手环 9 的 CSS/JS 引擎与 10 Pro、Watch 6 存在兼容性差异：
- **`@media (shape: pill-shaped)` 独立大块会导致手环 9 黑屏重启**（根因详见 `docs/手环9黑屏根因定位*.md`）
- **`lines:` / `text-overflow: ellipsis` 是已知崩溃触发属性**
- `@media (shape: capsule), (shape: pill-shaped)` 逗号写法在 9 上被忽略，反而 10 Pro 正常
- 因此传统"一套 CSS 分 shape 写 4 块"的做法在 9 上不可行

### 10.2 标准结构

所有页面的 CSS 必须遵循以下四层结构：

```
┌──────────────────────────────────────────────┐
│  Layer 1: Base CSS                           │
│  = 手环 9 基准（160px 内容区）                 │
│  9 默认命中，无需任何 media query             │
│  弹性 flex + % 撑满                           │
│  原则：base 属性一旦设定，后续断点只做增量     │
├──────────────────────────────────────────────┤
│  Layer 2: @media (width >= 200px)             │
│  手环 10 / 胶囊屏大号（内容区 ~180px）          │
│  在 base 基础上增量：字号+2、间距+2、按钮略宽   │
│  rename-bar 从 column 恢复为 row              │
├──────────────────────────────────────────────┤
│  Layer 3: @media (width >= 400px)             │
│  Watch 6 / 方屏（内容区 ~400px）               │
│  字体再大一级、上下 padding 大幅压缩            │
├──────────────────────────────────────────────┤
│  Layer 4: @media (shape: circle)             │
│  圆形表盘（唯一保留的 shape 查询）              │
│  圆方不同构，非宽度可替代，9 不命中天然安全     │
└──────────────────────────────────────────────┘
```

### 10.3 铁律（强制遵守）

1. **Base = 手环 9**：所有样式默认值以 9（160px 内容区）为基准，9 上不依赖任何 media query
2. **禁止 `(shape: pill-shaped)`**：任何 `.ux` 文件中不得出现 `@media (shape: pill-shaped)`，无论独立大块还是逗号组合
3. **禁止 `lines:` 属性**：全局禁止，（项目规则 Section 6 已覆盖）
4. **禁止 `text-overflow: ellipsis`**：全局禁止（项目规则 Section 6 已覆盖）
5. **唯一 shape 例外**：仅 `@media (shape: circle)` 可保留，因为圆屏与方屏物理尺寸差异超过宽度断点能覆盖的范围
6. **断点只做增量**：width >= 200 / 400 断点中只写与 base 不同的属性，不重复 base 已有的值
7. **`overlay-modal` / `overlay-sheet` 定位属性必须 inline**：`position: absolute; left: 0; top: 0; width: 100%; height: 100%` 不能写在 CSS class 里，必须写在模板 inline style 上，防止手环 9 上 `if` 隐藏后仍截获点击事件

### 10.4 模板片段

```css
/* ================================================================
   BASE CSS = 手环 9 基准（160px 内容区）
   手环 9 默认命中，无需任何 media query。
   弹性 flex + % 撑满。屏幕增大时，下方宽度断点「增量」调整。
   原则：base 属性一旦设定，大屏断点只改物理必须区分的值，不覆盖。
   手环 9 黑屏根因：独立 @media (shape: pill-shaped) 大块命中即崩，
   故 base 以 9 为基准，彻底移除独立 pill-shaped 分支。
   ================================================================ */

/* ... base styles for hand ring 9 ... */

/* ================================================================
   宽度断点：手环 10 / 胶囊屏大号（width >= 200px）
   在 base 基础上「增量」调整。
   ================================================================ */
@media (width >= 200px) {
  /* incrementally scale up from 9 baseline */
}

/* ================================================================
   宽度断点：Watch 6 / 方屏（width >= 400px）
   ================================================================ */
@media (width >= 400px) {
  /* further scale up */
}

/* ================================================================
   圆形表盘（唯一保留的 shape 查询——圆方不同构，非宽度可替代）
   手环 9 不会命中此分支，天然安全。
   ================================================================ */
@media (shape: circle) {
  /* circle-specific adjustments */
}
```

### 10.5 `overlay` 定位 inline 示例

```html
<!-- 正确：定位属性写在 inline style -->
<div class="overlay-modal" if="{{ showDialog }}"
     style="position: absolute; left: 0; top: 0; width: 100%; height: 100%"
     onclick="dismissDialog">
  ...
</div>
```

```css
/* CSS class 中只保留颜色、flex、z-index，不保留 position/left/top/width/height */
.overlay-modal {
  background-color: rgba(0, 0, 0, 0.5);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 40px 16px;
}
```

### 10.6 已有实施页面

| 页面 | 文件 | 版本 |
|------|------|------|
| 编辑课程页 | `src/pages/detail/detail.ux` | 1.7.73 |
| 课程表管理页 | `src/pages/schedule-manager/schedule-manager.ux` | 1.7.74+ |

新页面开发时必须参照上述已实施页面的 CSS 结构。

---

## 11. 官方示例优先复用（2026-10-12 新增，用户指定）

> 原则：UI 组件、交互与功能实现，优先从官方示例库复用，禁止自创轮子 / 随意发挥。

- **参考源（唯一）**：`open-vela-learning/`（官方示例 `packages_apps/wearable/*` + 官方文档镜像 `vela-quickapp-docs/` 182 篇）。
  资源索引见 `docs/官方示例-可复用资源与功能分析.md`；逐个明细见 `docs/vela-sample-87文件明细.md`。
- **优先抄**：官方 vela-sample 的 `component/`（组件）、`interface/`（系统能力）、`framework/`（模板/脚本/样式）。
- **冲突优先级（硬）**：项目既有铁律 > 官方示例做法。
  1. 自适应走本文件 §10「触底自适应」，禁止 `@media (shape: pill-shaped)`；
  2. 图标走总纲 §3.14 Lucide，不复用官方 png 图标；
  3. 文本遵守 §6 / §10.3：禁 `lines:` 与 `text-overflow: ellipsis`。
- **例外**：官方示例未覆盖的新功能可自行实现，但须在提交信息/方案里注明「官方示例无对应实现」。

---

## 附录：已删除/已弃用的文件

| 文件 | 操作 | 原因 |
|------|------|------|
| `.trae/rules/chinese.md` | 已弃用 | 内容合并至本文件 |
| `.trae/rules/jiaonang.md` | 已弃用 | 内容合并至本文件 |
| `.trae/rules/running.md` | 已删除 | 内容为空 |
| `.trae/rules/terminal-fix.md` | 移至 `docs/` | 非规则，仅供参考 |

## ev-sweeper 纠察记录

> 由 ev-sweeper 2026-10-08 清扫发现。

### 本次发现（2026-10-08）

| 问题 | 严重度 |
|------|:--:|
| `_tasks.txt`（194KB）调试输出散落根目录 | 🔴 |
| `_reg.txt`、`_tasks_raw.json`、`_tasks_summary.txt` 调试输出散落根目录 | 🔴 |
| `before-countdown-redesign` 无扩展名截图散落根目录 | 🟡 |
| `.cache/` 缓存目录残留 | 🟡 |

### 防重复规则

1. **调试输出不进根目录**：所有 `_*` 调试/临时文件必须放入 `scripts/` 或 `logs/`，禁止在根目录创建
2. **截图归位**：所有 `.png`/`.jpg` 构建截图放入 `build/` 或 `docs/screenshots/`
3. **缓存清理**：每次构建结束后 `rm -rf .cache`

---

## 9. 会话任务单号登记（去 sh 脚本）

> **背景**：Trae 不挂 PreToolUse 编辑钩，无法在编辑当下强制触发脚本；此前用 `ev-session-beat.sh` 手动跑 sh 兜底观测，**现已去掉该脚本**。
> 现在改为由 **AI 在每次会话中主动弹窗**（见 §5）并自行判断是否领取 `evtask-` 单号，配合提交门完成登记。

- **登记时机**：会话首次动工前，AI 判断本会话是否有实质改动 → 有则 `ev-claim.sh claim` 领 `evtask-` 单号；无则略过（快速通道：单文件 ≤5 行或纯 .md ≤50 行免登记）。
- **弹窗告知**：每次会话开始，无论是否领取，都必须按 §5 弹窗告知用户「本会话是否领取任务单号」。
- **提交门照旧**：未认领对应改动文件时按总纲逻辑拦截提交；`ev-claim.sh claim` 补齐。
- **收尾**：任务结束未提交不得视为完成，提交完成后 `ev-claim.sh release` 释放单据（见 §3）。

---

## 12. 简单脚本执行偏好（2026-10-17 新增，用户指定）

> 用户要求：跑简单脚本（JS / SH 等单文件短命令）时**不要询问确认**，直接后台静默运行并返回结果。

- **适用**：`node xxx.js`、`bash xxx.sh` 等一次性短命令、调试脚本、demo 脚本，以及本地脚本时间/环境查询等。
- **禁止**：对这类简单脚本弹确认框、`requires_approval` 置 true、或反复询问用户是否执行。
- **例外**：涉及 `git` 提交/推送、删文件、装依赖、改系统配置、启动服务、打 release/debug 包等**有副作用**的操作，仍按各自流程执行/提交（不在此偏好内）。
- 任务登记仍按 §5/§9 判定；仅「跑一个脚本看看输出」不因本偏好免除登记（若涉及代码改动仍须领单）。

---

## 13. Trae 独立领单与花名（指针 → 全局规则真源）

> **本条规定已移至 Trae 全局规则真源**（`ev/ev-mcp/rules/trae-global-rules.md`），所有 Trae 项目共享，纳入 git 版本控制。
>
> **加载方式**：`~/.trae/rules/project_rules.md` **软链**至上述真源，Trae 会话自动加载，无需逐项目重复。
>
> **操作手册**：`ev/ev-mcp/docs/ev-mcp-Trae领单与花名手册.md`（分步详解）。
>
> 本项目文件不再重复领单/花名规则；此处仅留指针，避免多份副本漂移。本文件中 §5、§9 的旧 `evtask-`/`task-register` 引用为 workbuddy 体系残余，Trae 会话一律以全局规则真源为准（走 ev-mcp，`evm-` 单号）。

---

## 14. 胶囊屏头部与按钮规范（2026-10-18 新增，用户指定）

> **用户指定（2026-10-18）：以后禁止在头部标题旁加按钮。胶囊屏头部本来就看不见多少。**
> 完整实测与踩坑见 `docs/胶囊屏UI规范与模拟器快速迭代-20261018.md`。

---

## 15. trae-hello-button 插件修改后必须安装并测试（2026-10-19 新增，用户指定）

> **强制规则**：每次修改 `trae-hello-button` 插件代码后，必须：
> 1. **重新构建**最新版 `.vsix` 安装包
> 2. **安装**到 VS Code 扩展目录
> 3. **重载窗口**使新版本生效
> 以上步骤未完成，不得视为修改完成。

### 15.1 标准流程（分步执行，每步检查 exit code）

```bash
# Step 1: 构建 .vsix
cd ../trae-hello-button && bash scripts/build-vsix.sh
# 产物：trae-hello-button-<version>.vsix（项目根）

# Step 2: 安装扩展
bash install-extension.sh
# 安装到 ~/.vscode/extensions/local.trae-hello-button-<version>/

# Step 3: 重载窗口生效
# 用户手动执行：Cmd+Shift+P → Reload Window
# 或通知用户重载窗口
```

### 15.2 验证清单

- [ ] `build-vsix.sh` exit code 为 0
- [ ] `install-extension.sh` exit code 为 0
- [ ] 重载窗口后，状态栏出现「你好」/「确认:x」按钮
- [ ] 功能改动点手动验证通过

### 14.1 头部铁律（强制）

- **手环 9（192×490，内容区 168）头部只放「返回（32×32）+ 标题（单行 20px）」**。
- **禁止**在头部放任何操作按钮 / 开关 / 多余图标 / 双行标题。192 屏上第 3 个控件必然出屏或被压成竖排（实测「添加」按钮右半截被裁到屏外、标题被挤两行）。
- 新增与全局操作一律**下沉到列表底部整行按钮**（168×44，随列表滚动，空态同样显示）。
- 空态文案禁止写"点击右上角添加"这类指向已移除入口的引导。

### 14.2 按钮与热区

- 热区下限：**高度 ≥ 40，单侧宽 ≥ 72**。两按钮并排按 `(可用宽 − 间距) / 2` 反算，不要先定尺寸再硬塞。
- **按钮必须用 `div + text`，不用 `input[type=button]`**：Vela 里 input 的 `width` 不生效（宽度只跟文案走），热区调不动；div 宽高完全可控，`onclick` 一样能点。
- 参考尺寸：列表编辑/删除 72×40、ON/OFF 52×28、列表底部新增 168×44、详情开关 80×32。

### 14.3 样式必须单类选择器（最容易白干的坑）

- Vela 编译会**静默丢弃 `.父 .子` 后代选择器**：不报错、不告警，就是不生效。
- 因此写样式时**一个选择器只写一个类名**，需要区分时在模板上直接挂语义类（`.del-btn { margin-left: 8px; }`）。
- 排查口诀：**样式改了没反应 → 先看选择器里有没有空格**，再怀疑缓存/打包/设备。
5. **本会话现状**：当前 Trae 会话的工具列表未挂载 ev-mcp 的 MCP 工具（`ev_add_task` / `ev_name_session` 等未直接暴露）；若需实际调用，须先接入/注册 ev-mcp MCP Server。本文档先固化「归属与流程」规定。