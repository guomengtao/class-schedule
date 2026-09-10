# Ev课程表 手环快应用 · 第 2 轮质检报告（无变更确认 + 基线复验）

| 项目 | 内容 |
|---|---|
| 仓库 | https://github.com/guomengtao/class-schedule |
| 分支 / HEAD | `main` / `2d727e98080454bef62717983fe25de94cde807d` |
| HEAD 提交时间 | 2026-09-10 12:23:31 +0800 |
| HEAD 提交信息 | refactor: move donate page to settings section; update README to reflect actual features |
| 版本 | versionName 1.4.153 / versionCode 653 |
| 目标机型 | 小米手环 9 Pro、小米手环 10 Pro（manifest deviceTypeList: watch + band） |
| 分析轮次 | **第 2 轮** · 对比基线 = 第 1 轮（2026-09-10 12:30，同一 commit） |
| 生成时间 | 2026-09-10 18:20 (+0800) |
| 分析视角 | 资深客户端测试工程师（QA） |

---

## 一、本轮结论摘要

> **一句话结论**：**本轮仓库零代码变更**（远端 `main` 与本地 HEAD 为同一 commit），第 1 轮报告的 **7 个 P0 全部未修复、原样存在**；同时本轮复验**推翻了基线中的 1 条误报**（P3-1「41 处 JSON.parse 无 try/catch」不成立），并**新增确认 3 个未适配页面**（不止首页），另通过全量语法检查确认**代码无语法错误**（"代码语法错误"这一关注点未复现）。

**本轮三个关键结论：**

1. **零变更**：`git ls-remote origin main` = `2d727e9808...`，与本地 HEAD 完全一致，`git log HEAD..FETCH_HEAD` 为空。第 1 轮所有缺陷**原样遗留**，无任何修复动作。
2. **基线误报修正**：第 1 轮 P3-1 称"41 处 `JSON.parse` 无 try/catch，**数据损坏即白屏**"。本轮逐处脚本核查：**全仓共 35 处 `JSON.parse`，无 try/catch 保护的为 0 处**（26 处前置 try、7 处同行 try、2 处 `JSON.parse(JSON.stringify())` 恒安全）。该条**不成立，予以撤回**。
3. **适配缺口扩大**：第 1 轮仅指出首页 `index-full.ux` 无 `@media` 适配。本轮全量扫描 30 个页面，**共 4 个页面零适配**：`index-full`（首页）、`welcome`（启动入口）、`schedule-manager`（课表管理）、`custom-content-edit`。**启动页与课表管理页同样是重灾区，基线漏报。**

**用户反馈项与本轮核查对应关系：**

| 用户已知关注点 | 本轮核查结果 |
|---|---|
| 编辑课程失败 | **复现（代码层确认）** → P0-2 新增/编辑课程保存后首页不显示，需重启 |
| 按钮显示错乱 | **部分复现** → P1-1/P1-2 首页无形状适配 + 顶部安全区 8px vs 全站 44px 不一致 |
| 输入法打不开 | **复现（代码层确认）** → P2-2 `screentype="circle"` 写死，方屏机器走圆屏布局 |
| 代码语法错误 | **未复现** → 22 个 `.js` + 37 个 `.ux` script 块全部通过 `node --check`，**0 语法错误** |
| 白屏 | **未发现确定性白屏路径** → 基线 P3-1 的白屏推断已撤回；异常兜底整体到位 |
| 9 Pro 屏幕显示错乱 | **复现（代码层确认）** → 首页等 4 页零适配 + 全站写死 px + `designWidth: device-width` |

---

## 二、变更核对

| 项 | 值 |
|---|---|
| 本地 HEAD | `2d727e98080454bef62717983fe25de94cde807d` |
| 远端 origin/main | `2d727e98080454bef62717983fe25de94cde807d` |
| 是否一致 | **一致（零变更）** |
| 新增 commit 数 | 0 |
| 变更文件数 | 0 |

**核对方式说明**：`git fetch` 因网络超时未能完成对象传输（`Recv failure: Operation timed out`），随后改用 `git ls-remote origin main` 复核远端引用，确认远端 `main` 与本地 HEAD 为同一 commit，故判定为**零变更**。该结论基于远端引用比对，可靠。

