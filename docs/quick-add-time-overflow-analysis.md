# 快速添加课程时间溢出分析报告

## 问题描述

快速添加课程时，如果当天最后一节课结束时间很晚（如 23:59），计算出的下一节课时间会跨过午夜，出现 `24:00`、`25:00` 等不合法的显示时间。

## 涉及代码

| 文件 | 函数 | 说明 |
|------|------|------|
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L589-L613) | `calcNextTimeSlot()` | 计算快速添加的默认时间段 |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L615-L619) | `formatTime()` | 分钟数转 "HH:MM" 格式 |

---

## 根因分析

### 当前逻辑

```javascript
calcNextTimeSlot() {
  var now = new Date()
  var nowMinutes = now.getHours() * 60 + now.getMinutes()
  var dayClasses = this.currentClasses
  var lastEndMin = 0

  // 1. 找当天最后一节课的结束时间
  for (var i = 0; i < dayClasses.length; i++) {
    var parts = dayClasses[i].time.split("-")
    if (parts.length < 2) continue
    var endMin = parseTime(parts[1].trim())
    if (endMin > lastEndMin) {
      lastEndMin = endMin
    }
  }

  // 2. 计算开始时间：最后一节课结束 + 10 分钟休息
  var startMin
  if (lastEndMin > 0) {
    startMin = lastEndMin + 10
  } else {
    startMin = 8 * 60           // 无课时默认 08:00
  }

  // 3. 如果开始时间早于当前时间，用当前时间 + 5 分钟
  if (startMin < nowMinutes) {
    startMin = nowMinutes + 5
  }

  // 4. 结束时间 = 开始时间 + 45 分钟（默认课时）
  var endMin = startMin + 45
  return this.formatTime(startMin) + " - " + this.formatTime(endMin)
}

formatTime(minutes) {
  var h = Math.floor(minutes / 60)
  var m = minutes % 60
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m
}
```

### 溢出场景推演

| 最后一节课结束 | startMin | endMin | 显示结果 | 问题 |
|:--|:--|:--|:--|:--|
| 17:40 (1060) | 1070 | 1115 | 17:50 - 18:35 | ✅ 正常 |
| 22:00 (1320) | 1330 | 1375 | 22:10 - 22:55 | ✅ 正常 |
| 23:30 (1410) | 1420 | 1465 | 23:40 - 24:25 | ❌ 跨午夜 |
| 23:59 (1439) | 1449 | 1494 | 24:09 - 24:54 | ❌ 严重溢出 |
| 无课 + 当前 23:30 | 1415 | 1460 | 23:35 - 24:20 | ❌ 跨午夜 |

### 根本原因

`calcNextTimeSlot` 和 `formatTime` 都**没有做午夜边界检查**：

1. `calcNextTimeSlot` 计算 `startMin` 时没有上限，`lastEndMin + 10` 可能超过 1440（24:00）
2. `formatTime` 直接 `Math.floor(minutes / 60)`，对 1440+ 分钟会输出 `24`、`25` 等小时数
3. 没有判断 "当天是否已经排满"，无法给用户提示

---

## 优化方案

### 方案 A：午夜截断 + 提示（推荐）

当天最后一节课结束时间超过 23:05（即 `lastEndMin >= 1385`，加上 10 分钟休息 + 45 分钟课时 = 1440 刚好到 24:00）时，不再计算时间，直接提示用户当天已排满。

```javascript
calcNextTimeSlot() {
  var now = new Date()
  var nowMinutes = now.getHours() * 60 + now.getMinutes()
  var dayClasses = this.currentClasses
  var lastEndMin = 0

  for (var i = 0; i < dayClasses.length; i++) {
    var parts = dayClasses[i].time.split("-")
    if (parts.length < 2) continue
    var endMin = parseTime(parts[1].trim())
    if (endMin > lastEndMin) {
      lastEndMin = endMin
    }
  }

  var startMin
  if (lastEndMin > 0) {
    startMin = lastEndMin + 10
  } else {
    startMin = 8 * 60
  }

  if (startMin < nowMinutes) {
    startMin = nowMinutes + 5
  }

  var DAY_END = 24 * 60   // 1440

  // 如果开始时间已经超过当天 24:00，提示已排满
  if (startMin >= DAY_END) {
    this.quickAddTime = ""
    this.quickAddDisabled = true
    return "今天课程已排满"
  }

  var endMin = startMin + 45

  // 如果结束时间超过 24:00，截断到 24:00
  if (endMin > DAY_END) {
    endMin = DAY_END
  }

  this.quickAddDisabled = false
  return this.formatTime(startMin) + " - " + this.formatTime(endMin)
}
```

**优点**：简单直接，不会产生非法时间，用户能明确知道当天已排满。

### 方案 B：午夜截断（静默处理）

不提示，直接截断，让结束时间最多到 24:00。

```javascript
var DAY_END = 24 * 60

if (startMin >= DAY_END) {
  startMin = DAY_END - 45   // 23:15，最后一节可排的课
}

var endMin = startMin + 45
if (endMin > DAY_END) {
  endMin = DAY_END
}
```

**优点**：用户无感知，不会看到非法时间。
**缺点**：用户可能不知道当天已排满，仍然点击添加但时间段很尴尬。

### 方案 C：跨天滚动到次日

当天排满后，自动滚动到第二天，时间从 08:00 开始。

```javascript
if (startMin >= DAY_END) {
  startMin = 8 * 60          // 次日 08:00
  this.nextDay()             // 自动切换到第二天
}
```

**优点**：体验流畅，用户连续添加课程不中断。
**缺点**：实现复杂，需要联动 `nextDay` 和课程数据刷新。

---

## 推荐方案

**方案 A**，理由：
1. 手环屏幕小，用户需要明确知道当天是否排满
2. 实现简单，改动最小
3. 提示文案清晰，符合用户预期

### 模板改动

在快速添加区域增加一个禁用提示：

```html
<text class="quick-add-empty" if="{{ quickAddExpanded && quickAddDisabled }}" 
      style="font-size: 20px; color: {{ theme.textMuted }}">
  今天课程已排满，无法再添加
</text>
```

---

## 总结

| 问题 | 根因 | 修复 |
|------|------|------|
| 显示 `24:00`、`25:00` 等非法时间 | `calcNextTimeSlot` 和 `formatTime` 无午夜边界检查 | 添加 `DAY_END = 1440` 上限判断 |
| 当天排满后用户不知道 | 没有"已排满"状态提示 | 设置 `quickAddDisabled` 标志 + 提示文案 |