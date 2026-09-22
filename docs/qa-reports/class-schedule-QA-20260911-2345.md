# Ev课程表（小米手环快应用）· 缺陷分析报告 · 第 7 轮

- **仓库**：github.com/guomengtao/class-schedule（main）
- **本轮 HEAD**：`ef095da`（`docs(qa): sync REPLY.md with QA round6 review`）
- **上一轮基线**：`cb94d64`（v1.4.193 / versionCode 693）
- **本轮代码变更**：**0**（`cb94d64..ef095da` 全部是 `docs(qa):` 文档提交，无一行 `src/` 改动）
- **报告时间**：2026-09-11 23:45 (+0800)
- **机型**：小米手环 9 Pro / 10 Pro（均为 `shape: rect` 方屏）

---

## 一、本轮结论摘要

> **一句话**：本轮零代码变更，上轮修好的 9 条 P0 **全部复查无回归、仍然有效**；但新挖出 **1 条 P0（P0-10）：课程详情页「更新/删除」在 id 未命中时静默不写库、却弹「课程已更新/已删除」假成功提示 —— 用户会以为改好了，实际改动全丢**。这是「编辑课程保存不生效」这个历史重点问题在 `cb94d64` 之后的**残留分支**。

**关键风险（只谈功能与可用性）**

| 风险 | 影响 |
|---|---|
| **P0-10 编辑/删除假成功** | 改动丢失且**无任何失败提示**，用户不会重试，数据永久丢 |
| P1-7 实验室「课程详情」入口不传参 | 打开的是上一门课或空白兜底，接着编辑就踩 P0-10 |
| U-2 T9 键盘缺 `jp.png` | 日文键盘裂图（P1，仍未修） |
| U-7 / U-9 / U-10 | 方屏热区偏小、emoji 当图标、三态缺失（P1，仍未修，因零变更指标与上轮完全一致） |

**明确不展开**：并发、限流、性能优化、内存量化、安全合规、密钥加密 —— 对当前几十人体量收益极低，本报告不列章节。（仅一句话：本地激活态可被改，见文末「已知风险·不急修」。）

---

## 二、用户操作链路走查（本轮重头戏）

> 每条给出：**结论 / 代码定位 / 推断的实际结果**
> 结论三选一：**通** ｜ **不通** ｜ **无法静态确认**

