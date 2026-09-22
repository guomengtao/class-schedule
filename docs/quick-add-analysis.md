# 快速添加课程区域失效分析与重构

## 问题分析

### 当前实现

```html
<div class="quick-add-buttons">
  <input type="button" value="数学" onclick="quickAddMath" />
  <input type="button" value="英语" onclick="quickAddEnglish" />
  <input type="button" value="科学" onclick="quickAddScience" />
</div>
```

```javascript
quickAddMath()   { this.makeCourse("数学", "08:00 - 08:45", "王老师", "301教室") }
quickAddEnglish(){ this.makeCourse("英语", "08:55 - 09:40", "李老师", "205教室") }
quickAddScience(){ this.makeCourse("科学", "10:00 - 10:45", "吴老师", "实验室B") }
```

### 失效原因

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| 只有 3 个硬编码课程 | 🔴 P0 | 用户可能添加了更多课程（如语文、物理、历史），但快速添加只显示 3 个 |
| 时间硬编码 | 🔴 P0 | 时间是写死的（08:00、08:55、10:00），与当天实际课程表冲突 |
| 教师/教室固定 | 🟡 P1 | 每次添加都是同样的教师和教室，不灵活 |
| 重复添加 | 🟡 P1 | 同一堂课可能被多次添加入同一时段 |
| 无时间冲突检测 | 🟡 P1 | 不会检查是否与已有课程时间重叠 |

**核心问题**：快速添加区域完全脱离实际课程表，只提供 3 个固定选项，无法覆盖用户实际需求。

## 重构方案

### 需求

1. 显示所有已添加过的课程名称（从 schedule 中提取去重）
2. 默认每节课时长：45 分钟
3. 默认开始时间：当天最后一节课结束时间 + 10 分钟休息
4. 如果当天无课程，默认 08:00 开始

### 时间计算逻辑

```
当天最后一节课: 16:30 - 17:15
                 ↓
默认开始时间: 17:15 + 10分钟 = 17:25
默认结束时间: 17:25 + 45分钟 = 18:10
显示: "17:25 - 18:10"
```

### 模板

```html
<div class="quick-add" if="{{ quickCourseNames.length > 0 }}">
  <text class="quick-add-title">快速添加</text>
  <div class="quick-add-list">
    <div for="{{ quickCourseNames }}" class="quick-add-item" onclick="quickAddCourse($item)">
      <text class="quick-add-name">{{ $item }}</text>
      <text class="quick-add-time">{{ quickAddTime }}</text>
    </div>
  </div>
</div>
```

### 方法

| 方法 | 作用 |
|------|------|
| `getAllCourseNames()` | 从 schedule 中提取所有不重复的课程名 |
| `calcNextTimeSlot()` | 计算当天最后一节课后 + 10 分钟的时间 |
| `quickAddCourse(name)` | 用计算出的时间添加课程 |
| `refreshQuickAdd()` | 刷新课程名列表和时间 |
| `formatTime(minutes)` | 分钟数转 "HH:MM" 格式 |

## 实现细节

### 修改文件

**src/pages/index/index.ux**

### 模板变更

```html
<!-- 修复前：3 个硬编码按钮 -->
<div class="quick-add-buttons">
  <input type="button" value="数学" onclick="quickAddMath" />
  <input type="button" value="英语" onclick="quickAddEnglish" />
  <input type="button" value="科学" onclick="quickAddScience" />
</div>

<!-- 修复后：动态课程名列表 + 自动计算时间 -->
<div class="quick-add-list" if="{{ quickCourseNames.length > 0 }}">
  <div for="{{ quickCourseNames }}" class="quick-add-item" onclick="quickAddCourse($item)">
    <text class="quick-add-name">{{ $item }}</text>
    <text class="quick-add-time">{{ quickAddTime }}</text>
  </div>
</div>
<text class="quick-add-empty" if="{{ quickCourseNames.length === 0 }}">暂无已添加课程</text>
```

### 新增方法

```javascript
// 收集所有不重复的课程名
getAllCourseNames() {
  var seen = {}
  var names = []
  for (var i = 0; i < this.schedule.length; i++) {
    var classes = this.schedule[i].classes
    for (var j = 0; j < classes.length; j++) {
      var name = classes[j].name
      if (name && !seen[name]) {
        seen[name] = true
        names.push(name)
      }
    }
  }
  return names
}

// 计算下一个可用时间槽
calcNextTimeSlot() {
  var lastEndMin = 0
  // 找到当天最后一节课的结束时间
  for (var i = 0; i < this.currentClasses.length; i++) {
    var parts = this.currentClasses[i].time.split("-")
    if (parts.length < 2) continue
    var endMin = parseTime(parts[1].trim())
    if (endMin > lastEndMin) lastEndMin = endMin
  }
  // 开始时间 = 最后一节课结束 + 10分钟
  var startMin = lastEndMin > 0 ? lastEndMin + 10 : 8 * 60
  // 如果已过时间，从现在+5分钟开始
  if (startMin < nowMinutes) startMin = nowMinutes + 5
  // 结束时间 = 开始 + 45分钟
  var endMin = startMin + 45
  return formatTime(startMin) + " - " + formatTime(endMin)
}
```

### 触发时机

`refreshQuickAdd()` 在 `loadDayClasses()` 结尾调用，确保每次课程变更后列表和时间自动更新。

## 第三轮迭代

### 1. 顶部"今""明"按钮

```html
<div class="day-nav-btns">
  <div class="day-nav-circle" onclick="goToToday">今</div>
  <div class="day-nav-circle" onclick="goToTomorrow">明</div>
</div>
```

点击跳转到今天/明天，已在当天则忽略。

### 2. 状态栏仅当天显示

```html
<div class="status-bar" if="{{ isToday }}">
```

`isToday` 在 `loadDayClasses()` 中计算：
```javascript
this.isToday = (this.currentDayIndex === getRealTodayIndex())
```

### 3. 快速添加折叠

默认收起，点击"快速添加"展开课程列表：
```html
<text onclick="toggleQuickAdd">快速添加 {{ quickAddExpanded ? '▲' : '▼' }}</text>
```

### 4. 课程来源改为课程管理

从 `course_preset_list` 存储读取（与 course-manager 页面共享同一份数据）：

```javascript
loadPresetCourses() {
  storage.get({ key: "course_preset_list" }, success: function(data) {
    self.presetCourses = JSON.parse(data)
    self.quickCourseNames = presetCourses.map(c => c.name)
  })
}
```

### 5. 快速添加带教师/教室

```javascript
quickAddCourse(name) {
  var c = presetCourses.find(p => p.name === name)
  this.makeCourse(name, this.quickAddTime, c.teacher, c.location)
}
```