> 依据任务约定：本轮仓库无代码变更，故输出本"无变更确认报告"，并附当前已知 P0/P1 状态复验。

---

## 三、缺陷清单（本轮复验状态）

> 状态图例：🔴 **未修复（本轮复验仍存在）** · 🟢 已修复 · ⚪ 已撤回（误报） · 🔵 本轮新增

### P0 — 用户操作直接受影响的功能 Bug（最高优先级）

| 编号 | 模块/页面 | 缺陷标题 | 复现步骤 | 期望结果 | 实际结果 | 影响机型 | 严重度 | 定位（本轮复核行号） | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| P0-1 | schedule-manager | **删除课表导致课程数据串表（致命）** | 新建 3 张课表 A/B/C → 分别录入不同课程 → 删除中间的 B | B 数据清除，C 索引前移且数据仍对应 C | 仅 splice 后写回 `scheduleNames`，`allCourses_1/2` 原始数据原样保留 → 删 B 后切到 C 实际读到 B 的旧数据 | 9 Pro / 10 Pro 全系 | **致命** | `schedule-manager.ux:389`（`deleteSchedule`）、`:414`（splice）、`:427`（仅 `setScheduleNames`）；`database.js:374/576` 的 `deleteScheduleAndShift` **已定义但全仓无调用点**（死代码，本轮再次确认） | 🔴 未修复 |
| P0-2 | add-course | **新增/编辑课程保存后首页不显示（与"编辑课程失败"反馈吻合）** | 首页 → 新增课程 → 填写 → 保存 → 返回首页 | 首页立即出现新课程 | 页面端**直写 `allCourses_<idx>` storage**，未走 `database.insertCourse` → 首页经 `getAllCourses` 命中 `_cache` 旧值，须杀进程重启才可见 | 9 Pro / 10 Pro 全系 | **严重** | `add-course.ux:510`（`var storageKey = "allCourses_" + idx`）；`database.js:480`（`insertCourse` 未被该页调用）、`:482`（仅此处失效缓存） | 🔴 未修复 |
| P0-3 | detail | **编辑课程静默清空备注（数据丢失）** | 打开一条带备注的课程 → 编辑 → 更新 | 备注内容保留 | `updatedCourse.notes` 硬编码 `""`，且加载时从不读取 notes → 保存后备注永久丢失 | 全机型 | **严重** | `detail.ux:548`（`notes: ""`，本轮 grep 确认全文件 notes 仅此 1 处，无任何读取/回显逻辑） | 🔴 未修复 |
| P0-4 | add-course | **`day` 异步竞态导致课程"存了但看不见"** | onInit 中 storage 未回调完成前极快点保存 | 课程落在正确星期 | `day` 初值 `""`，异步赋值；竞态下写入 `day:""`，周视图/首页均无星期可匹配 | 全机型 | **严重** | `add-course.ux:161`（`day: ""`）、`:231`/`:235`（异步回调赋值）、`:293`（`setDefaultDay`） | 🔴 未修复 |
| P0-5 | backup-restore | **备份/恢复遗漏主题配置，恢复后不生效** | 换主题 → 备份 → 重置数据 → 恢复备份 | 主题一起还原且立即生效 | `DATA_KEYS` 写 `"theme"`，而 store 实际键为 `"appTheme"` → 主题永不备份/还原；恢复后 `database._cache` 与内存 `currentScheduleIndex` 未刷新 | 全机型 | **严重** | `backup-restore.ux:67-74`（`"theme"`，本轮核实在 `DATA_KEYS` 数组内）；`store.js:251/272/288`（`"appTheme"`） | 🔴 未修复 |
| P0-6 | schedule-manager | **复制课表失败时卡在中间态** | 复制一张含课程的课表，过程中任一 insert 失败 | 提示完成或失败 | `inserted++` 仅在成功分支累加，`inserted===totalCourses` 永不成立 → 无 toast、不还原索引、UI 停在加载态 | 全机型 | 一般 | `schedule-manager.ux:311-337`（本轮复核 `inserted` 计数与 `:328` 判定） | 🔴 未修复 |
| P0-7 | activation / auth-store | **激活持久化失败无任何反馈** | 激活成功但 `setAuthData` 写盘失败 | 明确提示"未保存，请重试" | 结果框已先置"激活成功"，失败仅不弹 toast；下次启动静默回退标准版 | 全机型 | 一般 | `activation.ux:511-523`（`:513-514` 先置成功态）；`auth-store.js:385-431` | 🔴 未修复 |

