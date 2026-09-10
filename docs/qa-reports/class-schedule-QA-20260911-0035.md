# Ev课程表 手环快应用 · 第 3 轮质检报告（零变更确认 + 用户操作链路走查）

| 项目 | 内容 |
|---|---|
| 仓库 | https://github.com/guomengtao/class-schedule |
| 分支 / HEAD | `main` / `d4e11a6668cb5665dd25f68aeb40eaadf1ff82d7` |
| 上一轮 HEAD | `2d727e98080454bef62717983fe25de94cde807d`（第 2 轮） |
| HEAD 提交信息 | docs(qa): add QA analysis reports round 1 & 2 |
| 版本 | versionName 1.4.153 / versionCode 653 |
| 目标机型 | 小米手环 9 Pro、小米手环 10 Pro（`manifest.deviceTypeList` = watch + band） |
| 分析轮次 | **第 3 轮** |
| 生成时间 | 2026-09-11 00:35 (+0800) |
| 分析视角 | 资深客户端测试工程师（QA） |

---

## 一、本轮结论摘要

> **一句话结论**：**本轮依旧零代码变更**（远端 `main` 与本地 HEAD 同一 commit，`2d727e9..d4e11a6` 之间只新增了 2 个 QA 文档），上轮 7 个 P0 全部原样遗留；但本轮首次做**完整用户操作链路走查**，**新抓出 3 个真实缺陷**——其中「首页按返回键退不出应用、被启动页循环吞掉」是此前两轮都没覆盖到的、每个用户每天都会踩的问题。

**三个关键结论：**

1. **零变更**：`git ls-remote` 远端 `main` = `d4e11a66...` = 本地 HEAD；`git diff 2d727e9 d4e11a6` 仅 2 个 `docs/qa-reports/*.md`。**第 1、2 轮全部缺陷原样遗留，无任何修复动作。**
2. **本轮新增 3 个缺陷（都是"用户点下去没反应 / 退不出来"这一类）**：
   - **P0-8 返回键退不出应用**：全仓 **0 处 `onBackPress`**；启动页 `welcome` 用 `router.push`（而非 replace）进首页，且 `onShow` 会重启 3 秒倒计时再自动 push 一遍 → 用户在首页按返回，回到启动页 → 3 秒后又自动跳回首页，**永远退不出去**。
   - **P0-9 跳未注册路由变砖**：设置 → 实验室 → 震动实验室 →「模块测试」跳 `/pages/lab-module-test`，但 manifest 里**根本没有这个页面**（30 条路由中无此项）→ 点击后跳砖/无响应。
   - **P2-9 按钮无响应**：`lab.ux:46` 的「丰富欢迎用户提交意见建议」绑定 `onDevExpireClick`，**该方法全仓未定义** → 点了毫无反应。
3. **澄清一个此前未说清的重要事实**：**手环端全程无网络同步能力**。全仓扫描 `fetch` / `@system.fetch` 结果为 **0 处**（只有捐赠外链和激活跳转外部 URL）。课程数据 100% 本地存储，「数据同步/刷新」这条链路**当前不存在**，不是 bug 而是能力缺失——若作者计划做云同步，这是从零起步。

**用户已知关注点 · 本轮核查对照：**

| 用户关注点 | 本轮结论 | 对应条目 |
|---|---|---|
| 编辑课程失败 | **复现（代码层确认）** — 新增/编辑保存后首页不显示，须重启 | P0-2 |
| 按钮显示错乱 | **部分复现** — 4 个页面零屏幕形状适配 + 顶部安全区不一致 | P1-1 / P1-1b / P1-2 |
| 输入法打不开 | **定位到唯一可疑点** — InputMethod 是全仓唯一使用箭头函数的组件 | P3-7（待真机确认） |
| 代码语法错误 | **未复现** — 上轮已全量 `node --check`，0 语法错误 | — |
| 白屏 | **未发现确定性路径**，但本轮找到 1 条**跳不存在的路由**（表现接近白屏/无响应） | P0-9 |
| 9 Pro 屏幕显示错乱 | **复现（代码层确认）** — 首页/启动页等 4 页零适配 + 全站写死 px | P1-1 / P1-1b / P1-4 |
| （新）返回键退不出 | **本轮首次发现** | **P0-8** |

