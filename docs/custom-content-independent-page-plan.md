# 自定义内容独立页面规划

## 一、背景

当前「自定义内容」功能内嵌在 `homepage-settings.ux`（首页设置）页面中，作为一个折叠区域包含：开关、文字输入、预览。随着功能增多，首页设置页面越来越长，将「自定义内容」独立为单独页面，结构更清晰。

### 当前状态

```
设置页 (settings.ux)
  └── 首页设置 (homepage-settings.ux)
        ├── 显示控制 (快速添加/课程提醒/钉首页)
        ├── 快捷按钮 (总课程/今日/明日)
        ├── 自定义内容 ← 移出，独立为页面
        │     ├── 开关
        │     ├── 文字输入
        │     └── 预览
        └── 时间显示
```

### 目标状态

```
设置页 (settings.ux)
  └── 首页设置 (homepage-settings.ux)
        ├── 显示控制 (快速添加/课程提醒/钉首页)
        ├── 快捷按钮 (总课程/今日/明日)
        ├── 自定义内容 → 点击跳转独立页面
        └── 时间显示

自定义内容设置 (custom-content-settings.ux)  ← 新页面
  ├── 开关
  ├── 文字输入
  └── 预览
```

---

## 二、新页面设计

### 2.1 页面: `custom-content-settings.ux`

路径: `src/pages/custom-content-settings/custom-content-settings.ux`

参考 `vibration-lab.ux` 深色主题风格，与 `homepage-settings.ux` 风格一致。

#### 布局

```
┌─────────────────────────────────┐
│  ◀ 返回       自定义内容设置    │  ← header
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │ 自定义内容          [开关] │  │  ← 开关行
│  ├───────────────────────────┤  │
│  │ 点击输入自定义文字...     │  │  ← 输入行 (点击跳转中文输入)
│  └───────────────────────────┘  │
│                                 │
│  预览效果                        │
│  ┌───────────────────────────┐  │
│  │ ▎ 好好学习天天向上        │  │  ← 预览卡片 (模拟首页效果)
│  └───────────────────────────┘  │
│                                 │
│  设置说明                        │
│  ┌───────────────────────────┐  │
│  │ 开启后，首页课程列表上方   │  │
│  │ 显示自定义文字内容         │  │
│  │ 文字为空时自动隐藏         │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

#### 数据流

```
custom-content-settings.ux
  ├── 读取: storage key "homepage_settings"
  │     ├── showCustomContent (boolean)
  │     └── customContent (string)
  ├── 写入: store.setHomepageSettings()
  └── 中文输入: 跳转 /pages/chinese-input
        └── 返回 key: "chinese_input_result"
```

---

## 三、涉及文件变更

### 3.1 新增文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/pages/custom-content-settings/custom-content-settings.ux` | 新增 | 自定义内容独立页面 |

### 3.2 修改文件

| 文件 | 操作 | 说明 |
|------|:---:|------|
| `src/manifest.json` | 修改 | 新增 `pages/custom-content-settings` 路由 |
| `src/pages/homepage-settings/homepage-settings.ux` | 修改 | 删除「自定义内容」section，改为跳转链接 |
| `src/pages/settings/settings.ux` | 可选 | 如需在设置页直接入口，新增跳转项 |

### 3.3 不需修改

| 文件 | 原因 |
|------|------|
| `src/pages/index/index.ux` | 自定义内容栏模板和逻辑不变 |
| `src/pages/index/modules/custom-content.js` | 读取 `homepage_settings` 逻辑不变 |
| `src/data/store.js` | `getHomepageSettings` / `setHomepageSettings` 已存在 |
| 存储 key `homepage_settings` | 数据结构不变，向后兼容 |

---

## 四、详细实现

### 4.1 新页面 `custom-content-settings.ux`

#### 模板