| # | 用户操作 | 结论 | 代码定位 | 推断的实际结果 |
|---|---|---|---|---|
| 1 | **首次启动 → 引导 → 进主界面** | **通** | `manifest.json:66` entry=`pages/welcome`；`welcome.ux:35 onInit` → `loadDefaultHomepage` → `:94 startCountdownIfNeeded` → `:127 doEnter` `router.replace` | 启动页 3s 倒计时（或点「进入」）→ replace 到 `index-full`。栈被清空，无「返回退不回去」问题。`autoSeconds=-1` 时为手动进入，也正常 |
| 2 | **激活状态判断**（未激活看到什么 / 已激活看到什么） | **通**（但门槛很软） | `store.js:740 isPremiumUnlocked` → `auth-store.getAuthData`；拦截点只在 `settings.ux:279 selectTheme` → `:281 showPremiumDialog`；`premium-overlay.ux:59` / `unlock-dialog.ux:87` / `pro-card.ux:63` → `/pages/activation` | **未激活**：课程表全部功能可用，只在**换主题**时弹「立即解锁」弹窗，点「暂不需要」即可关掉继续用。**已激活**：直接生效。→ 不会挡住正常使用 |
| 3 | **新增课程 → 填写 → 保存 → 下次打开还在不在** | **通** | `add-course.ux:489 saveCourse` → `:505 database.insertCourse`；`database.js:482 insertCourse` → `:484 if(!err) invalidateCache()` | 写入 + **缓存已失效**（本条即上轮 P0-2，复核仍在）。冷启动重开，**课程还在** ✅ |
| 4 | **编辑已有课程 → 修改 → 保存 → 是否真的生效** | **不通（主路径通，次级路径不通）** | 主路径 `index-full` → `class-list.js:127 goToClassDetail` 写 `detail_classId`/`detail_day` → `detail.ux:249/263` 读 → `:541 updateCourse` → `database.js updateCourseStorage` | **主路径（从首页点课程进详情）通** ✅（上轮 P0-3 备注清空已修，`:559 notes: this.courseNotes \|\| ""` 仍在）。<br>**次级路径不通** → 见 **P0-10** |
| 5 | **删除课程 → 是否真删、有没有确认** | **通**（同上有次级路径分支） | `detail.ux:571 deleteCourse` 两段式确认（首次点击置 `deleteConfirm`，5s 超时复位 `:576`）→ `database.deleteCourse` | 有二次确认、有「课程已删除」提示 ✅。但 id 未命中时同 P0-10 静默不删 |
| 6 | **课程数据本地存储 → 读回 → 顺序/时间/周次** | **通** | `database.js:137 invalidateCache` / `:150 getAllCoursesStorageWithIndex`；`insertCourse/updateCourse/deleteCourse` 三处均 `invalidateCache`；`schedule-manager.ux:416 deleteScheduleAndShift` | 单课表内读写一致；**删课表时 `allCourses_*` 键平移，不再串表**（P0-1 复核仍在，8 处调用）。时间排序 `sortByTime` 存在 |
| 7 | **主界面渲染：今天的课 / 周次切换 / 跨天** | **通**（跨天边界待真机） | `index-full.ux:210 onShow` 重载链（scheduleIndex → 字号 → `getAllCoursesWithIndex(idx, cb, true)` 强制刷新）；`:396 goToTomorrow`；三态 `isLoading/loadError/空` | 切天、返回刷新链路完整。**跨零点**是否自动跳天属运行时行为，**无法静态确认** |
| 8 | **设置项修改 → 保存 → 重启后保留** | **通** | 主题 `settings.ux:298 applyTheme` → `store.setTheme` **即时落盘**；字号 `:256 setSize` → `store.setBaseFontSize` **即时落盘**；默认首页 `:347 saveDefaultHomepage` 即时落盘 | 即便不点底部「保存」也已持久化 ✅。底部「保存」按钮 `saveSettings` 属冗余（见 P2-13） |
| 9 | **数据同步 / 刷新（若对接后端）** | **通（不适用）** | 全仓 `fetch` = **0** 处；`system.request` 仅注册在 `manifest.json:59` background features，无业务调用 | 纯本地应用，**不存在同步失败**。备份/恢复走本地 storage 序列化（`backup-restore.ux:72` 键表，含 `appTheme` ✅ P0-5 仍在） |
| 10 | **各页面入口按钮逐个点名** | **9 通 / 1 不通** | 静态 `router.push` 目标 **28 个全部命中 manifest 29 条路由**（0 跳砖，P0-9 无回归）；动态跳转 3 处：`pinned-pages.js:24`、`lab.ux:101`、`welcome.ux:125/136` | **不通的 1 个**：`lab.ux:101` → 实验室「**课程详情**」入口，见 **P1-7**。其余入口（设置/实验室/备份/统计/二维码/震动实验室/设备信息/打赏/重置…）按钮均有 handler、目标已注册 |

**走查小结：10 条中 8 条通、1 条不通（第 4 条编辑，次级路径）、1 条不适用（第 9 条无后端）。**

---

## 三、缺陷清单

### 🆕 P0-10 · 编辑/删除课程「假成功」：id 未命中时静默不写库，却提示已保存

