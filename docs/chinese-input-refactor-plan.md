# 中文输入法统一页面重构方案

## 问题背景

当前 6 个页面各自引用 `InputMethod` 组件，导致词库文件（`dic_words.js` 69KB + `dic_words_initials.js` 41KB = 110KB）被重复打包 6 次，每个页面 JS 文件体积膨胀至 1MB+，手环设备加载时内存不足导致系统崩溃重启。

## 核心思路

```
所有页面 → 跳转到「中文输入页面」→ 完成输入 → 携带结果返回原页面
```

只有 `chinese-input` 页面引用 `InputMethod` 组件，词库只打包**一次**，其他页面体积大幅减小。

## 涉及文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/pages/chinese-input/chinese-input.ux` | **修改** | 重构为唯一的中文输入页面，增加「返回」「确认」按钮 |
| `src/pages/add-course/add-course.ux` | 修改 | 移除 InputMethod 引用，改为跳转 chinese-input |
| `src/pages/detail/detail.ux` | 修改 | 移除 InputMethod 引用，改为跳转 chinese-input |
| `src/pages/course-manager/course-manager.ux` | 修改 | 移除 InputMethod 引用，改为跳转 chinese-input |
| `src/pages/schedule-manager/schedule-manager.ux` | 修改 | 移除 InputMethod 引用，改为跳转 chinese-input |
| `src/pages/nickname-edit/nickname-edit.ux` | 修改 | 移除 InputMethod 引用，改为跳转 chinese-input |

## 现状分析

### 各页面 InputMethod 使用场景

| 页面 | 输入目标 | 变量名 | 最大长度 | 触发方式 |
|------|----------|--------|----------|----------|
| add-course | 课程位置 | `courseLocation` | 10 | 点击位置显示区域 |
| detail | 课程位置 | `courseLocation` | 10 | 点击位置显示区域 |
| course-manager | 重命名/添加课程 | `editName` / `newCourseName` | 10 | 点击重命名/添加按钮 |
| schedule-manager | 重命名课程表 | `editName` | 10 | 点击重命名按钮 |
| nickname-edit | 编辑昵称 | `currentName` | 5 | 点击昵称显示区域 |

### 现有 chinese-input 页面已支持的参数

| storage key | 含义 | 类型 |
|-------------|------|------|
| `chinese_input_title` | 页面标题 | string |
| `chinese_input_placeholder` | 占位提示文字 | string |
| `chinese_input_value` | 默认值 | string |
| `chinese_input_maxlen` | 最大输入长度 | number |
| `chinese_input_return_key` | 返回结果存储 key | string |

---

## 实施步骤

### 步骤 1：重构 chinese-input 页面

**文件**: [chinese-input.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/chinese-input/chinese-input.ux)

#### 1.1 模板修改

将现有的「取消」「完成」按钮替换为明确的「返回」「确认」按钮，放在顶部标题栏中：

```html
<import name="input-method" src="../../components/InputMethod/InputMethod.ux"></import>

<template>
  <div class="input-page" style="background-color: {{ theme.bg }}">
    <!-- 顶部栏：返回 + 标题 + 确认 -->
    <div class="header">
      <input class="back-btn" type="button" value="&#9664; 返回" onclick="onCancel" 
             style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
      <text class="title" style="color: {{ theme.text }}">{{ title }}</text>
      <input class="confirm-btn" type="button" value="确认" onclick="onConfirm" 
             style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
    </div>

    <!-- 输入显示区域 -->
    <div class="display-area" onclick="showKeyboard" 
         style="background-color: {{ theme.card }}; border-color: {{ theme.accent }}">
      <text class="display-text" style="color: {{ theme.text }}">
        {{ inputValue || placeholder }}
      </text>
      <text class="cursor" show="{{ showCursor }}" style="color: {{ theme.accent }}">_</text>
    </div>

    <!-- 输入法组件（唯一引用处） -->
    <input-method
      hide="{{ hideKeyboard }}"
      maxlength="{{ maxlen }}"
      vibratemode="short"
      screentype="rect"
      @visibility-change="onVisibilityChange"
      @key-down="onKeyDown"
      @delete="onDelete"
      @complete="onComplete"
    ></input-method>
  </div>
</template>
```

#### 1.2 逻辑修改

