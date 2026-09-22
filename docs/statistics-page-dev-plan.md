# 课程统计页面 - 开发方案

## 概述

在课程表管理页面增加一个"统计"按钮，点击进入统计页面。统计页面展示课程数据的可视化分析，包括总览卡片、各科数量排行、每日课程分布、时间段分布。

---

## 页面结构

```
schedule-manager (课程表管理)
├── 新增: "统计"按钮 → 跳转至 statistics 页面
│
statistics (课程统计) ← 新建页面
├── header: 返回按钮 + 标题
├── overview: 总课程数 / 本周课程 / 最忙日
├── section: 各科数量排行 (横向条形图)
├── section: 每日课程分布 (横向条形图)
└── section: 时间段分布 (上午/下午/晚上)
```

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/pages/schedule-manager/schedule-manager.ux` | 修改 | 添加"统计"按钮入口 |
| `src/pages/statistics/statistics.ux` | **新建** | 统计页面（单文件组件） |
| `src/manifest.json` | 修改 | 注册 statistics 页面路由 |

---

## 实施步骤

### 步骤 1：注册路由

**文件**: [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json)

在 `router.pages` 中添加：

```json
"pages/statistics": {
  "component": "statistics"
}
```

### 步骤 2：添加入口按钮

**文件**: [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux)

在 `back-header` 中添加"统计"按钮：

```diff
  <div class="back-header">
    <input class="back-btn" type="button" value="◀" onclick="goBack" />
    <text class="header-title">课程表管理</text>
+   <input class="stats-btn" type="button" value="统计" onclick="openStatistics" />
  </div>
```

添加 `openStatistics` 方法：

```js
openStatistics() {
  router.push({ uri: "/pages/statistics" })
}
```

### 步骤 3：创建统计页面

**文件**: [statistics.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/statistics/statistics.ux)（新建）

> **注意**：本项目使用单文件 `.ux` 组件（template + script + style 合并在一个文件中），而非分离的 `.js` + `.css` 文件。

#### 模板

```html
<template>
  <div class="stats-page" style="background-color: {{ theme.bg }}">
    <div class="header">
      <input class="back-btn" type="button" value="◀" onclick="goBack"
             style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
      <text class="header-title" style="color: {{ theme.text }}">课程统计</text>
    </div>

    <scroll class="stats-scroll" scroll-y="{{true}}">
      <!-- 总览卡片 -->
      <div class="overview" style="background-color: {{ theme.card }}">
        <div class="overview-row">
          <div class="overview-item">
            <text class="overview-number" style="color: {{ theme.accent }}">{{ totalCourses }}</text>
            <text class="overview-label" style="color: {{ theme.textMuted }}">总课程</text>
          </div>
          <div class="overview-item">
            <text class="overview-number" style="color: {{ theme.accent }}">{{ weeklyCourses }}</text>
            <text class="overview-label" style="color: {{ theme.textMuted }}">本周</text>
          </div>
          <div class="overview-item">
            <text class="overview-number" style="color: {{ theme.accent }}">{{ busiestDay }}</text>
            <text class="overview-label" style="color: {{ theme.textMuted }}">最忙日</text>
          </div>
        </div>
      </div>

      <!-- 各科数量排行 -->
      <div class="section" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">各科数量排行</text>
        <div for="{{ subjectRank }}" class="rank-item">
          <text class="rank-name" style="color: {{ theme.text }}">{{ $item.name }}</text>
          <div class="rank-bar-wrap">
            <div class="rank-bar" style="width: {{ $item.percent }}%; background-color: {{ theme.accent }}; opacity: 0.8;"></div>
          </div>
          <text class="rank-count" style="color: {{ theme.textMuted }}">{{ $item.count }}</text>
        </div>
        <text if="{{ subjectRank.length === 0 }}" class="empty-text" style="color: {{ theme.textMuted }}">暂无课程数据</text>
      </div>

      <!-- 每日课程分布 -->
      <div class="section" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">每日课程分布</text>
        <div for="{{ dayDistribution }}" class="rank-item">
          <text class="rank-name" style="color: {{ theme.text }}">{{ $item.day }}</text>
          <div class="rank-bar-wrap">
            <div class="rank-bar" style="width: {{ $item.percent }}%; background-color: {{ $item.percent > 0 ? theme.accent : 'transparent' }}; opacity: 0.6;"></div>
          </div>
          <text class="rank-count" style="color: {{ theme.textMuted }}">{{ $item.count }}</text>
        </div>
      </div>

      <!-- 时间段分布 -->
      <div class="section" style="background-color: {{ theme.card }}">
        <text class="section-title" style="color: {{ theme.accent }}">时间段分布</text>
        <div for="{{ timeDistribution }}" class="rank-item">
          <text class="rank-name" style="color: {{ theme.text }}">{{ $item.label }}</text>
          <div class="rank-bar-wrap">
            <div class="rank-bar" style="width: {{ $item.percent }}%; background-color: {{ theme.accent }}; opacity: 0.5;"></div>
          </div>
          <text class="rank-count" style="color: {{ theme.textMuted }}">{{ $item.count }}</text>
        </div>
      </div>
    </scroll>
  </div>
