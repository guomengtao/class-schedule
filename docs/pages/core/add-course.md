# 添加课程

> 路由：`pages/add-course` ｜ 源码：`src/pages/add-course/add-course.ux`

## 1. 页面职责

新建一条课程记录：课程、星期、上课位置、起止时间，写入前做同天时间冲突检测。
时间用步进器而非键盘输入——手环上没有可用的数字键盘，`chinese-input` 只服务位置这种短文本。

**已按 `ev-six` 六位准则重排（2026-10-25，evtask-D-evclass-sche-261025-kwz3rm）。**

## 2. 界面结构

内容区 168px（页面 padding 左右 12px），卡片内 152px。自上而下四块：

| 区块 | 内容 | 说明 |
|---|---|---|
| 选课程 | 横向滚动课程卡（88px 宽 / 28px 字，一屏约 1.8 个）+ 末尾 `+` 卡 | 选中态用 **accent 底色**，不用描边；`+` 卡与课程管理页同一入口，故不再单独放「管理」按钮 |
| 星期 | 7 个 44px 按钮横滑，一屏约 3.7 个 | `scrollToCurrentDay()` 自动把选中日滚进视野；模板顺序「一二三四五六日」，`dayIndex=0` 排末尾 |
| 上课时间 | 两张卡（开始 / 结束），卡内「时」「分」两列，值下方各自 `−` `+` | 2×(34+34+44) ≈ 224px，原设计 4 个 label 独占整行共 328px |
| 上课位置 | 输入卡，点击进 `chinese-input` | 空态占位 4 字「输入位置」 |

底部固定：`取消`（74px 定宽）+ `添加`/`确认`（flex）+ 上方 34px 页内状态条。

**区块顺序依据**：课程与星期是高频改动项，时间由所选课程自动带出（`selectCourseByIdx` 整组写入时/分），位置次之且可选。故取「课程 → 星期 → 时间 → 位置」：首屏能看到完整的第一张时间卡，位置留在第二屏。

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `saveCourse` | 校验（选课程 / 有时间）→ 冲突检测 → 必要时二次确认 → `doInsert` |
| `doInsert` | `nextId` 自增并落 storage，`database.insertCourse` 写库，成功后 `router.back()` |
| `selectCourseByIdx` | 选中课程，把 name / location / 起止时间整组带入表单 |
| `loadCourses` / `refreshCourseList` | 读 `course_preset_list`，无数据回落 12 门默认课程，按开始时间排序 |
| `adjustEndTime` | 开始时间变化后调用：结束 ≤ 开始时自动给 45 分钟（默认课时） |
| `applyEnd` | 结束时间自身调整后调用：只保证严格大于开始（最少 5 分钟），不做 45 分钟跳变 |
| `shiftStartMin` / `shiftEndMin` | 分钟整体位移，跨 60 自动进位 / 退位，跨零点回绕 |
| `showTip` / `clearTip` | 页内状态条读写；任何有效改动（选课 / 改日 / 调时）都会清提示并把主按钮复位成「添加」 |
| `scrollToCurrentDay` | 星期横滑定位：`scroll-left` 属性先行 + `$element.scrollTo` 兜底 |

## 4. 主要数据字段

`courseName` `courseTime` `courseLocation` `courseIndex` `presetCourses` `day` `dayIndex`
`startHour` `startMin` `endHour` `endMin` `nextId` `isSaving` `conflictConfirmed`
`tipText` `tipColor` `saveLabel` `theme` `iconTheme`

## 5. 注意事项（坑）

1. **分钟步进是 5 分钟，不是 1**（`MIN_STEP`）。课程表时间全是 5 的倍数，±1 要连点 30 次；`adjustEndTime` 保证结束晚于开始，`applyEnd` 保证按结束按钮不会跳成 45 分钟后。
2. **校验一律走页内状态条，禁用 `prompt.showToast`**（ev-six 第 13 条）。toast 是系统浮层固定弹屏幕上沿，会压住内容；状态条高度固定 34px，只换颜色不换高度，用 `display` 绑定控制显隐。
3. **`header-placeholder` 不能归零**。归零后 flex 标题被左侧返回键推偏，不再居中；必须与返回键等宽 30px。
4. **页面左右 padding 必须是 12px**。16px 会让内容宽 168 → 160，4 字 @28 标题（149px）开始贴边。
5. **课程卡选中态用底色不用描边**。`border: 2px` 吃掉 4px 宽度，且 ev-six 禁装饰边框。
6. **两组 `−`/`+` 不能等间距**。列宽 70px、按钮 32px ⇒ 组内 6px、组间 12px，否则四个按钮连读成一排，分不清哪个管小时。
7. **`if="{{ }}"` 条件渲染在本工程会整页白屏**，条件一律用 `display` 绑定。
8. **首屏只到「开始」卡是必然的**。4 组字段 + 固定底栏在 490px 屏上内容约 600px（ev-six 允许 1.5 屏），靠半个卡露出提示可下滑，不要靠压字号去挤。
9. 自检：`node test/add-course.test.js`（49 项，含时间进位、冲突二次确认、ev-six 静态自检）。
