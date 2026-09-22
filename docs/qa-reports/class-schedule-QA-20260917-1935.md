# Ev课程表 手环快应用 · 第 12 轮质检报告（用户视角 · 功能+UI）

| 项目 | 内容 |
|---|---|
| 仓库 | https://github.com/guomengtao/class-schedule |
| 分支 / HEAD | `main` / `9dfeec3a7562c9f060191d3a286995bed6daf29b` |
| HEAD 提交时间 | 2026-09-17 17:54:25 +0800 |
| HEAD 提交信息 | settings: fix back button exclamation mark, replace missing icon with text arrow |
| 版本 | versionName 1.5.63 / versionCode 817 |
| 目标机型 | 小米手环 9 / 9 Pro / 10 / 10 Pro（manifest deviceTypeList: watch + band） |
| 分析轮次 | **第 12 轮**（上一轮：第 11 轮 `d9b9bf6` / 2026-09-13 09:27） |
| 生成时间 | 2026-09-17 19:35 (+0800) |
| 分析视角 | 用户角度：核心操作（添加/编辑/删除课程）+ 界面显示（字号/遮挡/行高/布局） |

---

## 一、本轮结论摘要

> **一句话结论**：添加/编辑/删除课程**主链路功能可用**（防重复、二次确认、写库与缓存失效均已打通，上一轮多个硬伤已修复），但**胶囊屏（192px 宽）核心添加页存在 5 处固定宽度严重超宽、首页字号被内联样式覆盖导致标题截断/时间撑破卡片**，且**时间倒挂校验仍缺失**——这三类问题是用户在胶囊设备上每次添加/编辑课程都会遇到的体验问题。

**最该优先修的 3 件事：**

1. **添加课程页（add-course）胶囊屏布局整体超宽**：时间行 304px、底部按钮 300px、星期行 294px、时间调节器 176px，全部超过胶囊内容区 160px（物理约束见《胶囊屏UI规范.md》），时间行/星期行/按钮被挤压或溢出，用户可能点不到「确认添加」
2. **首页胶囊屏字号被内联 style 覆盖**：星期标题内联 48px（CSS 26px 失效）、课程时间/地点内联 34px（CSS 13px 失效）→ 胶囊屏标题被截断成 1 字、时间文字撑破课程卡片
3. **时间倒挂校验仍缺失**：add-course 与 detail 均可保存「结束早于开始」的课程（如 10:00-09:00），首页进度条/排序异常（上轮 UX-24 未修）

---

## 二、本轮已修复验证（相对第 11 轮 + 上轮用户视角审查）

| 编号 | 问题 | 验证方式 | 结果 |
|---|---|---|---|
| FIX-1 | add-course-v2 与旧 add-course 双页并存、入口混乱 | `add-course-v2/` 已从仓库删除（842 行），首页「+」统一跳 `/pages/add-course` | ✅ 已修复 |
| FIX-2 | 添加页标题残留「添加课程9」 | add-course.ux:6 已为「添加课程」 | ✅ 已修复 |
| FIX-3 | applyFontSizes 死代码（add-course） | add-course.ux 已无 applyFontSizes，字号全走 CSS + 胶囊 media query | ✅ 已修复 |
| FIX-4 | 保存直写 storage 绕过缓存（旧 P0-2） | add-course saveCourse 走 `database.insertCourse`，缓存自动失效 | ✅ 已修复 |
| FIX-5 | day 异步竞态导致课程存进空星期（旧 P0-4） | `setDefaultDay()` 在 onInit 同步执行，无异步窗口 | ✅ 已修复 |
| FIX-6 | 编辑课程静默清空备注（旧 P0-3） | detail.ux:566 `notes: this.courseNotes \|\| ""`，加载回显、更新透传 | ✅ 已修复 |
| FIX-7 | 图标用字符/emoji（部分） | 已开始换 Lucide PNG（icon_home/icon_trash，浅色/深色两套）；**但 ◀ ▶ 等返回/翻页字符仍残留** | 🟡 部分修复 |
| FIX-8 | lab-add-course 空列表崩溃 | selectCourse 增加 `presetCourses.length === 0` 保护 | 🟡 部分（模板直取 `[courseIndex].name` 仍无保护，见 P2-7） |

---

## 三、缺陷清单

### P0 — 用户操作直接受影响的功能 Bug（最高优先级）

