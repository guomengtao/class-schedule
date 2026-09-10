# Ev课程表 手环快应用 · 第 1 轮质检报告（基线）

| 项目 | 内容 |
|---|---|
| 仓库 | https://github.com/guomengtao/class-schedule |
| 分支 / HEAD | `main` / `2d727e98080454bef62717983fe25de94cde807d` |
| HEAD 提交时间 | 2026-09-10 12:23:31 +0800 |
| HEAD 提交信息 | refactor: move donate page to settings section; update README to reflect actual features |
| 版本 | versionName 1.4.153 / versionCode 653 |
| 目标机型 | 小米手环 9 Pro、小米手环 10 Pro（manifest deviceTypeList: watch + band） |
| 分析轮次 | **第 1 轮（基线）**，无上一轮可对比 |
| 生成时间 | 2026-09-10 12:30 (+0800) |
| 分析视角 | 资深客户端测试工程师（QA） |

---

## 一、本轮结论摘要

> **一句话结论**：核心数据链路存在 1 个**致命级数据错乱缺陷**（删除课表后课程数据错位串表）和 1 个**严重级可用性缺陷**（新增课程后不刷新需重启），同时**用户量最大的首页完全没有做任何屏幕形状适配**，与开发者自己文档中的"已完成三形适配"记录不符。

**最该优先修的 3 件事：**

1. `deleteSchedule` 只删了课表名字，**没迁移 `allCourses_<index>` 数据** → 删中间一张表后，后面的课表会读到前一张的旧数据，属于数据错乱/串表（致命）
2. `add-course` **绕过 database 缓存层直写 storage** → 保存成功但首页不显示，用户必须杀进程重启才看到（严重，与用户反馈"编辑课程失败"高度吻合）
3. 首页 `index-full.ux` **零 `@media(shape)` 适配**，而全站 18 个页面都有 → 圆屏/胶囊屏设备上四角控件被裁切且不可点（严重）

---

## 二、缺陷清单

### P0 — 用户操作直接受影响的功能 Bug（最高优先级）

