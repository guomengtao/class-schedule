# 推荐文字方案：昵称一键推荐 & 自定义文字独立栏目

## 一、需求概述

1. **昵称编辑页**：加入"推荐"按钮，点击浏览 20 条内置推荐，用户原始输入不覆盖，确认后才替换
2. **自定义文字**：升级为独立栏目，在设置页有独立入口（与昵称、主题、字体同级），支持多条管理、勾选开关、删除、首页轮播
3. **中文输入页**：输入框文字加大到 48px

---

## 二、架构变更：自定义文字从"首页子设置"提升为独立栏目

### 2.1 当前架构

```
设置页
├── 昵称编辑  (独立页面)
├── 主题配色  (内嵌)
├── 字体大小  (内嵌)
├── 首页设置  (独立页面)
│   ├── 快速添加课程
│   ├── 自定义内容  ← 这里，嵌套在首页设置内，只有一个输入框
│   ├── 时间显示
│   └── ...
└── ...
```

### 2.2 新架构

```
设置页
├── 昵称编辑     (独立页面)
├── 主题配色     (内嵌)
├── 字体大小     (内嵌)
├── 自定义文字   (独立页面) ← 提升到设置页一级入口，与昵称同级
├── 首页设置     (独立页面)
│   ├── 快速添加课程
│   ├── 时间显示
│   └── ...
└── ...
```

### 2.3 变动说明

| 项目 | 旧 | 新 |
|------|-----|-----|
| 入口位置 | 首页设置内嵌 | 设置页一级入口 |
| 独立页面 | 无 | `custom-content-manage.ux` |
| 数据条数 | 1 条 | 多条 |
| 显示控制 | 开关 | 每条独立勾选 |
| 首页效果 | 静态显示 | 多条轮播 |
| 删除 | 不支持 | 支持 |

---

## 三、设置页入口改动

### 3.1 在 settings.ux 模板中新增一级入口

在字体大小 section 之后，新增一个 group：

```html
<!-- 自定义文字：独立栏目入口 -->
<div class="group" style="background-color: {{ theme.card }}">
  <div class="row" onclick="goToCustomContentManage">
    <text class="row-label" style="color: {{ theme.text }}">自定义文字</text>
    <div class="row-right">
      <text class="row-value" if="{{ customContentCount > 0 }}" style="color: {{ theme.accent }}">{{ customContentCount }} 条</text>
      <text class="row-hint" if="{{ customContentCount === 0 }}" style="color: {{ theme.textMuted }}">未设置</text>
      <text class="arrow" style="color: {{ theme.textMuted }}">›</text>
    </div>
  </div>
</div>
```

### 3.2 在 settings.ux 脚本中新增

```javascript
// 数据
customContentCount: 0,

// 加载计数
loadCustomContentCount() {
  var self = this
  store.getCustomContents(function(list) {
    var enabled = list.filter(function(item) { return item.enabled })
    self.customContentCount = enabled.length
  })
},

// 跳转
goToCustomContentManage() {
  router.push({ uri: "/pages/custom-content-manage" })
},

// 在 onShow 中调用
onShow() {
  // ... 现有代码 ...
  this.loadCustomContentCount()
}
```

### 3.3 设置页最终效果

```
┌──────────────────────────────────────────┐
│  ◀ 返回          设置                    │
│                                           │
│  ┌──────────────────────────────────────┐ │
│  │  昵称                        追梦人 › │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  主题配色                                  │
│  ┌──────────────────────────────────────┐ │
│  │  ● ● ● ● ● ● ●                      │ │
│  │  深蓝 暗紫 青绿 ...                   │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  字体大小                                  │
│  ┌──────────────────────────────────────┐ │
│  │  [−]  48px  [+]                     │ │
│  │  [28] [36] [48] [62] [76]           │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  ┌──────────────────────────────────────┐ │
│  │  自定义文字                    3 条 › │ │  ← 新增独立入口
│  └──────────────────────────────────────┘ │
│                                           │
│  ┌──────────────────────────────────────┐ │
│  │  首页设置                         ›  │ │
│  └──────────────────────────────────────┘ │
│  ...                                      │
└──────────────────────────────────────────┘
```

---

## 四、自定义文字管理页：custom-content-manage.ux

### 4.1 页面定位

- 独立页面，设置页直达
- 不依赖首页设置页
- 全功能管理：添加、推荐、勾选、删除、预览

### 4.2 页面 UI 设计

