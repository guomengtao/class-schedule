# 首页多文件组合方案

## 背景

当前首页 `src/pages/index/index.ux` 是一个约 1200 行的单文件，包含：

- **模板（Template）**：约 120 行，页面结构
- **脚本（Script）**：约 600 行，全部业务逻辑
- **样式（Style）**：约 350 行，CSS 样式

随着功能不断增加，单文件变得越来越臃肿，难以维护。本方案探索一种**非自定义组件**的多文件组合方式，将不同功能模块的 JavaScript 逻辑拆分到独立的 `.js` 文件中，通过 `require()` 在页面脚本中组合使用。

## 核心思路

### 与自定义组件的区别

| 方式 | 描述 | 适用场景 |
|------|------|----------|
| 自定义组件 `<import>` | 有独立的 template/script/style，可在模板中像标签一样使用 | 需要封装 UI + 逻辑的可复用组件 |
| **多文件组合（本方案）** | 仅拆分 script 逻辑为多个 `.js` 文件，模板和样式仍保留在 `.ux` 文件中 | 页面逻辑分组管理，不涉及独立 UI |

### 组合模式

每个功能模块作为一个独立的 `.js` 文件，导出一个**工厂函数**，接收页面实例（`this` 上下文），返回该模块的方法集合。主页面脚本通过 `require()` 引入各模块，在 `onInit` 中批量挂载到页面实例上。

```
src/pages/index/
  ├── index.ux              # 主文件（模板 + 样式 + 组合入口）
  └── modules/
      ├── status.js         # 状态栏逻辑
      ├── navigation.js     # 日期导航
      ├── classes.js        # 课程加载与进度
      ├── quick-add.js      # 快速添加课程
      ├── pinned.js         # 固定页面
      ├── screen.js         # 屏幕检测
      ├── vibration.js      # 震动提醒
      └── utils.js          # 工具函数
```

## 模块拆分方案

### 1. `modules/utils.js` — 工具函数

```js
// 纯函数，不依赖页面实例
const dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]

function parseTime(timeStr) { ... }
function formatTime(minutes) { ... }
function getRealTodayIndex() { ... }
function sortByTime(list) { ... }

export default {
  parseTime,
  formatTime,
  getRealTodayIndex,
  sortByTime,
  dayNames
}
```

### 2. `modules/screen.js` — 屏幕检测

```js
// 检测设备屏幕形状和宽度
function detectScreen(instance) {
  // 设置 instance.isCapsule, instance.isNarrowScreen
}

export default { detectScreen }
```

### 3. `modules/navigation.js` — 日期导航

```js
// 前后翻页、跳转今天/明天/周视图
function prevDay(instance) { ... }
function nextDay(instance) { ... }
function goToToday(instance) { ... }
function goToTomorrow(instance) { ... }
function goToWeekView(instance) { ... }

export default {
  prevDay, nextDay, goToToday, goToTomorrow, goToWeekView
}
```

### 4. `modules/classes.js` — 课程加载与进度

```js
// 加载当日课程、更新进度条
function loadDayClasses(instance) { ... }
function updateClassProgress(instance) { ... }

export default { loadDayClasses, updateClassProgress }
```

### 5. `modules/status.js` — 状态栏

```js
// 上课中/即将上课/暂无课程状态
function updateStatus(instance) { ... }
function updateStatusLine(instance) { ... }
function computeTodayStatus(instance, nowMinutes) { ... }
function findUpcomingClass(instance, realTodayIdx) { ... }
function startStatusTimer(instance) { ... }
function stopStatusTimer(instance) { ... }

export default {
  updateStatus, updateStatusLine, computeTodayStatus,
  findUpcomingClass, startStatusTimer, stopStatusTimer
}
```

### 6. `modules/quick-add.js` — 快速添加

```js
function refreshQuickAdd(instance) { ... }
function loadPresetCourses(instance) { ... }
function calcNextTimeSlot(instance) { ... }
function quickAddCourse(instance, name) { ... }
function toggleQuickAdd(instance) { ... }
function makeCourse(instance, name, time, teacher, location) { ... }

export default {
  refreshQuickAdd, loadPresetCourses, calcNextTimeSlot,
  quickAddCourse, toggleQuickAdd, makeCourse
}
```

### 7. `modules/pinned.js` — 固定页面

```js
function loadPinnedPages(instance) { ... }
function openPinnedPage(instance, uri) { ... }

export default { loadPinnedPages, openPinnedPage }
```

### 8. `modules/vibration.js` — 震动