```javascript
import router from "@system.router"
const store = require("../../data/store.js")

export default {
  private: {
    title: "输入",
    placeholder: "点击输入",
    inputValue: "",
    maxlen: 5,
    theme: {},
    hideKeyboard: true,
    showCursor: false,
    returnKey: "chinese_input_result"
  },

  onInit() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })
  },

  onShow() {
    var self = this
    store.getTheme(function(t) {
      self.theme = t
    })

    var storage = require("@system.storage")
    var keys = [
      "chinese_input_title",
      "chinese_input_placeholder",
      "chinese_input_value",
      "chinese_input_maxlen",
      "chinese_input_return_key"
    ]
    var count = 0
    function checkDone() {
      count++
      if (count >= keys.length) {
        // 重置输入值，确保每次进入都是新的
        self.hideKeyboard = true
        self.showCursor = false
        // 自动弹出键盘
        setTimeout(function() {
          self.showKeyboard()
        }, 300)
      }
    }
    storage.get({
      key: "chinese_input_title",
      success: function(data) { if (data) self.title = data; checkDone() },
      fail: function() { checkDone() }
    })
    storage.get({
      key: "chinese_input_placeholder",
      success: function(data) { if (data) self.placeholder = data; checkDone() },
      fail: function() { checkDone() }
    })
    storage.get({
      key: "chinese_input_value",
      success: function(data) {
        if (data !== undefined && data !== null) self.inputValue = data
        checkDone()
      },
      fail: function() { checkDone() }
    })
    storage.get({
      key: "chinese_input_maxlen",
      success: function(data) { if (data) self.maxlen = parseInt(data) || 5; checkDone() },
      fail: function() { checkDone() }
    })
    storage.get({
      key: "chinese_input_return_key",
      success: function(data) { if (data) self.returnKey = data; checkDone() },
      fail: function() { checkDone() }
    })
  },

  showKeyboard() {
    this.hideKeyboard = false
    this.showCursor = true
  },

  onVisibilityChange(evt) {
    if (evt.detail && evt.detail.visible === false) {
      this.showCursor = false
    }
  },

  onKeyDown(_evt) {
  },

  onDelete() {
    this.inputValue = this.inputValue.slice(0, -1)
  },

  onComplete(evt) {
    this.inputValue += evt.detail.content
  },

  // ===== 确认按钮 =====
  onConfirm() {
    var result = this.inputValue.trim()
    this.returnResult(result)
  },

  // ===== 返回按钮 =====
  onCancel() {
    if (!this.hideKeyboard) {
      // 键盘打开时，先关闭键盘
      this.hideKeyboard = true
      this.showCursor = false
    } else {
      // 键盘关闭时，返回空结果
      this.returnResult(null)
    }
  },

  // ===== 返回结果到调用页面 =====
  returnResult(result) {
    var storage = require("@system.storage")
    var self = this
    storage.set({
      key: this.returnKey || "chinese_input_result",
      value: result !== null ? result : "",
      success: function() {
        router.back()
      },
      fail: function() {
        router.back()
      }
    })
  },

  // ===== 物理返回键 =====
  goBack() {
    this.onCancel()
  }
}
```

#### 1.3 样式修改

```css
.input-page {
  flex-direction: column;
  padding: 8px 12px;
  height: 100%;
}

.header {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  margin-bottom: 10px;
}

.back-btn {
  width: 72px;
  height: 34px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.title {
  font-size: 17px;
  font-weight: bold;
  flex: 1;
  text-align: center;
}

.confirm-btn {
  width: 72px;
  height: 34px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
}

.display-area {
  flex-direction: row;
  align-items: center;
  border-radius: 10px;
  border-width: 2px;
  padding: 12px 16px;
  margin-bottom: 10px;
  min-height: 46px;
}

.display-text {
  font-size: 18px;
  flex: 1;
}

.cursor {
  font-size: 18px;
  margin-left: 2px;
}
```

---

### 步骤 2：修改各页面，移除 InputMethod，改为跳转 chinese-input

#### 2.1 add-course 页面

**文件**: [add-course.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/add-course/add-course.ux)

**模板修改**：
- 删除 `<import name="input-method" ...>` 和 `<input-method ...>`
- 保留第 3 步的 `location-display` 点击区域，将 `showKeyboard` 改为跳转

```html
<!-- 删除这两行 -->
<import name="input-method" src="../../components/InputMethod/InputMethod.ux"></import>
<!-- 删除整个 input-method 标签 -->
<input-method ...></input-method>
```

**逻辑修改**：

