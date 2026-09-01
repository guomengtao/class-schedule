# 首页设置 - 开发方案

## 一、背景分析

### 1.1 当前首页状态

当前 `index.ux` 存在以下问题：

| 问题 | 说明 |
|------|------|
| 快速添加 HTML 已移除 | 模板中已无 `.quick-add` 区域的 HTML 代码 |
| JS 死代码残留 | `quickAddCourse()`、`toggleQuickAdd()`、`refreshQuickAdd()`、`loadPresetCourses()`、`calcNextTimeSlot()` 等方法仍在 |
| 数据属性残留 | `quickCourseNames`、`quickAddTime`、`quickAddExpanded`、`quickAddDisabled` 仍在 private 中 |
| CSS 死样式残留 | `.quick-add`、`.quick-add-title`、`.quick-add-scroll` 等样式仍存在（约 60 行） |
| `index-full.ux` 保留完整实现 | 作为参考版本，HTML+JS+CSS 齐全 |

### 1.2 涉及的栏位

首页当前可见的元素：

```
┌─────────────────────────────┐
│ 时钟 (非胶囊屏)              │
├─────────────────────────────┤
│ ◀ 星期一 ▶  [总] [今] [明]  │  ← 导航栏
├─────────────────────────────┤
│ 状态栏 (当前课程/下节课)     │
├─────────────────────────────┤
│ 课程卡片列表 (scroll)       │
│  - 数学 08:00-08:45 301     │
│  - 英语 08:55-09:40 205     │
├─────────────────────────────┤
│ 快速添加 (已移除模板)  ← 本方案目标 |
├─────────────────────────────┤
│ [+ 添加课程] [设置] [去激活] │  ← 底部按钮
├─────────────────────────────┤
│ ⇄ 课程表1                   │  ← 课程表切换
└─────────────────────────────┘
```

## 二、方案设计

### 2.1 目标

在设置页增加「首页设置」区域，允许用户控制首页「快速添加」栏位的显示/隐藏。

### 2.2 页面结构

```
settings (设置)  ← 现有页面
├── 昵称
├── 主题配色
├── 字体大小
├── 文字预览
├── 上课提醒 (震动提醒/提前时间/震动样式)
├── 保存设置
├── [新增] 首页设置 ← 新增区域
│   └── 快速添加栏目：显示/隐藏开关
├── 功能实验室
└── 恢复默认数据
```

### 2.3 存储设计

使用 `@system.storage`，key 为 `homepage_settings`，存储结构：

```json
{
  "showQuickAdd": true
}
```

在 `store.js` 中新增 get/set 方法：

```javascript
getHomepageSettings: function(callback) {
  storage.get({
    key: "homepage_settings",
    success: function(data) {
      if (data) {
        try {
          callback(JSON.parse(data))
        } catch (e) {
          callback({ showQuickAdd: true })
        }
      } else {
        callback({ showQuickAdd: true })
      }
    },
    fail: function() {
      callback({ showQuickAdd: true })
    }
  })
},

setHomepageSettings: function(settings, callback) {
  storage.set({
    key: "homepage_settings",
    value: JSON.stringify(settings),
    success: function() { if (callback) callback() },
    fail: function() { if (callback) callback() }
  })
}
```

### 2.4 设置页 UI 设计

在「保存设置」按钮下方、「功能实验室」上方新增：

```html
<div class="homepage-section" style="background-color: {{ theme.card }}">
  <text class="section-label" style="color: {{ theme.text }}">首页设置</text>

  <div class="remind-row">
    <text class="remind-label" style="color: {{ theme.text }}">快速添加栏目</text>
    <input class="toggle-btn" type="button"
      value="{{ showQuickAdd ? '显示' : '隐藏' }}"
      onclick="toggleQuickAddSetting"
      style="background-color: {{ showQuickAdd ? theme.accent : theme.border }};
             color: {{ showQuickAdd ? theme.bg : theme.textSecondary }}" />
  </div>
</div>
```

### 2.5 设置页 JS 变更

```javascript
// 新增 data 属性
showQuickAdd: true,

// onInit 中加载
loadHomepageSettings() {
  var self = this
  store.getHomepageSettings(function(settings) {
    self.showQuickAdd = settings.showQuickAdd
  })
},

// 切换方法
toggleQuickAddSetting() {
  this.showQuickAdd = !this.showQuickAdd
  store.setHomepageSettings({ showQuickAdd: this.showQuickAdd })
}
```

### 2.6 首页 JS 变更

在 `index.ux` 的 `onInit()` 中加载设置，控制快速添加的显示：