```html
<template>
  <div class="page" style="background-color: {{ theme.bg }}">
    <div class="header">
      <input class="back-btn" type="button" value="◀ 返回" onclick="goBack"
             style="background-color: {{ theme.card }}; color: {{ theme.accent }}" />
      <text class="title" style="color: {{ theme.text }}">自定义内容设置</text>
    </div>

    <text class="section-title" style="color: {{ theme.textSecondary }}">显示控制</text>

    <div class="card" style="background-color: {{ theme.card }}">
      <div class="card-row">
        <div class="row-left">
          <div class="dot" style="background-color: {{ theme.accent }}"></div>
          <text class="row-label" style="color: {{ theme.text }}">自定义内容</text>
        </div>
        <div class="switch-track" style="background-color: {{ showCustomContent ? theme.accent : theme.border }}"
             onclick="toggleSwitch">
          <div class="switch-thumb"
               style="left: {{ showCustomContent ? '22px' : '2px' }}; background-color: {{ theme.bg }}"></div>
        </div>
      </div>
      <div class="row-divider" style="background-color: {{ theme.border }}"></div>
      <div class="input-row" onclick="showKeyboard">
        <text class="input-text"
              style="color: {{ customContent && showCustomContent ? theme.text : theme.textMuted }}">
          {{ customContent || '点击输入自定义文字...' }}
        </text>
        <text class="input-arrow" style="color: {{ theme.textMuted }}">></text>
      </div>
    </div>

    <div if="{{ customContent && showCustomContent }}">
      <text class="section-title" style="color: {{ theme.textSecondary }}">预览效果</text>
      <div class="preview-card" style="background-color: {{ theme.cardLight }}">
        <div class="preview-accent" style="background-color: {{ theme.accent }}"></div>
        <text class="preview-text" style="color: {{ theme.text }}">{{ customContent }}</text>
      </div>
    </div>

    <text class="section-title" style="color: {{ theme.textSecondary }}">设置说明</text>
    <div class="card" style="background-color: {{ theme.card }}">
      <text class="desc-text" style="color: {{ theme.textSecondary }}">
        开启后，首页课程列表上方显示自定义文字内容。文字为空时自动隐藏。
      </text>
    </div>
  </div>
</template>
```

#### Script

```javascript
import router from "@system.router"
const store = require("../../data/store.js")

export default {
  private: {
    theme: store.DEFAULT_THEME,
    showCustomContent: false,
    customContent: ""
  },

  onInit() {
    var self = this
    store.getTheme(function(t) { self.theme = t })
    this.loadSettings()
  },

  onShow() {
    var self = this
    store.getTheme(function(t) { self.theme = t })

    var storage = require("@system.storage")
    storage.get({
      key: "chinese_input_result",
      success: function(data) {
        if (data !== undefined && data !== null && data !== "") {
          self.customContent = data
          storage.delete({ key: "chinese_input_result" })
          self.saveSettings()
        }
      }
    })
  },

  loadSettings() {
    var self = this
    store.getHomepageSettings(function(settings) {
      self.showCustomContent = settings.showCustomContent || false
      self.customContent = settings.customContent || ""
    })
  },

  saveSettings() {
    store.getHomepageSettings(function(settings) {
      settings.showCustomContent = self.showCustomContent
      settings.customContent = self.customContent
      store.setHomepageSettings(settings)
    })
  },

  toggleSwitch() {
    this.showCustomContent = !this.showCustomContent
    this.saveSettings()
  },

  showKeyboard() {
    var storage = require("@system.storage")
    storage.set({ key: "chinese_input_title", value: "自定义内容" })
    storage.set({ key: "chinese_input_placeholder", value: "输入想在首页显示的文字..." })
    storage.set({ key: "chinese_input_value", value: this.customContent || "" })
    storage.set({ key: "chinese_input_maxlen", value: "20" })
    storage.set({ key: "chinese_input_return_key", value: "chinese_input_result" })
    router.push({ uri: "/pages/chinese-input" })
  },

  goBack() {
    router.back()
  }
}
```

#### CSS 样式

