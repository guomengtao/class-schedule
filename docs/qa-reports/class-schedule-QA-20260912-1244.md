# Ev课程表（class-schedule）· 第 9 轮 QA 质检报告

- **生成时间**：2026-09-12 12:44 (+0800)
- **本轮 HEAD**：`012343d`（版本 **1.4.202** / versionCode **702**）
- **上一轮基线**：`c3ea2fe`（QA 文档）/ `e12a13c`（代码 1.4.198）
- **本轮代码变更**：**有**（4 个 `fix(qa):` + 1 个 `fix:` + 版本号自增）
- **目标机型**：小米手环 9 Pro（336×480 方形 rect）、小米手环 10 Pro
- **质检口径**：只谈「用户能不能把功能用起来」。并发 / 限流 / 性能 / 安全合规本轮**不展开**（见末尾一句话）。

---

## 一、本轮结论摘要

> **P0-10（编辑/删除假成功）与 P1-7（实验室课程详情入口）本轮已由作者修复并经代码复核确认；10 条用户操作链路本轮「不通」= 0 条。新增 2 条 P1（3 个周视图页缺方形屏适配、输入法宽度自适应回调 `this` 丢失）+ 1 条 P2（欢迎页进入按钮无防重入）。本轮未发现 P0 / P0-S。**

关键风险（按影响排序）：

1. **P1-9**：`week-grid-demo` / `week-grid-simple` / `week-text-simple` 三页**只有 `@media (shape: circle)`**，没有 rect / capsule 分支 → 9 Pro / 10 Pro 方形屏上大概率出现圆角裁切、上下溢出。入口在「实验室」，真实用户可达。
2. **P1-10**：`InputMethod.ux` 本轮把箭头函数改成 `function` 后，`adjustScreenWidth()` 回调里的 `this` 丢失（`:810` / `:813`）→ 真机宽度取不到，`screenWidth` 恒为默认 336 → 非 336 宽机型键盘整体偏移。这是**本轮修复引入的回归**。
3. **P2-11**：欢迎页进入按钮去掉了防重入锁，快速双击会连发两次 `router.replace`。

---

## 二、用户操作链路走查（本轮重头戏）

> 每条都给「代码定位 + 推断的实际结果」。结论只有三种：✅ 通 / ❌ 不通 / ⚠️ 无法静态确认（需真机）。

