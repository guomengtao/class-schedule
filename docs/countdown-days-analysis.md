# 倒数日功能分析 - 首页可行性评估

## 一、需求概述

在首页新增一个「倒数日」区域，类似自定义内容区域的实现方式：
- 支持在设置中添加多个倒数日（标题 + 目标日期）
- 每个倒数日有独立开关
- 首页显示每个倒数日的标题、剩余天数、目标日期

---

## 二、参考实现：自定义内容区域

### 2.1 架构分析

自定义内容区域是一个完整的三层架构：

```
设置层 (homepage-settings.ux)
  ├── showCustomContent 开关
  └── customText 输入 → 存 storage("customContentList")

存储层 (storage)
  ├── customContentList (JSON Array) → 独立存储，多条目轮播
  └── homepage_settings.customContent / showCustomContent → 首页设置存储

首页层 (index-full.ux)
  ├── 模板: <div if="{{ showCustomContent && customContent }}">
  ├── 模块: modules/custom-content.js
  │     ├── init() → loadAndRotate() → 读 storage 设置数据
  │     ├── startRotation() → setInterval 轮播多条文字
  │     └── destroy() → clearInterval 清理
  └── private 数据: showCustomContent, customContent
```

### 2.2 首页模块加载机制

`index-full.ux` 使用模块化架构，在 `onInit()` 末尾调用 `initAllModules()`：

```javascript
var moduleNames = [
  { key: "clock" },
  { key: "quickAdd" },
  { key: "dayNav" },
  { key: "statusBar" },
  { key: "customContent" },    // ← 自定义内容模块
  { key: "pinnedPages" },
  { key: "bottomButtons" },
  { key: "classList" }
]
```

每个模块的定义文件放在 `src/pages/index-full/modules/` 目录下，模块必须导出 `{ init: function(instance) }`，可选导出 `{ destroy: function() }`。

---

## 三、首页承载能力分析

### 3.1 模板层面 ✅ 完全可行

首页（index-full.ux）目前模板结构如下：

```
page
├── clock 时钟区
├── quick-add 快速添加
├── day-nav 日期导航
├── custom-content-bar 自定义内容 ← 参考这个
├── status-bar 状态条
├── pinned-bar 钉住内容
├── scroll (课程列表)
│   └── class-card × N
└── bottom-buttons 底部按钮
```

新增倒数日区域只需要在 `custom-content-bar` 旁边或下方插入一个 `<div if="{{ showCountdownDays && countdownDays.length > 0 }}">` 即可。

**胶囊屏适配**: 
- 胶囊屏宽度有限（约 200px 有效宽度）
- 倒数日建议紧凑格式：`标题 剩X天`（单行）
- 多个倒数日竖排，每条高度约 40-44px
- 3个倒数日 ≈ 120-132px，首页完全放得下

### 3.2 模块系统 ✅ 已有成熟模式

新增 `modules/countdown.js` 即可，参考 `modules/custom-content.js`：
- 导出 `init(instance)` / `destroy()`
- 在 `moduleNames` 数组中新增 `{ key: "countdown" }`
- 在 `loadModule` 中注册
- `onDestroy` 中调用 `modules.countdown.destroy()`

### 3.3 存储层 ✅ 已有成熟模式

选项 A：扩展 `homepage_settings`（推荐）
```json
{
  "showCountdownDays": false,
  "countdownDays": [
    { "title": "高考", "date": "2027-06-07", "enabled": true },
    { "title": "生日", "date": "2027-03-15", "enabled": false }
  ]
}
```

选项 B：独立 storage key（类似 `customContentList`）
- key: `countdownDays` → JSON Array
- key: `showCountdownDays` → bool

**推荐选项 A**：因为 `homepage_settings` 已经有完善的 get/set 方法和缓存机制，统一管理更方便。

### 3.4 设置页 ✅ 可复用现有结构

在 `homepage-settings.ux` 中新增 section（参考自定义内容）：

```html
<div class="section" style="background-color: {{ theme.card }}">
  <div class="item-row">
    <text class="item-label">倒数日</text>
    <switch-track onclick="toggleCountdownDays" />
  </div>
  <div class="row-divider"></div>
  <div class="item-row" onclick="openCountdownManage">
    <text class="item-label">管理倒数日</text>
    <text class="arrow">›</text>
  </div>
</div>
```