### P1 — 界面与显示 / 机型适配

| 编号 | 页面/组件 | 缺陷标题 | 期望 vs 实际 | 影响机型 | 严重度 | 定位（本轮复核） | 状态 |
|---|---|---|---|---|---|---|---|
| P1-1 | index-full（首页） | **首页零屏幕形状适配** | 期望：按圆/方/胶囊布局；实际：`@media` 出现 **0 次** | 圆屏 / 胶囊屏 | **高** | `index-full.ux`（本轮 grep `@media` = 0，`shape` = 0） | 🔴 未修复 |
| P1-1b | welcome / schedule-manager / custom-content-edit | **另有 3 个页面同样零适配（本轮新增确认）** | 30 个页面中 26 页已适配，**4 页为 0**：`index-full`、`welcome`（启动入口）、`schedule-manager`、`custom-content-edit`。基线仅报首页，漏报 3 页 | 圆屏 / 胶囊屏；`welcome` 影响**首屏第一印象** | **高** | `welcome.ux`、`schedule-manager.ux`、`custom-content-edit.ux`（三者 `@media` 均为 0） | 🔵 本轮新增 |
| P1-2 | index-full 顶部 | **顶部安全区与全站不一致（8px vs 44px）** | 首页 `padding:8px`，其余页 44px → 有状态栏机器内容被遮挡 | 9 Pro / 10 Pro 全系 | **高** | `index-full.ux:380`（`padding: 8px 8px 8px 8px`）；对比 `settings.ux`、`device-info.ux`、`week-view.ux`、`schedule-manager.ux` 的 44px | 🔴 未修复 |
| P1-3 | index-full 四角 | **圆屏下角落控件被裁切不可点** | header 两侧 44px `nav-btn`、3 个 `day-nav-circle`、`bottom-buttons`、`week-indicator` 全部贴边无内缩 | 圆屏 watch 形态 | **高** | `index-full.ux:6/9`（nav-btn）、`:11-21`（day-nav-circle）、`:656`（bottom-buttons）、`:680`（week-indicator） | 🔴 未修复 |
| P1-4 | 全局 | **写死 px，无分辨率差异处理** | `designWidth: device-width`（1px=1 物理像素），导航按钮 44px、课程卡 min-height 60px、按钮高 44px 全部固定 → 不同分辨率溢出/挤压 | 10 Pro（分辨率与 9 Pro 不同） | 中 | `manifest.json:57`；`index-full.ux` 多处固定 px | 🔴 未修复 |
| P1-5 | index-full | **数据库失败无错误态，永久"加载中"** | 期望：错误提示 + 重试；实际：`isLoading` 恒 true，只显示"加载中…" | 全机型 | 中 | `index-full.ux:48-50` | 🔴 未修复 |

### P2 — 输入与交互

