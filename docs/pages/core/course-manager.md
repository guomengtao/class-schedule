# 课程名称管理

> 路由：`pages/course-manager` ｜ 源码：`src/pages/course-manager/course-manager.ux`

## 1. 页面职责

维护「课程预设列表」（`course_preset_list`）：改名、新增、删除、清空。列表按**开始时间**升序。

**已按 `ev-six` 六位准则重排（2026-10-25，evtask-D-evclass-sche-261025-fg3dfx）。**

## 2. 界面结构

内容区 168px（页面 padding 左右 12px），卡片内 160px。

| 区块 | 内容 | 说明 |
|---|---|---|
| 头部 | 返回键 30 + 标题「课程」28px + 等宽占位 30 | 3 元素骨架，标题才居中 |
| 操作行 | 左「清空」76×40 + 右「+ 添加」84×40 | 主次靠颜色：添加 accent 亮底（主），清空常态 card 底 + textSecondary 字（次），仅确认态切亮红 |
| 课程列表 | 单行卡片 46px：课名区（cardLight 亮底，可点改名）+ 删除键 38×38 | 一屏 6 项；原设计上下两层只放得下 3 项 |

底部浮层 `tip-bar` 固定 52px（左右 12 / 底 8），替代全部 toast。

### 2.1 单行卡片宽度预算

卡片 padding 4×2 → 课名区 flex 118px（内 padding 8×2）⇒ 课名可用 **102px ≈ 3.6 汉字** @28px。
删除键 38 + margin 4（单字「删」@24 = 24px，两侧各 7px 余量）。
4 字以上课名折行，卡片靠 `min-height` 自动增高，**不裁切不加省略号**（第 8 条）。

### 2.2 为什么删掉圆形序号徽标

第 6 条：圆形徽标各占 1.0P，只给顺序不给信息。列表本按时间排序，序号无决策价值；
删掉后课名可用宽度 64→102px（+59%）。

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `sortByTime` | 按 `time` 前段 `HH:MM` 升序；缺 time 当 `00:00`；返回新数组 |
| `loadCourses` | 读 storage，空值或解析失败回落 12 门默认课程 |
| `startRename` / `startAdd` | 写 `chinese_input_*` 四键后 `router.push` 到输入页 |
| `processInputResult` | 按 `editingIndex` / `isAdding` 分流到改名或新增 |
| `doRenameCourse` | 同名静默返回；重名提示「名称已存在」；成功「已改名」并持久化 |
| `doAddCourse` | 重名/空文本拒绝；成功追加 `{time:"08:00 - 08:45", teacher:"老师"}` 后重排 |
| `deleteCourse` | 一次点击进确认态（提示「再点一次删除」，5s 超时），二次真删并开撤销窗口 |
| `undoDelete` | 按时间重插被删课程（不是按原索引，避免排序错位） |
| `clearAllCourses` | 两次确认，5s 超时；清空时同步作废撤销备份 |
| `showTip` / `hideTip` | 底部内联条；`canUndo` 时带撤销按钮并延长 5s，普通提示 3.5s |

## 4. 主要数据字段

`courseList` `editingIndex` `isAdding` `clearAllConfirm` `deleteConfirmIndex`
`tipVisible` `tipText` `canUndo` `tipTimer` `deleteTimer` `clearTimer` `undoBackup` `theme` `iconTheme`

## 5. 注意事项（坑）

1. **事件属性里不能写 `{{ }}`**：`onclick="startRename({{ $idx }})"` 被拼成 `startRename(" + ($idx) + ")`，
   报 `Unsupported Event value`。正确写法直接写内置变量 `onclick="startRename($idx)"`（CallExpression 求值）。
2. **`<style>` 块里不能插值**：`border-color: {{ theme.borderLight }}` 报 `### Css ### Unknown word`。
   动态颜色走模板内联 `style`，静态几何留 CSS。
3. **`npx aiot release` 编译失败退出码仍为 0**，EmuBuddy 只看 rc，会打印「直达成功」却部署旧包，
   **截图显示首页就是编译失败的信号**，别误判成"导航不生效"。
4. **`onShow` 先处理回传结果再决定是否 `loadCourses`**：原实现两个异步回调竞态，
   会把刚改好的课名覆盖回旧值。现改为有回传结果则不重读。
5. **提示文案 ≤3 字**：tip-bar 宽 168，按钮 56 + margin 8 占位后消息区仅 86px ≈ 3.5 字；
   「课程已删除」实测被裁成「已删」。带按钮场景统一 3 字，无按钮场景可到 6 字。
6. **课名区用 `min-height` 不用 `height`**：固定 38px 时长课名（maxlen=10）折行会溢出卡片。
7. **`if="{{ }}"` 在工程内会白屏**，条件显隐一律 `display` 绑定（第 14 条），本页 4 处。
8. **点删除键不会误触改名**：删除键 input 与课名区 div 是兄弟节点，非父子，不冒泡。
9. 自检：`node test/course-manager.test.js`（64 项）。
