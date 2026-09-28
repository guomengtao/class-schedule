# Ev课程表 手环快应用 · 第 16 轮质检报告（用户视角 · 操作链路优先）

| 项目 | 内容 |
|---|---|
| 仓库 | https://github.com/guomengtao/class-schedule |
| 分支 / HEAD | `main` / `9ccc2cf8bf6a7f3570669405b0cb123fb6dc89db` |
| HEAD 提交时间 | 2026-09-29 00:28:22 +0800 |
| HEAD 提交信息 | docs(memory): 沉淀禁止改官方组件、宿主侧解决的铁律 |
| 版本 | versionName **1.6.165** / versionCode **994** |
| 目标机型 | 米环 9 / 10（胶囊 192×490 / 212×520）、9 Pro / 8 Pro（方屏 336×480）、**REDMI Watch 6（方屏 432×514，本轮新增关注）** |
| 分析轮次 | **第 16 轮**（上一轮：第 15 轮 `6e1fa0b` / 2026-09-22 07:23） |
| 本轮新增提交 | **159 个** |
| 生成时间 | 2026-09-29 07:39 (+0800) |
| 分析视角 | 用户能不能把功能真的用起来（功能 → P1 显示适配 → P2 交互 → P3 稳定性） |

---

## 一、本轮结论摘要

> **一句话结论**：本轮是 16 轮以来**变更量最大**的一轮（159 个提交，版本号 1.6.49 → 1.6.165），历史遗留大面积清零——**第 15 轮的头号 P0（胶囊屏字号内联覆盖）已修、胶囊屏的根因级缺陷 `@media (shape: capsule)` 已全部改为合法的 `pill-shaped`、`min-height:100%` 基本清零、4 个死页已移出 manifest**；但与此同时，一次纯文档提交（`de06c1f`）**悄悄把 `manifest.deviceTypeList` 里的 `"band"` 删掉了**，以及新增的**工具页、设备信息页整页没有滚动容器**（内容一半以上不可达），这两条是本轮最该先处理的问题。

**最该优先修的 4 件事：**

1. **`manifest.deviceTypeList` 丢了 `"band"`（P0-16）** —— `de06c1f`（"找回2026假期数据并恢复docs目录"）在一次性恢复 265 个 md 的提交里，顺手把 manifest 的 `band` 设备类型删了（diff 只有 `- "band",` 一行，提交信息完全没提）。而 `7a9b348` 当初正是为了"小米手环11兼容"专门加上的。**这直接影响手环能不能装/能不能跑，属最高风险。**
2. **工具页 `tools.ux` 整页没有滚动容器（P0-17）** —— `.page { height: 100% }` + 13 项入口，内容高约 1106px vs 屏高 514px（432）/ 480px（336），**一半以上入口（含"手机遥控"4 个新按钮）点不到**，且没有任何滚动手段。对照：settings / course-manager / detail / add-course **都有** `<scroll>`，只有 tools 和 device-info 漏了。
3. **设备信息页 `device-info.ux` 同样无滚动（P0-18）** —— 21 条信息 + 底部「钉首页」入口全部在首屏之外，同样不可达。
4. **首页设置页「课程字号」是死功能（P0-20）** —— −/+ 两个按钮的 `decreaseFont` / `increaseFont` **方法根本不存在**（点了完全没反应），而且这一页读写的 `homepage_settings.displaySize` 是全项目**从来没人写过**的字段（永远显示 48px）；首页真实字号来自另一个键 `baseFontSize`（在**设置页**调）。同一个 UI 在设置页有完整实现，在首页设置页是没接线的空壳。

---

## 二、用户操作链路走查（10 条，本轮重头戏）

> 结论口径：**通** = 静态代码链路闭合，推断用户能完成；**不通** = 链路断裂或 evidently 与实际不符；**部分不通** = 主路径通但存在可触发的失败分支；**不适用** = 本项目不存在该机制。