---

## 二、用户操作链路走查（本轮重头戏）

> 结论图例：✅ **通** · ❌ **不通** · ⚠️ **部分通（有条件/有缺陷）** · ➖ **不适用（功能不存在）** · ❔ **无法静态确认**

| # | 用户操作链路 | 结论 | 代码定位 | 推断的实际结果 |
|---|---|---|---|---|
| 1 | **首次启动 → 引导/初始化 → 进入主界面** | ⚠️ **部分通** | `manifest.json:66`（entry = `pages/welcome`）；`welcome.ux:43`（onInit）、`:81-107`（`startCountdownIfNeeded`）、`:117-121`（`doEnter`） | 启动页 3 秒倒计时后自动 `router.push` 进首页，**能进得去**。但 push 而非 replace → welcome 留在栈底，埋下 P0-8。 |
| 2 | **激活状态判断 → 未激活 / 已激活各看到什么** | ⚠️ **部分通** | `activation.ux:338-344`（`isActivated && isExpired` / `isExpiring` / `isActivated` 三分支）；`auth-store.js` | 三态分支齐全，UI 上能区分。但**激活成功若写盘失败无任何提示**（P0-7），用户会以为激活好了，下次启动静默退回标准版。 |
| 3 | **新增课程 → 填写 → 保存 → 下次打开还在不在** | ⚠️ **部分通** | `add-course.ux:490-497`（拼 course 对象）、`:510`（`var storageKey = "allCourses_" + idx`）、`:512-560`（直写 `@system.storage`） | **写盘成功，下次打开在**（存储层没问题）。但**当次返回首页看不到**（P0-2）：绕过了 `database` 直写 storage，首页走 `database.getAllCoursesWithIndex` 命中 `_cache` 旧值（`data/database.js:152`），**必须杀进程重启**才显示。这就是用户嘴里"课程存了但看不见/编辑失败"的真身。 |
| 4 | **编辑已有课程 → 修改 → 保存 → 是否真的生效** | ⚠️ **部分通** | `detail.ux:534-558`（`updateCourse`）、`:548`（`notes: ""`） | 走的是正路 `database.updateCourse`（`detail.ux:550`），缓存会失效，**改完首页能刷新**。但**备注被静默清空**（P0-3）：`:548` 硬编码 `notes: ""`，且全文件**从未读取/回显过 notes**，编辑一次备注永久丢失。 |
| 5 | **删除课程 → 是否真删除、有没有确认** | ✅ **通** | `detail.ux:6`/`:113`（`deleteConfirm` 二次确认，按钮文案变「确认删除」）；`:560-580`（`deleteCourse` → `database.deleteCourse`）；`course-manager.ux:21`/`:230`（同款二次确认） | 两处入口都做了「点一次变确认、再点才删」的防误触，删后走数据库层并 `router.back`。**这条链路是健康的**。 |
| 6 | **课程数据本地存储 → 读回 → 顺序/时间/周次是否正确** | ⚠️ **部分通** | `data/database.js:143-200`（`_cache` / `_cacheDirty` 读写）、`:152`（命中缓存直接返回）；`add-course.ux:231-293`（`day` 异步赋值） | 数据库层本身正确（按 `day` 分桶、`classes` 数组有序）。但两个污染源：① `add-course` 旁路直写破坏缓存（P0-2）；② **`day` 初值 `""` 且异步赋值**（P0-4），极快保存会写出 `day:""` 的隐形课程，周视图/首页永远匹配不到。 |
| 7 | **主界面渲染：今天的课 / 周次切换 / 跨天显示** | ⚠️ **部分通** | `index-full.ux:8`/`:21`（prev/next 按钮）、`:11-21`（今天/明天快捷圆钮）、`:139-140`（`currentDay`/`currentDayIndex`）、`:351-365`（`goToTomorrow`）、`:54`（`currentClasses` 列表）、`:210`（`onShow` 重载） | 左右切天、跳今天、跳明天逻辑齐全，`onShow` 每次回首页都会重载，**渲染链路通**。缺陷是**数据库失败时 `isLoading` 恒 true，页面永久「加载中…」且无重试**（P1-5）。 |
| 8 | **设置项修改 → 保存 → 重启后是否保留** | ✅ **通** | `settings.ux:155`（保存按钮）、`:440-450`（`saveSettings` → `store.setTheme` / `setBaseFontSize` / `setHideWeekend`） | 三项设置都即时落 storage，重启保留。**这条链路健康**。 |
| 9 | **数据同步 / 刷新（对接后端）** | ➖ **不适用** | 全仓 grep `fetch` / `@system.fetch` = **0 处**；`activation.ux:255-256`、`donate.ux:47-48` 仅为外链 URL | **当前无云端同步能力**，课程数据 100% 本地。不是 bug，是能力缺失；备份靠 `backup-restore` 手动导出（该模块有 P0-5 主题键写错的 bug）。 |
| 10 | **各页面入口按钮逐个点名：有没有点了没反应 / 跳错页** | ❌ **不通（3 处）** | 见下表 | 全量扫描 30 个页面的所有 `onclick` 绑定 vs 方法定义，发现 3 个真实断点。 |

