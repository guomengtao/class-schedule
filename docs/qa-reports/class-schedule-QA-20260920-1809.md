# Ev课程表 手环快应用 · 第 13 轮质检报告（用户视角 · 功能+UI）

| 项目 | 内容 |
|---|---|
| 仓库 | https://github.com/guomengtao/class-schedule |
| 分支 / HEAD | `main` / `d48b08fd66dc7a55b574d8971190e3b5c06be279` |
| HEAD 提交时间 | 2026-09-20 17:42:49 +0800 |
| HEAD 提交信息 | Release v1.6.27: 胶囊屏全页面适配优化 |
| 版本 | versionName 1.6.27 / versionCode 856 |
| 目标机型 | 小米手环 9 / 9 Pro / 10 / 10 Pro（manifest deviceTypeList: watch + band） |
| 分析轮次 | **第 13 轮**（上一轮：第 12 轮 `9dfeec3` / 2026-09-17 19:35） |
| 生成时间 | 2026-09-20 18:09 (+0800) |
| 分析视角 | 用户角度：核心操作（添加/编辑/删除课程）+ 界面显示（字号/遮挡/行高/布局） |

---

## 一、本轮结论摘要

> **一句话结论**：v1.6.27 是本项目 3 天来改进最大的一版——**上轮 P0/P1 的胶囊屏添加页布局、时间倒挂、冲突检测、detail 滑条超宽、图标字符等 12 项全部实质修复或重构**，主链路（添加/编辑/删除+换星期+删除撤销）功能完整；但残留两个必须处理的硬伤：**首页胶囊屏字号内联覆盖仍未修（标题截断/时间溢出）**，以及**新增的冲突检测因时间格式不统一（"08:00-08:45" vs "08:00 - 08:45"）对"所有新添加/编辑过的课程"完全失效**。

**最该优先修的 3 件事：**

1. **时间格式统一（新功能失效，P0）**：add-course/detail 保存的时间是「08:00-08:45」（无空格），而冲突检测 `parseTimeRange` 用 `split(" - ")` 解析 → 无空格串不被分割、被当成单点时间 {s:e} → `rangesOverlap` 恒 false → **新添加/编辑的课程永远不会检测到与任何课程冲突**。全仓时间字段三种格式混存（预置/quick-add 带空格、新添加无空格），建议统一为无空格并在解析处兼容两种
2. **首页胶囊屏字号内联覆盖（上轮 P0 未修）**：`day-title` 内联 48px 仍覆盖胶囊 CSS 26px、课程时间内联 34px 覆盖 CSS 20px → 胶囊屏标题截断、「08:00-08:45」34px 约 170px 宽溢出卡片（作者已加省略号/换行缓解，字号本身未降）
3. **死页/Demo 残留（上轮 P3 未修）**：course-manager-v2、test-area、lab-add-course、lab-edit-course 4 页 0 引用仍注册；lab-edit-course 仍是纯 Demo（「课程已更新 (Demo)」不写数据），一旦接入即"假操作"

---

## 二、本轮已修复验证（相对第 12 轮 `9dfeec3`）