| # | 用户操作 | 结论 | 代码定位 | 推断的实际结果 |
|---|---|---|---|---|
| 1 | **首次启动 → 欢迎页 → 进入首页** | **通**（有 1 个 P2） | `welcome.ux:54-78`；`app.ux` `defaults-engine` 接入 | 欢迎页三按钮（进入首页 / 设置 / 退出）齐全，`onBackPress` 已按"退出失败就交还系统"处理（`:95-101`），历史上"退不出应用"的问题已闭环。⚠️ P2：`enterSchedule` **无防重入锁**（`:72-78`），连点两次会发两次 `router.replace` |
| 2 | **激活状态判断：未激活 / 已激活分别看到什么** | **通** | `premium-overlay.js:24-36`；各页 `checkAndShowOverlay`；`auth-store.js` | 未解锁只在**增值页**（首页设置 / 备份恢复 / 重置数据 / 课程表管理复制·二维码 / 设置页主题）弹增值引导，**核心的增删改课程不设门槛**，未付费用户能正常用。✅ 这个分寸是好的 |
| 3 | **新增课程 → 填写 → 保存 → 下次打开还在** | **通** | `add-course.ux:488-530`；`database.insertCourse:671`；`markDataDirty:226` | 走 `database.insertCourse`（自带 `invalidateCache`）+ 写盘后累加 `allCourses_dirty`；返回首页由 `index.ux:432 resumeRefresh` 比对版本号强制重读并设置 400ms 二次兜底 → **数据落地且在首页立即可见** |
| 4 | **编辑已有课程 → 修改 → 保存 → 是否真的生效**（历史重点） | **通**（有一处新缺口，见 P1-16） | `detail.ux:725-754`；`database.updateCourse:681` / `updateCourseAcrossDays:692`（原子写盘） | 更新 / 删除都有 `hit` 未命中校验（`database.js:341/388`），**不会再出现"假成功"**；跨星期改用 `updateCourseAcrossDays` 单次原子写盘，**杜绝"删成功插失败"丢课**。✅ 历史 P0-10 完全闭环。⚠️ 但删除路径有一个新缺口，见 P1-16 |
| 5 | **删除课程 → 是否真删、有无确认与撤销** | **部分不通** | `detail.ux:757-792`；`course-manager.ux:276-300` | 单课删除：二次确认 8s + 删除成功给 5s 撤销条，**通**。⚠️ **但如果先在编辑页改了星期再删除，会删不掉却提示"课程已被删除"并被踢回首页**（P1-16）。另有两处无撤销：课程管理页「清除全部」、课表管理「删除整张课表」（P2） |
| 6 | **本地存储 → 读回 → 顺序/时间/周次是否正确** | **通** | `database.js:159-217` 缓存与 `invalidateCache`；`getAllCourses:663` | 所有写路径（`insertCourse / updateCourse / updateCourseAcrossDays / deleteCourse`）成功后都清缓存，不存在"读到旧副本"（历史 P0-2 的根因）；`schedule.json` 预置数据 + `DAY_NAMES` 中文星期两端一致 |
| 7 | **首页渲染：今天的课 / 周次切换 / 跨天** | **通** | `index.ux:341-470`，`modules/{class-list,day-nav,week-indicator,holiday,status-bar,quick-add,pinned-pages,custom-content,bottom-buttons}.js` | 9 个模块分工清晰；`onShow` 走"版本号比对 + 立即重读 + 400ms 兜底"，**增删改后回首页一定是最新的**；节假日/调休/跨天（`reloadHolidayState`）有独立兜底 |
| 8 | **设置项修改 → 保存 → 重启后是否保留** | **部分不通** | `store.setTheme/setBaseFontSize/setHomepageSettings` 即时落盘；`settings.ux:269`；`homepage-settings.ux:189-210` | 设置页（`settings.ux`）主题/字号/**即时落盘**，✅ 不存在"不点保存就丢"。⚠️ **首页设置页（`homepage-settings.ux`）的「课程字号」一栏是死功能**（P0-20）；且该页 `saveSettings()` 采用**整对象覆盖**，漏了 `showLabSection` 等字段 → 任何一次开关改动都会把未在白名单里的字段冲掉（P2） |
| 9 | **数据同步 / 刷新（对接手机端）** | **部分不通**（本轮首次适用） | `app.ux:64-505` `initSyncReceiver`；`data/chat-bridge.js` | ✅ 本轮**新增**了 `@system.interconnect` 手环↔手机通道：支持 `import/export/list_schedules/get_device_id/activate/chat/cmd`，并有分区权限表（`app.ux:484-490`，`auth` 域禁止读写）——设计周全。⚠️ 但 `chat-bridge.js:20` 的 `connect` **必须手机先发一条才注册**（`app.ux` 收到回调后才 `register`），在此之前用户点工具箱"手机遥控"4 个按钮会**什么都不发生且无提示**（`sendCmd:44-48` 只打日志） |
| 10 | **逐个页面入口按钮点名** | **部分不通** | 全仓扫描：49 个静态跳转目标 **48/49 命中**（唯一 `/pages/` 动态拼接是欢迎页 `targetPage`，合法）；事件处理器缺失仅 2 处 | ✅ 已注册 32 页；15 个未注册目录不再打包。⚠️ **2 处点了没反应**：① `homepage-settings.ux:82/84` 字号 −/+（P0-20）；② 工具页/设备信息页首屏之外的按钮**根本够不着**（P0-17/18） |

**走查总计：通 6 / 部分不通 4 / 不通 0 / 不适用 0**（第 15 轮为「通 9 / 不通 0 / 不适用 1」；本轮第 9 条首次从"不适用"变为"部分不通"，因新增了 interconnect 同步链路）

---

## 三、缺陷清单

### P0 — 用户用不了 / 操作不生效（最高优先级）

| 编号 | 模块 | 缺陷标题 | 复现步骤（用户视角） | 期望结果 | 实际结果（推断） | 影响机型 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|---|---|
| **P0-16** | manifest | **`deviceTypeList` 丢失 `"band"`，随一次文档提交混入** | 打包/上架到手环设备 | 同时在手表与手环上运行 | 当前只剩 `["watch"]`。`7a9b348` 为"小米手环11兼容"专门加入 `band`，`de06c1f`（"恢复docs目录"）把它删了且提交信息未提 → 手环设备可能**不被识别、无法安装或无法启动** | 米环 9 / 10 / 9 Pro / 10 Pro / REDMI Watch 6 视判定 | **极高** | `src/manifest.json:10-12`；引入提交 `de06c1f` | 先把 `"band"` 加回去（`["watch","band"]` 或 `["band","watch"]`），再真机确认一次上架包 |
| **P0-17** | 工具页 | **整页没有滚动容器，一半以上入口够不着** | 设置或首页 → 工具 → 往下翻，想点底部的「找手机 / 手机状态 / 静音振动 / 倒计时5分钟」 | 能滚动到第 13 项 | `.page { height:100% }` + 模板根是普通 `div`（无 `<scroll>`），13 项 ≈ 1106px vs 屏高 514（432）/ 480（336）→ **底部约 55% 内容永久不可见、无滚动条、无滚动手势响应** | 全部方屏 + 胶囊屏 | **极高** | `pages/tools/tools.ux:2`（根 div）、`:228-233` | 按 `settings.ux` 已验证写法包一层 `<scroll class="...">`，把「背景 Back」之外的 13 项移进去 |
| **P0-18** | 设备信息页 | **整页没有滚动容器，21 条信息与「钉首页」入口不可达** | 工具 → 设备信息 → 往下翻看设备ID/序列号/存储空间 | 能滚动到第 21 条和底部「钉首页」 | `.page { width:100%; height:100% }` 无 `<scroll>`，`infoList` 动态 17 项 + 静态 4 项 ≈ 1302px vs 514px → **约 60% 条目被裁，「钉首页」永远点不到** | 全部机型 | **极高** | `pages/device-info/device-info.ux:2`、`:23`（`for` 渲染 21 项）、`:178-183` | 同 P0-17，加滚动容器；或把「钉首页」提到 header 右侧 |
| **P0-19** | 自定义内容页 | **模板多一个 `</div>`，XML 不闭合** | 首页设置 → 自定义内容 | 正常打开 | 全仓 39 个 .ux 标签闭合校验，**唯独本页最终深度 = −1**（多余 1 个闭合标签）。严格 XML 解析会直接构建失败 / 该页白屏；即便解析器容错，第三个 section 之后的 DOM 层级也会错乱。该多余标签是 `31c5cc7` 删除内联键盘块时漏删的孤儿闭合 | 全部机型 | **高** | `pages/custom-content-edit/custom-content-edit.ux:56-57` | 删除第 56 或 57 行中多余的那一个 `</div>`（1 行改动） |
| **P0-20** | 首页设置页 | **「课程字号」−/+ 按钮方法不存在（点了没反应），且改的是从没被写过的键** | 首页设置 → 展开「课程字号」→ 点「−」或「+」 | 字号变化并生效到首页课程卡片 | ① `decreaseFont` / `increaseFont` 在全文件和全项目都**没有定义** → 按钮零响应；② 该页显示值来自 `homepage_settings.displaySize`，而这个字段**没有任何地方写入**（默认永远 48px）；③ 首页真实字号来自另一个键 `baseFontSize`（`settings.ux:269` 才有实现）→ **这一栏是未接线的空壳，用户在这里无论怎么点都不可能生效** | 全部机型 | **高** | `homepage-settings.ux:82`、`:84`、`:187`（读 displaySize）、`:189-210`（存/回退都不含 displaySize）；对照可用实现 `settings.ux:274-292` | 二选一：① 直接照抄 `settings.ux` 的 `decrease/increaseFont + setBaseFontSize`，展示值改从 `store.getBaseFontSize` 读；② 若本页本就不该管字号，把这一栏整块删掉，避免误导 |

### P1 — 界面与显示 / 机型适配 / 数据边界

| 编号 | 模块 | 缺陷标题 | 复现步骤 | 期望 vs 实际 | 影响机型 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|---|
| **P1-16** | 编辑课程 | **改了星期后再删除 → 删不掉却提示"已被删除"并被踢回首页** | 详情页 → 下一步到「位置与星期」→ 换成别的星期 → 退回第 1 步 → 删除 | 期望：删掉原星期的那门课。实际：`deleteCourse` 用的是**当前** `self.day`（`:784`）而非 `originalDay`（更新路径 `:733` 用对了）→ 在新星期下找不到该课 → `database` 返回"课程不存在" → 弹「课程已被删除，请返回首页」2.1s 后跳回，**但课程还原封不动在原来的星期里** | 全部机型 | 高 | `pages/detail/detail.ux:784` vs `:733` | 改用 `self.originalDay \|\| self.day` 定位；或改星期后回第 1 步时把 `self.day` 复位 |
| **P1-17** | 课表管理 | **复制课表并发读改写同一 key → 副本只剩少数课程** | 课表管理 → 选一张 20+ 门课的课表 → 复制 | 期望：副本与源表课程数一致。实际：`for` 循环里同步派发 N 次 `database.insertCourse`，每次内部是 `get → push → set` 同一 `allCourses_<idx>`；N 次 get 拿到同一快照，后写覆盖先写 → **最终只剩最后写入的少数几门**，UI 仍弹「课程表已复制」 | 全部机型 | 高 | `pages/schedule-manager/schedule-manager.ux:435-458`；`data/database.js:256-308` | 改串行（上一门 success 里写下一门），或先拼好整份数组再一次性 `saveToStorageWithIndex` |
| **P1-18** | 总课表 | **表格列宽对非胶囊屏硬编码 316px → REDMI Watch 6(432) 右侧空 97px 且右缘不对齐** | REDMI Watch 6 → 总课表 | 期望：表格撑满。实际：`availCells = (isCapsule ? screenWidth : 316) - rowNumWidth`（`:486`），胶囊已自适应、**方屏一律 316**。432 屏可用内容宽 412px（`padding:6px 10px`）→ 表格只占 315px，**右侧留 97px 空白**，而下方模板切换行 `width:100%` 撑满 412px → **上下右缘错开**，这就是用户反馈"界面混乱"的直观来源 | REDMI Watch 6（432）；9 Pro(336) 刚好填满不受影响 | 高 | `pages/week-view/week-view.ux:486`、`:489`、`:1184` | 非胶囊分支也改成按真实屏宽算：`(this.isCapsule ? this.screenWidth : this.screenWidth \|\| 336)`，并让 `.wv-grid` 与模板行同宽 |
| **P1-19** | 输入法 | **`screenShape` 取不到时兜底为 `"circle"` → 胶囊屏渲染 480px 圆屏键盘，横向出屏 288px** | 手环网速/接口异常导致 `device.getInfo` 没返回 `screenShape` 时，任意输入框唤起键盘 | 期望：按屏型自适应。实际：`chinese-input.ux:85` `var shape = data.screenShape \|\| "circle"` → 落到 `InputMethod.ux:16/92` 的 **480×321 固定宽圆屏分支** → 192px 胶囊屏上**右侧 288px 完全出屏**，键盘不可用 | 胶囊屏（米环 9 / 10）为主 | 高 | `pages/chinese-input/chinese-input.ux:85`；`InputMethod.ux:16`、`:92`（上游组件，不得改） | 兜底值改为本页 `private` 初值 `"pill-shaped"`（`:65` 已经是它），取不到就不覆盖；或兜底为上一次成功读到的值 |
| **P1-20** | 工具页 | **行内容溢出 28px 且无截断保护** | REDMI Watch 6 → 工具 → 看「静音/振动」这一行 | 期望：完整显示或省略号。实际：`.item-label` 30px×5字 + 分隔 15×2 = 180px，`margin-left 8`，`.item-hint` 28px×8字 = 224px → **412px > 可用 384px，右侧被硬裁 28px**；「倒计时5分钟」行 384 vs 384 **零余量**。两个 text **都没有 `lines` / `text-overflow`** | REDMI Watch 6 / 9 Pro | 中 | `pages/tools/tools.ux:66-67`、`:71-72`、`:272`、`:286`、`:291` | 给 `.item-hint` 加 `flex-shrink:1; lines:1; text-overflow:ellipsis`，并把 30/28px 在 rect 下调到 26/24px |
| **P1-21** | 课程管理（预设库） | **写盘无任何回调，却一律弹成功** | 课程管理页 → 编辑/改名，或添加预设、删除后撤销、清除全部 | 期望：失败时提示。实际：`saveCourses()` 的 `storage.set` **没有 success / fail / complete**（`:186-191`），而 4 个调用方（`:247 已更新`、`:271 已添加`、`:331 已恢复`、`:352 所有课程已清除`）在下一行**无条件弹成功** → 写失败时用户以为成功，下次打开改动没了 | 全部机型 | 中高 | `pages/course-manager/course-manager.ux:186-191`、`:247/271/331/352` | `saveCourses` 接回调并把 err 回传，仅在成功时弹 toast |
| **P1-22** | 震动实验室 | **2 处中间层缺 `width`，432 宽会塌缩（`d64b1f0` 漏网）** | REDMI Watch 6 → 震动实验室 → 看底部保存区与提示条 | 期望：通栏。实际：`d64b1f0` 给 14 处同类中间层补了 `width:100%`，**漏了 `.save-section`(`:892`) 与 `.notice-banner`(`:907`)**，两者子元素 `.save-btn` 是 `width:100%` → 父容器宽按内容算 → 按钮/提示条在 432 上退化 sidebar | REDMI Watch 6 | 中 | `pages/vibration-lab/vibration-lab.ux:892-897`、`:907-912` | 补上 `width: 100%;` |
| **P1-23** | 课表管理 | **删除课表回调不接 err，数据搬迁失败仍弹"已删除"** | 课表管理 → 选课表 → 删除 → 确认 | 期望：失败要提示。实际：`deleteScheduleAndShift` 内部 `storage.delete/set` 失败一律记 log 继续、`callback()` **不传 err**（`database.js:571-585`），调用方回调连形参都没有 → 搬迁写失败也弹「已删除 X」，后续课表序号整体错位风险被掩盖 | 全部机型 | 中高 | `pages/schedule-manager/schedule-manager.ux:537`、`:558`；`data/database.js:571-585`、`:604-625` | 让 `deleteScheduleAndShiftStorage` 累计错误并 `callback(err)`，调用方接 err 分流提示 |
| **P1-24** | 添加课程 | **星期按钮 7×48 = 336px > 9 Pro 可用 304px → 周日被裁** | 9 Pro（336 宽）→ 添加课程 → 看星期行 | 期望：7 个星期按钮完整。实际：`.weekday-btn { width:48px }` ×7 + padding 左右各 16px = **336 > 304，溢出 32px**，最右一个「日」会被裁出屏幕。胶囊屏有专门的覆盖（`:820-831`、`:911`），rect 没有 | 9 Pro / 8 Pro（336） | 中 | `pages/add-course/add-course.ux:726`、`:721`；胶囊覆盖在 `:820-831`/`:911` | rect 块补 `.weekday-btn { width: 40px }` 或改 `flex: 1` 均分 |
| **P1-25** | 课程管理 / 详情页 | **`.undo-bar` 用 `position: fixed`，且胶囊块未覆盖 position** | 胶囊屏删除课程 → 看底部撤销条 | 期望：贴底显示。实际：基础层 `position:fixed`（`course-manager.ux:799`、`detail.ux:1139`），胶囊适配块（`course-manager.ux:665-674`、`detail.ux:1492-1501`）改了 `bottom/height/flex-direction` 但**都没写 position** → fixed 一定生效。而 `detail.ux` 的 `.undo-bar` 是 `<scroll>` 的直接子元素，滚动容器内 fixed 行为不确定（可能飘位）；且 rect 块底部避让 padding 只有 16px/50px < 76px → **撤销条会盖住列表最后一行** | 胶囊屏风险最大，rect 次之 | 中 | `pages/course-manager/course-manager.ux:798-811`、`:743`；`pages/detail/detail.ux:1138-1151`、`:1644` | 改 `position: absolute` 并确保父级 `position: relative`（即 `c490e47` 已确立的安全模式）；rect 块 padding-bottom 提到 ≥80px |
| **P1-26** | 课表管理 | **重命名时空名 / 重名点「完成」零反馈** | 课表管理 → 重命名 → 清空输入直接完成（或输入已有名字）→ 完成 | 期望：提示「名称不能为空 / 名称已存在」。实际：两处都**裸 `return`**（`:353-355`、`:366-368`），界面毫无变化、无 toast，用户会以为按钮没反应而反复点 | 全部机型 | 中 | `pages/schedule-manager/schedule-manager.ux:352-368` | 两处 `return` 前补 `prompt.showToast`（`:242`/`:259` 同文件已有"名称已存在"的现成文案，直接复用） |
| **P1-27** | 倒数日 | **5 处隐式宽中间层 + 2 处日期文本无 ellipsis** | REDMI Watch 6 → 倒数日 → 看列表 | 期望：行宽铺满、长日期省略。实际：`.page/.toolbar/.list-scroll/.countdown-row/.row-actions` 均**无 `width`**（`:375/392/421/426/505`），与 `homepage-settings.ux:309` 注释明示的"432 宽 rect 下隐式宽中间层退化到内容宽"同一模式；`.row-date`(`:494`)、`.row-days-text`(`:499`) 只有 `lines:1` 无 `text-overflow` → 「2026-12-31」类长日期硬裁 | REDMI Watch 6 | 中 | `pages/countdown-manage/countdown-manage.ux:375/392/421/426/505`、`:494/499` | 补 `width:100%`；两处补 `text-overflow: ellipsis` |

### P2 — 输入与交互 / 代码质量 / 本轮新增

| 编号 | 模块 | 缺陷标题 | 期望 vs 实际 | 定位 | 修复建议 |
|---|---|---|---|---|---|
| P2-16 | 全站文本输入 | **输入到 maxlen 上限后按键完全无反应、无任何提示** | 期望：提示"已达最大长度"。实际：`onCharacter` 只在 `length < maxLen` 时拼接，**没有 else 分支**，超限静默丢弃。二维码名称（maxlen=5）、位置/备注（10）、昵称（12）、自定义内容（20）全都有这个坑 | `pages/chinese-input/chinese-input.ux:125-133` | else 分支加一句 toast |
| P2-17 | 添加课程 | **5 个 `storage.set` 不等回调就 `router.push`，`nextId` 也不等** | 期望：参数写稳再跳。实际：`add-course.ux:472-476` 连发 5 次无回调写盘后第 6 行立刻跳转 → 输入页可能读到空标题/上一次残留值；`:524` 的 `nextId` 自增也无回调就 `back()`，写丢会产生**重复 id**，而删除是按 id 全量过滤、更新是首个命中 → 会误删多门/改错课 | `pages/add-course/add-course.ux:472-477`、`:522-528` | 改嵌套 success 或计数后跳；id 生成改用 `Date.now()` 或现有最大值+1 |
| P2-18 | 详情页 | **删除按钮无 `classId` 守卫** | 期望：数据未就绪时禁用。实际：`loadExistingCourseData` 在 `!classId\|\|!day` 时提前 return（`:388-391`）但 form 照常显示、删除可点 → `deleteCourse("")` → 报"不存在" → 弹"已被删除"并跳回，其实课程还在 | `pages/detail/detail.ux:388-391`、`:757`、`:784` | `deleteCourse()` 开头加 `if (!this.classId \|\| !this.day) { toast("加载中"); return }` |
| P2-19 | 课程管理 | **「清除全部」无撤销条；撤销删除忽略备份 index** | 「清除全部」删除整份预设库却**不给撤销**（单条删除有 5s 撤销）；撤销时 `push` 到末尾再排序（`:326`）而不是 `splice(backup.index,0,...)`（backup 存了 index `:295` 却不用）→ 同一时段的课恢复后位置错乱 | `pages/course-manager/course-manager.ux:295`、`:326-327`、`:349-352` | 清除也走 `undoBackup`；恢复用 `splice` |
| P2-20 | 总课表 | **同一时段多门课只显示「+N」，点击永远打开第一门** | 期望：能看到/切换第 2 门。实际：`buildTimeSlots` 收集了 `matched` 但 `course` 只取 `matched[0]`（`:765`），`showDetail(day, course)` 传的永远是第一门 → 第 2 门在总课表里**无法进入编辑/删除**，反复点击都打开同一门 | `pages/week-view/week-view.ux:763-777`、`:43` | `extraCount>0` 时弹该时段课程列表供选择 |
| P2-21 | 首页设置 | **`saveSettings` 整对象覆盖，白名单外字段会被冲掉** | `setHomepageSettings` 是 `JSON.stringify(settings)` **整体替换**（`store.js:775-784`），而本页保存时只写了 8 个字段，漏了 `showLabSection`（`app-defaults.js:46` 定义了它）→ 用户改任意一个开关，`showLabSection` 就被重置为默认 | `pages/homepage-settings/homepage-settings.ux:189-210`；`data/store.js:775` | 改为「读出 → 合并 → 写回」而不是整对象覆盖 |
| P2-22 | 欢迎页 | **进入按钮无防重入锁（第 3 轮遗留）** | 期望：连点只有一次跳转。实际：`enterSchedule` 无 `_hasEntered` 判断（历史上被删过一次），连点两次会发两次 `router.replace` | `pages/welcome/welcome.ux:72-78` | 方法首行 `if (this._entering) return; this._entering = true` |
| P2-23 | 震动实验室 | **rect 下 3 处触控区低于 48px 规范** | `.step-btn 32px`(`:1311`)、`.quick-btn height 26px`(`:1320`)、`.delete-btn 26×26`(`:1343`) —— 手环上极易误触/点不中 | `pages/vibration-lab/vibration-lab.ux:1311/1320/1343` | 提到 ≥48px（用透明 padding 撑热区亦可） |
| P2-24 | 设备信息 | **`.menu-value` 无 ellipsis，设备ID/序列号右侧不可读** | 20+ 字符 × 26px ≈ 520px，只有 `lines:1` 无 `text-overflow` → 单行硬裁 | `pages/device-info/device-info.ux:367`、`:130/139` | 补 `text-overflow: ellipsis` |
| P2-25 | 自定义内容 | **预览轮播首次不启动；「清空」无确认无撤销** | `loadContent()` 是异步的，紧接着同步调 `startPreviewTimer()` 时 `hasSelection` 还是 false → 直接 return 且之后无人再启动；`clearAll()` 一键抹掉全部内容、无二次确认、无撤销条 | `pages/custom-content-edit/custom-content-edit.ux:139-140`、`:312`、`:282-292` | `startPreviewTimer` 挪进 loadContent 成功回调；`clearAll` 加确认 + 撤销条 |
| P2-26 | 工具箱「手机遥控」 | **手机未先发消息前，4 个遥控按钮点了毫无反应** | `chat-bridge.js` 的 `connect` 要等 `app.ux` 收到手机侧消息后才 register；在此之前 `sendCmd` 只 `console.log` 就返回 false，UI 无任何提示 | `src/data/chat-bridge.js:44-48`；`app.ux` register 处 | 返回 false 时给 toast「请先在手机端发一条消息唤醒连接」 |

---

## 四、机型适配矩阵（本轮重点复核）

**结构性前提（本轮最重要的发现）**：全仓 `@media` **只按 `shape` 分支，`min-width` / `max-width` 命中数为 0**（唯一例外是 `InputMethod.ux:992` 给小圆屏的 `scale`）。因此 **9 Pro(336) 与 REDMI Watch 6(432) 共用完全相同的 rect 样式表** —— 一切按 336 调的"紧凑值"被原样搬到 432。这是 REDMI Watch 6「界面混乱」的根因，而不是某个元素的问题。

| 维度 | 米环 9（胶囊 192） | 米环 10（胶囊 212） | 9 Pro / 8 Pro（方屏 336） | REDMI Watch 6（方屏 432） |
|---|---|---|---|---|
| 命中的 media | `pill-shaped`（本轮**终于生效**） | 同左 | `rect` | **同左，无 432 专属分支** |
| 工具页可用性 | 内容 1106px vs 490px，**一半以上不可达** | 同左 | 1106 vs 480，**更差** | 1106 vs 514，**约 55% 不可达**（P0-17） |
| 设备信息页 | 21 条 ≈1302px，**约 60% 不可达** | 同左 | 同左 | 同左（P0-18） |
| 总课表表格 | 按屏宽自适应 ✅（`f793759` 已修） | 自适应 ✅ | **硬编码 316 刚好填满** ✅ | **硬编码 316 → 右侧空 97px**（P1-18） |
| 首页课程网格 | 单列 `width:100%`，胶囊档字号 32/20/26 ✅ | 同左 | 单列 + 32/26/36 ✅ | 单列 + 32/26/36 ✅（0 溢出） |
| 首页星期标题 | **48 → 26px 已收敛** ✅（第 15 轮 P0-2 已修） | 同 ✅ | 36px ✅ | 36px ✅ |
| 添加课程星期行 | 胶囊 `margin:0 1px` 紧排 ✅ | 同 ✅ | **7×48=336 > 304，周日被裁**（P1-24） | 400px 够宽，但被 `space-between` 拉散 |
| 添加课程卡片名 | 胶囊 120px / 24px ≈ 5 字 | 同左 | 基础层 100px / 26px ≈ **3.8 字** | 同左，**大屏反而比胶囊少显示 1.2 字** |
| 输入法键盘 | `pill-shaped` 分支 `width:100%` ✅（除非 `getInfo` 失败 → 480px 出屏，P1-19） | 同左 | `rect` 分支 `width:100%`，横滚可见 ≈5.25 键 | 同分支，横滚可见 ≈6.75 键 |
| 撤销条 | `position:fixed` + 胶囊块未覆盖 position ⚠️（P1-25） | 同 ⚠️ | bottom 避让不足会盖住最后一行 ⚠️ | 同 ⚠️ |
| 新页面（首页设置 / 倒数日 / 工具 / 实验室 / 设备信息 / 诊断页） | 首页设置 **0 命中（唯一全清）** | 同左 | tools/device-info 溢出+不可滚动 | tools 溢出 28px、vibration-lab 塌缩、countdown-manage 隐式宽 |

**本轮确认「历史已修 / 别再报」**

| 项目 | 第 15 轮状态 | 本轮状态 | 证据 |
|---|---|---|---|
| 第 15 轮 P0-2「胶囊屏字号被内联覆盖」 | 🔴 未修（挂 3 轮） | ✅ **已修** | `index.ux:525-542 computeFontSizes` 新增 `if (this.isCapsule)` 分支，注释明写"避免内联 font-size 覆盖 CSS 导致标题截断/时间溢出（QA P0-2）"，dayTitle ≤26 / meta ≤20 / display ≤32 |
| P1-11「27 处 `@media (shape: capsule)` 无效」 | 🔴 未修（根因级） | ✅ **已修** | 全仓 33 处均改为 `@media (shape: capsule), (shape: pill-shaped)`，逗号分隔后 `pill-shaped` 命中即生效；`pill-shaped` 计数从 0 → **32** |
| P1-14「`min-height:100%`」 | 🔴 8→12 处 | ✅ **基本清零** | CSS 内仅剩 1 处（`rect-c6.ux:71`，是专门为验证它而写的诊断页），2 处是诊断页模板里的**说明文字** |
| P1-13「`.sheet-overlay` 四边定位」 | 🔴 未修 | ✅ **已修** | `unlock-dialog.ux:96` `position: absolute` + 四边 0（符合 `c490e47` 确立的安全模式） |
| 第 15 轮 P1-1「4 个死页 + lab-edit-course Demo」 | 🔴 未修（挂 3 轮） | ✅ **已解决** | 15 个目录未注册进 manifest（`test-area` / `course-manager-v2` / `lab-add-course` / `lab-edit-course` 全在内），实测未注册不进包 |
| 第 15 轮 P1-2「add-course day 空值兜底不等回调」 | 🔴 未修 | 🟡 **已改善** | `add-course.ux:492-496` 改成同步 `this.day = DAY_NAMES[new Date().getDay()]` 兜底 |
| 第 11 轮 P0-11「二维码输入被 maxlen 卡死」 | 🔴 未修 | ✅ **已修** | `qrcode-generator.ux:203/:222` 已显式写 `maxlen`（名称 5 / 内容 100），不再是漏写导致的默认 5 |
| 第 11 轮 P1-10「InputMethod `this` 丢失」 | 🔴 未修 | ⚪ **自然消解** | 输入法已换成上游官方组件逐字节零改动，屏型改由 `screentype` prop 传入；风险形态变成 P1-19 |
| 第 11 轮 P1-12「欢迎页按钮 220px」 | 🔴 未修 | 🟡 **自然缓解** | `welcome.ux:140` 基础层仍是 220px，但 circle 块覆盖为 180px、capsule/pill 块覆盖为 160px，**两个分支都已生效**，实际不会被窄屏命中 |
| 语法 / ES6 | — | ✅ **全绿** | 29 个 `.js` + 39 个 `.ux` script 块 `node --check` **0 错误**；49 个静态跳转目标 48/49 命中（唯一 1 个是欢迎页合法动态拼接）；全仓箭头函数仅 5 处，**全部在上游 InputMethod 内**（作者约定不得修改） |

---

## 五、与上一轮（第 15 轮 / `6e1fa0b`）对比

**新增已修（本轮验证通过）**

| 编号 | 内容 |
|---|---|
| FIX-30 | 胶囊屏字号内联覆盖（第 15 轮头号 P0，挂 3 轮）——`computeFontSizes` 胶囊档收敛 |
| FIX-31 | `@media (shape: capsule)` → `capsule, pill-shaped`，**465 条从未生效过的胶囊样式一次性复活** |
| FIX-32 | `min-height:100%` 从 12 处降到 1 处（诊断页） |
| FIX-33 | 4 个死页 + Demo 页全部移出 manifest（含"实验室课程"整组删除） |
| FIX-34 | `lab` 输入法换上游官方原版，包体 828KB → 693KB（bundle −63%） |
| FIX-35 | 新增 `@system.interconnect` 手环↔手机同步（含分区权限表，`auth` 域禁止读写） |
| FIX-36 | 周视图胶囊列宽按屏宽自适应（周五不再被裁半字）、课程管理页胶囊工具行紧凑化、`unlock-dialog` 7 处解锁弹窗胶囊适配 |
| FIX-37 | 新老用户默认设置集中管理（`app-defaults.js` 26 条 + `defaults-engine.js`，单测 42 项通过） |
| FIX-38 | 输入法宽度塌缩：作者确立「禁止改上游官方组件、一律宿主侧解决」铁律，改由 `chinese-input.ux` 的 `.ime-host`（`div` 替代 `scroll`，`width:100%`）承载（`e0bb780` + `d64b1f0`） |

**仍未修复（含挂起轮次）**

| 编号 | 已挂轮次 | 本轮状态 |
|---|---|---|
| 欢迎页进入按钮防重入锁（P2-22） | 第 3 轮 | 未修 |
| week-view 缓存指纹不含 location/teacher | 第 3 轮 | 未修（本轮未重点复核） |
| 胶囊屏总课表无横滑提示 / 首页「+」无文案 | 第 3 轮 | 未修（本轮未重点复核） |
| quick-add `Date.now()` id / 硬编码色 / 空 fail | 第 5 轮 | 未修（本轮未重点复核） |
| `add-course` 5 个 set 不等回调即 push | 第 3 轮 | **未修 + 本轮新增 nextId 同类（P2-17）** |

**本轮新增**：P0-16 ~ P0-20（5 条）、P1-16 ~ P1-27（12 条）、P2-16 ~ P2-26（11 条）。

**自然消解**：第 11 轮 P0-11（二维码 maxlen）、P1-10（InputMethod this）、P1-13、P1-14；第 15 轮 P1-1（死页）。

---

## 六、回归测试建议（按用户操作路径，可直接照着点）

**A. 每次发版必跑（约 12 分钟）**
1. **打包前先确认 `manifest.deviceTypeList` 含 `band`**（P0-16）——这是唯一一个"静态看看就能拦住"的致命项
2. 冷启动 → 欢迎页连点「进入首页」两次 → 确认只跳一次（P2-22）
3. 首页 → 添加课程 → 选预置课 → 确认时间冲突能正确弹出（FIX 复核）
4. 添加后回首页 → **确认新课程立刻出现**（`allCourses_dirty` 机制）
5. 点课程 → 改时间 → 更新 → 回首页 → 确认生效
6. 点课程 → **改星期 → 退回第一步 → 删除** → 确认不会误报"已被删除"（P1-16 验证点）
7. 删除 → 5s 内点撤销 → 确认回到**原来的位置**而不是列表末尾（P2-19）

**B. 逐个页面「能不能够得着」专项（本轮新增，最高价值）**
8. **工具页：从顶部一路往下翻，确认 13 项全部能滚动到**（重点看「手机遥控」4 个新按钮）→ P0-17
9. **设备信息页：一路翻到底，确认能看到「序列号 / 存储空间 / 钉首页」** → P0-18
10. 布局诊断页 `rect-diag` → 逐个进 rect-c1~c7，每页看最后 1–2 个用例入口有没有被裁

**C. REDMI Watch 6（432）专项**
11. 总课表：确认表格是否撑满宽度、是否与下方模板切换行右缘对齐 → P1-18
12. 工具页：确认「静音/振动」行右侧有没有被裁 → P1-20
13. 震动实验室：确认底部保存按钮是否通栏 → P1-22
14. 倒数日 / 添加课程：确认行铺满、长日期不硬裁 → P1-27 / P1-24

**D. 9 Pro（336）专项**
15. 添加课程星期行：**确认「日」没有被裁出屏幕** → P1-24
16. 工具页 / 设备信息页同样复核可滚动性 → P0-17 / P0-18

**E. 胶囊屏（米环 9 / 10）专项**
17. 首页：确认星期标题不截断、课程时间不溢出（第 15 轮 P0-2 现在应该通过）
18. 首页设置页「课程字号」−/+：**确认是否依然没有反应** → P0-20
19. 设置页：确认描述文字隐藏是**作者有意为之**（`@media` 现已生效），并确认右侧选中值没有被 `overflow:hidden` 裁掉
20. 任意输入框：**在正常网络下键盘应水平居中**（左上角出来的话就是 P1-19 被触发）

**F. 输入法**
21. 填「二维码名称」连续敲 6 个字 → 确认第 6 个字有没有任何反馈提示 → P2-16
22. 填「位置」连敲 11 字 → 同上

---

## 七、已知风险 · 不急修（P4，仅记录）

| 风险 | 损失上限 | 触发条件 |
|---|---|---|
| 本地明文存授权态：`premium_unlocked` / `auth_data` 存在 `@system.storage`，本地写入 `'1'` 即可解锁高级功能 | 单份授权费，不影响其他用户、不影响数据正确性 | 用户主动导出/修改本地存储 |
| week-view 渲染命中缓存时 `detectCurrentCourse` 仍每次执行，但 `isNow` 跨分钟不重算 → 「当前课」高亮延迟到下一次重渲染 | 观感问题 | 长时间停留在总课表页面 |
| 工具箱的「手机遥控」指令走手机端白名单执行，未做双向鉴权 | 仅在已配对的手机↔手环之间，不外泄 | 需要已 root 的同账号设备才能构造 |

> 按项目定位：「知道就行，算是一种福利，修复不着急。」本节不进摘要、不进交接本待办表、不排期、不弹窗。

---

*报告生成：2026-09-29 07:39 (+0800) · HEAD `9ccc2cf` · 第 16 轮 · 用户视角（操作链路优先）*