| 项 | 内容 |
|---|---|
| **编号 / 优先级** | P0-10 / **P0（用户用不了·数据丢失）** |
| **模块** | 课程详情（编辑 / 删除） |
| **标题** | `updateCourse` / `deleteCourse` 在 id 未命中时仍返回成功，UI 弹「课程已更新/已删除」，实际数据未变 |
| **复现步骤（用户视角）** | ① 打开 App → 设置 → 实验室（测试区）→ 点「**课程详情**」<br>② 页面显示某门课（或兜底的第一门预设课），改掉课程名 / 时间<br>③ 点「更新」→ 弹出「**课程已更新**」→ 自动返回<br>④ 再进首页看 —— **课程名没变** |
| **期望结果** | 要么真的改掉，要么提示「更新失败」让用户重试 |
| **实际结果** | 提示成功、自动返回，**改动 100% 丢失**，且无任何异常提示 |
| **影响机型** | 9 Pro / 10 Pro 全系 |
| **严重度** | **高**（静默数据丢失 + 假成功，用户不会重试） |
| **定位** | `src/data/database.js` `updateCourseStorage()`：双重 for 找 `classes[j].id === course.id`，**未命中则直接落到 `saveToStorageWithIndex(..., callback(err))`**，此时 `err` 为 `undefined` → 上层判为成功。<br>`deleteCourseStorage()` 同构，同样问题。<br>上层：`src/pages/detail/detail.ux:553 updateCourse` `if(!err){ showToast("课程已更新"); router.back() }`；`:585 deleteCourse` 同理 |
| **触发条件** | `detail.ux:352 loadExistingCourseData` 里 `if(!self.classId \|\| !self.day)` → `selectCourse(0)`；而 `selectCourse(index)`（`:420`）**只设 `courseName/Teacher/Location/Time`，从不设置 `this.classId`** → `classId` 保持 `""` → `updateCourse` 传 `id: String("")`。<br>或：classId 有值但该课已被删除（陈旧 storage）→ 同样未命中 |
| **修复建议（最小 1 行）** | `updateCourseStorage`：加命中标记 `var hit=false`，循环结束 `if(!hit){ callback(formatError("updateCourseStorage","course not found: "+course.id)); return }`。`deleteCourseStorage` 同样处理。上层 toast 文案会自然变成「更新失败: course not found」。另外 `detail.ux:354` 的 `!self.classId` 分支建议直接 `prompt.showToast({message:"课程不存在"})` + `router.back()`，避免用户在错误对象上编辑 |

---

### 🆕 P1-7 · 实验室「课程详情」入口不传 `detail_classId`，打开的是上一门课

| 项 | 内容 |
|---|---|
| **编号 / 优先级** | P1-7 / **P1**（界面与显示 → 实际导致 P0-10，手环端按顶格） |
| **模块** | 实验室（测试区）入口列表 |
| **标题** | `ALL_PAGES` 里 `/pages/detail` 可直接跳转，但不写 `detail_classId` / `detail_day` |
| **复现步骤** | 设置 → 实验室 → 滑到底点「课程详情」 |
| **期望结果** | 提示「请从课程列表进入」或直接不可用 |
| **实际结果** | 详情页读到的是**上一次遗留的 `detail_classId`**（可能是已被删的课）或空 → 落到 `selectCourse(0)` 显示**预设课第一门**，用户以为这是自己的课，一改就踩 P0-10 |
| **影响机型** | 9 Pro / 10 Pro 全系 |
| **严重度** | 中高（是 P0-10 的主入口） |
| **定位** | `src/data/lab-list.js:21` `{ name: "课程详情", uri: "/pages/detail" }`；`src/pages/lab/lab.ux:101 router.push({ uri: item.uri })` —— 对比已修的 `class-list.js:127`（写 storage + success/fail 回调）与 `week-view.ux:652`，**唯独 lab 没补** |
| **修复建议** | 从 `ALL_PAGES` 删掉 `/pages/detail`（最简单，详情页本就不该被单独入口打开）；或跳前写入 `detail_classId=""` 并在 `detail.ux` 侧做空值拦截 |

---

### 🆕 P2-11 · 实验室保存设置无 `fail` 回调，写入失败时 UI 卡死无反馈

| 项 | 内容 |
|---|---|
| **编号 / 优先级** | P2-11 / P2 |
| **模块** | `lab-list.js` 隐藏 / 排序 / 删除条目 |
| **实际结果** | `saveSettings(settings, callback)` 只挂了 `success`，`storage.set` 失败时 `callback` 永不执行 → `deleteItem` 的回调不触发，界面无提示 |
| **定位** | `src/data/lab-list.js:52-59`（`storage.set` 无 `fail`） |
| **修复建议** | 补 `fail: function(){ if(callback) callback() }`，与 `store.js` 里其它 setter 保持一致 |

### 🆕 P2-12 · 首页「快速添加」满课时点击无反馈

