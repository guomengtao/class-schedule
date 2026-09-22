# 添加课程时间设置步骤恢复为旧方案 — 根因分析

## 现象

添加课程页面第2步（时间设置）使用了上下箭头（▲/▼）的时间选择器，而应该使用 demo-reminder 页面中"方式2"的 +/- 步进式按钮。

## 数据对比

### 当前 add-course.ux 第2步（箭头方式）

```
开始时间
  ▲           ▲
  08     :    00
  ▼           ▼
结束时间
  ▲           ▲
  08     :    45
  ▼           ▼
```

### demo-reminder 方式2（步进方式，期望的效果）

```
小时  [-]  8  [+]
分钟  [-]  30  [+]
```

### 直观对比

| 特性 | 箭头方式（当前） | 步进方式（期望） |
|------|:--:|:--:|
| 按钮数量 | 8个（4列×2箭头） | 4个（2行×2按钮） |
| 布局复杂度 | 4列垂直排列 | 2行水平排列 |
| 小时调整 | 每次 +1/-1 | 每次 +1/-1 |
| 分钟调整 | 每次 +5/-5 | 每次 +1/-1 |
| 视觉风格 | 模拟时钟数字滚轮 | 简洁的 +/- 步进 |
| 空间占用 | 高（垂直堆叠） | 矮（水平排列） |

**问题**：箭头方式每列有3个元素（▲、数字、▼），4列（开始小时、开始分钟、结束小时、结束分钟），共12个元素，8个按钮。布局复杂，占用空间大，且与 demo-reminder 方式2的设计风格不一致。

## 根因

v1.1.0 提交（`77f3211`）在引入时间选择器时，错误地使用了箭头方式而非步进方式。

### 证据

```bash
$ git log --oneline -- src/pages/add-course/add-course.ux
77f3211 v1.1.0 - 中文输入法集成、课程管理优化、提醒测试页面  ← 在这次提交中引入
d7daae7 v1.0.0 - Initial commit
```

v1.0.0 版本**没有时间选择器**，直接使用预设课程的时间。v1.1.0 添加了时间选择功能，但选错了交互方式：

```diff
# v1.1.0 新增的时间选择器代码
+  startHourUp() {
+    this.startHour = (this.startHour + 1) % 24
+    this.updateTimeString()
+  },
+  startHourDown() {
+    this.startHour = (this.startHour - 1 + 24) % 24
+    this.updateTimeString()
+  },
+  startMinUp() {
+    this.startMin = (this.startMin + 5) % 60      ← 分钟步进5分钟
+    this.updateTimeString()
+  },
```

## 修复方案

将第2步时间选择器从箭头方式改为步进方式，参考 [demo-reminder.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/demo-reminder/demo-reminder.ux) 方式2。

### 模板变更

**修复前**（箭头方式）：
```html
<div class="form-section" if="{{ step === 2 }}">
  <text class="step-title">第2步: 时间</text>
  <text class="step-hint">课程: {{ courseName }}</text>

  <text class="picker-label">开始时间</text>
  <div class="time-picker">
    <div class="picker-column">
      <input type="button" value="▲" onclick="startHourUp" />
      <text>{{ padZero(startHour) }}</text>
      <input type="button" value="▼" onclick="startHourDown" />
    </div>
    <text>:</text>
    <div class="picker-column">
      <input type="button" value="▲" onclick="startMinUp" />
      <text>{{ padZero(startMin) }}</text>
      <input type="button" value="▼" onclick="startMinDown" />
    </div>
  </div>

  <text class="picker-label">结束时间</text>
  <div class="time-picker">
    <!-- 同上，endHour/endMin -->
  </div>
</div>
```

**修复后**（步进方式）：
```html
<div class="form-section" if="{{ step === 2 }}">
  <text class="step-title">第2步: 时间</text>
  <text class="step-hint">课程: {{ courseName }}</text>

  <text class="picker-label">开始时间</text>
  <div class="stepper-time">
    <text class="stepper-value">{{ padZero(startHour) }}:{{ padZero(startMin) }}</text>
    <div class="stepper-row">
      <text class="stepper-label">小时</text>
      <input type="button" value="-" onclick="decreaseStartHour" />
      <text class="stepper-num">{{ startHour }}</text>
      <input type="button" value="+" onclick="increaseStartHour" />
    </div>
    <div class="stepper-row">
      <text class="stepper-label">分钟</text>
      <input type="button" value="-" onclick="decreaseStartMin" />
      <text class="stepper-num">{{ startMin }}</text>
      <input type="button" value="+" onclick="increaseStartMin" />
    </div>
  </div>

  <text class="picker-label">结束时间</text>
  <div class="stepper-time">
    <text class="stepper-value">{{ padZero(endHour) }}:{{ padZero(endMin) }}</text>
    <div class="stepper-row">
      <text class="stepper-label">小时</text>
      <input type="button" value="-" onclick="decreaseEndHour" />
      <text class="stepper-num">{{ endHour }}</text>
      <input type="button" value="+" onclick="increaseEndHour" />
    </div>
    <div class="stepper-row">
      <text class="stepper-label">分钟</text>
      <input type="button" value="-" onclick="decreaseEndMin" />
      <text class="stepper-num">{{ endMin }}</text>
      <input type="button" value="+" onclick="increaseEndMin" />
    </div>
  </div>
</div>
```

### 脚本变更

将 8 个箭头方法替换为 8 个步进方法：

| 删除（箭头） | 新增（步进） |
|------|------|
| `startHourUp()` | `increaseStartHour()` |
| `startHourDown()` | `decreaseStartHour()` |
| `startMinUp()` (+5) | `increaseStartMin()` (+1) |
| `startMinDown()` (-5) | `decreaseStartMin()` (-1) |
| `endHourUp()` | `increaseEndHour()` |
| `endHourDown()` | `decreaseEndHour()` |
| `endMinUp()` (+5) | `increaseEndMin()` (+1) |
| `endMinDown()` (-5) | `decreaseEndMin()` (-1) |

### 样式变更

删除垂直箭头样式，新增水平步进样式。