| 编号 | 模块/页面 | 缺陷标题 | 复现步骤 | 期望结果 | 实际结果（推断） | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|---|
| P0-1 | add-course（胶囊屏） | **时间行固定宽度超宽 144px** | 胶囊设备（米环 9/10）→ 首页「+」→ 添加课程 → 看「上课时间」行 | 两个时间框 + 分隔符在一行内完整显示 | 胶囊 `time-box` 130×2 + `time-sep`(24px 字 + margin 10×2) = **304px**，内容区仅 **160px**，超出 144px；两框被挤压、行高压缩，存在文字裁切 | **高** | `add-course.ux:775-793`（胶囊块） | time-row 胶囊改纵向排列（上下两框），或 time-box flex:1 + max-width:130px + time-sep 纵向 |
| P0-2 | add-course（胶囊屏） | **底部按钮固定宽度超宽 140px** | 同上 → 滚到页面底部 | 取消/确认添加并排完整可见、可点 | 胶囊 `cancel-btn` 100 + `save-btn` 200 = **300px** > 160px，确认添加按钮右侧溢出屏幕，可能点不到 | **高** | `add-course.ux:829-840` | 胶囊 bottom-bar 改纵向（两个按钮各 flex:1 + 高度 44），或 save-btn 收窄至 150px |
| P0-3 | index（胶囊屏） | **首页字号被内联 style 覆盖** | 胶囊设备 → 打开首页 | 星期标题 26px、课程时间 13px 显示完整 | `day-title` 内联 `font-size: {{ dayTitleSize }}px`（默认 48）覆盖胶囊 CSS 26px；`grid-item-time/location` 内联 `metaFontSize`（默认 34）覆盖 CSS 13px → 标题 3 字 144px 宽被挤成 1 字省略，时间「08:00 - 08:45」约 224px 宽撑破卡片与课程名互相挤压 | **高** | `index.ux:9/71-74` 内联字号；胶囊块 `.day-title{26px}`、`.grid-item-time{13px}` 失效 | 胶囊屏字号从内联移入 CSS media query，或按 isCapsule 运行时用胶囊字号档 |
| P0-4 | add-course / detail | **时间倒挂无校验（UX-24 未修）** | 添加课程 → 开始调成 23:55 → 结束调成 08:00 → 确认添加 | 提示「结束时间需晚于开始时间」并拦截 | 保存成功写入「23:55 - 08:00」；首页进度条 `total = endMin − startMin` 为负、进度显示异常、排序错乱 | **高** | `add-course.ux:413-441` saveCourse；`detail.ux:550-576` updateCourse | 保存前比较 start/end 分钟数，倒挂 toast 拦截 |

### P1 — 界面与显示 / 机型适配

| 编号 | 模块/页面 | 缺陷标题 | 期望 vs 实际 | 影响机型 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|
| P1-1 | add-course（胶囊屏） | **星期行超宽 134px** | 7 个 `weekday-btn` 胶囊 42×7 = **294px** > 160px，space-between 下仍溢出，两端按钮贴近半圆被遮挡 | 胶囊屏 | 高 | `add-course.ux:820-824` | 胶囊 weekday-row 改 wrap 两行（4+3），或按钮缩至 22px 宽 |
| P1-2 | add-course（胶囊屏） | **时间调节器超宽 40px** | 每组 `adjust-group` = label 40 + btn 44 + num 48 + btn 44 = **176px** > 容器 136px（160−12×2），时/分两组左右溢出 | 胶囊屏 | 中 | `add-course.ux:794-805` | 胶囊 adjust-group 按钮/数字收窄，或纵向拆两行 |
| P1-3 | detail（胶囊屏） | **选课滑条仍超宽 52px** | 箭头 36×2 + 卡片 140 + margin 16 = **228px** > 176px（192−16）可用 | 胶囊屏 | 中 | `detail.ux` 胶囊块 `.swipe-arrow{36px}` `.course-card{140px}` | 卡片收窄至 104px 或箭头缩小 |
| P1-4 | detail | **字号设置不生效（applyFontSizes 死代码）** | 用户在设置里调字号 → 编辑页应同步变化 | 实际 `applyFontSizes` 赋值的 `titleStyle/labelStyle/...` **从未在模板绑定**（模板无 `{{ titleStyle }}`），字号固定 CSS；编辑页与全局字号设置脱节 | 全机型 | 中 | `detail.ux:184/235/237/306-307` | 删除死代码，或把字号真正绑定模板 |
| P1-5 | add-course（方屏） | **time-box 行高被压缩** | 方屏 time-box 高 70px，内容（padding 20 + 行高 42 + 28）= **90px**，超出 20px，time-val/time-label 行高被压缩存在文字挤压；胶囊同样（62 vs 78） | 方屏+胶囊 | 中 | `add-course.ux:562-582/775-788` | 增高 time-box 或减小行高/padding |