### 第 10 条展开：按钮/入口逐一点名结果

| 入口 | 位置 | 结论 | 说明 |
|---|---|---|---|
| 首页全部按钮（◀ ▶、今天、明天、总课表、课程卡、快捷添加、添加课程、设置、周指示器、置顶页） | `index-full.ux:8/11/14/17/21/40/54/80/91/92/95` | ✅ 通 | 11 个绑定的方法全部由 `index-full/modules/*.js`（8 个模块）注入（`:126-133` `loadModule`），无遗漏。 |
| 实验室页「丰富欢迎用户提交意见建议」 | `lab.ux:46` `onclick="onDevExpireClick"` | ❌ **点了没反应** | **该方法全仓不存在**。属 P0 分级口径里的"按钮点击无响应"，但影响面只是一行装饰提示文字，本轮降为 **P2-9**。 |
| 震动实验室「模块测试」 | `vibration-lab.ux:525-530` `goToModuleTest()` → `/pages/lab-module-test` | ❌ **跳砖/无响应** | manifest 30 条路由中**无 `lab-module-test`**，目标页不存在。**P0-9**。 |
| 其余 28 个页面的入口 | — | ✅ 通 | 静态扫描未发现未定义处理器或未注册路由。 |

---

## 三、缺陷清单

> 状态图例：🔴 未修复 · 🔵 **本轮新增** · ⚪ 已撤回/不适用

### P0 — 用户操作直接受影响（最高优先级）