| 项 | 内容 |
|---|---|
| **编号 / 优先级** | P2-12 / P2 |
| **模块** | `index-full` 快速添加（新功能） |
| **实际结果** | 今天已排满时 `quickAdd.disabled=true`，但课程标签仍可点；`quick-add.js:42 if (self.quickAdd.disabled) return` **静默 return**，用户点了没任何反应（典型的「按钮点了没反应」） |
| **定位** | `src/pages/index-full/modules/quick-add.js:39-42` |
| **修复建议** | `if (disabled) { prompt.showToast({message:"今天的课程已排满"}); return }`；另外 `addCourse` 成功也应补一次 `showToast("已添加")`（当前只有列表变化，无明确反馈） |

### 🆕 P2-13 · `nextId` 写盘无 `fail`，失败会产生重复课程 id

| 项 | 内容 |
|---|---|
| **编号 / 优先级** | P2-13 / P2 |
| **模块** | 新增课程 |
| **实际结果** | `add-course.ux:503 storage.set({key:"add_course_nextId"})` **无 `fail` 回调**，且是先 `this.nextId++` 再写盘。写盘失败 → 下次再新增时复用同一个 id → 两门课 id 相同 → 编辑/删除只命中第一个，造成**数据错乱** |
| **定位** | `src/pages/add-course/add-course.ux:496-506` |
| **修复建议** | id 改成 `String(Date.now())`（与 `quick-add.js:43` 一致）可彻底消除；或补 `fail` 并在失败时回滚 `nextId` |

### 🆕 P3-14 · 输入法组件残留 2 处 ES6 箭头函数

| 项 | 内容 |
|---|---|
| **编号 / 优先级** | P3-14 / P3（但老内核下可能整段不执行 → 按 P0 风险提示） |
| **模块** | `InputMethod` 组件 |
| **实际结果** | `InputMethod.ux:810/813` `success: (data) => {}` / `fail: () => {}`；`dicUtil.js:59 const step = () => {}`。全仓 `let/const` 已普遍使用，说明目标内核支持 ES6 基本语法，但**箭头函数是老快应用内核最容易整段解析失败的一项**。若真机出现「输入法唤不起来 / 键面全黑」，这是第一排查点 |
| **定位** | `src/components/InputMethod/InputMethod.ux:808-817`、`src/components/InputMethod/assets/dicUtil.js:59` |
| **修复建议** | 改成 `success: function(data){...}` 形式，零成本 |

---

### 本轮复验：上轮已修项**零回归** ✅

| 编号 | 复核方式 | 结果 |
|---|---|---|
| P0-1 删课表串表 | `deleteScheduleAndShift` 调用点 ≥8 处（`schedule-manager.ux:416` 等） | ✅ 仍在 |
| P0-2 新增不显示 | `add-course.ux:505 insertCourse`；`insertCourse` 内 `invalidateCache` | ✅ 仍在 |
| P0-3 编辑清备注 | `detail.ux:559 notes: this.courseNotes \|\| ""` | ✅ 仍在 |
| P0-4 day 竞态 | `add-course.ux:485-487 if(!this.day) setDefaultDay()` | ✅ 仍在 |
| P0-5 备份漏主题 | `backup-restore.ux:76 "appTheme"` | ✅ 仍在 |
| P0-6 复制课表卡中间态 | `schedule-manager` 多处 fail + toast | ✅ 仍在 |
| P0-7 激活无反馈 | `activation.ux` 11 处 toast | ✅ 仍在 |
| P0-8 返回退不出 | `onBackPress` 全仓 1 处（`index-full.ux:357`） | ✅ 仍在 |
| P0-9 模块测试跳砖 | `lab-module-test` 全仓 **0** 处；28 个静态跳转目标 100% 命中 manifest | ✅ 仍在 |
| P1-1 屏幕形状适配 | `@media (shape: circle/capsule/rect)` 覆盖 **29/29** 页面 | ✅ 仍在 |
| P1-5 数据库失败错误态 | `index-full.ux:52`「数据加载失败」+ 重试按钮 | ✅ 仍在 |
| P1-6 详情页参数传递 | `class-list.js:127` 已加 success/fail，失败不 push | ✅ 仍在（**但 lab 入口漏网 → P1-7**） |
| U-12 实验室重复页 | `pages/countdown-demo/` 已删除 | ✅ 仍在 |