```
┌──────────────────────────────────────────┐
│  ◀ 返回        自定义文字管理              │
│                                           │
│  管理多条自定义文字，勾选的将在首页轮播显示  │
│                                           │
│  ┌── 添加新文字 ────────────────────────┐  │
│  │                                       │  │
│  │  ┌──────────────────────────────┐    │  │
│  │  │  点击输入文字...              │    │  │  ← 点击跳转中文输入页
│  │  └──────────────────────────────┘    │  │
│  │                                       │  │
│  │  ┌──────────┐   ┌──────────┐        │  │
│  │  │  💡 推荐  │   │  + 添加   │        │  │
│  │  └──────────┘   └──────────┘        │  │
│  └───────────────────────────────────────┘  │
│                                           │
│  ┌── 推荐预览 ──────────────────────────┐  │
│  │  "乾坤未定，你我皆黑马"               │  │
│  │  ┌────────┐   ┌──────────┐          │  │
│  │  │ 填入   │   │ 下一个 ▶  │          │  │
│  │  └────────┘   └──────────┘          │  │
│  └───────────────────────────────────────┘  │
│                                           │
│  已添加的文字 (3 条)                        │
│                                           │
│  ┌──────────────────────────────────────┐  │
│  │  ☑  今天也要加油呀              🗑   │  │  ← 勾选中
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  ☑  自律即自由                  🗑   │  │  ← 勾选中
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  ☐  开心最重要                  🗑   │  │  ← 未勾选，首页不显示
│  └──────────────────────────────────────┘  │
│                                           │
│  ┌──────────────────────────────────────┐  │
│  │  💡 勾选多条时，首页每隔 30 秒轮播切换  │  │
│  └──────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 4.3 交互逻辑详解

#### 添加文字

1. 点击输入框 → 跳转中文输入页
2. 输入完成返回 → 自动添加到列表末尾，默认 `enabled: true`
3. 结果：列表新增一条，首页立即可见

#### 推荐按钮

1. 点击"推荐"→ 展开推荐预览区，显示第 1 条推荐
2. 点击"下一个 ▶"→ 循环浏览 20 条推荐
3. 点击"填入"→ 将推荐内容写入输入框（不自动添加）
4. 用户可以在输入框中修改后再点"+ 添加"

#### 勾选开关

- 点击 ☑/☐ 切换显示状态
- 勾选 = 首页显示
- 未勾选 = 首页不显示（但保留在列表中，可随时重新勾选）
- 至少保留一条勾选（最后一条已勾选的不允许取消）
- 如果全部未勾选，首页不显示任何自定义文字

#### 删除

- 点击 🗑 删除该条
- 如果删除后列表为空，首页不显示自定义文字
- 如果删除的是当前轮播中的那条，自动切换到下一条

#### 最大条数

- 建议上限 20 条，防止列表过长
- 达到上限时，"+ 添加"按钮禁用并提示

---

## 五、数据模型

### 5.1 存储 key：`customContents`

```json
[
  { "id": 1, "text": "今天也要加油呀", "enabled": true },
  { "id": 2, "text": "自律即自由",      "enabled": true },
  { "id": 3, "text": "开心最重要",      "enabled": false }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 自增唯一标识，用于删除 |
| `text` | string | 文字内容，最长 20 字 |
| `enabled` | boolean | true=首页显示，false=首页不显示 |

### 5.2 存储方法（store.js）

```javascript
getCustomContents: function(callback) {
  storage.get({
    key: "customContents",
    success: function(data) {
      try {
        var list = JSON.parse(data)
        callback(Array.isArray(list) ? list : [])
      } catch (e) { callback([]) }
    },
    fail: function() { callback([]) }
  })
},

setCustomContents: function(list, callback) {
  storage.set({
    key: "customContents",
    value: JSON.stringify(list),
    success: function() { if (callback) callback() },
    fail: function() { if (callback) callback() }
  })
},

getEnabledCustomContents: function(callback) {
  this.getCustomContents(function(list) {
    callback(list.filter(function(item) { return item.enabled }))
  })
}
```

### 5.3 旧数据迁移

`app.ux` 启动时自动检测并迁移旧版单条数据：

```javascript
function migrateCustomContent() {
  store.getHomepageSettings(function(settings) {
    if (settings.customContent && typeof settings.customContent === 'string' && settings.customContent.trim()) {
      store.getCustomContents(function(list) {
        if (list.length === 0) {
          store.setCustomContents([{
            id: 1,
            text: settings.customContent.trim(),
            enabled: settings.showCustomContent !== false
          }])
        }
      })
    }
  })
}
```

---

## 六、首页轮播逻辑

### 6.1 核心代码（index.ux）

```javascript
// 数据
currentCustomContent: "",
customContentTimer: null,

// 加载
loadCustomContents() {
  var self = this
  store.getEnabledCustomContents(function(list) {
    if (list.length === 0) {
      self.currentCustomContent = ""
      self.stopRotation()
      return
    }
    if (list.length === 1) {
      self.currentCustomContent = list[0].text
      self.stopRotation()
      return
    }
    self.currentCustomContent = list[0].text
    self.rotationIndex = 0
    self.rotationList = list
    self.startRotation()
  })
},

// 开始轮播
startRotation() {
  var self = this
  this.stopRotation()
  this.customContentTimer = setInterval(function() {
    self.rotationIndex = (self.rotationIndex + 1) % self.rotationList.length
    self.currentCustomContent = self.rotationList[self.rotationIndex].text
  }, 30000)
},

// 停止轮播
stopRotation() {
  if (this.customContentTimer) {
    clearInterval(this.customContentTimer)
    this.customContentTimer = null
  }
}
```

### 6.2 轮播行为

| 场景 | 行为 |
|------|------|
| 0 条勾选 | 不显示自定义文字 |
| 1 条勾选 | 固定显示，不轮播 |
| 多条勾选 | 每 30 秒切换到下一条，循环 |
| 页面离开 | `onDestroy` 中停止轮播 |
| 页面返回 | `onShow` 中重新加载，从头开始 |

### 6.3 模板

```html
<text class="custom-content-line" if="{{ currentCustomContent }}"
      style="color: {{ theme.accent }}; font-size: {{ displaySize }}px">
  {{ currentCustomContent }}
</text>
```

---

## 七、homepage-settings.ux 改动

删除自定义内容相关 section，简化页面：

```diff
- <text class="group-title">自定义内容</text>
- <div class="section">
-   <div class="item-row">...</div>       <!-- 开关 -->
-   <div class="input-row">...</div>      <!-- 输入框 -->
-   <div class="preview-row">...</div>    <!-- 预览 -->
- </div>
```

删除相关数据和方法：

```diff
- showCustomContent: false,
- customContent: "",

- // 删除 toggleCustomContent
- // 删除 showContentKeyboard
- // 删除 saveSettings 中的 customContent 字段
```

---

## 八、推荐词库（recommend-words.js）

共用模块，同时支持昵称编辑和自定义文字管理两个页面：

```javascript
var NICKNAME_WORDS = [
  "小学霸", "卷王", "追梦人", "早八人", "学无止境",
  "今天不逃课", "课代表", "夜猫子", "小太阳", "不挂科",
  "图书馆长", "天天向上", "笔记侠", "咖啡续命", "按时毕业",
  "向光而行", "全勤奖", "读万卷书", "毕业倒计时", "前程似锦"
]

var CUSTOM_CONTENT_WORDS = [
  "今天也要加油呀", "好好学习，天天向上", "不积跬步无以至千里",
  "距离梦想又近了一步", "自律即自由", "今天不学习，明天变垃圾",
  "星光不问赶路人", "冲鸭！新的一天", "卷起来，别躺平",
  "越努力越幸运", "坚持就是胜利", "每一节课都不白上",
  "做最好的自己", "知识改变命运", "满课的一天也很充实",
  "乾坤未定，你我皆黑马", "认真过好每一天", "少年不惧岁月长",
  "开心最重要", "不负韶华，未来可期"
]

module.exports = {
  getNicknameWords: function() { return NICKNAME_WORDS },
  getCustomContentWords: function() { return CUSTOM_CONTENT_WORDS }
}
```

---

## 九、中文输入页改动：输入框 48px

### 9.1 当前状态

输入框显示区（display）字体由 `displayStyle` 控制，默认 `Math.round(17 * r)` = 17px。

### 9.2 改动

修改 `store.js` 的 `getFontSizes` 方法：

```diff
- display: Math.round(17 * r),
+ display: Math.round(48 * r),
```

### 9.3 效果对比

| 设置字号 | 旧 | 新 |
|----------|-----|-----|
| 28px | 10px | 28px |
| 36px | 13px | 36px |
| 48px | 17px | 48px |
| 62px | 22px | 62px |
| 76px | 27px | 76px |

---

## 十、昵称编辑页：推荐按钮

### 10.1 交互流程

```
┌──────────────────────────────────────────┐
│  ◀ 返回          编辑昵称                 │
│                                           │
│  请输入昵称                                │
│  ┌──────────────────────────────────────┐ │
│  │  用户当前输入的昵称                    │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  ┌──────────┐                            │
│  │  💡 推荐  │  ← 点击展开推荐预览         │
│  └──────────┘                            │
│                                           │
│  ┌── 推荐预览 ──────────────────────────┐  │
│  │  追梦人                               │  │
│  │  ┌────────┐   ┌──────────┐          │  │
│  │  │  替换   │   │ 下一个 ▶  │          │  │
│  │  └────────┘   └──────────┘          │  │
│  └──────────────────────────────────────┘  │
│                                           │
│        ┌──────┐    ┌──────┐              │
│        │ 取消  │    │ 保存  │              │
│        └──────┘    └──────┘              │
└──────────────────────────────────────────┘
```

### 10.2 安全设计

| 操作 | 用户输入区 | 推荐预览区 |
|------|-----------|-----------|
| 点击"推荐" | 不变 | 出现，显示第 1 条 |
| 点击"下一个" | 不变 | 切换到下一条 |
| 点击"替换" | 更新为推荐内容 | 保留，可继续浏览 |
| 点击"保存" | 保存到 storage | 不影响 |
| 再次点击"推荐" | 不变 | 关闭预览区 |

---

## 十一、改动文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/custom-content-manage/custom-content-manage.ux` | **新建** | 自定义文字管理独立页面 |
| `src/common/recommend-words.js` | **新建** | 推荐词库模块 |
| `src/pages/settings/settings.ux` | 修改 | 新增"自定义文字"一级入口 |
| `src/pages/homepage-settings/homepage-settings.ux` | 修改 | 删除自定义内容 section |
| `src/pages/nickname-edit/nickname-edit.ux` | 修改 | 新增推荐按钮 + 预览区 |
| `src/pages/index/index.ux` | 修改 | 多条轮播逻辑 |
| `src/data/store.js` | 修改 | display 基础值 17→48；新增 3 个 CustomContent 方法 |
| `src/data/storage-tables.js` | 修改 | 新增 customContents 表 |
| `src/app.ux` | 修改 | 新增 migrateCustomContent() |

---

## 十二、路由注册

```json
{
  "pages": {
    "pages/custom-content-manage": {
      "component": "index"
    }
  }
}
```

---

## 十三、关键样式

### 13.1 自定义文字管理页

```css
.custom-content-page {
  flex-direction: column;
  padding: 44px 8px 8px 8px;
  min-height: 100%;
}

.add-section {
  flex-direction: column;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 12px;
}

.add-input-box {
  height: 48px;
  border-radius: 8px;
  border-width: 1px;
  padding: 0 12px;
  justify-content: center;
  margin-bottom: 10px;
}

.add-input-text {
  font-size: 16px;
}

.add-btn-row {
  flex-direction: row;
  justify-content: flex-start;
}

.content-item {
  flex-direction: row;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 6px;
}

.content-checkbox {
  width: 28px; height: 28px;
  border-radius: 6px;
  border-width: 2px;
  text-align: center;
  font-size: 16px;
  margin-right: 10px;
  flex-shrink: 0;
}

.content-item-text {
  flex: 1;
  font-size: 16px;
}

.content-delete-btn {
  width: 32px; height: 32px;
  border-radius: 6px;
  text-align: center;
  font-size: 15px;
  margin-left: 8px;
  flex-shrink: 0;
}

.rotation-hint {
  font-size: 12px;
  margin-top: 12px;
  text-align: center;
  padding: 8px;
  border-radius: 6px;
}
```

### 13.2 推荐按钮公用样式

```css
.recommend-btn {
  width: 100px; height: 36px;
  border-radius: 8px;
  border-width: 1px;
  font-size: 14px;
  text-align: center;
  margin-right: 8px;
}

.recommend-panel {
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  margin-top: 10px;
  width: 100%;
}

.recommend-text {
  font-size: 18px; font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
}

.recommend-actions {
  flex-direction: row;
  justify-content: center;
}

.recommend-replace-btn {
  width: 70px; height: 32px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
  margin-right: 16px;
}

.recommend-next-btn {
  width: 90px; height: 32px;
  border-radius: 8px;
  border-width: 1px;
  font-size: 13px;
  text-align: center;
}
```

---

## 十四、扩展性

1. **轮播间隔可配置**：未来在设置页增加选项（15s / 30s / 60s）
2. **拖拽排序**：自定义文字管理页中可拖拽调整顺序
3. **推荐词库扩展**：新增分类（节日祝福、考试加油等）
4. **切换动画**：首页轮播切换加入渐隐渐显效果
5. **分享功能**：用户可将自定义文字导出分享