| 编号 | 问题 | 验证方式 | 结果 |
|---|---|---|---|
| FIX-1 | 时间倒挂可保存（UX-24，上轮 P0-4） | add-course/detail 步进均走 `adjustEndTime()`：end≤start 时自动置为 start+45 并防跨 24h | ✅ 已修复（机制性） |
| FIX-2 | 无时间冲突检测（上轮 P2-1） | `database.checkDayConflict`（parseTimeRange+rangesOverlap+excludeId）上线，add-course/detail/add-course-v2 保存前查重、冲突 toast 二次确认 | 🟡 已上线但格式 bug 致失效（见 P0-2） |
| FIX-3 | 胶囊 bottom-bar 300px 超宽（上轮 P0-2） | 改 `cancel-btn flex:1 + save-btn flex:2`，宽度自适应 | ✅ 已修复 |
| FIX-4 | 胶囊星期行 294px 超宽（上轮 P1-1） | 改 `weekday-scroll` 横向滚动 + `scrollToCurrentDay` 自动滚到当前星期 | ✅ 已修复 |
| FIX-5 | 胶囊时间行/调节器超宽（上轮 P0-1/P1-2） | 时间选择器重构为 stepper（小时/分钟分组，胶囊 label 独占行 + flex-wrap，btn44+val56+btn44=144<160） | ✅ 已修复 |
| FIX-6 | detail 选课滑条 228px 超宽（上轮 P1-3） | `course-card` 改 `width:auto + min-width:0` | ✅ 已修复 |
| FIX-7 | detail 字号设置不生效/applyFontSizes 死代码（上轮 P1-4） | detail 已无 applyFontSizes/titleStyle | ✅ 已修复 |
| FIX-8 | 编辑不能换星期（上轮 P2-2） | detail 重构为 4 步向导，step3「位置与星期」+ dayConfirmed 二次确认 | ✅ 已修复（功能增强） |
| FIX-9 | Unicode 字符图标（上轮 P2-8） | 全站 `value="◀"` 等字符图标 0 残留，统一 header.css + icon_back.png（浅/深两套） | ✅ 已修复 |
| FIX-10 | 首页文字裁切风险 | lineHeight=字号×1.2 + `estimateTextWidth` 宽度估算（胶囊 name+loc 超 120px 换行 locationWrap） | ✅ 部分改善（字号未降，见 P0-1） |
| FIX-11 | 添加页星期默认今天不跟随首页 | add-course 读 `add_course_day`（首页翻天后再添加默认停在那天） | ✅ 已修复（功能增强） |
| FIX-12 | 删除无撤销 | detail 增加 undo（undoBackup/undoTimer，删除后撤销窗口） | ✅ 已修复（功能增强） |

---

## 三、缺陷清单

### P0 — 用户操作直接受影响的功能 Bug（最高优先级）

| 编号 | 模块/页面 | 缺陷标题 | 复现步骤 | 期望结果 | 实际结果（推断） | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|---|
| P0-1 | 全局数据层 | **时间格式不统一 → 新增冲突检测失效** | 预置课添加「语文 08:00 - 08:45」后，再用添加页新建「数学 08:10 - 08:30」 | 提示时间冲突需二次确认 | add-course/detail 保存格式为「08:00-08:45」（无空格），`parseTimeRange` 用 `split(" - ")` 解析 → 不分割、被 `parseTimeToMinutes` 解析为**单点 {480,480}** → `rangesOverlap` 恒 false → 新添加/编辑过的课程（无空格格式）与任何课程都不会触发冲突提示 | **高** | `add-course.ux:440`/`detail.ux:547` 无空格输出；`database.js:491` split(" - ")；三种格式混存（预置/quick-add 带空格） | 统一时间输出格式（推荐无空格），`parseTimeRange` 兼容 split("-") 与 split(" - ")；存量数据重写归一 |
| P0-2 | index（胶囊屏） | **首页字号被内联 style 覆盖（上轮未修）** | 胶囊设备打开首页 | 星期标题 26px、时间 20px 完整显示 | `day-title` 内联 48px 覆盖胶囊 CSS 26px（3 字 144px 只给约 60px，标题截断成 1 字）；`grid-item-time` 内联 metaFontSize 34px 覆盖 CSS 20px，「08:00-08:45」约 170px 溢出卡片正文宽 141px | **高** | `index.ux:11/89-93` 内联字号；`class-list.js:63-64` displaySize 默认 48 | 胶囊屏运行时把 displaySize/metaFontSize 降到胶囊档（如 26/18），或内联字号移入 CSS media query |

### P1 — 界面与显示 / 机型适配 / 数据边界