```javascript
// 删除 showKeyboard, onVisibilityChange, onKeyDown, onDelete, onComplete 方法
// 新增方法：

showKeyboard() {
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "输入位置" })
  storage.set({ key: "chinese_input_placeholder", value: "点击输入位置, 例如: 301教室" })
  storage.set({ key: "chinese_input_value", value: this.courseLocation || "" })
  storage.set({ key: "chinese_input_maxlen", value: "10" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  router.push({ uri: "/pages/chinese-input" })
},

// 在 onShow 中接收返回结果
onShow() {
  var self = this
  store.getTheme(function(t) { self.theme = t })
  this.loadCourses()
  
  // 接收中文输入结果
  var storage = require("@system.storage")
  storage.get({
    key: "chinese_input_result",
    success: function(data) {
      if (data !== undefined && data !== null && data !== "") {
        self.courseLocation = data
        storage.delete({ key: "chinese_input_result" })
      }
    }
  })
}
```

#### 2.2 detail 页面

**文件**: [detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux)

**模板修改**：同上，删除 `<import>` 和 `<input-method>` 标签。

**逻辑修改**：

```javascript
// 删除 showKeyboard, onVisibilityChange, onKeyDown, onDelete, onComplete 方法
// 新增/修改：

showKeyboard() {
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "输入位置" })
  storage.set({ key: "chinese_input_placeholder", value: "点击输入位置, 例如: 301教室" })
  storage.set({ key: "chinese_input_value", value: this.courseLocation || "" })
  storage.set({ key: "chinese_input_maxlen", value: "10" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  router.push({ uri: "/pages/chinese-input" })
},

// 在 onShow 中接收返回结果
onShow() {
  var self = this
  store.getTheme(function(t) { self.theme = t })
  this.loadCoursesWithData()
  
  var storage = require("@system.storage")
  storage.get({
    key: "chinese_input_result",
    success: function(data) {
      if (data !== undefined && data !== null && data !== "") {
        self.courseLocation = data
        storage.delete({ key: "chinese_input_result" })
      }
    }
  })
}
```

#### 2.3 course-manager 页面

**文件**: [course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux)

这个页面有两个输入场景：重命名和新增课程。使用 `chinese_input_mode` 区分。

**模板修改**：删除 `<import>` 和 `<input-method>` 标签。

**逻辑修改**：

```javascript
// 删除 showKeyboard, onVisibilityChange, onKeyDown, onDelete, onComplete 方法
// 新增/修改：

// 重命名模式
startRename(idx) {
  var item = this.courseList[idx]
  if (!item) return
  this.editingIndex = idx
  this.editName = item.name
  
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "重命名课程" })
  storage.set({ key: "chinese_input_placeholder", value: "输入新名称" })
  storage.set({ key: "chinese_input_value", value: this.editName })
  storage.set({ key: "chinese_input_maxlen", value: "10" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  storage.set({ key: "chinese_input_mode", value: "rename" })
  router.push({ uri: "/pages/chinese-input" })
},

// 新增模式
startAdd() {
  this.isAdding = true
  this.newCourseName = ""
  
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "添加课程" })
  storage.set({ key: "chinese_input_placeholder", value: "输入课程名称" })
  storage.set({ key: "chinese_input_value", value: "" })
  storage.set({ key: "chinese_input_maxlen", value: "10" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  storage.set({ key: "chinese_input_mode", value: "add" })
  router.push({ uri: "/pages/chinese-input" })
},

// 在 onShow 中接收返回结果
onShow() {
  var self = this
  store.getTheme(function(t) { self.theme = t })
  
  var storage = require("@system.storage")
  storage.get({
    key: "chinese_input_result",
    success: function(data) {
      if (data !== undefined && data !== null && data !== "") {
        storage.get({
          key: "chinese_input_mode",
          success: function(modeData) {
            if (modeData === "rename" && self.editingIndex >= 0) {
              self.editName = data
            } else if (modeData === "add" && self.isAdding) {
              self.newCourseName = data
            }
            storage.delete({ key: "chinese_input_result" })
            storage.delete({ key: "chinese_input_mode" })
          },
          fail: function() {
            storage.delete({ key: "chinese_input_result" })
          }
        })
      }
    }
  })
}
```

#### 2.4 schedule-manager 页面

**文件**: [schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux)

**模板修改**：删除 `<import>` 和 `<input-method>` 标签。

**逻辑修改**：