| 编号 | 模块 | 缺陷标题 | 复现步骤（用户视角） | 期望结果 | 实际结果 | 影响机型 | 严重度 | 定位 | 修复建议 | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|
| P0-1 | schedule-manager | **删除课表导致课程数据串表（致命）** | 建 3 张课表 A/B/C，各录不同课程 → 删掉中间的 B → 切到 C | C 的数据完好 | 只 splice 了课表**名字**列表，`allCourses_1/2` 原始数据原样保留 → 切到 C 实际读到 **B 的旧数据** | 9 Pro / 10 Pro 全系 | **致命** | `schedule-manager.ux:389`（deleteSchedule）、`:414`（splice）、`:427`（仅 setScheduleNames）；`data/database.js:374/576` `deleteScheduleAndShift` **已实现但全仓 0 调用**（死代码，本轮再次确认） | 删除流程中先调 `database.deleteScheduleAndShift(index, list.length, cb)`，回调成功后再写名字与索引 | 🔴 |
| P0-2 | add-course | **新增/编辑保存后首页不显示（＝用户说的"编辑课程失败"）** | 首页 → 添加课程 → 填完保存 → 返回首页 | 首页立即出现新课程 | 页面直写 `allCourses_<idx>` storage，未走 `database.insertCourse` → 首页仍读 `_cache` 旧值，**须杀进程重启** | 全系 | **严重** | `add-course.ux:510`；`data/database.js:152`（缓存命中）、`:480`（`insertCourse` 未被该页调用） | 改用 `database.insertCourse(course, cb)`，与 detail 页保持一致 | 🔴 |
| P0-3 | detail | **编辑课程静默清空备注（数据丢失）** | 给课程填备注 → 打开编辑 → 更新 | 备注保留 | `updatedCourse.notes` 硬编码 `""`，且加载时从不读 notes → **保存后备注永久丢失** | 全系 | **严重** | `detail.ux:548`（本轮确认全文件 notes 仅此 1 处，无读取/回显逻辑） | 从原课程对象带上 `notes: self.originalCourse.notes \|\| ""` | 🔴 |
| P0-4 | add-course | **`day` 异步竞态 → 课程"存了但看不见"** | 进添加页后极快点保存 | 课程落在正确星期 | `day` 初值 `""`、异步赋值；竞态下写入 `day:""` → 周视图/首页无星期可匹配 | 全系 | **严重** | `add-course.ux:161`（`day:""`）、`:231`/`:235`（异步赋值）、`:293`（`setDefaultDay`） | 保存前断言 `day !== ""`，为空则同步调 `setDefaultDay()` | 🔴 |
| P0-5 | backup-restore | **备份遗漏主题，恢复后不生效** | 换主题 → 备份 → 重置 → 恢复 | 主题一起还原 | `DATA_KEYS` 写 `"theme"`，store 实际键是 `"appTheme"` → **主题永不备份/还原** | 全系 | **严重** | `backup-restore.ux:72`（本轮确认仍在数组内）；`data/store.js:251/272/288`（`appTheme`） | `"theme"` → `"appTheme"` | 🔴 |
| P0-6 | schedule-manager | **复制课表失败时卡在中间态** | 复制一张含课程的课表，任一 insert 失败 | 提示完成或失败 | `inserted++` 只在成功分支累加，`inserted===totalCourses` 永不成立 → 无 toast、不还原索引、UI 停在加载态 | 全系 | 一般 | `schedule-manager.ux:312/328/330`（本轮复核仍在） | 改计数失败分支，或加超时兜底 | 🔴 |
| P0-7 | activation | **激活持久化失败无任何反馈** | 激活成功但写盘失败 | 明确提示"未保存，请重试" | 结果框先置"激活成功"，失败只是不弹 toast；下次启动静默退回标准版 | 全系 | 一般 | `activation.ux:511-523`；`data/auth-store.js:385-431` | 先写盘成功再置成功态 | 🔴 |
| **P0-8** | **welcome / 全局** | **🔵 首页按返回退不出应用，被启动页倒计时循环吞掉** | 进首页 → 按返回键（或侧滑返回） | 退出应用，或停在启动页等待用户点「进入」 | 回到 welcome → `onShow` 重启 3 秒倒计时 → 自动 push 回首页。**用户永远退不出去**，只能靠系统手势强杀 | 9 Pro / 10 Pro 全系 | **严重** | `welcome.ux:119`/`:126`（用 `router.push` 而非 `replace`）；`:52-57`（onShow 重启倒计时）；`:81-107`（3 秒后自动 `doEnter`）；**全仓 `onBackPress` = 0 处** | ① 首页/主界面实现 `onBackPress` 直接退出；② `doEnter` 改 `router.replace` 或加"已自动进入过"标记，`onShow` 不再重复自动跳转 | 🔵 **新增** |
| **P0-9** | **vibration-lab** | **🔵「模块测试」跳未注册路由 → 跳砖/无响应** | 设置 → 实验室 → 震动实验室 → 点「模块测试」 | 打开模块测试页 | manifest 30 条路由中**无 `lab-module-test`** → 跳转失败，页面无反应或白屏 | 9 Pro / 10 Pro 全系 | 中 | `vibration-lab.ux:525-530`（`goToModuleTest`）；`manifest.json:66-158`（路由表，无此项） | 要么补页面并注册路由，要么删掉这个按钮 | 🔵 **新增** |

### P1 — 界面与显示 / 机型适配（手环端顶格）

