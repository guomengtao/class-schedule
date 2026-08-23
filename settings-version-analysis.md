# 设置页面底部版本号丢失原因分析

## 问题描述

设置页面（`src/pages/settings/settings.ux`）底部没有显示版本号，用户无法看到当前应用版本信息。

## 详细原因分析

### 1. 版本数据模块存在但未被引用

项目中已创建了版本数据模块 [version.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/version.js)：

```javascript
module.exports = { versionName: "1.2.0", versionCode: 43 }
```

同时在 [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json) 中也有对应的版本信息：

```json
"versionName": "1.2.0",
"versionCode": 43
```

**但搜索整个 `src/` 目录，`version.js` 模块从未被任何页面 import 或 require。** 它是一个孤立的数据文件，没有集成到任何 UI 中。

### 2. 设置页面模板缺少版本号展示区域

查看当前 [settings.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/settings/settings.ux) 模板底部：

```html
<div class="save-section">
    <input class="save-settings-btn" type="button" value="保存设置" onclick="saveSettings" ... />
</div>
```

模板中只有"保存设置"按钮，没有 `<text>` 元素用于显示版本号。整个页面从头到尾没有任何版本信息展示。

### 3. 脚本中未导入版本数据

`settings.ux` 的 `<script>` 部分只导入了三个模块：

```javascript
import router from "@system.router"
const store = require("../../data/store.js")
const database = require("../../data/database.js")
```

**没有 `const version = require("../../data/version.js")` 这行。**

### 4. 数据属性中无版本字段

`private` 数据对象中没有 `versionText` 或类似的属性：

```javascript
private: {
    weekDays: [...],
    scheduleName: "",
    timeSlots: [],
    totalCourses: 0,
    // ... 没有 versionText 或 appVersion 字段
}
```

### 5. 生命周期方法中无版本读取逻辑

`onInit()` 方法中没有读取版本的代码。没有：

```javascript
var versionInfo = require("../../data/version.js")
self.versionText = "v" + versionInfo.versionName
```

### 6. 历史版本对比

- **v1.0.0**（初始提交）：设置页面没有版本号显示
- **v1.1.0**（当前）：设置页面在重构时（加入了提醒功能测试、列表Demo等入口），仍未包含版本号显示

版本号显示功能从未在设置页面中实现过。`version.js` 文件被创建后，对应的 UI 集成工作被遗漏了。

## 总结

版本号丢失的根本原因是：**"数据层已就绪，UI 层未集成"**。

- `version.js` 数据模块已创建 ✓
- `manifest.json` 版本信息已更新 ✓
- `settings.ux` 导入版本模块 ✗
- `settings.ux` 添加版本号显示元素 ✗
- `settings.ux` 读取并展示版本号逻辑 ✗

## 修复方案

需要在 `settings.ux` 中做三件事：

1. **导入版本模块**：`const version = require("../../data/version.js")`
2. **添加数据属性**：`versionText: ""`
3. **在 `onInit` 中读取**：`self.versionText = "v" + version.versionName`
4. **在模板底部添加版本号显示**：
   ```html
   <text class="version-text" style="color: {{ theme.textMuted }}">{{ versionText }}</text>
   ```