```css
.page {
  flex-direction: column;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 44px 8px 8px 8px;
}

.header {
  flex-direction: row;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 0;
}

.back-btn {
  width: 70px;
  height: 36px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  margin-right: 70px;
}

.section-title {
  font-size: 13px;
  font-weight: bold;
  margin: 16px 0 8px 4px;
}

.card {
  border-radius: 12px;
  padding: 4px 0;
}

.card-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.row-left {
  flex-direction: row;
  align-items: center;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  margin-right: 10px;
}

.row-label {
  font-size: 15px;
}

.switch-track {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  position: relative;
}

.switch-thumb {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  position: absolute;
  top: 2px;
}

.row-divider {
  height: 1px;
  margin: 0 16px;
}

.input-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
}

.input-text {
  flex: 1;
  font-size: 14px;
}

.input-arrow {
  font-size: 16px;
  margin-left: 8px;
}

.preview-card {
  flex-direction: row;
  align-items: center;
  padding: 12px 12px;
  border-radius: 10px;
}

.preview-accent {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  margin-right: 10px;
}

.preview-text {
  font-size: 15px;
  flex: 1;
}

.desc-text {
  font-size: 13px;
  padding: 14px 16px;
  line-height: 20px;
}

@media (shape: circle) {
  .page {
    padding: 44px 36px 44px 36px;
  }
}

@media (shape: capsule) {
  .page {
    padding: 44px 8px 12px 8px;
  }
}

@media (shape: rect) {
  .page {
    padding: 44px 6px 6px 6px;
  }
}
```

### 4.2 修改 `homepage-settings.ux`

**删除**: 整个「自定义内容」section（约 25 行：从 `<text class="group-title">自定义内容</text>` 到该 section 的 `</div>`）

**替换为**: 一个跳转链接行

```html
<text class="group-title" style="color: {{ theme.textSecondary }}">自定义内容</text>

<div class="section" style="background-color: {{ theme.card }}">
  <div class="item-row item-row-last" onclick="openCustomContentSettings">
    <div class="item-left">
      <div class="dot" style="background-color: {{ theme.accent }}"></div>
      <div class="item-text">
        <text class="item-label" style="color: {{ theme.text }}">自定义内容设置</text>
        <text class="item-desc" style="color: {{ theme.textMuted }}">
          {{ customContent ? customContent : '点击设置首页显示文字' }}
        </text>
      </div>
    </div>
    <text class="input-arrow" style="color: {{ theme.textMuted }}">></text>
  </div>
</div>
```

Script 新增方法:

```javascript
openCustomContentSettings() {
  router.push({ uri: "/pages/custom-content-settings" })
},
```

`onShow` 中刷新 `customContent` 显示:

```javascript
onShow() {
  var self = this
  store.getTheme(function(t) { self.theme = t })
  store.getHomepageSettings(function(settings) {
    self.customContent = settings.customContent || ""
  })
},
```

### 4.3 修改 `manifest.json`

在 `pages` 对象中新增:

```json
"pages/custom-content-settings": {
  "component": "custom-content-settings"
}
```

### 4.4 无需修改 `settings.ux`

当前设置页已有「首页设置」入口，跳转到 `homepage-settings`。自定义内容在 `homepage-settings` 中作为跳转链接，用户点击进入独立页面。无需在设置页增加额外入口。

---

## 五、实施步骤

| 步骤 | 文件 | 操作 |
|:---:|------|------|
| 1 | `src/pages/custom-content-settings/custom-content-settings.ux` | 新建独立页面 |
| 2 | `src/manifest.json` | 注册新页面路由 |
| 3 | `src/pages/homepage-settings/homepage-settings.ux` | 删除自定义内容 section，改为跳转链接 |
| 4 | 构建验证 | `npm run build` 确保无报错 |
| 5 | 功能测试 | 验证开关/输入/预览/首页显示 |

---

## 六、验证清单

- [ ] 从首页设置页点击「自定义内容设置」跳转进入独立页面
- [ ] 独立页面显示当前开关状态和文字内容
- [ ] 开关切换即时生效，返回首页设置可见状态变化
- [ ] 点击输入行跳转中文输入页，输入后返回显示正确
- [ ] 预览区域模拟首页效果
- [ ] 返回首页，自定义内容栏正确显示/隐藏
- [ ] 文字为空时首页不显示自定义内容栏
- [ ] 构建 RPK 大小 < 1MB，解压 < 2MB