| 编号 | 页面/组件 | 缺陷标题 | 期望 vs 实际 | 影响机型 | 严重度 | 定位 | 状态 |
|---|---|---|---|---|---|---|---|
| P2-1 | nickname-edit + chinese-input | **取消编辑后昵称被清空（共享键污染）** | 期望：取消不改动原值；实际：取消时把 `chinese_input_result` 写成 `""`，昵称页判定 `data!==undefined && data!==null`，`""` 被当有效值 → 昵称清空 | 全机型 | **高** | `chinese-input.ux:353-369`；`nickname-edit.ux:70-82` | 🔴 未修复 |
| P2-2 | chinese-input-full | **方屏机器被强制走圆屏输入法布局（与"输入法打不开/错位"反馈吻合）** | 期望：按 rect/pill 布局；实际：`screentype="circle"` **字符串写死**，未绑定变量 → 圆屏 480px 布局直接套到方屏，按键错位 | 9 Pro / 10 Pro（rect） | 中 | `chinese-input-full.ux:19`（本轮 grep 确认全仓仅此 1 处写死；`countdown-demo.ux:17` 正确使用了 `{{ screenType }}` 动态绑定，可参照） | 🔴 未修复 |
| P2-3 | InputMethod | **中文整词提交可越过 maxlength** | 昵称 maxlen=5，候选词整体追加（如"我们"）不触发长度校验 | 全机型 | 中 | `InputMethod.ux:471-473`（`addAllTxt` 无校验）；`chinese-input-full.ux:136-141` | 🔴 未修复 |
| P2-4 | InputMethod | **圆屏键盘宽度硬编码 480px** | 非对应设计宽度下被裁切/溢出 | 圆屏 | 中 | `InputMethod.ux:16/19` | 🔴 未修复 |
| P2-5 | InputMethod | **T9 候选点击区仅 36px，低于 40px 可点阈值** | 手环小屏极易误触/点不中 | 圆屏 T9 | 低 | `InputMethod.ux:987-991` | 🔴 未修复 |
| P2-6 | InputMethod | **`adjustScreenWidth` 无 fail 回调** | `device.getInfo` 失败时 screenWidth 恒为默认 336 → 进度环/键盘偏位 | rect / pill | 低 | `InputMethod.ux:802-808` | 🔴 未修复 |
| P2-7 | InputMethod | **胶囊屏（pill-shaped）缺 T9 布局** | 胶囊屏切 T9 键盘时多键/选词逻辑错位 | 胶囊屏 | 低 | `InputMethod.ux:263-334`（仅 full 键盘分支）；`:719`（T9 分支显式排除 pill-shaped） | 🔴 未修复 |
| P2-8 | InputMethod | **下展候选列表不刷新（代码注释自述）** | 选词后再次展开列表不更新，需先收回再展开 | 圆屏 | 低 | `InputMethod.ux:485`（注释） | 🔴 未修复 |

### P3 — 代码质量与稳定性

| 编号 | 问题 | 本轮核查结果 | 影响 | 状态 |
|---|---|---|---|---|
| P3-1 | ~~41 处 `JSON.parse` 无 try/catch，数据损坏即白屏~~ | **撤回（误报）**：全仓 35 处 `JSON.parse`，**未保护 0 处** —— 26 处前置 try、7 处同行 try、2 处 `JSON.parse(JSON.stringify())` 恒安全。抽样复核 `store.js:605-620`、`auth-store.js:140-152`、`detail.ux:320-335` 均有完整 try/catch + 默认值兜底 | 无 | ⚪ **本轮撤回** |
| P3-2 | 遗留 `console.log` | 仍存在（手环 CPU/内存极弱，日志 I/O 拖慢首屏） | 低 | 🔴 未修复 |
| P3-3 | 使用废弃 API `String.prototype.substr` | 仍存在于 `InputMethod.ux:356`、`dicUtil.js` 多处 | 低 | 🔴 未修复 |
| P3-4 | `setTimeout` 递归未清理 | `dicUtil.js:70` 分片构建 | 低 | 🔴 未修复 |
| P3-5 | `database.deleteScheduleAndShift` 为死代码 | **本轮再次确认全仓无调用点**（掩盖了 P0-1 真实 bug） | 中 | 🔴 未修复 |
| P3-6 | **语法错误**（用户关注点） | **未复现**：22 个 `.js` 文件 + 37 个 `.ux` script 块全部通过 `node --check`，**0 语法错误** | 无 | ⚪ 本轮排除 |

### P4 — 安全与合规（按你的要求排最后）

| 编号 | 问题 | 定位 | 说明 | 状态 |
|---|---|---|---|---|
| P4-1 | **激活码主盐硬编码在客户端** | `src/lib/crypto.js:1` `const GLOBAL_MASTER_SALT = "k3f9x"` | 激活码生成/校验算法完全在客户端，盐值明文写死，可被逆向后本地生成有效激活码。属混淆而非加密。建议改为服务端签发/校验，或至少做时效性签名 + 设备绑定 | 🔴 未修复 |

> 其余 P4 面（明文密码、token、越权写入）本轮**仍未发现** —— `auth-store.js` 中无 password/token/secret 相关字段。

---

## 四、9 Pro vs 10 Pro 机型适配对比表