```javascript
// 删除 showKeyboard, onVisibilityChange, onKeyDown, onDelete, onComplete 方法
// 新增/修改：

startRename(index) {
  this.editingIndex = index
  this.editName = this.scheduleList[index].name
  
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "重命名课程表" })
  storage.set({ key: "chinese_input_placeholder", value: "输入新名称" })
  storage.set({ key: "chinese_input_value", value: this.editName })
  storage.set({ key: "chinese_input_maxlen", value: "10" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  router.push({ uri: "/pages/chinese-input" })
},

// 在 onShow 中接收返回结果
onShow() {
  var self = this
  store.getTheme(function(t) { self.theme = t })
  this.loadData()
  
  var storage = require("@system.storage")
  storage.get({
    key: "chinese_input_result",
    success: function(data) {
      if (data !== undefined && data !== null && data !== "" && self.editingIndex >= 0) {
        self.editName = data
        storage.delete({ key: "chinese_input_result" })
      }
    }
  })
}
```

#### 2.5 nickname-edit 页面

**文件**: [nickname-edit.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/nickname-edit/nickname-edit.ux)

**模板修改**：删除 `<import>` 和 `<input-method>` 标签。

**逻辑修改**：

```javascript
// 删除 showKeyboard, onVisibilityChange, onKeyDown, onDelete, onComplete 方法
// 新增/修改：

showKeyboard() {
  var storage = require("@system.storage")
  storage.set({ key: "chinese_input_title", value: "编辑昵称" })
  storage.set({ key: "chinese_input_placeholder", value: "点击输入昵称" })
  storage.set({ key: "chinese_input_value", value: this.currentName || "" })
  storage.set({ key: "chinese_input_maxlen", value: "5" })
  storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
  router.push({ uri: "/pages/chinese-input" })
},

// 在 onShow 中接收返回结果
onShow() {
  // 现有 onShow 不需要，nickname-edit 没有 onShow
  // 改为在 onInit 后立即跳转，接收结果在页面重新显示时处理
  
  // 实际上，由于 nickname-edit 点击后跳转到 chinese-input，
  // 返回时 nickname-edit 会重新执行 onShow（如果已定义）
  // 如果没有 onShow，可以在 saveNickname 中不需要额外处理
}
```

**注意：nickname-edit 页面特殊处理**。因为 nickname-edit 页面本身已经有「取消」和「保存」按钮，点击显示区域后应该跳转到 chinese-input 页面。返回后，用户看到的是 nickname-edit 页面，显示区域显示输入的内容，用户再点击「保存」或「取消」。

```javascript
// nickname-edit 的 onShow 中接收结果
onShow() {
  var self = this
  store.getTheme(function(t) { self.theme = t })
  
  var storage = require("@system.storage")
  storage.get({
    key: "chinese_input_result",
    success: function(data) {
      if (data !== undefined && data !== null) {
        self.currentName = data
        storage.delete({ key: "chinese_input_result" })
      }
    }
  })
}
```

---

### 步骤 3：验证

构建后检查：

1. 只有 `chinese-input.js` 包含 `InputMethod` 词库代码
2. 其他 5 个页面 JS 文件体积应在 200K-400K 范围
3. RPK 总大小应进一步减小

---

## 预期效果对比

| 页面 | 优化前 | 优化后 | 减少 |
|------|--------|--------|------|
| add-course.js | 969K | ~250K | -74% |
| chinese-input.js | 828K | ~850K | 持平（唯一保留 InputMethod） |
| course-manager.js | 853K | ~200K | -77% |
| detail.js | 978K | ~250K | -74% |
| nickname-edit.js | 831K | ~180K | -78% |
| schedule-manager.js | 907K | ~200K | -78% |
| **RPK 总大小** | 855K | **~500K** | **-42%** |

## 交互流程

```
用户操作流程：
1. 用户在「添加课程」页面点击位置输入框
2. 跳转到「中文输入」页面
3. 用户使用全键盘输入中文
4. 点击「确认」按钮 → 携带结果返回原页面
5. 点击「返回」按钮 → 不携带结果返回原页面
6. 原页面接收结果并更新显示
```

## 注意事项

1. **storage 清理**：接收结果后务必 `storage.delete`，避免脏数据残留
2. **物理返回键**：chinese-input 页面需要处理 `goBack()`，先关闭键盘再返回
3. **course-manager 双模式**：使用 `chinese_input_mode` 区分重命名和新增
4. **nickname-edit 页面**：返回后保留在 nickname-edit 页面，用户手动点击保存
5. **chinese-input 页面本身**：保留 InputMethod 引用，这是唯一引用处