| 编号 | 模块/页面 | 缺陷标题 | 复现步骤 | 期望结果 | 实际结果（推断） | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|---|
| P0-1 | schedule-manager | **删除课表导致课程数据串表（致命）** | 新建 3 张课表 A/B/C → 分别录入不同课程 → 删除中间的 B | B 数据清除，C 的索引前移且数据仍对应 C | 仅从 `list` 中 splice 并写回 `scheduleNames`，**`allCourses_1/2` 原始数据原样保留**；删除后切到"C"实际读到 B 的旧数据，再新建表会覆盖 C 的数据 | **致命** | `schedule-manager.ux:389-435`（414 splice、427 只写 names）；`database.js:374/576` 的 `deleteScheduleAndShift` **已定义但从未被调用**（死代码） | `deleteSchedule` 中必须先调用 `database.deleteScheduleAndShift(index, list.length, cb)`，回调成功后再 `setScheduleNames` / `setScheduleIndex` |
| P0-2 | add-course | **新增/编辑课程保存后首页不显示** | 首页 → 新增课程 → 填写 → 保存 → 返回首页 | 首页立即出现新课程 | 页面端**直写 `allCourses_<idx>` storage**，未调用 `database.insertCourse` → 首页经 `database.getAllCourses` 命中 `_cache` 旧值，需重启应用才出现 | **严重** | `add-course.ux:510`（`var storageKey = "allCourses_" + idx`）；`database.js:151-204`（缓存读）、`:482`（仅 insertCourse 失效缓存）；`index-full.ux:194/235` | 改用 `database.insertCourse(course, cb)`，走统一写入通道并自动失效缓存 |
| P0-3 | detail | **编辑课程静默清空备注（数据丢失）** | 打开一条带备注的课程 → 编辑 → 更新 | 备注内容保留 | `updatedCourse.notes` 被硬编码为 `""`，且加载时从不读取 notes → 保存后备注永久丢失 | **严重** | `detail.ux:548`（`notes: ""`）；`detail.ux:537-558`；`database.js:299-300` | `loadExistingCourseData` 读取并回显 notes；更新时透传原值 |
| P0-4 | add-course | **`day` 异步竞态导致课程不可见** | onInit 中 storage 读取未回调完成前极快点保存 | 课程落在正确星期 | `day` 初值 `""`，异步赋值；竞态下写入 `day:""`，该课程在周视图/首页均无星期可匹配，等于"存了但看不见" | **严重** | `add-course.ux:161`、`:226-237`、`:492` | 保存前校验 `day` 非空，为空则 `setDefaultDay()`；或把 day 作为页面参数同步传入 |
| P0-5 | backup-restore | **备份/恢复遗漏主题配置，且恢复后不生效** | 换主题 → 备份 → 重置数据 → 恢复备份 | 主题一起还原，且恢复后立即生效 | `DATA_KEYS` 写的是 `"theme"`，而 store 实际存储键是 `"appTheme"` → **主题永远不会被备份也不会被还原**；且恢复后 `database._cache` 与内存 `currentScheduleIndex` 未刷新，首页仍显示旧数据 | **严重** | `backup-restore.ux:67-74`（`"theme"`）；`store.js:251/272/288`（`"appTheme"`）★已交叉核实 | DATA_KEYS 中 `"theme"` 改为 `"appTheme"`；`performRestore` 结束后调用 `database.init()` 清空缓存并刷新内存索引 |
| P0-6 | schedule-manager | **复制课表失败时卡在中间态** | 复制一张含课程的课表，过程中任一 insert 失败 | 提示完成或失败 | `inserted++` 仅在成功分支累加，`inserted===totalCourses` 永不成立 → 无 toast、不还原索引、UI 停在加载态 | 一般 | `schedule-manager.ux:312-337`、`:328-336` | 完成判定改为"已处理数==总数"，无论成败都进收尾（刷新+还原+提示） |
| P0-7 | activation / auth-store | **激活持久化失败无任何反馈** | 激活成功 → 但 `setAuthData` 写入失败 | 明确提示"未保存，请重试" | 结果框已先置为"激活成功"，失败仅不弹 toast；下次启动静默回退标准版 | 一般 | `activation.ux:511-523`、`:513-514`；`auth-store.js:385-431` | 持久化失败时显式提示，不要在写盘成功前标记成功 |

### P1 — 界面与显示 / 机型适配

| 编号 | 页面/组件 | 缺陷标题 | 期望 vs 实际 | 影响机型 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|
| P1-1 | index-full（首页） | **首页完全没有屏幕形状适配** | 期望：按圆/方/胶囊分别布局；实际：**全文件 `@media` 出现 0 次**（已核实），而 `settings.ux:741`、`device-info.ux:287`、`week-view.ux:857`、`homepage-settings.ux:619` 等 18 个页面均已适配 | 圆屏 / 胶囊屏 / 部分 10 Pro | **高** | `index-full.ux`（grep `media` = 0）★已核实 | 补 `@media(shape:circle/rect/capsule)` 三套，参照 `settings.ux:741` |
| P1-2 | index-full 顶部 | **顶部安全区与全站不一致（8px vs 44px）** | 首页 `padding:8px`，其它所有页 44px → 有状态栏的机器内容被系统状态栏遮挡，无状态栏的机器其它页顶部空 44px | 9 Pro / 10 Pro 全系 | **高** | `index-full.ux:380`（8px）；`settings.ux:461`、`device-info.ux:184`、`week-view.ux:675`、`schedule-manager.ux:522`（44px） | 统一策略：用 `device.getInfo` 取实际状态栏高度（`device-info.ux:105` 已有能力可复用） |
| P1-3 | index-full 四角 | **圆屏下角落控件被裁切不可点** | header 两侧 44px `nav-btn`、3 个 `day-nav-circle`、`bottom-buttons`、`week-indicator` 全部贴边无内缩 | 圆屏 watch 形态 | **高** | `index-full.ux:411-431`、`:679-689` | 圆屏媒体查询内增加 padding 内缩 ≥ 屏幕半径补偿值 |
| P1-4 | 全局 | **写死 px，无机型分辨率差异处理** | `manifest.json:57` 为 `designWidth: device-width`（1px=1 物理像素），导航按钮 44px、课程卡 `min-height:60px`、按钮高 44px 全部固定 → 不同分辨率屏幕上溢出/挤压 | 10 Pro（分辨率与 9 Pro 不同） | 中 | `manifest.json:57`；`index-full.ux:411/424/524/658` | 改用百分比/相对单位，或按 `device.getInfo().screenWidth` 动态折算 |
| P1-5 | index-full | **数据库失败无错误态，永久"加载中"** | 期望：错误提示 + 重试；实际：`isLoading` 恒为 true，只显示"加载中…" | 全机型 | 中 | `index-full.ux:48-50` | 增加 error 兜底态与重试入口 |