---

## 四、9 Pro / 10 Pro 机型适配对比表

| 维度 | 小米手环 9 Pro | 小米手环 10 Pro | 代码依据 | 结论 |
|---|---|---|---|---|
| 屏幕形状 | `rect`（方屏） | `rect`（方屏） | `@media (shape: rect)` 分支 | 走同一套分支，理论上表现一致 |
| 形状适配覆盖 | 29/29 页 | 29/29 页 | 全仓 `@media (shape:...)` 命中 29 个页面文件（circle / capsule / rect 三态齐全） | ✅ 无「零适配页面」（P1-1 已修） |
| 基准宽度 | 336px | 336px | `InputMethod.ux:407 screenWidth: 336`；`manifest.json:57 designWidth: "device-width"` | 一致；`designWidth` 用 `device-width` 是快应用标准做法 |
| 顶部安全区 | `padding-top: 44px` | `padding-top: 44px` | `index-full.ux` / `settings.ux` 统一 44px | ✅ P1-2 基本收敛，真机观感待确认 |
| 圆屏/胶囊分支 | 不生效 | 不生效 | `shape: circle` / `capsule` 块 | 与两款机型无关；老款圆形/胶囊手环才走 |
| 方屏按钮热区 | **<40px 的按钮 158 个** | 同 | `ui-audit` 第 6 区（本轮值 = 上轮值） | ❌ **U-7 未修**，方屏下误触/点不中风险 |
| 输入法布局 | 78 处绝对定位硬像素 | 同 | `InputMethod.ux` | ⏸ **U-1 挂起**（已问 3 轮，等真机回填 A/B/C） |
| T9 键盘日文 | `assets/t9/jp.png` **缺失** | 同 | `assets/arc/`、`full/`、`horizontal/` 均有 `jp.png`，唯独 `t9/` 没有 | ❌ **U-2 未修**，切日文裂图 |
| 主题配色双轨 | 硬编码色残留（detail/add-course 各 13 种） | 同 | `ui-audit` 第 6 区 | 🟡 **U-11 部分改善** |
| 三态（加载/空/错误） | 12 个页面无任何三态 | 同 | round4 实测基线 | ❌ **U-10 未修** |
| ES6+ 风险 | 仅 `InputMethod.ux:810/813` + `dicUtil.js:59` 箭头函数 | 同 | 全仓扫描 `?.` `??` `=>` `async` `await` `fetch(` | ⚠️ **P3-14**；全仓 `fetch` = 0，无网络兼容问题 |
| **机型间差异结论** | — | — | — | **两款机型不存在分支差异**，所有适配问题同源；真机差异主要在屏幕物理尺寸与圆角，需实机目测 |

> 注：因本轮零代码变更，上表所有量化指标与上一轮（round6）**完全一致**。

---

## 五、与上一轮对比

| 类别 | 内容 |
|---|---|
| **代码变更** | **无**。`cb94d64..ef095da` 共 3 个 commit，全是 `docs(qa):`（STATUS.md / REPLY.md / round5-6 交接本），`src/` 零改动 |
| **fix(qa) 提交** | 扫描 `git log cb94d64..HEAD --grep='fix(qa)'` → **0 条**（作者未用 commit 编号通道） |
| **作者回复** | ✅ 作者于 `ef095da` 同步了 `REPLY.md`，**全盘接受上轮复核结论**：把 P0-2 / P0-3 / P1-1 / P1-5 / U-12 从「②处理中 / ③打算做」移入「①已处理」，②处理中区清空；U-1 理由改为「待真机回填后决定」（维持 ⏸），U-3 接受改判 🔴 低优先 |
| **新增** | P0-10、P1-7、P2-11、P2-12、P2-13、P3-14（共 6 条） |
| **已修复** | 无（无代码变更） |
| **仍未修复** | U-2（缺 jp.png）、U-7（方屏热区）、U-9（emoji 图标 84 处）、U-10（三态缺失）、P1-3（圆屏裁切，真机确认）、P1-4（`designWidth`，待确认是否算缺陷）、U-3、U-4、U-5、U-6、U-8、U-11、U-13~U-15 |
| **回归** | **无**。9 条 P0 + 5 条 P1 全部复查仍在位 |