| # | 用户操作路径 | 结论 | 代码定位 | 推断的实际结果 |
|---|---|---|---|---|
| 1 | 首次启动 → 引导/初始化 → 进入主界面 | ✅ 通 | `manifest.json` entry=`pages/welcome`；`welcome.ux:46 onInit` → `loadDefaultHomepage()`；`:54 onShow` → `loadDefaultHomepage(true)`；`doEnter():120` → `router.replace('/pages/index-full')` | 默认 3 秒自动跳首页，或点「进入」立即跳。本轮 `012343d` 把 `_hasEntered` 前哨从「调用前置位」改成「导航成功回调里置位」，**失败可重试**，比上一轮更稳。跳转目标 `index-full` 在 manifest 29 页内 ✅ |
| 2 | 激活状态判断（未激活 vs 已激活看到什么） | ✅ 通 | `store.js:740 isPremiumUnlocked`；`premium-overlay.js:17 checkAndShow`；调用方 `backup-restore.ux:95/155/221/324`、`settings.ux:287`、`homepage-settings.ux:209`、`reset-data.ux:215`、`schedule-manager.ux:163/446`、`lab.ux:118` | 未激活：首页、加课、编辑、删除**不受限**（核心功能全可用）；备份恢复 / 多课表 / 重置 / 部分设置会弹付费浮层。已激活：浮层不弹。判定只依赖本地 `premium_unlocked` + 本地授权数据，无网络参与 ✅ |
| 3 | 新增课程 → 填写 → 保存 → 下次打开还在 | ✅ 通 | `add-course.ux:509 database.insertCourse(newCourse, cb)`；`database.js:498-503` insert 内含 `invalidateCache`；`index-full.ux:253 onShow → getAllCoursesWithIndex(idx, cb, true)` 强制刷新 | 走 database 统一入口（上一轮的 P0-2 直写 storage 已改掉），首页 onShow 带 `forceRefresh=true` 重读 → **新增后回首页立刻可见，冷启动也在** ✅ |
| 4 | 编辑已有课程 → 修改 → 保存 → 是否真的生效 | ✅ 通（本轮修复） | `database.js:291 hit` / `:309-313` 未命中 `callback(formatError(...))`；`:506 updateCourse` + `:511 invalidateCache`；`detail.ux:543 updateCourse()` 失败分支 `:565 prompt.showToast('更新失败: ' + err)` | **P0-10 已修**：id 未命中时不再假成功，改为弹「更新失败: [DB] updateCourseStorage: 课程不存在」并留在页面，改动不会静默丢失 ✅。残留：`detail.ux:353-355` 的 `!classId → selectCourse(0)` 兜底仍在（见 P2-12，仅降级提示，不丢数据） |
| 5 | 删除课程 → 真删除 + 有确认 | ✅ 通 | `detail.ux:570-586 deleteCourse()`：`deleteConfirm` 二次确认 + 5 秒后自动复位；`database.js:339 hit` / `:355-359` 未命中报错；`:519 deleteCourseStorage` + `:521 invalidateCache` | 第一次点「删除」进入确认态，5 秒内再点才真删；删除走 database 并清缓存 → 回首页立即消失 ✅ |
| 6 | 课程数据本地存储 → 读回 → 顺序/周次正确 | ✅ 通 | `database.js:472-482 getAllCoursesStorage` 按固定 `dayOrder`（星期一→星期日）重排；`:141 invalidateCache`；`:549 forceRefresh` | 读回顺序由代码固定重排，**不依赖写入顺序**，周次不会错乱 ✅ |
| 7 | 主界面渲染：今天的课 / 周次切换 / 跨天 | ✅ 通 | `index-full/modules/day-nav.js:21 prevDay` `:34 nextDay` `:47 goToToday`；`index-full.ux:240 store.getCurrentScheduleIndex` → `:253 getAllCoursesWithIndex`；`week-view.ux:654 currentCourseDay` 计算 | 上下翻天循环、回今天、切换第 N 套课表均有实现；主页 onShow 每次重取课表序号 + 数据 ✅ |
| 8 | 设置项修改 → 保存 → 重启后是否保留 | ✅ 通 | `settings.ux:285 selectTheme` → `store.setTheme`（即时落盘）；`increaseFont/decreaseFont` → `store.setSize`；`homepage-settings.ux` selectTargetPage/selectAutoSeconds 即时写 | 主题 / 字号 / 默认首页 / 跳转秒数**点即存**，底部「保存」按钮是冗余的；重启后从 storage 读回 ✅ |
| 9 | 数据同步 / 刷新（对接后端） | ➖ **不适用** | 全仓 `fetch(` = **0**；`system.request` 虽在 manifest features 声明但**代码零调用** | 手环端数据 100% 本地，不存在「拉不到 / 失败无提示」的场景 |
| 10 | 各页面入口按钮逐个点名（有没有点了没反应 / 跳错页） | ✅ 通 | 全仓静态跳转目标 **111 处，命中 manifest 29 页 = 111/111**；模板绑定但脚本未定义的方法仅 `index-full.ux` 10 个，经查由 `index-full/modules/*.js` 运行时注入（`bottom-buttons.js:4`、`pinned-pages.js:22`、`class-list.js:122/127`、`week-indicator.js:20`、`day-nav.js:21/34/47`）；实验室 22 个入口 URI 全部有效 | **无死按钮、无跳错页** ✅ |

**汇总：通 9 条 · 不通 0 条 · 不适用 1 条。**

> ⚠️ 唯一无法静态确认的环节：**输入法真机表现**（链路 #3 的「填写」步骤）。代码层面已无 ES6 箭头函数（全仓 0 处），但 A 套 `chinese-input.ux` / B 套 `InputMethod.ux` 在手环上的实际手感仍需真机确认 —— 已连续追问 6 轮，见第五节。

---

## 三、缺陷清单

### 🆕 本轮新增