跳转到独立的倒数日管理页面：`/pages/countdown-manage`

### 3.5 首页视觉位置建议

```
┌─────────────────────────────────┐ ← 胶囊屏 (窄)
│  09:42                          │ ← 时钟
│  快速添加 ▸                     │
│  ◀ 总 2026-09-14 周三 ▸         │ ← 日期导航
│  ┌───────────────────────────┐  │
│  │ ▎ 好好学习天天向上         │  │ ← 自定义内容（已有）
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 高考 剩 265 天             │  │ ← 倒数日1（新增）
│  │ 生日 剩 182 天             │  │ ← 倒数日2（新增）
│  │ 考研 剩 470 天             │  │ ← 倒数日3（新增）
│  └───────────────────────────┘  │
│  上节课: 第3节 语文             │ ← 状态条
│  ┌───────────────────────────┐  │
│  │ 第4节 数学  09:50-10:35   │  │ ← 课程卡片
│  │ 第5节 英语  10:45-11:30   │  │
│  │ ...                       │  │
│  └───────────────────────────┘  │
│  [+ 添加] [编辑] [导入] [设置]  │ ← 底部按钮
└─────────────────────────────────┘
```

---

## 四、关闭模式对首页加载压力的分析

### 4.1 关键问题

> 如果关闭了倒数日（showCountdownDays = false），是否仍然占用首页加载资源？

### 4.2 DOM 渲染层面：✅ 不占用

模板使用 `if` 条件渲染：

```html
<div if="{{ showCountdownDays && countdownDays.length > 0 }}">
  <!-- 倒数日内容 -->
</div>
```

Quick App 的 `if` 指令是**真正的条件渲染**：
- 条件为 false 时，该 DOM 子树**完全不创建**
- 不会参与布局计算（layout）
- 不会参与绘制（paint）
- 内存占用为 0

**结论：关闭后首页 DOM 树无变化，不增加渲染开销。**

### 4.3 模块初始化层面：⚠️ 有轻微开销

当前所有模块的 `init()` 都在 `initAllModules()` 中遍历执行：

```javascript
for (var i = 0; i < moduleNames.length; i++) {
  var mod = modules[moduleNames[i].key]
  if (mod && mod.init) mod.init(instance)
}
```

关闭模式下的开销：

| 操作 | 是否执行 | 开销评估 |
|------|---------|---------|
| `init()` 调用 | ✅ 总是执行 | 约 0.5ms（函数调用本身） |
| `storage.get()` 读取设置 | ✅ 总是执行 | 约 1-3ms（异步 I/O） |
| `setInterval` 定时器 | ❌ 不执行（数据为空） | 0 |
| DOM 创建 | ❌ 不执行（if=false） | 0 |
| 日期计算 | ❌ 不执行（无数据） | 0 |

**总开销：约 2-4ms 异步读取，不阻塞 UI 线程。**

### 4.4 对比分析表

| 项目 | 开启模式 | 关闭模式 | 差值 |
|------|---------|---------|------|
| DOM 节点 | +N 个节点 | +0 | N 个节点 |
| 布局计算 | +1 次 layout | +0 | 1 次 layout |
| 绘制开销 | +1 次 paint | +0 | 1 次 paint |
| storage 读取 | 1 次 get | 1 次 get | 相同 |
| JS 计算 | 日期差值计算 | 无计算 | 微小 |
| 定时器 | 无（静态数据） | 无 | 相同 |
| 内存占用 | +200-500 字节 | +0 | ~500 字节 |

### 4.5 优化建议

与自定义内容模块不同（custom-content.js 在 toggle off 时仍设置 `showCustomContent=false` 但 `init()` 仍调用 `loadAndRotate()`），倒数日模块可以做更轻量的处理：