### P2 — 输入与交互

| 编号 | 页面/组件 | 缺陷标题 | 期望 vs 实际 | 影响机型 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|
| P2-1 | nickname-edit + chinese-input | **取消编辑后昵称被清空（共享键污染）** | 期望：取消不改动原值；实际：取消时把 `chinese_input_result` 写成 `""`，而昵称页判定 `data!==undefined && data!==null`，`""` 被当成有效值 → 昵称被清空 | 全机型 | **高** | `chinese-input.ux:353-369`；`nickname-edit.ux:70-82` | 取消时不写该键（或删除键）；昵称页判定改为 `data !== ''` |
| P2-2 | chinese-input-full | **方屏机器被强制走圆屏输入法布局** | 期望：按 rect/pill 布局；实际：`screentype="circle"` **写死**（已核实）→ 圆屏 480px 布局被直接缩放到方屏，按键错位 | 9 Pro / 10 Pro（rect） | 中 | `chinese-input-full.ux:19` ★已核实 | 由 `device.getInfo` 动态传入 screentype |
| P2-3 | InputMethod | **中文整词提交可越过 maxlength** | 昵称 maxlen=5，候选词整体追加（如"我们"）不触发长度校验 | 全机型 | 中 | `InputMethod.ux:471-473`（`addAllTxt` 无校验）；`chinese-input-full.ux:136-141`（仅按"次"判） | 在 `addAllTxt`/`onCharacter` 中累加后截断到 maxlength |
| P2-4 | InputMethod | **圆屏键盘宽度硬编码 480px** | 非对应设计宽度下被裁切/溢出 | 圆屏 | 中 | `InputMethod.ux:16/19` | 改百分比或运行时宽度 |
| P2-5 | InputMethod | **T9 候选点击区仅 36px，低于 40px 可点阈值** | 手环小屏极易误触/点不中 | 圆屏 T9 | 低 | `InputMethod.ux:987-991` | 点击区宽高均 ≥40px |
| P2-6 | InputMethod | **`adjustScreenWidth` 无 fail 回调** | `device.getInfo` 失败时 screenWidth 恒为默认 336 → 进度环/键盘偏位 | rect / pill | 低 | `InputMethod.ux:802-808` | 补 fail 回调，给机型默认宽度 |
| P2-7 | InputMethod | **胶囊屏（pill-shaped）缺 T9 布局** | 胶囊屏切 T9 键盘时多键/选词逻辑错位 | 胶囊屏 | 低 | `InputMethod.ux:263-334`（仅 full 键盘分支） | 补 T9 分支或直接禁用 T9 |
| P2-8 | InputMethod | **下展候选列表不刷新（代码注释自述）** | 选词后再次展开列表不更新，需先收回再展开 | 圆屏 | 低 | `InputMethod.ux:485`（注释） | 重建 list 或强制 key 刷新 |

### P3 — 代码质量与稳定性