| 编号 | 优先级 | 模块 | 标题 | 复现步骤（用户视角） | 期望结果 | 实际结果 | 影响机型 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|---|---|---|
| **P1-9** | P1 | 周视图/网格页 | 3 个页面只有圆屏适配，方形屏无分支 | 首页 → 实验室 → 「网格课表 demo / 简易网格 / 简易文本」任一页 | 9 Pro / 10 Pro 上方屏上正常铺满、四角不裁切 | 这三页 CSS 里**只有 `@media (shape: circle)`**，无 `rect` / `capsule` 分支，方形屏沿用圆屏规则 → 大概率顶部溢出、内容被裁 | 9 Pro、10 Pro（rect 屏） | 中 | `src/pages/week-grid-demo/week-grid-demo.ux:247`、`week-grid-simple.ux:183`、`week-text-simple.ux:251`（三页均只有 `@media (shape: circle)`） | 照其它 26 页的样子各补一段 `@media (shape: rect)` 与 `@media (shape: capsule)`（改 padding / 行高即可） |
| **P1-10** | P1 | 输入法组件 | 本轮 ES5 改造后 `adjustScreenWidth` 回调 `this` 丢失，真机宽度取不到 | 9 Pro 上手环打开「昵称编辑」→ 弹起输入法键盘 | 键盘按真机屏宽居中 | `success`/`fail` 里写 `this.screenWidth = ...`，普通 `function` 的 `this` 不是组件实例（严格模式下为 undefined，非严格下挂到全局）→ `screenWidth` 恒为默认 **336**；宽度≠336 的机型键盘整体偏移 `(336-实际宽)/2` | 10 Pro（宽≠336 时）、9 Pro 无感 | 中 | `src/components/InputMethod/InputMethod.ux:808-817`（`:810`、`:813`）；调用点 `:456-457`（`screentype==='rect' \|\| 'pill-shaped'` 时执行，目标机型必然命中）；默认值 `:407` | 与文件其它回调一致用 `var self = this`：<br>`adjustScreenWidth(){ var self=this; device.getInfo({ success:function(d){ self.screenWidth=d.screenWidth }, fail:function(){ self.screenWidth=336 } }) }` |
| **P2-11** | P2 | 欢迎页 | 进入按钮去掉防重入锁，快速双击会重复跳转 | 开机停在欢迎页 → 手指快速连点两下「进入」 | 只跳转一次 | `doEnter()` / `enterSchedule()` 的 `if (this._hasEntered) return` 前哨已删除（`:120`、`:133`），两次点击会连发两次 `router.replace` | 全部 | 低 | `src/pages/welcome/welcome.ux:120-131`、`:133-145` | 保留「成功后才置位」的改进，另加一个一次性时间戳锁：两次点击间隔 <300ms 直接 return |
| **P2-12** | P2 | 课程详情 | 参数缺失时静默打开「上一门课」（残留） | 从任意入口进详情页但 `detail_classId` 存储写入失败 | 直接提示「打开失败，请重试」并回退 | `detail.ux:353-355` 兜底 `if(!classId\|\|!day){ self.selectCourse(0); return }`，`selectCourse():420` 只填名称/教师/地点/时间、**从不设 classId** → 界面显示第一门课的内容 | 全部 | 低 | `src/pages/detail/detail.ux:353-355`、`:420` | 与 `class-list.js:127` / `week-view.ux:663` 保持一致：取参失败直接 `showToast('请重试') + router.back()`，不要 `selectCourse(0)`。注：配合 P0-10 修复后**已不会丢数据**，仅体验问题 |
| **P3-13** | P3 | 工程规范 | `manifest.json` 文件末尾缺换行 | — | 文件以换行结尾 | `\ No newline at end of file` | — | 极低 | `src/manifest.json:160` | 补一个换行即可（部分构建/校验工具对无结尾换行敏感） |
| **P3-14** | P3 | 欢迎页 | `_hasEntered` 变成只写不读的死变量 | — | — | 本轮改造后 `_hasEntered` 只在 success/fail 回调里赋值（`:126`/`:129`/`:140`/`:143`）+ `onShow` 复位（`:56`），**全文件没有任何读取点** | — | 极低 | `src/pages/welcome/welcome.ux:56,126,129,140,143` | 随 P2-11 一起处理：要么真正用于防重入，要么删掉 |

### ✅ 本轮修复（代码复核通过）

| 编号 | 标题 | 修复 commit | 复核结论 |
|---|---|---|---|
| **P0-10** | 编辑/删除「假成功」，改动 100% 丢失无提示 | `5dc8fba` | **已修**。`database.js:291/313` 加 `hit` 标记，未命中 `callback(formatError(...))`；`deleteCourseStorage:339/355` 用 `filtered.length < classes.length` 判命中；`detail.ux:565/588` 失败分支已有 toast。连续 2 轮未修的问题**本轮关闭** |
| **P1-7** | 实验室「课程详情」入口不写参数 | `5dc8fba` | **已修**。`lab-list.js` 已移除该入口；全仓进入 `/pages/detail` 只剩 `class-list.js:137`、`week-view.ux:673`，两者均先写 `detail_classId`/`detail_day` 再 push，且失败会 toast「请重试」不跳转 |
| **U-1**（部分） | 输入法 3 处箭头函数 | `793c6dc` | **代码层面已修**：全仓 `=>` 扫描 = **0**（`crypto.js:344-402` 的 `??` 是脱敏占位字符串，非语法）。但引入 P1-10 回归，见上 |
| **U-9** | 彩色 emoji 清洗 | `f1d1724` | **已修且无副作用**：10 套主题的 `icon` 字段统一为 `●`，经查该字段**全仓无任何引用**（主题列表渲染只用 `$item.accent` + `$item.name`，`settings.ux:24-25`），属死数据，改了不影响显示 |
| （未登记） | `@system.app` feature 补齐 | `852a256` | **作者未登记但确为修复**：`index-full.ux:358 onBackPress` 里 `require('@system.app')`，此前 manifest features **没有** `system.app` → 未声明 feature 的 require 会取不到模块，`app.exit()` 会抛错 → 主页按返回键失灵。现已声明 ✅ |
| （未登记） | 设置/捐赠页返回键热区 32→38px | `852a256` 系列 | 热区达标（≥38px），属 P1 热区改善 |