</template>
```

#### 脚本

```js
import router from "@system.router"
const store = require("../../data/store.js")
const database = require("../../data/database.js")

var dayNames = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]

export default {
  private: {
    theme: {},
    totalCourses: 0,
    weeklyCourses: 0,
    busiestDay: "-",
    subjectRank: [],
    dayDistribution: [],
    timeDistribution: []
  },

  onInit() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })
    this.loadStatistics()
  },

  onShow() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })
    this.loadStatistics()
  },

  loadStatistics() {
    var self = this
    database.getAllCourses(function(schedule) {
      var allCourses = []
      var dayMap = {}
      var subjectMap = {}

      for (var d = 0; d < schedule.length; d++) {
        var dayData = schedule[d]
        var day = dayData.day
        var classes = dayData.classes || []

        dayMap[day] = (dayMap[day] || 0) + classes.length

        for (var c = 0; c < classes.length; c++) {
          var course = classes[c]
          allCourses.push(course)
          var name = course.name || "未命名"
          subjectMap[name] = (subjectMap[name] || 0) + 1
        }
      }

      self.totalCourses = allCourses.length

      var weekCount = 0
      for (var d = 0; d < 5; d++) {
        weekCount += dayMap[dayNames[d]] || 0
      }
      self.weeklyCourses = weekCount

      var maxDay = "-"
      var maxCount = 0
      for (var d = 0; d < dayNames.length; d++) {
        var count = dayMap[dayNames[d]] || 0
        if (count > maxCount) {
          maxCount = count
          maxDay = dayNames[d] + " (" + count + "节)"
        }
      }
      self.busiestDay = maxDay

      var subjectList = []
      for (var key in subjectMap) {
        if (subjectMap.hasOwnProperty(key)) {
          subjectList.push({ name: key, count: subjectMap[key] })
        }
      }
      subjectList.sort(function(a, b) { return b.count - a.count })
      if (subjectList.length > 8) {
        subjectList = subjectList.slice(0, 8)
      }
      var maxSubjectCount = subjectList.length > 0 ? subjectList[0].count : 1
      for (var i = 0; i < subjectList.length; i++) {
        subjectList[i].percent = Math.round((subjectList[i].count / maxSubjectCount) * 100)
      }
      self.subjectRank = subjectList

      var dayList = []
      var maxDayCount = 1
      for (var d = 0; d < dayNames.length; d++) {
        var count = dayMap[dayNames[d]] || 0
        dayList.push({ day: dayNames[d], count: count })
        if (count > maxDayCount) maxDayCount = count
      }
      for (var i = 0; i < dayList.length; i++) {
        dayList[i].percent = Math.round((dayList[i].count / maxDayCount) * 100)
      }
      self.dayDistribution = dayList

      var timeMap = { morning: 0, afternoon: 0, evening: 0 }
      for (var c = 0; c < allCourses.length; c++) {
        var time = allCourses[c].time
        if (!time) continue
        var parts = time.split("-")
        if (parts.length < 2) continue
        var startStr = parts[0].trim()
        var hour = parseInt(startStr.split(":")[0]) || 0
        if (hour < 12) {
          timeMap.morning++
        } else if (hour < 18) {
          timeMap.afternoon++
        } else {
          timeMap.evening++
        }
      }

      var timeList = [
        { label: "上午", key: "morning", count: timeMap.morning },
        { label: "下午", key: "afternoon", count: timeMap.afternoon },
        { label: "晚上", key: "evening", count: timeMap.evening }
      ]
      var maxTimeCount = 1
      for (var i = 0; i < timeList.length; i++) {
        if (timeList[i].count > maxTimeCount) maxTimeCount = timeList[i].count
      }
      for (var i = 0; i < timeList.length; i++) {
        timeList[i].percent = Math.round((timeList[i].count / maxTimeCount) * 100)
      }
      self.timeDistribution = timeList
    })
  },

  goBack() {
    router.back()
  }
}
```

#### 样式

```css
.stats-page {
  flex-direction: column;
  padding: 8px 12px;
  height: 100%;
}