| 编号 | 问题 | 规模 / 定位 | 影响 | 建议 |
|---|---|---|---|---|
| P3-1 | **41 处 `JSON.parse` 疑似无 try/catch** | `store.js:613/633/679/822`、`auth-store.js:147/179/528/550`、`detail.ux:328`、`course-manager.ux:135`、`storage-viewer.ux:200`、`index-full/modules/custom-content.js:24/51` 等 | **存储数据一旦损坏即整页崩溃（白屏）** | 全部包 try/catch 并给默认值兜底 |
| P3-2 | **116 处遗留 `console.log`** | `premium-overlay.js`、`backup-restore.ux`（单文件 89+）、`index-full/modules/*.js`、`status-bar.js` 等 | 手环 CPU/内存极弱，日志 I/O 拖慢首屏 | 构建时剔除或按 logLevel 开关 |
| P3-3 | 使用废弃 API `String.prototype.substr` | `InputMethod.ux:356`；`dicUtil.js:117/125/213/269/294/300/471` | 低 | 改 `slice` |
| P3-4 | `setTimeout` 递归未清理 | `dicUtil.js:70`（`_buildForwardIndex` 分片） | 低 | 组件销毁时清理 timer |
| P3-5 | `database.deleteScheduleAndShift` 为死代码 | `database.js:374/576`，全仓库无调用点 ★已核实 | 中（掩盖了真实 bug） | 要么接进调用链，要么删除以免误导 |

**字典资源体积（内存风险）**：`dic.js` 26KB/7449 汉字 + `dic_words.js` 68KB/3016 词 + `dic_words_initials.js` 44KB + `dic_jp.js` 28KB + `pinyin_syllables.js` 4KB ≈ **190KB 源码**，解析为 JS 对象后在手环上属中等体量。已做懒加载与分片，**不至于 OOM**，但纯英文/数字场景仍会构建全套中文词库，建议按语种按需加载。

### P4 — 安全与合规（按你的要求排最后）

| 编号 | 问题 | 定位 | 说明 |
|---|---|---|---|
| P4-1 | **激活码主盐硬编码在客户端** | `src/lib/crypto.js:1` `const GLOBAL_MASTER_SALT = "k3f9x"` | 激活码生成/校验算法完全在客户端，盐值明文写死，可被逆向后本地生成有效激活码。属混淆而非加密。建议改为服务端签发/校验，或至少做时效性签名 + 设备绑定。 |

> 其余 P4 面（明文密码、token、越权写入）本轮**未发现**——`auth-store.js` 中无 password/token/secret 相关字段。

---

## 三、9 Pro vs 10 Pro 机型适配对比表

| 维度 | 小米手环 9 Pro | 小米手环 10 Pro | 当前代码覆盖情况 | 风险 |
|---|---|---|---|---|
| 屏幕形态 | 方屏（rect） | 方屏（rect，尺寸/比例与 9 Pro 不同） | `manifest.deviceTypeList` 含 `watch`+`band`，但**首页无任何形态判断** | **高** |
| 屏幕适配查询 | — | — | 18 个次级页有 `@media(shape)`，**首页 0 处** | **高** |
| 分辨率处理 | 约 336×480 | 与 9 Pro 不同 | `designWidth: device-width`（1px=1 物理像素），全站写死 px，**未读 `screenWidth` 做折算** | **高** |
| 顶部安全区 | 与全站 44px 假设不一致 | 同左 | 首页 8px，其余页 44px，**两处不一致** | **高** |
| 输入法布局 | 应为 rect | 应为 rect | 统一写死 `screentype="circle"` | 中 |
| 圆角/安全区 | 未处理 | 未处理 | 无 safe-area 概念 | 中 |
| 圆形 watch 形态 | — | — | 首页四角控件会被圆形裁切且不可点 | **高** |
| 屏幕参数读取能力 | 有能力但仅用于展示 | 同左 | `device-info.ux:105/119-120` 已能取 `screenWidth/screenHeight`，**未被复用到布局层** | 中 |

**结论**：代码对 9 Pro / 10 Pro 的差异**几乎零处理**，靠一套固定 px 硬扛两台机器。当前未大规模爆雷，主要因为两机尺寸接近；一旦新机型分辨率拉开差距，P1-4 会集中爆发。

---

## 四、历史已知 Bug 修复状态核对