### ⏸ 挂账 / 仍需作者决策

| 编号 | 状态 | 说明 |
|---|---|---|
| **P1-4** | 排队中（作者已接受，未排期） | 全站写死 px，`designWidth: device-width` 是快应用标准方案。已问 3 轮，作者 REPLY「打算做」。保持 ⏸ |
| **P1-8** | 长期挂账 | 崩溃无留痕（可观测性）。前提：手环端联不了网，**不要按「加 fetch 上报」做** |
| **U-1 真机** | ⚠️ 已问 6 轮 | 输入法在手环上的真实现象（A/B/C 三套）作者始终未回填 |
| **P1-3 真机** | 待验 | 圆屏 modal 宽度 72% 的实际裁切效果需真机确认 |

---

## 四、9 Pro / 10 Pro 机型适配对比

两款都是**方形（rect）屏**，走同一套 `@media (shape: rect)` 分支，差异主要在屏宽。

| 维度 | 小米手环 9 Pro | 小米手环 10 Pro | 代码依据 | 结论 |
|---|---|---|---|---|
| 屏幕形态 | rect（方形） | rect（方形） | `manifest.json` deviceTypeList = `['watch','band']`；`InputMethod.ux:456` 对 `rect`/`pill-shaped` 走方形分支 | 同分支，无差异 |
| 屏宽假设 | 336px | 项目里**硬编码 336**（`InputMethod.ux:407`） | `docs/index-band9pro-black-screen-analysis.md:148` 记录 9 Pro = 336×480 | 9 Pro ✅ 吻合；**10 Pro 若≠336 则键盘偏移**（P1-10） |
| 顶部安全区 | 统一 `padding: 44px` | 同上 | 29/29 页面全部命中 | 两机型一致 ✅ |
| 圆屏兜底 | 不影响（非圆屏） | 不影响 | `@media (shape: circle)` 29/29 | ✅ |
| **方形屏分支覆盖** | **26/29 页有 `shape: rect`** | 同上 | 缺 3 页：week-grid-demo / week-grid-simple / week-text-simple | ❌ **P1-9，两机型都受影响** |
| capsule 分支 | 27/29 页 | 同上 | 缺同样 3 页 | 同上 |
| ES6+ 语法 | 全仓箭头函数 **0** 处 | 同 | 全仓扫描 `=>` = 0；`?.` / `??` 仅 crypto.js 字符串 | ✅ 不会整段脚本不执行 |
| 系统能力 | `@system.app` 本轮补齐声明 | 同 | `manifest.json` features 12 项，`require` 用到的 6 个 feature 全部已声明 | ✅ 比上轮更稳 |
| 硬编码屏宽 | 页面 CSS 中 0 处 `336px/192px/480px` | 同 | 全仓扫描 | ✅ 页面布局不写死宽度 |
| 网络能力 | 不支持 `fetch`/`request` | 不支持 | 全仓 `fetch(` = 0 | ➖ 与机型无关，项目本就纯本地 |

**机型专项结论**：9 Pro 本轮**无新增阻断问题**；10 Pro 的唯一风险是 P1-10（键盘宽度按 336 硬算）。

---

## 五、与上一轮对比

| 项 | 上轮（`e12a13c`） | 本轮（`012343d`） | 变化 |
|---|---|---|---|
| HEAD / 版本 | `e12a13c` / 1.4.198 | `012343d` / **1.4.202** | 4 个 fix(qa) + 1 个 fix |
| P0 未修数 | **1**（P0-10，连续 2 轮） | **0** | ✅ 清零 |
| P1 未修数 | 5（P1-7 / P1-8 / U-3 / U-9 / U-10） | 2（P1-8 挂账 + 新增 P1-9 / P1-10） | 净减 |
| 走查「不通」条数 | 1（编辑保存） | **0** | ✅ |
| 行高覆盖 | 22.3%（210/942） | **22.3%（210/942）** | 持平 |
| 溢出保护页 | 13/29 | 13/29 | 持平 |
| 无三态页面 | 8/29 | 8/29 | 持平 |
| 热区 <40px | 184（可点击 284） | 184 | 持平（settings/donate 返回键已提到 38px，未跨过 40 线） |
| 彩色 emoji | 60 | **0**（主题 icon 字段全清） | ✅ |
| 全仓箭头函数 | 3 | **0** | ✅ |
| `@media (shape: rect)` 覆盖 | 26/29 | 26/29 | ❌ 本轮新发现 3 页缺 |