| 编号 | 页面 | 缺陷标题 | 期望 vs 实际 | 影响机型 | 严重度 | 定位 | 状态 |
|---|---|---|---|---|---|---|---|
| P1-1 | index-full | **首页零屏幕形状适配** | 期望按圆/方/胶囊布局；实际 `@media` 出现 **0 次** | 圆屏 / 胶囊屏 | **高** | `index-full.ux`（`@media` = 0、`shape` = 0） | 🔴 |
| P1-1b | welcome / schedule-manager / custom-content-edit | **另有 3 页同样零适配** | 30 页中 26 页已适配，**4 页为 0**；`welcome` 是启动入口，影响首屏第一印象 | 圆屏 / 胶囊屏 | **高** | `welcome.ux`、`schedule-manager.ux`、`custom-content-edit.ux` | 🔴 |
| P1-2 | index-full 顶部 | **顶部安全区与全站不一致（8px vs 44px）** | 全站 44px，首页仅 8px → 有状态栏的机器内容被遮挡 | 9 Pro / 10 Pro | **高** | `index-full.ux:380`（`padding: 8px`）；对比 `settings.ux:452` 等 44px | 🔴 |
| P1-3 | index-full 四角 | **圆屏下角落控件被裁切不可点** | header 两侧 44px `nav-btn`、3 个 `day-nav-circle`、`bottom-buttons`、`week-indicator` 全部贴边无内缩 | 圆屏 watch | **高** | `index-full.ux:6/9/11-21/656/680` | 🔴 |
| P1-4 | 全局 | **写死 px，无分辨率差异处理** | `designWidth: device-width`（1px=1 物理像素），导航 44px、课程卡 min-height 60px 全固定 → 不同分辨率溢出/挤压 | 10 Pro（分辨率与 9 Pro 不同） | 中 | `manifest.json:57`；`index-full.ux` 多处 | 🔴 |
| P1-5 | index-full | **数据库失败无错误态，永久「加载中」** | 期望错误提示 + 重试；实际 `isLoading` 恒 true | 全系 | 中 | `index-full.ux:48-50` | 🔴 |

### P2 — 输入与交互

| 编号 | 模块 | 缺陷标题 | 影响机型 | 严重度 | 定位 | 状态 |
|---|---|---|---|---|---|---|
| P2-1 | nickname-edit + chinese-input | **取消编辑后昵称被清空（共享键污染）** | 全系 | **高** | `chinese-input.ux:353-369`；`nickname-edit.ux:70-82` | 🔴 |
| P2-2 | chinese-input-full | **方屏机器被强制走圆屏输入法布局（＝用户"输入法打不开/错位"）** | 9 Pro / 10 Pro（rect） | 中 | `chinese-input-full.ux:19`（`screentype="circle"` 写死）；正确写法参照 `countdown-demo.ux:17` 的 `{{ screenType }}` | 🔴 |
| P2-3 | InputMethod | **中文整词提交可越过 maxlength** | 全系 | 中 | `InputMethod.ux:471-473`（`addAllTxt` 无校验） | 🔴 |
| P2-4 | InputMethod | **圆屏键盘宽度硬编码 480px** | 圆屏 | 中 | `InputMethod.ux:16/19` | 🔴 |
| P2-5 | InputMethod | **T9 候选点击区仅 36px，低于 40px 可点标准** | 圆屏 T9 | 低 | `InputMethod.ux:987-991` | 🔴 |
| P2-6 | InputMethod | **`adjustScreenWidth` 无 fail 回调**，失败时 screenWidth 恒为默认 336 | rect / pill | 低 | `InputMethod.ux:802-808` | 🔴 |
| P2-7 | InputMethod | **胶囊屏缺 T9 布局** | 胶囊屏 | 低 | `InputMethod.ux:263-334`、`:719` | 🔴 |
| P2-8 | InputMethod | **下展候选列表不刷新（代码注释自述）** | 圆屏 | 低 | `InputMethod.ux:485` | 🔴 |
| **P2-9** | **lab** | **🔵「丰富欢迎用户提交意见建议」点击无响应**（绑定了不存在的方法 `onDevExpireClick`） | 全系 | 低 | `lab.ux:46` | 🔵 **新增** |

> P2-9 按分级口径属"按钮点击无响应"（P0 类别），但影响面仅限实验室页一行装饰文字，不涉数据，故降为 P2。

### P3 — 代码质量与稳定性