| 维度 | 小米手环 9 Pro | 小米手环 10 Pro | 当前代码覆盖情况 | 风险 |
|---|---|---|---|---|
| 屏幕形态 | 方屏（rect） | 方屏（rect，尺寸/比例与 9 Pro 不同） | `manifest.deviceTypeList` 含 `watch`+`band`，但**4 个页面无任何形态判断** | **高** |
| 屏幕适配查询 | — | — | 30 页中 26 页有 `@media(shape)`；**`index-full` / `welcome` / `schedule-manager` / `custom-content-edit` 为 0** | **高** |
| 分辨率处理 | 约 336×480 | 与 9 Pro 不同 | `designWidth: device-width`（1px=1 物理像素），全站写死 px，**未读 `screenWidth` 做折算** | **高** |
| 顶部安全区 | 与全站 44px 假设不一致 | 同左 | 首页 8px，其余页 44px，**两处不一致** | **高** |
| 输入法布局 | 应为 rect | 应为 rect | `chinese-input-full.ux:19` 统一写死 `screentype="circle"` | 中 |
| 输入法正确写法参照 | — | — | `countdown-demo.ux:17` 已用 `screentype="{{ screenType }}"` 动态绑定，**可直接复用** | — |
| 圆角/安全区 | 未处理 | 未处理 | 无 safe-area 概念 | 中 |
| 圆形 watch 形态 | — | — | 首页/启动页四角控件会被圆形裁切且不可点 | **高** |
| 屏幕参数读取能力 | 有能力但仅用于展示 | 同左 | `device-info.ux` 已能取 `screenWidth/screenHeight/screenShape`，**未被复用到布局层** | 中 |
| 启动首屏 | — | — | `welcome.ux` 为 router entry 且**零适配**，首屏即可能错乱 | **高** |

---

## 五、与上一轮（第 1 轮基线）对比

| 类别 | 数量 | 明细 |
|---|---|---|
| **新增缺陷** | **1** | **P1-1b**：另有 3 个页面（`welcome` / `schedule-manager` / `custom-content-edit`）同样零 `@media` 适配 —— 基线仅发现首页，本轮全量扫描补全 |
| **已修复项** | **0** | 本轮零代码变更，**无任何缺陷被修复** |
| **仍未修复项** | **全部** | P0-1 ~ P0-7（7 项）、P1-1 ~ P1-5（5 项）、P2-1 ~ P2-8（8 项）、P3-2 ~ P3-5（4 项）、P4-1（1 项） |
| **撤回（基线误报）** | **1** | **P3-1**「41 处 JSON.parse 无 try/catch」—— 本轮逐处核查为 0 处未保护，撤回该结论及其"数据损坏即白屏"推断 |
| **本轮排除的用户关注点** | **2** | ①「代码语法错误」—— 59 个脚本单元全部通过 `node --check`，无语法错误；②「白屏」—— 未发现确定性白屏路径（原推断依赖已撤回的 P3-1） |

> **重要提示**：用户反馈的「编辑课程失败」「输入法打不开/错位」「9 Pro 屏幕显示错乱」三项，在本轮**代码层均得到确认**（分别对应 P0-2、P2-2、P1-1/P1-1b/P1-4）；而「代码语法错误」与「白屏」两项**未能在代码中复现**，建议向用户补充采集：具体机型、系统版本、复现操作路径、是否有截图/日志。

---

## 六、回归测试建议（给开发的可执行 checklist）

### A. 数据链路（最高优先，P0-1 致命）

- [ ] **删除课表串表**：建 A/B/C 三张表 → 各录 1 条不同课程 → 删 B → 切到 C，断言显示的是 C 的数据（当前会显示 B 的旧数据）
- [ ] **删除后新建**：删 B 后立即新建表，断言不会覆盖 C 的数据
- [ ] **接入 `deleteScheduleAndShift`**：`schedule-manager.ux:389` 删除流程中先调用 `database.deleteScheduleAndShift(index, list.length, cb)`，回调成功后再 `setScheduleNames` / `setScheduleIndex`
- [ ] 若确认不修复，**删除该死函数**（`database.js:374/576`），避免误导

### B. 新增/编辑课程（对应用户"编辑课程失败"，P0-2 / P0-3 / P0-4）