**历轮已修项回归扫描（铁律项，全部通过）**：
`deleteScheduleAndShift` 8 处 ✅ ｜ `onBackPress` 1 处（`index-full.ux:356`）✅ ｜ `lab-module-test` 0 处 ✅ ｜ `@media (shape: circle)` 29/29 ✅ ｜ `padding: 44px` 29/29 ✅ ｜ `insertCourse` + `invalidateCache` ✅ ｜ `backup-restore.ux:76 appTheme` ✅ ｜ 静态跳转目标 111/111 命中 manifest ✅ ｜ `fetch(` = 0 ✅ ｜ `JSON.parse` 全有 try/catch ✅ ｜ theme `icon` 字段无引用（非回归）✅

---

## 六、回归测试建议（按用户操作路径，可直接照着点）

> 每次发版前跑一遍，**加粗的是本轮重点**。

1. **冷启动**：手环重启 → 打开应用 → 3 秒后应自动进首页；从设置返回欢迎页 → 倒计时重新开始。
2. **进入按钮**：欢迎页**快速连点两下「进入」** → 只应跳转一次（P2-11）。
3. **加课闭环**：首页「+ 添加课程」→ 填名称/时间 → 保存 → **立刻回首页看有没有** → 杀掉应用重开 → 还在不在。
4. **编辑闭环**（历史重灾区）：首页点任意一节课 → 改名称 → 「更新」→ 回首页确认已改 → 再进详情页确认备注没被清空。
5. **编辑失败提示**：进详情页后**故意**从实验室无参数入口打开（本轮已删，可用 `week-view` 正常入口验证成功路径即可）→ 确认失败时弹「更新失败」而不是「课程已更新」。
6. **删除闭环**：详情页点「删除」→ 应出现二次确认 → 5 秒内再点 → 真删 → 回首页已消失。
7. **翻天与回今天**：首页左右翻天 7 次 → 顺序应为 一→二→…→日→一；点「今天」回到当天。
8. **主题/字号**：设置里换 3 套主题、字号加减各 3 次 → 每次**立刻生效** → 重启后保留。
9. **付费浮层**：未激活账号进「备份恢复」「多课表」→ 应弹付费引导而不是白屏。
10. **实验室三页**（P1-9 重点）：实验室 → 网格课表 demo / 简易网格 / 简易文本 → 在 **9 Pro 和 10 Pro 上各看一次**，确认顶部不被裁、内容不溢出。
11. **输入法**（P1-10 + U-1）：昵称编辑 → 弹键盘 → 在 10 Pro 上确认键盘**水平居中**、不偏左；输入中文候选正常。
12. **返回键**：首页按物理返回 → 应退出应用（`@system.app` 已声明）。

---

## 七、已知风险·不急修

> 以下**只造成资金损失，不影响用户能不能用**，按你的定位「知道就行，算一种福利」，不进待办表、不排期。

| # | 是什么 | 损失上限 | 触发条件 | 定位 |
|---|---|---|---|---|
| 1 | 本地改一个 storage 键即可解锁付费：`premium_unlocked = "true"` 直接被判定为已解锁，无需任何校验 | 一份授权费 | 用户用 adb / 文件管理改本地存储 | `store.js:741-745`（`storage.get('premium_unlocked') === 'true'` 直接 `callback(true)`） |
| 2 | 授权数据存在本地（`authStore.getAuthData`），无服务端二次校验 | 同上 | 同上 | `store.js:749`、`crypto.js` |

（并发 / 限流 / 性能优化 / 内存泄漏量化 / 安全合规：本轮**不展开** —— 几十人规模、纯本地数据，收益极低。）

---

## 八、归档信息

- 本地报告：`reports/class-schedule-QA-20260912-1244.md`
- 交接本：`class-schedule/docs/qa-reports/HANDOFF/2026-09-12-round9.md`
- 总台账：`class-schedule/docs/qa-reports/HANDOFF/STATUS.md`（已同步本轮状态）
- 本轮 HEAD：`012343d`