| 编号 | 问题 | 核查结果 | 定位 | 状态 |
|---|---|---|---|---|
| P3-2 | 遗留 `console.log` | 仍存在（手环 CPU/内存极弱，日志 I/O 拖慢首屏） | 多处 | 🔴 |
| P3-3 | 使用废弃 API `String.prototype.substr` | 仍存在 | `InputMethod.ux:356`、`dicUtil.js` 多处 | 🔴 |
| P3-4 | `setTimeout` 递归未清理 | 仍存在 | `dicUtil.js:70` | 🔴 |
| P3-5 | `database.deleteScheduleAndShift` 为死代码 | 本轮第 3 次确认**全仓 0 调用点**（掩盖了 P0-1） | `data/database.js:374/576` | 🔴 |
| **P3-7** | **🔵 全仓唯一使用 ES6 箭头函数的组件 = 输入法** | `InputMethod.ux:804` `success: (data) => {}`、`dicUtil.js:59` `const step = () => {}`。全仓箭头函数共 **2 处，全在输入法链路**；`?.` 0 处、模板字符串 0 处、`async/await` 0 处（`??` 11 处均为 `crypto.js` 里的占位字符串，非语法）。**注意**：`const/let` 已使用 196 处且应用能正常跑，说明引擎支持 ES6 基础语法 → 箭头函数大概率也能用，风险**待真机确认**。但若真机复现"输入法打不开/键盘不出来"，**这里是第一排查点** | `InputMethod.ux:804`、`dicUtil.js:59` | 🔵 **新增·待确认** |
| P3-6 | ~~语法错误~~ | 上轮已排除：22 个 `.js` + 37 个 `.ux` script 块全过 `node --check`，0 语法错误 | — | ⚪ 已排除 |

---

## 四、9 Pro vs 10 Pro 机型适配对比表

| 维度 | 小米手环 9 Pro | 小米手环 10 Pro | 当前代码覆盖 | 风险 |
|---|---|---|---|---|
| 屏幕形态 | 方屏（rect） | 方屏（rect，尺寸/比例与 9 Pro 不同） | `deviceTypeList` 含 watch+band，但 **4 个页面无任何形态判断** | **高** |
| 形状适配查询 | — | — | 30 页中 26 页有 `@media(shape)`；**`index-full` / `welcome` / `schedule-manager` / `custom-content-edit` 为 0** | **高** |
| 分辨率处理 | 约 336×480 | 与 9 Pro 不同 | `designWidth: device-width`（1px=1 物理像素），全站写死 px，**未读 `screenWidth` 折算**（`device-info.ux` 已能取到却没复用） | **高** |
| 顶部安全区 | 与全站 44px 假设不一致 | 同左 | 首页 8px，其余页 44px，**两处不一致** | **高** |
| 输入法布局 | 应为 rect | 应为 rect | `chinese-input-full.ux:19` 统一写死 `screentype="circle"` | 中 |
| 输入法正确写法参照 | — | — | `countdown-demo.ux:17` 已用 `screentype="{{ screenType }}"`，**可直接复用** | — |
| 圆角 / 安全区 | 未处理 | 未处理 | 无 safe-area 概念 | 中 |
| 圆形 watch 形态 | — | — | 首页/启动页四角控件被圆形裁切且不可点 | **高** |
| **返回键行为**（本轮新增） | 侧滑/物理返回 | 同左 | **全仓 0 处 `onBackPress`**，两机型均表现为"退不出应用"（P0-8） | **高** |
| ES6 引擎兼容性 | — | — | 仅输入法链路有 2 处箭头函数；`const/let` 196 处已验证可用 | 中（待真机） |
| 启动首屏 | — | — | `welcome.ux` 是 router entry 且**零适配**，首屏即可能错乱 | **高** |

---

## 五、与上一轮（第 2 轮）对比