开发者 `docs/` 目录里记录了大量历史分析，本轮**以代码为准**做了交叉验证：

| 文档记录的问题 | 文档结论 | 代码实测 | 判定 |
|---|---|---|---|
| 首页黑屏（左上角有内容其余全黑）根因缺 `width/height:100%` | 建议补 100% | `index-full.ux:377-378` 已补 | ✅ **已修复** |
| 黑屏：顶部 44px 把布局顶出屏幕 | 改为 8px | `index-full.ux:380` 已改 8px | ✅ **已修复**（但引发 P1-2 不一致） |
| 黑屏：`onShow` 末尾缺 `$forceUpdate` | 建议补 | `index-full.ux:253` 已补 | ✅ **已修复** |
| `index.ux` 缺 `@media(shape:rect/capsule/circle)` | `screen-adaptation-status.md` 标「✅ 已适配」 | **`index-full.ux` 实测 `@media` = 0 行** | ❌ **未修复，且文档失实**（页面已重命名为 `index-full`，文档仍指旧 `index`） |
| `deviceTypeList` 缺 `"band"` | 待补 | `manifest.json:8-11` 已含 watch+band | ✅ **已修复** |
| settings 页打不开（vibrator 导入/并发异步） | 待修 | `settings.ux:229-245` 仍有多异步 `onInit` | ⚠️ **部分仍存** |
| 添加课程保存按钮 bug（有专项分析文档） | 有分析 | `add-course.ux:510` 仍绕过 database 直写 | ❌ **未修复**（见 P0-2） |
| 快速添加课程失败（有专项分析文档） | 有分析 | 同一写入通道问题 | ❌ **未修复**（同 P0-2） |

> **重要提醒**：`docs/` 中多份文档已与实际代码脱节（尤其 `screen-adaptation-status.md`）。建议以本报告的代码实测为准，并对 docs 做一次清理，否则会误导后续判断。

---

## 五、回归测试 Checklist（给开发，可直接执行）

**数据正确性（最高优先）**
- [ ] 建 3 张课表各录不同课程 → 删除中间一张 → 检查第 3 张数据是否仍正确、是否串到第 2 张的数据
- [ ] 首页新增课程 → 不重启直接看首页是否显示
- [ ] 给课程写备注 → 编辑保存 → 备注是否还在
- [ ] 换主题（非默认）→ 备份 → 重置数据 → 恢复 → 主题是否恢复、首页数据是否立即刷新
- [ ] 复制一张含课程的课表 → 观察是否有 toast 收尾

**界面 / 机型（9 Pro 与 10 Pro 各跑一遍）**
- [ ] 首页：系统状态栏是否遮挡顶部内容
- [ ] 首页：切到具体星期，day-nav 三个圆点是否完整可点
- [ ] 任一输入的写字界面：按键是否与屏幕实际形状匹配（方屏不该用圆屏布局）
- [ ] 断网或模拟 DB 失败：首页是否卡在"加载中"（应出现错误提示+重试）
- [ ] 清空全部课程：首页是否是纯白屏（应显示空状态插图和引导）

**输入**
- [ ] 设昵称 → 进自定义内容编辑 → 输入内容后点**取消** → 返回昵称页，昵称是否被清空
- [ ] 昵称框（maxlen=5）输入满 5 字后，用中文候选整词再提交一次，看是否超过 5 字
- [ ] T9 键盘逐个点击候选首字母，统计误触率

---

## 六、本轮统计

| 优先级 | 数量 | 其中致命/严重/高 |
|---|---|---|
| P0 功能 Bug | 7 | 致命 1、严重 3 |
| P1 界面与适配 | 5 | 高 3 |
| P2 输入交互 | 8 | 高 1 |
| P3 代码质量 | 5 | 中 1 |
| P4 安全合规 | 1 | 低 1 |
| **合计** | **26** | — |

**下一轮巡检（自动定时任务，6 小时后运行）会重点复核**：本轮列出的 P0-1、P0-2、P1-1 是否已被修复，以及是否有新增提交引入新的数据链路问题。