```javascript
// 新增 data 属性
showQuickAdd: true,

// onInit 中加载
loadHomepageSettings() {
  var self = this
  store.getHomepageSettings(function(settings) {
    self.showQuickAdd = settings.showQuickAdd
  })
}
```

模板中使用 `if="{{ showQuickAdd }}"` 包裹快速添加区域：

```html
<div class="quick-add" if="{{ showQuickAdd }}" style="background-color: {{ theme.card }}">
  <!-- 快速添加内容 -->
</div>
```

## 三、涉及文件变更

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/data/store.js` | 修改 | 新增 `getHomepageSettings()` / `setHomepageSettings()` |
| `src/pages/settings/settings.ux` | 修改 | 新增「首页设置」区域 + 开关 |
| `src/pages/index/index.ux` | 修改 | 恢复快速添加 HTML 模板 + 根据设置控制显隐 |
| `src/pages/index/index-full.ux` | 修改 | 同步更新（如有需要） |

## 四、可行性分析

### 4.1 技术可行性：✅ 完全可行

| 维度 | 评估 |
|------|------|
| 存储 | `@system.storage` 已成熟使用，key-value 模式完全支持 |
| UI 组件 | 复用现有 `.toggle-btn`、`.remind-row` 样式，零新增样式 |
| 数据流 | 设置页写入 → storage → 首页读取，路径清晰 |
| 兼容性 | 不影响现有任何功能，纯增量改动 |

### 4.2 减少臃肿分析

**能减少臃肿**，原因如下：

| 当前问题 | 改进后 |
|----------|--------|
| 快速添加 HTML 已从 index.ux 移除，但 JS 死代码和 CSS 死样式仍在 | 方案要求恢复 HTML 模板，让代码成为**活代码**，不再有死代码残留 |
| 用户无法控制快速添加显隐 | 用户可自主选择，不需要时隐藏，减少视觉干扰 |
| 快速添加在胶囊屏上占用宝贵的屏幕空间 | 允许隐藏后，可腾出约 40-60px 高度给课程列表 |

**不会增加臃肿**，原因如下：

| 维度 | 说明 |
|------|------|
| 代码量 | 净增加约 50 行（store 方法 + 设置页 UI + 首页条件判断），但清理死代码后可抵消约 30 行 CSS |
| 运行时开销 | 仅多一次 storage.get() 调用，在 onInit 中执行，不影响性能 |
| 包体积 | 增量极小（< 1KB），可忽略 |

### 4.3 执行策略：分两步

**第一步：清理死代码（先做）**

当前 `index.ux` 中存在大量快速添加相关的死代码需要清理：

- JS：删除 `quickAddCourse()`、`toggleQuickAdd()`、`refreshQuickAdd()`、`loadPresetCourses()`、`calcNextTimeSlot()`、`formatTime()`（如无其他引用）
- Data：删除 `quickCourseNames`、`quickAddTime`、`quickAddExpanded`、`quickAddDisabled`、`presetCourses`
- CSS：删除 `.quick-add`、`.quick-add-title`、`.quick-add-scroll`、`.quick-add-list`、`.quick-add-item`、`.quick-add-name`、`.quick-add-empty` 及其媒体查询变体

**第二步：按方案实施**

从 `index-full.ux` 中恢复快速添加 HTML 模板，并加入 `showQuickAdd` 条件控制。

## 五、扩展性

此方案为「首页设置」建立了基础框架，未来可扩展：

| 扩展项 | 说明 |
|--------|------|
| 时钟显隐 | 控制首页顶部时钟的显示/隐藏 |
| 状态栏显隐 | 控制「当前课程/下节课」状态栏 |
| 底部按钮显隐 | 控制「添加课程」「设置」按钮区域 |
| 课程表切换显隐 | 控制「⇄ 课程表1」切换入口 |
| 今/明快捷按钮 | 控制日期导航快捷按钮 |

只需在 `homepage_settings` JSON 中增加字段，设置页增加对应开关即可。

## 六、实施步骤

1. 在 `store.js` 中新增 `getHomepageSettings()` 和 `setHomepageSettings()` 方法
2. 在 `settings.ux` 中新增「首页设置」区域，含快速添加栏目显隐开关
3. 清理 `index.ux` 中的死代码（JS 死方法 + 数据属性 + CSS 死样式）
4. 从 `index-full.ux` 恢复快速添加 HTML 模板到 `index.ux`
5. 在 `index.ux` 的 `onInit()` 中加载首页设置，用 `showQuickAdd` 控制快速添加显隐
6. 测试：开关切换后返回首页验证快速添加栏位显隐