| 编号 | 模块/页面 | 缺陷标题 | 期望 vs 实际 | 影响机型 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|
| P1-1 | detail（胶囊屏） | **header 标题被占位挤压截断** | 编辑页标题「编辑课程」4 字完整显示 | detail 用公共 header（back 48 + placeholder 48），**胶囊块未像 add-course 一样把 `.header-placeholder` 归零**，内容区 160px 下标题仅剩约 64px，24px 字号 4 字 = 96px → 截断为省略号 | 胶囊屏 | 中 | `detail.ux` 胶囊块缺 header-placeholder 覆盖（对比 add-course.ux:831-835） | 胶囊块补 `.header-placeholder{width:0}` |
| P1-2 | add-course | **day 空值兜底失效（低风险竞态）** | onInit 异步读 `add_course_day` 未返回前点保存 | 课程落在正确星期 | `setDefaultDay()` 已改异步（读 storage），`saveCourse` 里 `if(!this.day){setDefaultDay()}` 不等待回调，极端竞态下 day="" 存进空星期 | 全机型 | 低 | `add-course.ux:492` | 保存前若 day 为空，同步用 `new Date().getDay()` 兜底 |
| P1-3 | 全局 | **4 个死页仍注册（上轮 P3-1 未修）** | — | — | course-manager-v2 / test-area / lab-add-course / lab-edit-course 全仓 0 跳转引用，仍在 manifest「课程管理/实验室课程」组；lab-edit-course 仍为 Demo（更新/删除只弹 toast 不写数据） | 全机型 | 中 | `manifest.json`；`lab-edit-course.ux:337/356` | 未接线直接删页并从 manifest 移除；lab 页移出正式路由 |
| P1-4 | add-course（胶囊屏） | **时间步进区垂直过长需滚动** | 胶囊设备添加课程 → 看时间区 | 时间区一屏可见 | 开始/结束两组 stepper 各 4 行（label 32 + btn 48×2 行 ×2 组 ≈ 470px），胶囊内容高约 430px，结束区需滚动才可见；操作路径变长 | 胶囊屏 | 低 | `add-course.ux` 胶囊 stepper | 两组 stepper 并行两列或压缩行距 |

### P2 — 输入与交互 / 代码质量

| 编号 | 模块/页面 | 缺陷标题 | 期望 vs 实际 | 影响 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|
| P2-1 | quick-add | `Date.now()` 作课程 id（上轮 P2-4 未修） | — | 极短时间连续添加 id 冲突概率低 | 低 | `quick-add.js:41` | 复用 add_course_nextId |
| P2-2 | add-course/detail | 硬编码颜色不随主题（上轮 P2-6 未修） | 选中边框 `#7ec8e3`、weekday 激活 `#7ec8e3` 写死 | 主题切换视觉不联动 | 低 | `add-course.ux:602/733` | 改 theme.accent |
| P2-3 | add-course/detail | 空 `fail(){}` 回调（6 处） | 存储失败静默 | 异常无提示 | 低 | add-course/detail 多处 | 补 showToast 兜底 |
| P2-4 | 全局 | 20px 字号仍为主力、logLevel=log（P3 系列未修） | 低于自家规范底线 22px；console 拖慢弱 CPU | 观感/性能 | 低 | 各页；manifest config | 按规范升档、发布降 error |

---

## 四、屏幕适配矩阵（本轮重点复核）

**胶囊屏（米环 9：192×490 / 米环 10：212×520，内容区 160px）**

| 页面/组件 | 上轮 | 本轮 | 状态 |
|---|---|---|---|
| add-course 时间行 | 304px 超宽 | stepper 144px | ✅ 修复 |
| add-course 底部按钮 | 300px 超宽 | flex:1/2 自适应 | ✅ 修复 |
| add-course 星期行 | 294px 超宽 | 横向滚动 48px/项 | ✅ 修复 |
| add-course 时间调节器 | 176px 超宽 | 44+56+44=144px | ✅ 修复 |
| detail 选课滑条 | 228px 超宽 | width:auto | ✅ 修复 |
| detail header 标题 | — | 64px 可用 vs 96px 需要 | 🟡 截断风险（P1-1） |
| index 星期标题 | 内联 48px | 仍内联 48px | 🔴 未修（P0-2） |
| index 课程时间 | 内联 34px | 仍内联 34px | 🔴 未修（P0-2） |