### P2 — 输入与交互 / 数据边界

| 编号 | 模块/页面 | 缺陷标题 | 期望 vs 实际 | 影响 | 严重度 | 定位 | 修复建议 |
|---|---|---|---|---|---|---|---|
| P2-1 | add-course / quick-add | 无同名/同时段冲突检测 | 可重复添加同名课程或时间重叠课程，无提示 | 数据冗余、课表混乱 | 中 | `add-course.ux saveCourse`；`quick-add.js addCourse` | 保存前按 day+time 查重并 toast |
| P2-2 | detail | 编辑不能修改星期 | 只能改名称/时间/位置，课程换天需删除重建 | 操作繁琐 | 中 | `detail.ux` 模板无星期选择 | 增加「换星期」入口或跳转 |
| P2-3 | detail | 找不到课程时静默回退 | classId 无效时 `selectCourse(0)` 选中第一门预置课，直接点「更新」会改错课程或报「课程不存在」 | 数据误改 | 中 | `detail.ux loadExistingCourseData` | 找不到课程时提示并返回，不自动选中 |
| P2-4 | quick-add | `Date.now()` 作课程 id | 极短时间连续添加可能 id 冲突 | 概率低 | 低 | `quick-add.js` | 复用 add_course_nextId 计数器 |
| P2-5 | index | 长课程名只显示 1 行省略 | `max-lines:2` 与 `lines:1` 并存，后者生效，10 字课程名被截断 | 信息不可见 | 中 | `index.ux .grid-item-name` | 删除 `lines:1` 允许 2 行 |
| P2-6 | add-course/detail | 硬编码颜色不随主题 | 时间调节器背景 `#16213e`、选中边框 `#7ec8e3` 写死，主题切换不联动 | 视觉不一致 | 低 | `add-course.ux:597/685` 等 | 改用 theme 变量 |
| P2-7 | lab-add-course | 空预置课程列表仍可能渲染异常 | 模板 `{{ presetCourses[courseIndex].name }}` 无空数组保护（`[]` 是数组仍赋值），用户清空预置课程后进入，`undefined.name` 渲染异常 | 死页（当前无入口），接入即触发 | 低 | `lab-add-course.ux:27` | 模板加 `if presetCourses.length` 包裹 |
| P2-8 | 全局 | 返回/翻页仍用 Unicode 字符 | back-btn「◀」、arrow-btn「◀▶」等字符图标；新提交只替换了 home/trash 为 PNG | 部分设备渲染为方块/样式不一 | 低 | 各页 back-btn；`add-course.ux:4`；`lab-add-course.ux:26-32` | 统一换 PNG 图标 |

### P3 — 死页 / 包体 / 代码质量

| 编号 | 问题 | 规模 / 定位 | 影响 | 建议 |
|---|---|---|---|---|
| P3-1 | **4 个已注册页面零跳转引用（死页）** | `course-manager-v2`（0 引用，仍注册「课程管理」组）、`test-area`（0 引用）、`lab-add-course`、`lab-edit-course`（0 引用，仍注册「实验室课程」组） | 白做代码 + 包体积浪费；lab-edit-course 为纯 Demo（更新/删除只弹 toast「课程已更新 (Demo)」不写数据），一旦接入会造成假操作 | 未接线的直接删除；lab 实验页从 manifest 移除并删文件 |
| P3-2 | 新增实验室页继续膨胀 | `vibration-lab-v2`（859 行）、`test-area-v2`（223 行）新增 | 正式包持续变大，src 体积逼近 rpk 2MB 红线 | 实验页统一移出正式路由 |
| P3-3 | 空 `fail(){}` 回调仍多 | add-course/detail/chinese-input 等仍有多处空 fail（台账 UX-1 34 处） | 存储读写失败静默无提示 | 逐处补 showToast 兜底 |
| P3-4 | `logLevel: "log"` + console 日志 | manifest `config.logLevel: "log"`；全仓 console.* 142 处 | 手环弱 CPU 下日志 I/O 拖慢 | 发布改 error 并清理 |
| P3-5 | 20px 字号仍为主力 | 全站 <22px 约 288 处、20px 201 处（台账 UX-4） | 低于自家规范底线 22px，用户反馈字号偏小的重点区域 | 按《手环字号规范》升档 |

---