```javascript
function init(instance) {
  instance.showCountdownDays = false
  instance.countdownDays = []
  instance._countdownTexts = []

  // 先检查开关，关闭则跳过后续读取
  var storage = require("@system.storage")
  storage.get({
    key: "homepage_settings",
    success: function(data) {
      try {
        var settings = JSON.parse(data)
        if (!settings.showCountdownDays) {
          instance.showCountdownDays = false
          return  // ← 提前返回，不读 countdownDays 数据
        }
        instance.showCountdownDays = true
        // 读取倒数日列表
        loadCountdownData(instance, settings)
      } catch (e) {
        instance.showCountdownDays = false
      }
    },
    fail: function() {
      instance.showCountdownDays = false
    }
  })
}
```

这样关闭时只做 1 次 storage.get（读 homepage_settings），不做额外读取。

### 4.6 最终结论

| 评估维度 | 结论 |
|---------|------|
| 首页能否承载 | ✅ **完全可以**，架构已支持模块化扩展 |
| 关闭后 DOM 开销 | ✅ **零开销**，`if` 条件渲染不创建 DOM |
| 关闭后模块开销 | ✅ **极低**，仅 1 次 storage.get（约 2ms 异步） |
| 对首页加载时间影响 | ✅ **可忽略**，异步 I/O 不阻塞渲染 |
| 胶囊屏适配 | ✅ **可行**，紧凑单行格式，3 条约 120px |

---

## 五、实施计划建议

### 5.1 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/pages/index-full/index-full.ux` | 修改 | 新增倒数日模板 + 模块注册 + private 数据 |
| `src/pages/index-full/modules/countdown.js` | **新增** | 倒数日模块（init/destroy） |
| `src/pages/homepage-settings/homepage-settings.ux` | 修改 | 新增倒数日开关 + 管理入口 |
| `src/pages/countdown-manage/countdown-manage.ux` | **新增** | 倒数日管理页面（增删改切换） |
| `src/manifest.json` | 修改 | 注册 countdown-manage 路由 |
| `src/data/store.js` | 可选 | 如需新增专用 get/set 方法 |

### 5.2 数据流

```
countdown-manage.ux (管理页面)
  ├── 添加倒数日 → storage.set("homepage_settings", settings)
  ├── 删除倒数日 → storage.set("homepage_settings", settings)
  ├── 开关切换   → storage.set("homepage_settings", settings)
  └── 返回

    ↓ 写入

storage("homepage_settings")
  ├── showCountdownDays: true/false
  └── countdownDays: [{ title, date, enabled }]

    ↓ 读取

modules/countdown.js (首页模块)
  ├── 读取 homepage_settings
  ├── 计算剩余天数 (date - today)
  ├── 过滤 enabled === true
  └── 设置 instance.countdownDays / showCountdownDays

    ↓ 绑定

index-full.ux 模板
  └── <div if="{{ showCountdownDays && countdownDays.length > 0 }}">
        <div for="{{ item in countdownDays }}">
          <text>{{ item.title }} 剩{{ item.daysLeft }}天</text>
        </div>
      </div>
```

### 5.3 实现步骤

1. **store.js**: 确定数据结构，扩展 `homepage_settings` 默认值
2. **countdown.js 模块**: 新建，实现 init/destroy
3. **index-full.ux**: 添加模板 + 模块注册 + onDestroy 清理
4. **countdown-manage.ux**: 新建管理页面
5. **homepage-settings.ux**: 新增入口
6. **manifest.json**: 注册路由
7. **测试**: 首页显示、关闭不显示、胶囊屏适配

---

## 六、风险与注意事项

| 风险 | 级别 | 处理方式 |
|------|------|---------|
| 胶囊屏空间不足 | 中 | 已评估：3条约120px，在状态栏上方紧凑放置 |
| 存储容量 | 低 | 每个倒数日约100字节，100条才10KB，忽略不计 |
| 日期计算边界 | 低 | 处理负数（已过期显示"已过X天"或隐藏） |
| 模块加载顺序 | 低 | 跟随现有 moduleNames 顺序，倒数日放在 customContent 之后即可 |
| RPK 增量 | 低 | 预计 +3-5KB，远在 1MB 限制内 |

---

## 七、总结

**完全可以承载，且性能影响极小。** 关闭模式下唯一的开销是 1 次异步 storage 读取（约 2ms），不产生任何 DOM 创建或渲染开销。推荐立即开始实现。