| 类别 | 数量 | 明细 |
|---|---|---|
| **代码变更** | **0** | 远端 `main` = 本地 HEAD = `d4e11a66`；`2d727e9..d4e11a6` 只多了 2 个 QA 文档 |
| **新增缺陷** | **3** | **P0-8**（返回键退不出应用 / 启动页循环）、**P0-9**（跳未注册路由 `lab-module-test`）、**P2-9**（`lab.ux:46` 绑定未定义方法）；另记录 **P3-7**（输入法 ES6 箭头函数，待真机确认） |
| **已修复** | **0** | 零代码变更，无缺陷被修复 |
| **仍未修复** | **全部** | P0-1~P0-7（7 项）、P1-1~P1-5（5 项）、P2-1~P2-8（8 项）、P3-2~P3-5（4 项） |
| **本轮新澄清** | **1** | **手环端无任何网络同步能力**（`fetch` 0 处），课程数据 100% 本地 —— 「数据同步/刷新」链路不存在，不是 bug |

---

## 六、回归测试建议（按用户操作路径组织）

### A. 退出与导航（本轮新增，最先测）

- [ ] 首页按返回键 → 断言**能退出应用**，而不是回到启动页后又自动跳回（P0-8）
- [ ] 首页按返回 → 停在启动页时，断言**不会自动跳回**（或至少有明确「进入」按钮）
- [ ] 设置 → 实验室 → 震动实验室 → 点「模块测试」→ 断言能打开页面，或该按钮已被移除（P0-9）
- [ ] 实验室页点「丰富欢迎用户提交意见建议」→ 断言有响应或文字不再可点（P2-9）

### B. 课程数据链路（最高优先）

- [ ] 建 3 张课表 A/B/C 各录 1 条 → 删 B → 切到 C，断言显示 C 的数据（P0-1）
- [ ] 删 B 后立即新建课表，断言不覆盖 C
- [ ] 接入 `database.deleteScheduleAndShift`（`schedule-manager.ux:389`），或删掉该死函数
- [ ] **新增课程保存 → 返回首页 → 不重启即可见**（P0-2）
- [ ] `add-course.ux:510` 直写 storage 改为 `database.insertCourse`
- [ ] 课程填备注 → 编辑 → 更新 → 断言备注仍在（P0-3）
- [ ] 快速连点保存，断言不产生 `day:""` 的隐形课程（P0-4）
- [ ] 备份 → 重置 → 恢复，断言主题还原（P0-5，先改 `"theme"` → `"appTheme"`）

### C. 界面适配（9 Pro / 10 Pro 双机必测）

- [ ] 补齐 4 页 `@media(shape: circle/rect/capsule)`：`index-full`、`welcome`、`schedule-manager`、`custom-content-edit`（照抄 `settings.ux` 的三套写法）
- [ ] 统一顶部安全区：首页 8px 与全站 44px 取齐，建议动态取状态栏高度
- [ ] 圆屏四角内缩：nav-btn / day-nav-circle / bottom-buttons / week-indicator
- [ ] 双机各截图：启动页、首页、课表管理页，比对溢出/挤压
- [ ] 补数据库失败的错误态与重试入口（P1-5）

### D. 输入法（对应用户"输入法打不开"）

- [ ] `chinese-input-full.ux:19` 的 `screentype="circle"` → `screentype="{{ screenType }}"`
- [ ] **真机验证**：9 Pro / 10 Pro 上输入法能否唤起。若不能，先排查 `InputMethod.ux:804` 与 `dicUtil.js:59` 的箭头函数（P3-7），改成 `function(data){}` 后再验
- [ ] 取消编辑不清空昵称（P2-1）
- [ ] 中文整词提交后截断到 maxlength（P2-3）

### E. 收尾

- [ ] 构建时剔除 `console.log`；`substr` → `slice`；清理 `setTimeout` 递归

---

## 七、已知风险 · 不急修（仅记录，不排期）

| 编号 | 风险 | 触发条件 | 损失上限 | 定位 |
|---|---|---|---|---|
| P4-1 | **激活码主盐硬编码在客户端**，激活码生成/校验算法全在客户端，可被逆向后本地生成有效激活码 | 用户懂逆向、愿意折腾 | 少收一份激活费；当前用户仅几十人 | `lib/crypto.js:1`（`GLOBAL_MASTER_SALT = "k3f9x"`） |

> 按你的定位：知道就行，算是一种福利，修复不着急。本轮未发现其他白嫖面（`auth-store.js` 无 password/token/secret 字段）。

---

*报告生成：WorkBuddy QA 自动化 · 第 3 轮 · 2026-09-11 00:35 (+0800)*