- [ ] **保存即生效**：新增课程保存 → 返回首页 → 断言**无需重启**即可见
- [ ] 改造：`add-course.ux:510` 直写 storage → 改用 `database.insertCourse(course, cb)`，统一走缓存失效通道
- [ ] **备注不丢**：给课程加备注 → 编辑 → 更新 → 断言备注仍在（当前必丢）
- [ ] **`day` 非空校验**：保存前断言 `day !== ""`，为空则 `setDefaultDay()`；或将 day 作为页面参数同步传入，消除异步竞态
- [ ] 快速连续点击保存，断言不产生 `day:""` 的隐形课程

### C. 备份恢复（P0-5）

- [ ] `DATA_KEYS` 中 `"theme"` → `"appTheme"`（`backup-restore.ux:67-74`）
- [ ] 换主题 → 备份 → 重置 → 恢复，断言主题还原
- [ ] `performRestore` 结束后调用 `database.init()` 清空缓存并刷新内存索引，断言首页立即刷新

### D. 界面适配（P1，9 Pro / 10 Pro 必测）

- [ ] **补齐 4 个页面的 `@media(shape: circle/rect/capsule)`**：`index-full.ux`、`welcome.ux`、`schedule-manager.ux`、`custom-content-edit.ux`（参照 `settings.ux` 已有的 3 套写法）
- [ ] **统一顶部安全区**：首页 `index-full.ux:380` 的 8px 与全站 44px 取齐；建议用 `device.getInfo` 取实际状态栏高度动态设置
- [ ] **圆屏四角内缩**：`index-full.ux` 的 nav-btn / day-nav-circle / bottom-buttons / week-indicator 在圆屏媒体查询内增加 padding 内缩 ≥ 半径补偿值，断言四角控件**完整可见且可点**
- [ ] **真机验证**：9 Pro 与 10 Pro 各跑一遍首页、启动页、课表管理页，比对布局是否溢出/挤压
- [ ] 补充数据库失败的错误态与重试入口（`index-full.ux:48-50`）

### E. 输入法（P2，对应用户"输入法打不开"）

- [ ] **解除写死**：`chinese-input-full.ux:19` `screentype="circle"` → `screentype="{{ screenType }}"`，由 `device.getInfo` 动态传入（直接复用 `countdown-demo.ux:17` 的写法）
- [ ] 9 Pro / 10 Pro（rect）上断言键盘按键**不错位、不溢出**
- [ ] **取消不清空昵称**：`chinese-input.ux:353-369` 取消时不写 `chinese_input_result`（或删除该键）；`nickname-edit.ux:70-82` 判定改为 `data !== ''`
- [ ] **maxlength 兜底**：`InputMethod.ux:471-473` 的 `addAllTxt` 追加后截断到 maxlength；昵称 maxlen=5 场景断言无法输入 6 字
- [ ] 键盘宽度改百分比或运行时宽度（`InputMethod.ux:16/19` 的 480px）
- [ ] T9 候选点击区放大至 ≥40px（`InputMethod.ux:987-991`）
- [ ] `adjustScreenWidth` 补 fail 回调与机型默认宽度（`InputMethod.ux:802-808`）

### F. 稳定性与收尾（P3 / P4）

- [ ] 构建时剔除 `console.log`（手环 CPU/内存极弱）
- [ ] `String.prototype.substr` → `slice`（`InputMethod.ux:356`、`dicUtil.js` 多处）
- [ ] 组件销毁时清理 `setTimeout` 递归（`dicUtil.js:70`）
- [ ] `GLOBAL_MASTER_SALT` 移出客户端，改服务端签发/校验，或加时效性签名 + 设备绑定（`src/lib/crypto.js:1`）

### G. 每轮回归固定跑（建议固化）

1. 建 3 张课表 + 各录课程 → 删中间表 → 校验数据不错位
2. 新增课程 → 返回首页 → 不重启即可见
3. 9 Pro / 10 Pro 双机各截图：首页、启动页、课表管理页
4. 输入法在 rect 机型上完整走一遍中文输入 + 取消
5. 备份 → 重置 → 恢复 → 校验主题与课程数据

---

*报告生成：WorkBuddy QA 自动化 · 第 2 轮 · 2026-09-10 18:20 (+0800)*