## 四、屏幕适配矩阵（本轮重点复核）

**胶囊屏（米环 9：192×490 / 米环 10：212×520，内容区 160px）**

| 页面/组件 | 设计值 | 内容区 | 状态 |
|---|---|---|---|
| add-course 时间行 | 304px | 160px | 🔴 超 144px |
| add-course 底部按钮 | 300px | 160px | 🔴 超 140px |
| add-course 星期行 | 294px | 160px | 🔴 超 134px |
| add-course 时间调节器 | 176px | 136px | 🔴 超 40px |
| detail 选课滑条 | 228px | 176px | 🔴 超 52px |
| index 星期标题 | 内联 48px | CSS 26px 失效 | 🔴 标题截断 |
| index 课程时间/地点 | 内联 34px | CSS 13px 失效 | 🔴 撑破卡片 |

**方屏（336×480）**：add-course time-box 内容 90px > 容器 70px（行高压缩）🟡；其余基础布局可容纳。

---

## 五、与上一轮（第 11 轮 / `d9b9bf6`）对比

**已修复（本轮验证通过）**：FIX-1~FIX-8（见第二节），其中 add-course-v2 删除回归单页、标题文案、保存缓存链路、day 竞态、notes 透传为实质性改善。

**仍未修复（含轮次）**

| 编号 | 已挂轮次 | 本轮状态 |
|---|---|---|
| UX-24 时间倒挂校验 | 2 轮+ | 未修（add-course + detail 双处） |
| UX-22 胶囊添加页超宽 | 2 轮+ | 未修（V2 删除后**在回归的 add-course 上原样重现**，5 处） |
| 首页胶囊字号内联覆盖 | 上轮新增 | 未修 |
| detail applyFontSizes 死代码 | 上轮新增 | 未修 |
| detail 胶囊 swiper 超宽 | 上轮新增 | 未修 |
| UX-9 死页/实验页残留 | 4 轮+ | 未修（4 页零引用仍注册；旧 V2 死页已被删除属积极面） |
| UX-1 空 fail / UX-4 字号偏小 / P3 系列 | 长期 | 未修 |

**本轮新增**：P0-4（时间倒挂双页确认）、P3-2（新实验页膨胀）、P2-8（图标替换不彻底）。

**自然消解**：add-course-v2 死页随删除消失；旧「添加课程9」标题、applyFontSizes（add-course）随重写消失。

---

## 六、回归测试建议（按用户操作路径）

**A. 主链路（每次发版必跑，约 8 分钟）**
1. 冷启动 → 首页 → 胶囊屏重点看星期标题是否完整（当前会截断成 1 字）
2. 首页 → 添加课程 → **胶囊屏看时间行/星期行/底部按钮是否完整可见可点**（当前均超宽）
3. 开始时间调到 23:55、结束 08:00 → 确认添加 → **期望被拦截**（当前可保存倒挂课）
4. 保存正常课程 → 返回首页立即出现 → 点课程改名称 → 更新 → 回首页确认 → 杀进程重进确认保留
5. 点课程 → 删除 → 第一次点不删（提示再点）→ 5 秒内再点 → 删除成功
6. 设置 → 换主题 → 进添加/编辑页看弹层颜色是否联动（当前硬编码不联动）
7. 设置 → 调字号 → 进编辑页确认字号跟随（当前不跟随，P1-4）

**B. 输入法**
8. 添加课程 → 填位置 → 唤起输入法 → 确认键盘水平居中（旧 P1-10 相关）
9. 连敲 12 个字符 → 位置 maxlen=10 应被挡

**C. 胶囊屏专项（米环 9 / 10）**
10. 添加页全部 4 个 section 逐屏截图，核对时间行/星期行/底部按钮无溢出（P0-1~P1-2）
11. 首页截图核对星期标题与课程时间字号（P0-3）
12. 编辑页（detail）截图核对选课滑条（P1-3）

---

## 七、已知风险 · 不急修（P4，仅记录）

| 风险 | 损失上限 | 触发条件 |
|---|---|---|
| 本地明文存授权态：`premium_unlocked` / `auth_data` 存 `@system.storage`，本地写入 `'1'` 即可解锁高级功能 | 单份授权费，不影响其他用户与数据正确性 | 用户主动导出/修改本地存储 |

> 按项目定位：「知道就行，修复不着急。」本条不进摘要、不进交接待办表、不排期。

---

*报告生成：2026-09-17 19:35 (+0800) · HEAD `9dfeec3` · 第 12 轮 · 用户视角（功能+UI）*