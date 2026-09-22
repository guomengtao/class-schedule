# 课程表二维码导出功能 — 开发方案

## 需求描述

在课程表管理页面中，每个课程表增加一个"二维码"按钮。点击后，弹出一个弹窗，显示该课程表的二维码。用户用手机扫描二维码后，得到该课程表的结构化文字信息（课程名称、时间、老师、地点、备注）。

---

## 交互流程

```
schedule-manager（课程表管理）
  │
  ├── 每个课程表右侧新增: "二维码" 按钮
  │     │
  │     └── 点击 → 弹出 Popup/Menu
  │           │
  │           ├── 将课程表数据格式化为结构化文本
  │           ├── 通过 <qrcode> 组件生成二维码
  │           └── 用户扫描 → 手机显示完整课程表文字
```

---

## 涉及文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/pages/schedule-manager/schedule-manager.ux` | 修改 | 新增"二维码"按钮 + 二维码弹窗 |
| `src/data/database.js` | 不改 | 复用已有 `getAllCoursesWithIndex(index, callback)` 接口 |

---

## 实现方案

### 1. 课程表文字格式化

将 `getAllCoursesWithIndex` 返回的数据结构：

```javascript
[
  { day: "星期一", classes: [
    { id: "1", name: "英语", time: "08:00 - 08:45", teacher: "李老师", location: "205教室", notes: "阅读理解" },
    ...
  ]},
  ...
]
```

格式化为清晰的文字结构，例如：

```
===== 课程表1 =====

星期一
  08:00 - 08:45  英语  李老师  205教室
  08:55 - 09:40  语文  周老师  205教室
  10:00 - 10:45  物理  吴老师  实验室B
  10:55 - 11:40  化学  郑老师  实验室A

星期二
  08:00 - 08:45  语文  周老师  205教室
  08:55 - 09:40  数学  王老师  301教室
  10:00 - 10:45  历史  刘老师  102教室
  10:55 - 11:40  物理  吴老师  实验室B

...
```

### 2. 二维码生成

使用官方 `<qrcode>` 组件，将格式化后的文字作为 value 传入：

```html
<qrcode value="{{ qrText }}" 
  style="color: #000000; background-color: #ffffff; width: 200px; height: 200px;">
</qrcode>
```

### 3. Popup 弹窗设计

在 schedule-manager 页面底部新增一个 qr-popup 区块：

```html
<div class="qr-popup" show="{{ showQrPopup }}" style="background-color: {{ theme.bg }}">
  <div class="qr-popup-mask" onclick="closeQrPopup"></div>
  <div class="qr-popup-content" style="background-color: {{ theme.card }}">
    <text class="qr-popup-title" style="color: {{ theme.text }}">{{ qrScheduleName }} 的二维码</text>

    <div class="qr-code-wrapper" style="background-color: #ffffff">
      <qrcode value="{{ qrText }}" style="color: #000000; background-color: #ffffff; width: 200px; height: 200px;"></qrcode>
    </div>

    <text class="qr-popup-hint" style="color: {{ theme.textSecondary }}">用手机扫描二维码查看完整课程表</text>

    <input class="qr-close-btn" type="button" value="关闭" onclick="closeQrPopup" 
      style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
  </div>
</div>
```

### 4. 数据流

```
用户点击"二维码"按钮
  │
  ├── openQrPopup(index)
  │     ├── 设置 qrScheduleName = scheduleList[index].name
  │     ├── database.getAllCoursesWithIndex(index, callback)
  │     │       │
  │     │       └── formatScheduleText(name, scheduleData) → 格式化文本
  │     │             │
  │     │             └── 设置 qrText = 格式化后的文本
  │     │
  │     └── 设置 showQrPopup = true
  │
  └── <qrcode value="{{ qrText }}"> 自动渲染二维码
```

### 5. 格式化函数