**方屏（336×480）**：上轮 time-box 行高压缩问题随 stepper 重构消失；基础布局可容纳。

---

## 五、与上一轮（第 12 轮 / `9dfeec3`）对比

**已修复（本轮验证通过）**：FIX-1~FIX-12（见第二节），其中胶囊添加页五处超宽、时间倒挂、detail 死代码、换星期、删除撤销、图标 PNG 化为实质性改善，方向正确。

**仍未修复（含轮次）**

| 编号 | 已挂轮次 | 本轮状态 |
|---|---|---|
| 首页胶囊字号内联覆盖 | 2 轮 | 未修（加了换行/省略号缓解，字号未降） |
| 死页 4 个 + lab-edit-course Demo | 2 轮 | 未修 |
| quick-add Date.now() id | 2 轮 | 未修 |
| 硬编码颜色 / 空 fail / 20px 字号 / logLevel | 长期 | 未修 |

**本轮新增**：P0-1（时间格式不统一→冲突检测失效，新功能带病上线）、P1-1（detail 胶囊 header 标题截断）、P1-2（day 空值兜底失效）、P1-4（胶囊时间区过长）。

**自然消解**：detail applyFontSizes、Unicode 字符图标、胶囊添加页五处超宽随重构消失。

---

## 六、回归测试建议（按用户操作路径）

**A. 主链路（每次发版必跑，约 8 分钟）**
1. 冷启动 → 首页 → **胶囊屏看星期标题是否完整（当前截断成 1 字）与时间是否溢出卡片（P0-2）**
2. 首页 → 添加课程 → 胶囊屏看时间 stepper 是否需滚动、星期是否自动滚到当天（FIX-4）
3. 预置课先加「语文 08:00-08:45」→ 再加「数学 08:10-08:30」→ **期望提示时间冲突需二次确认**（当前无空格格式检测不到 → P0-1 命中）
4. 开始调到 23:55 → 结束自动跳 23:59（倒挂纠正）→ 确认添加 → 回首页出现
5. 点课程 → 改名称/时间 → 更新 → 回首页确认 → 杀进程重进确认保留
6. 点课程 → step3 换星期 → dayConfirmed 二次确认 → 更新 → 该课程出现在新星期（FIX-8）
7. 删除课程 → 第一次点不删 → 观察撤销按钮 → 撤销恢复（FIX-12）
8. 设置 → 换浅色主题 → 进添加页看返回图标是否换浅色（FIX-9）

**B. 输入法**
9. 添加课程 → 填位置 → 唤起输入法 → 确认键盘水平居中
10. 连敲 12 字符 → 位置 maxlen=10 被挡

**C. 胶囊屏专项（米环 9 / 10）**
11. 首页截图核对标题/时间字号（P0-2）
12. 编辑页（detail）header 截图核对标题是否截断（P1-1）
13. 添加页时间区截图核对结束组是否需滚动（P1-4）

---

## 七、已知风险 · 不急修（P4，仅记录）

| 风险 | 损失上限 | 触发条件 |
|---|---|---|
| 本地明文存授权态：`premium_unlocked` / `auth_data` 存 `@system.storage`，本地写入 `'1'` 即可解锁高级功能 | 单份授权费，不影响其他用户与数据正确性 | 用户主动导出/修改本地存储 |

> 按项目定位：「知道就行，修复不着急。」本条不进摘要、不进交接待办表、不排期。

---

*报告生成：2026-09-20 18:09 (+0800) · HEAD `d48b08f` · 第 13 轮 · 用户视角（功能+UI）*