---

## 六、回归测试建议（按用户操作路径的可执行 checklist）

> 上真机 10 分钟能跑完，按此顺序做。**前 3 条是必须验的。**

**A. 主路径（每天都会用）**
1. 首页 →「+ 添加课程」→ 选课 / 设时间 → 保存 → **不重启**，首页列表**立刻**出现这门课 ✅（P0-2）
2. 首页 → 点这门课 → 改课程名 + 写备注 → 更新 → 回到首页 → **名字变了**；再点进去 → **备注还在** ✅（P0-3）
3. 首页点课 → 删除（**点两次**）→ 提示「课程已删除」→ 首页该课消失 ✅
4. 首页 ← → 切天（◀ ▶ / 今 / 明）→ 课程随天切换，不串天
5. 首页底部「⇄ 课表名」→ 课表管理 → 新建课表 2 → 切过去 → **是空的**（不是课表 1 的内容）
6. 课表管理 → 删除「课表 1」→ 提示已删除 → 切到课表 2 → **课程数据不串表** ✅（P0-1）

**B. 本轮新发现的必测路径**
7. **设置 → 实验室 →「课程详情」→ 改课程名 → 更新 → 回首页确认有没有真的改**。若提示「课程已更新」但没变 = **P0-10 复现**
8. 首页「快速添加」展开 → 点一个课程标签 → 课程出现在今天列表；**把今天排满后再点** → 是否有「已排满」提示（当前无反应 = P2-12）

**C. 设置与持久化**
9. 设置 → 换主题 → **直接按返回 ◀**（不点保存）→ 重进 → 主题**还在**
10. 设置 → 字号 +/− → 立刻生效 → 重启 → 还在
11. 设置 → 默认首页改为「总课表」→ 冷启动 → 直接进总课表
12. 设置 → 数据备份与恢复 → 备份 → 恢复 → 主题/字号/课程都在（P0-5）

**D. 边界（顺便看一眼）**
13. 首页按返回键 → 应用退出（不退不进、不循环）✅（P0-8）
14. 输入法：在「添加课程 → 备注」里唤起键盘，记录现象是 **A 完全唤不起 / B 偏右被切 / C 能出但打不出字** → **回填给 U-1**（已问 3 轮）
15. T9 键盘切到日文 → 是否裂图（U-2）

---

## 七、已知风险 · 不急修（P4，仅记录，不排期）

> 按你的定位：知道就行，算一种福利，修复不着急。**不上待办表、不催修。**

| # | 风险 | 触发条件 | 损失上限 |
|---|---|---|---|
| 1 | 激活态存本地 storage（`premium_unlocked` / `auth-store` 的 `isActivated`），改之即可解锁付费主题 | 用户主动改本地存储（需 root/调试通道） | 少收一份主题解锁费；当前仅「主题」这一项受限，主功能全免 |
| 2 | 激活码校验在端上做（`lib/crypto.js`），离线可爆破 | 用户抓包/反编译 | 同上 |
| 3 | 备份文件是明文 JSON，可手改后再恢复 | 用户自己编辑备份 | 同上，且只影响自己的设备 |

**一句话**：都是「少卖一份主题」级别的资金损失，不影响其他用户正常使用，当前几十人体量下收益极低。

---

## 八、归档信息

| 渠道 | 位置 / 状态 |
|---|---|
| 本地 | `reports/class-schedule-QA-20260911-2345.md` |
| 仓库 | `class-schedule/docs/qa-reports/class-schedule-QA-20260911-2345.md` |
| 交接本 | `class-schedule/docs/qa-reports/HANDOFF/2026-09-11-round7.md` |
| 飞书云盘 | 「WorkBuddy 同步 / class-schedule-测试报告」folder_token `CH1nfkfwqlKjaCdekYZc22a1npg` |
| 项目云盘 tdrive | ❌ **不可用**（`~/.workbuddy/mcp.json` 不存在，ToolSearch 无 tdrive 工具 —— 已连续第 5 轮确认，明确跳过，未静默略过） |
