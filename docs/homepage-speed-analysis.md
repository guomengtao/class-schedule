# 首页打开速度优化分析

> 分析日期：2026-09-15
> 
> 目的：对比优化前后首页加载速度，评估当前打开速度是否合格，识别剩余瓶颈。

---

## 目录

1. [优化前基线（v1.4.x 以前）](#1-优化前基线)
2. [已实施优化清单](#2-已实施优化清单)
3. [优化后实测估算](#3-优化后实测估算)
4. [速度是否合格](#4-速度是否合格)
5. [剩余瓶颈](#5-剩余瓶颈)
6. [后续优化方向](#6-后续优化方向)

---

## 1. 优化前基线

优化前，标准首页 `index-full.ux` 的完整加载链路：

```
用户打开应用
  → welcome.ux (倒计时，默认 3 秒)
    → router.replace → index-full.ux
      → onInit:
        → isLoading = true
        → store.getTheme()                    [storage.get ×1]    ~10-50ms
        → loadHomepageSettings()              [storage.get ×1]    ~10-50ms
        → loadFontScale()                     [storage.get ×1]    ~10-50ms
        → database.init()
          → loadScheduleIndex()               [storage.get ×1]    ~10-50ms
          → migrateOldData()                  [storage.get ×2~3]  ~20-150ms
        → database.getAllCourses()            [storage.get ×1]    ~10-50ms
        → initAllModules() ×9
          ├── clock.init()                    [console.log ×3]    ~1-3ms
          ├── quickAdd.init()                 [console.log ×3]    ~1-3ms
          ├── dayNav.init()                   [storage.get ×1 + console.log ×3]
          ├── statusBar.init()                [console.log ×3]
          ├── customContent.init()            [storage.get ×1 + console.log ×3]
          ├── pinnedPages.init()              [storage.get ×1 + console.log ×3]
          ├── bottomButtons.init()            [console.log ×3]
          ├── weekIndicator.init()            [console.log ×3]
          └── classList.init()                [storage.get ×2 + console.log ×3]
        → isLoading = false

onShow() 紧随 onInit 触发（首次进入）
├── store.getTheme()                          [storage.get ×1]   重复！
├── loadHomepageSettings()                    [storage.get ×1]   重复！
├── loadFontScale()                           [storage.get ×1]   重复！
├── loadPinnedPages()                         [storage.get ×1]   重复！
├── quickAdd.loadPreset()                     [storage.get ×1]
└── getAllCoursesWithIndex()                  [storage.get ×1]   重复！
    → refreshClasses()
    → $forceUpdate()
```

### 瓶颈统计

| 瓶颈 | 问题 | 影响 |
|------|------|------|
| 模块脚本同步 require ×9 | 782 行 JS 在页面渲染前全部解析执行 | ~50-100ms |
| console.log ×24+ (模块内) | 每次 I/O flush 到调试桥 | ~20-50ms |
| storage.get 重复读取 | `homepage_settings` 读 2 次，`currentScheduleIndex` 读 2 次 | ~20-100ms |
| onShow() 重复加载全部数据 | 首次进入时 onInit 和 onShow 串行执行相同逻辑 | 整体翻倍 |
| 数据库迁移串行操作 | migrateOldData 每次检查 storage | ~50-200ms（首次） |
| 倒计时 3 秒无预加载 | 等待期间首页未开始加载 | 感知延迟 +3s |

**优化前总体加载时间：首次 2-4 秒（含倒计时则 5-7 秒），再次进入（onShow）额外 0.5-2 秒。**

---

## 2. 已实施优化清单

### 2.1 ✅ 删除模块文件中的所有 console.log（commit 2144875）

| 项目 | 详情 |
|------|------|
| 影响文件 | 9 个模块文件（clock.js, quick-add.js, day-nav.js, status-bar.js, custom-content.js, pinned-pages.js, bottom-buttons.js, week-indicator.js, class-list.js） |
| 删除数量 | 约 24 条 console.log 语句 |
| 收益 | 减少 I/O flush，每个 `console.log` 在 Vela 手环上约 1-3ms |
| 估值 | **减少 20-50ms** |

> 注意：`index-full.ux` 主文件仍有 21 条 console.log，这些是页面级日志，对调试有价值但也可进一步精简。

### 2.2 ✅ store.js 内存缓存（commit 6031b95 前后）

在 `store.js` 中新增 `_cache` 对象，缓存以下数据：

| 缓存 key | getter | setter 清除 | 收益 |
|------|------|------|------|
| `theme` / `themeName` | `getTheme(callback, forceRefresh)` | `setTheme()` | onInit/onShow 各省 1 次 storage 读取 |
| `homepageSettings` | `getHomepageSettings(callback, forceRefresh)` | `setHomepageSettings()` | onInit 和 customContent.init 合为 1 次 |
| `baseFontSize` | `getBaseFontSize(callback, forceRefresh)` | `setBaseFontSize()` | onInit/onShow 各省 1 次 |
| `fontSizes` | `getFontSizes(callback)` | `setBaseFontSize()` | 计算密集型缓存 |
| `defaultHomepage` | `getDefaultHomepage(callback, forceRefresh)` | `setDefaultHomepage()` | 启动页配置缓存 |

```javascript
// store.js 核心缓存逻辑
var _cache = {}

getHomepageSettings: function(callback, forceRefresh) {
  if (!forceRefresh && _cache.homepageSettings) {
    callback(_cache.homepageSettings)  // 命中缓存，跳过 storage.get
    return
  }
  storage.get({ key: "homepage_settings", ... })
}
```

**估值：减少 storage.get 调用 4-6 次/页面生命周期，节省 40-300ms。**

### 2.3 ✅ database.js 课程缓存

```javascript
var _cache = {}       // 按 scheduleIndex 缓存课程数据
var _cacheDirty = {}  // 脏标记

getAllCoursesWithIndex: function(index, callback) {
  if (!_cacheDirty[index] && _cache[index] !== undefined) {
    callback(_cache[index])  // 命中缓存，跳过 storage.get + JSON.parse
    return
  }
  storage.get(...)
}
```

写操作（insertCourse/updateCourse/deleteCourse）后自动 `delete _cache[index]`，保证数据一致性。

**估值：onShow 中 getAllCoursesWithIndex 从 100-500ms 降至近乎瞬时。**

### 2.4 ✅ `initialized` flag 防止 onShow 重复加载

```javascript
onInit() {
  self.initialized = false
  // ... 加载逻辑 ...
  database.getAllCourses(function(schedule) {
    self.initAllModules()
    self.initialized = true   // 标记完成
    self.isLoading = false
  })
}

onShow() {
  if (!self.initialized) {
    return  // 首次进入时跳过，onInit 正在执行
  }
  // 仅做必要的缓存刷新
}
```

**估值：首次进入时 onShow 不再产生额外 I/O，节省 200-500ms。**

### 2.5 ✅ 迁移标记缓存

```javascript
var _migrationDone = false
// 首次迁移后设置 _migrationDone = true
// 后续启动跳过 storage 检查
```

**估值：每次启动减少 50-200ms（首次迁移后）。**

### 2.6 ✅ 8 秒超时兜底

```javascript
self._loadTimeout = setTimeout(function() {
  if (self.isLoading) {
    self.loadError = true
    self.isLoading = false
    self.$forceUpdate()
  }
}, 8000)
```

防止极端情况下数据库初始化卡死导致永久白屏。

### 2.7 ❌ 已回退：禁用模块跳过初始化

原因：异步时序问题导致手环黑屏。
- 尝试 1 (2144875)：`skipMap` 跳过禁用模块的 init → 黑屏
- 尝试 2 (475f7cc)：只跳过计时器/数据加载，仍调用 init → 仍异常
- 回退 (7681a5f)：恢复无条件 initAllModules

**该优化方向已尝试但失败，属于"尝试过但不可行"。**

---

## 3. 优化后实测估算

由于 Vela 手环上没有精确的性能计时 API，以下为基于 I/O 次数变化的估算值。

### 3.1 storage.get 调用次数对比

| 场景 | 优化前 | 优化后 | 减少 |
|------|:-----:|:-----:|:---:|
| 首次 onInit | 7-9 次 | 7-9 次 | 0（首次仍需读） |
| 首次 onShow（紧随 onInit） | 7 次 | 0 次 | **-7 次** |
| 二次进入 onShow（从设置页返回） | 7 次 | ~2 次 | **-5 次** |
| 三次进入 onShow | 7 次 | 0 次（全部命中缓存） | **-7 次** |

### 3.2 加载时间估算

| 阶段 | 优化前 | 优化后 | 节省 |
|------|--------|--------|------|
| 模块 JS 解析（console.log 删除前） | ~100ms | ~80ms | ~20ms |
| onInit 数据加载 | 200-500ms | 200-500ms | 0ms（首次仍需） |
| initAllModules（9 模块） | 100-300ms | 100-300ms | 0ms（无跳过逻辑） |
| onShow 重复加载 | 200-500ms | **0ms** | **200-500ms** |
| **首次总耗时（不含倒计时）** | **1.5-3s** | **1.0-2s** | **0.5-1s** |
| **含倒计时感知耗时** | **5-7s** | **4.5-5.5s** | **0.5-1.5s** |
| **二次进入 onShow（从其他页返回）** | **0.5-2s** | **近乎瞬时** | **0.5-2s** |

### 3.3 视觉体验对比

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 首次打开 | "加载中..." 2-4 秒 | "加载中..." 1-2 秒 |
| 从设置返回 | 再次显示短暂"加载中..." | 即时显示，无感知延迟 |
| 切换课程表 | 重新加载全部数据 | 缓存命中，即时切换 |

---

## 4. 速度是否合格

### 4.1 判定标准

对于智能手环应用（Vela JS 框架，资源受限的嵌入式环境）：

| 标准 | 时间 | 说明 |
|------|------|------|
| 优秀 | < 1 秒 | 用户感知为"秒开" |
| 合格 | 1-2 秒 | 可接受的短暂等待 |
| 勉强 | 2-3 秒 | 用户会注意到等待，体验一般 |
| 不合格 | > 3 秒 | 明显卡顿，可能被用户放弃 |

### 4.2 当前首页判定

| 指标 | 当前值 | 判定 |
|------|--------|:--:|
| 首次加载（不含倒计时） | 1-2 秒 | 🟡 合格 |
| 首次加载（含倒计时感知） | 4.5-5.5 秒 | 🔴 不合格（感知上太长） |
| 二次进入 onShow | < 0.1 秒 | 🟢 优秀 |
| 切换课程表 | < 0.1 秒 | 🟢 优秀 |

### 4.3 结论

**首次加载速度已从"不合格"提升至"合格"，但仍有改进空间。**

- ✅ **核心加载（onInit data loading）：合格** — 1-2 秒在嵌入式手环上是可接受的
- 🔴 **含倒计时感知时间：不合格** — 4.5-5.5 秒太长，需要倒计时预加载
- 🟢 **二次进入：优秀** — 缓存机制使 onShow 几乎瞬时完成
- 🟢 **切换操作：优秀** — 课程缓存使日常操作流畅

**最大问题不是缓存不够，而是倒计时的 3 秒被浪费了。这 3 秒完全可以用来并行加载首页数据。**

---

## 5. 剩余瓶颈

### 5.1 🔴 倒计时 3 秒无预加载（最大瓶颈）

```
现状：
  welcome.ux (倒计时，默认 3 秒)
    -> 3 秒后 router.replace -> index-full.ux
      → onInit 开始加载数据 (1-2 秒)
      → 总感知时间: 3 + 1~2 = 4-5.5 秒

理想：
  welcome.ux (倒计时，默认 3 秒)
    -> 并行：database.init() 开始
    -> 3 秒后 router.replace -> index-full.ux
      → onInit 发现数据已就绪 → 直接渲染
      → 总感知时间: 3 秒 (加载在倒计时期间完成)
```

**这个优化的收益是最大的：感知时间直接减少 1-2 秒。**

### 5.2 🟡 index-full.ux 仍有 21 条 console.log

```
console.log count in src/pages/index-full/index-full.ux: 21
```

模块文件中已删除全部 console.log，但主文件保留。每条 console.log 在 Vela 手环上约 1-3ms，21 条约 20-60ms。

### 5.3 🟡 initAllModules 无条件初始化全部 9 个模块

即使用户在设置中关闭了时钟、快捷添加等功能，这些模块仍然被初始化。skipModules 优化因异步黑屏问题已回退。

### 5.4 🟡 storage.get 首次仍需逐条读取

首次 onInit 的所有 storage.get 仍然是串行的：theme → homepageSettings → fontScale → scheduleIndex → allCourses。没有并行化。

### 5.5 🟢 无骨架屏

当前显示的是文字"加载中..."，不是结构性骨架屏。骨架屏已记录为待实施项。

---

## 6. 后续优化方向

### 优先级排序

| 优先级 | 优化项 | 预期收益 | 改动量 | 风险 |
|:--:|------|:--:|:--:|:--:|
| P0 | 倒计时预加载 database.init() | **感知时间 -1~2s** | 中 | 低 |
| P1 | 删除 index-full.ux 中的 debug console.log | 20-60ms | 小 | 低 |
| P1 | 骨架屏替代"加载中..." | 改善感知体验 | 中 | 低 |
| P2 | 并行化 storage.get 读取 | 50-150ms | 中 | 低 |
| P2 | 恢复 skipModules（需解决异步时序） | 50-200ms | 大 | **高（已失败 2 次）** |
| P3 | 懒加载非关键模块（延迟 setTimeout 100ms） | 改善首帧速度 | 小 | 低 |

### P0 倒计时预加载 — 推荐实施方案

在 `welcome.ux` 倒计时期间提前初始化数据库：

```javascript
// welcome.ux onShow 中，倒计时期间并行预加载
var db = require("../data/database.js")
var preloaded = false

onShow() {
  if (!preloaded) {
    preloaded = true
    db.init(function() {
      db.getAllCourses(function(schedule) {
        // 数据就绪，存入临时存储
        getApp()._preloadedSchedule = schedule
      })
    })
  }
  // 倒计时结束后 router.replace 由 doEnter() 正常触发，
  // 此时 _preloadedSchedule 已就绪，index-full.ux 可直接使用
}
```

```javascript
// index-full.ux onInit 中
var app = require("@app")
if (app._preloadedSchedule) {
  self.schedule = app._preloadedSchedule
  app._preloadedSchedule = null
  self.initAllModules()
  self.initialized = true
  self.isLoading = false
} else {
  // 正常加载流程（兜底）
  database.init(function() { ... })
}
```

---

## 附录 A：相关 commit

| commit | 日期 | 内容 |
|--------|------|------|
| `2144875` | 2026-09-15 | perf: delete console.log from all modules; skip init for disabled modules |
| `475f7cc` | 2026-09-15 | fix: always init all modules; only skip timers/data-loading |
| `7681a5f` | 2026-09-15 | fix: restore unconditional module init to fix black screen |
| `6031b95` 等 | 2026-09-04 | store.js/database.js 内存缓存机制 |
| `1f0a13f` | 2026-09-08 | release: 修复手环 9Pro 左上角黑屏 (width/height:100% + forceUpdate) |

## 附录 B：参考文档

| 文档 | 内容 |
|------|------|
| `docs/homepage-performance.md` | 标准首页加载性能分析与优化方案（含缓存机制详解） |
| `docs/homepage-loading-performance-analysis.md` | 首页加载性能分析（16 次 storage.get 详细链路） |
| `analysis-module-acceleration.md` | 首页 8 模块加载分析与加速方案 |