```js
function playVibration(instance, style) { ... }

export default { playVibration }
```

## 主页面改造

`index.ux` 的 script 部分改造为：

```js
<script>
import router from "@system.router"
const store = require("../../data/store.js")
const database = require("../../data/database.js")
var pinHelper = require("../../data/pin-helper.js")

// 多文件模块引入
const utils = require("./modules/utils.js")
const screenModule = require("./modules/screen.js")
const navigation = require("./modules/navigation.js")
const classes = require("./modules/classes.js")
const statusModule = require("./modules/status.js")
const quickAdd = require("./modules/quick-add.js")
const pinned = require("./modules/pinned.js")
const vibration = require("./modules/vibration.js")

export default {
  private: { ... },  // 数据定义保持不变

  onInit() {
    // 初始化逻辑
    var self = this
    store.getTheme(function(t) { self.theme = t })
    database.init(function() {
      database.getAllCourses(function(schedule) {
        self.schedule = schedule
        classes.loadDayClasses(self)
        statusModule.updateStatus(self)
        statusModule.startStatusTimer(self)
      })
    })
    this.currentDayIndex = utils.getRealTodayIndex()
    this.currentDay = utils.dayNames[this.currentDayIndex]
    // ... 其他初始化
    screenModule.detectScreen(this)
    pinned.loadPinnedPages(this)
  },

  // 挂载模块方法
  sortByTime: utils.sortByTime,
  prevDay: navigation.prevDay,
  nextDay: navigation.nextDay,
  goToToday: navigation.goToToday,
  goToTomorrow: navigation.goToTomorrow,
  goToWeekView: navigation.goToWeekView,
  loadDayClasses: classes.loadDayClasses,
  updateClassProgress: classes.updateClassProgress,
  updateStatus: statusModule.updateStatus,
  updateStatusLine: statusModule.updateStatusLine,
  computeTodayStatus: statusModule.computeTodayStatus,
  findUpcomingClass: statusModule.findUpcomingClass,
  startStatusTimer: statusModule.startStatusTimer,
  stopStatusTimer: statusModule.stopStatusTimer,
  refreshQuickAdd: quickAdd.refreshQuickAdd,
  loadPresetCourses: quickAdd.loadPresetCourses,
  calcNextTimeSlot: quickAdd.calcNextTimeSlot,
  quickAddCourse: quickAdd.quickAddCourse,
  toggleQuickAdd: quickAdd.toggleQuickAdd,
  makeCourse: quickAdd.makeCourse,
  loadPinnedPages: pinned.loadPinnedPages,
  openPinnedPage: pinned.openPinnedPage,
  playVibration: vibration.playVibration
}
</script>
```

## 优势

1. **代码组织清晰**：每个模块职责单一，文件短小精悍（每个模块 50-150 行）
2. **易于维护**：修改某个功能只需关注对应模块文件
3. **独立测试**：纯函数模块可以独立进行单元测试
4. **模板不变**：页面模板和样式保持在 `index.ux` 中，不引入额外组件
5. **渐进式迁移**：可以逐步拆分，不影响现有功能
6. **零运行时开销**：`require()` 在编译时解析，无额外性能损耗

## 注意事项

1. **模块间通信**：通过 `instance`（页面实例）访问共享数据，模块间不直接依赖
2. **工具函数独立**：`utils.js` 中的纯函数不依赖页面实例，可被所有模块引用
3. **生命周期绑定**：`onInit`、`onShow`、`onHide`、`onDestroy` 保留在主文件中，负责协调各模块的初始化和销毁
4. **数据定义不变**：`private` 和 `public` 数据定义保留在主文件的 `export default` 中

## 示例 Demo

在实验室中新增一个 `multi-file-demo` 页面，演示多文件组合模式：

- `src/pages/multi-file-demo/index.ux` — 主页面（模板 + 样式 + 组合入口）
- `src/pages/multi-file-demo/modules/counter.js` — 计数器逻辑
- `src/pages/multi-file-demo/modules/list.js` — 列表逻辑
- `src/pages/multi-file-demo/modules/theme.js` — 主题切换逻辑

每个模块独立管理自己的数据和逻辑，主页面通过组合方式将它们整合为一个完整页面。

## 后续计划

1. 先在实验室中创建 `multi-file-demo` 验证方案可行性
2. 验证通过后，逐步将首页 `index.ux` 按此方案重构
3. 其他复杂页面（如 `settings.ux`、`schedule-manager.ux`）也可采用相同模式