```javascript
formatScheduleText(name, scheduleData) {
  var lines = []
  lines.push("===== " + name + " =====")
  lines.push("")

  var dayOrder = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"]

  for (var di = 0; di < dayOrder.length; di++) {
    var dayName = dayOrder[di]
    var dayData = null
    for (var s = 0; s < scheduleData.length; s++) {
      if (scheduleData[s].day === dayName) {
        dayData = scheduleData[s]
        break
      }
    }
    if (!dayData || !dayData.classes || dayData.classes.length === 0) {
      continue
    }

    lines.push(dayName)
    var classes = dayData.classes
    classes.sort(function(a, b) {
      var ta = a.time ? a.time.split(' - ')[0] : '00:00'
      var tb = b.time ? b.time.split(' - ')[0] : '00:00'
      return ta.localeCompare(tb)
    })

    for (var c = 0; c < classes.length; c++) {
      var course = classes[c]
      var line = "  " + (course.time || "") + "  " + (course.name || "")
      if (course.teacher) line = line + "  " + course.teacher
      if (course.location) line = line + "  " + course.location
      if (course.notes) line = line + "  [" + course.notes + "]"
      lines.push(line)
    }
    lines.push("")
  }

  return lines.join("\n")
}
```

### 6. 样式

```css
.qr-popup {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.qr-popup-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
}

.qr-popup-content {
  position: relative;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 16px;
  width: 260px;
}

.qr-popup-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
}

.qr-code-wrapper {
  padding: 12px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
}

.qr-popup-hint {
  font-size: 13px;
  margin-top: 12px;
  text-align: center;
}

.qr-close-btn {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  margin-top: 16px;
}
```

---

## 需要修改的代码

### schedule-manager.ux 模板

在 `item-right` 区域新增"二维码"链接：

```html
<div class="item-right">
  <text class="link" onclick="startRename($idx)" style="color: {{ theme.accent }}">重命名</text>
  <text class="link" onclick="copySchedule($idx)" style="color: {{ theme.accent }}">复制</text>
  <text class="link" onclick="openQrPopup($idx)" style="color: {{ theme.accent }}">二维码</text>  <!-- 新增 -->
  <text class="link" onclick="openWeekView($idx)" style="color: {{ theme.accent }}">总览</text>
  <text class="link" onclick="openScheduleStats($idx)" style="color: {{ theme.accent }}">统计</text>
  <text class="link delete-link" if="{{ scheduleList.length > 1 }}" onclick="deleteSchedule($idx)" style="color: {{ theme.deleteText }}">删除</text>
</div>
```

### schedule-manager.ux private 数据

```javascript
private: {
  scheduleList: [],
  currentIndex: 0,
  editingIndex: -1,
  editName: "",
  theme: {},
  showQrPopup: false,    // 新增
  qrText: "",            // 新增
  qrScheduleName: ""     // 新增
}
```

### schedule-manager.ux 方法

```javascript
openQrPopup(index) {
  var self = this
  var name = this.scheduleList[index].name
  this.qrScheduleName = name

  database.getAllCoursesWithIndex(index, function(data) {
    var text = self.formatScheduleText(name, data)
    self.qrText = text
    self.showQrPopup = true
  })
},

closeQrPopup() {
  this.showQrPopup = false
  this.qrText = ""
  this.qrScheduleName = ""
}
```

---

## 扫码后的效果

用户用手机扫描二维码后，会得到如下格式的文字：

```
===== 课程表1 =====

星期一
  08:00 - 08:45  英语  李老师  205教室  [阅读理解]
  08:55 - 09:40  语文  周老师  205教室  [作文写作]
  10:00 - 10:45  物理  吴老师  实验室B  [力学]
  10:55 - 11:40  化学  郑老师  实验室A  [化学键]

星期二
  08:00 - 08:45  语文  周老师  205教室  [语法练习]
  08:55 - 09:40  数学  王老师  301教室  [第二章：几何]
  ...
```

---

## 开发量预估

| 任务 | 行数 | 难度 |
|------|:---:|:---:|
| 格式化函数 `formatScheduleText` | ~30 行 | 简单 |
| Popup 弹窗模板 + 样式 | ~50 行 | 简单 |
| `openQrPopup` / `closeQrPopup` 方法 | ~20 行 | 简单 |
| 私有数据新增 3 个字段 | 3 行 | 简单 |
| `item-right` 新增"二维码"链接 | 1 行 | 简单 |
| **总计** | **~104 行** | **简单** |

---

## 注意事项

1. 二维码内容越长，二维码越密（版本越高）。一个典型课程表 5 天 × 4 节课 = 约 300-500 字符，版本 10-15 左右，手环屏幕 200px 足够清晰显示。
2. 如果内容超过 500 字符，建议精简 notes 字段或省略空字段。
3. `<qrcode>` 组件由 Xiaomi Vela JS 框架底层实现，保证二维码符合 ISO 标准，可被任何手机扫码应用识别。
4. 不使用自研库，不引入第三方依赖，与 `qrcode-generator` 页面保持一致的实现方式。