.header {
  flex-direction: row;
  align-items: center;
  height: 36px;
  margin-bottom: 8px;
}

.back-btn {
  width: 32px;
  height: 28px;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  margin-left: 8px;
}

.stats-scroll {
  flex: 1;
  flex-direction: column;
}

.overview {
  flex-direction: row;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}

.overview-row {
  flex-direction: row;
  justify-content: space-around;
  width: 100%;
}

.overview-item {
  flex-direction: column;
  align-items: center;
}

.overview-number {
  font-size: 24px;
  font-weight: bold;
}

.overview-label {
  font-size: 12px;
  margin-top: 2px;
}

.section {
  flex-direction: column;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 6px;
}

.rank-item {
  flex-direction: row;
  align-items: center;
  padding: 6px 0;
}

.rank-name {
  font-size: 13px;
  width: 60px;
}

.rank-bar-wrap {
  flex: 1;
  height: 14px;
  background-color: rgba(255, 255, 255, 0.06);
  border-radius: 7px;
  margin: 0 8px;
}

.rank-bar {
  height: 100%;
  border-radius: 7px;
}

.rank-count {
  font-size: 12px;
  width: 24px;
  text-align: right;
}

.empty-text {
  font-size: 13px;
  text-align: center;
  padding: 12px 0;
}
```

---

## 数据流

```
database.getAllCourses(callback)
  │
  ▼
schedule = [
  { day: "星期一", classes: [{ name: "数学", time: "08:00-09:30", ... }, ...] },
  { day: "星期二", classes: [...] },
  ...
]
  │
  ├── 遍历 → dayMap: { "星期一": 6, "星期二": 4, ... }
  │         → 每日课程分布
  │         → 最忙日
  │         → 本周课程（周一~周五之和）
  │
  ├── 遍历 → subjectMap: { "数学": 6, "英语": 5, ... }
  │         → 各科排行（取前8）
  │
  └── 遍历 → timeMap: { morning: 12, afternoon: 10, evening: 4 }
            → 时间段分布
```

---

## 注意事项

| 项 | 说明 |
|------|------|
| **文件格式** | 本项目使用单文件 `.ux` 组件，template/script/style 合并在一个文件中，不要分离为 `.js` + `.css` |
| **Emoji** | 手表上 Emoji 可能无法渲染，页面标题和区块标题去掉 Emoji，使用纯文字 |
| **CSS transition** | QuickApp 可能不支持 `transition` 属性，去掉 `transition: width 0.5s ease` |
| **overflow: hidden** | QuickApp 可能不支持，`.rank-bar-wrap` 去掉 `overflow: hidden`，改用 `border-radius` 裁剪 |
| **hasOwnProperty** | QuickApp 的 for...in 循环中建议加 `hasOwnProperty` 检查，避免原型链属性干扰 |
| **滚动** | 统计内容可能超过一屏，需用 `<scroll>` 包裹 |
| **数据来源** | 复用现有 `database.getAllCourses()` API，无需新增数据层 |

---

## 统计维度

| 维度 | 说明 | 展示方式 |
|------|------|---------|
| 总课程数 | 所有天、所有课程总数 | 数字卡片 |
| 本周课程 | 周一至周五课程数之和 | 数字卡片 |
| 最忙日 | 课程数量最多的一天 + 节数 | 文字卡片 |
| 各科数量排行 | 按课程名分组统计，取前 8 | 横向条形图 |
| 每日课程分布 | 一周 7 天每天课程数 | 横向条形图 |
| 时间段分布 | 上午(<12) / 下午(12-18) / 晚上(≥18) | 横向条形图 |

---

## 开发量预估

| 维度 | 评估 |
|------|------|
| 新建文件 | 1 个 (`statistics.ux`) |
| 修改文件 | 2 个 (`schedule-manager.ux`, `manifest.json`) |
| 代码量 | 约 180 行 |
| 实现难度 | ⭐⭐☆☆☆ |
| 第三方依赖 | 无（纯 CSS 条形图） |