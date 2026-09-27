# 分析：设置 `entry: "pages/index-full"` 白屏问题

## 现象

在 `manifest.json` 的 `router.entry` 设置为 `"pages/index-full"` 时，应用启动后出现白屏，无法正常显示。但改为 `"pages/welcome"` 作为入口，再从 welcome 页面点击进入 index-full 则正常。

## 涉及的代码文件

| 文件 | 路径 |
|------|------|
| manifest.json | [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json) |
| app.ux | [app.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/app.ux) |
| welcome.ux | [welcome.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/welcome/welcome.ux) |
| index-full.ux | [index-full.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/index-full.ux) |
| database.js | [database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js) |
| class-list.js | [class-list.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/modules/class-list.js) |

---

## 对比分析

### 场景 A：entry = `"pages/welcome"` （正常工作流程）

```
冷启动
  │
  ├─ app.ux onCreate()
  │   ├─ database.init()         → ensureReady → initStorage() 开始异步执行
  │   ├─ authStore.initAuth()
  │   └─ store.getBaseFontSize()
  │
  ├─ welcome.ux onInit()         ← 轻量级页面，只加载 theme 和 homepage settings
  │   └─ 页面渲染完成，显示 "进入标准页" 按钮 + 倒计时
  │
  │   ... 用户等待/点击（3秒+）...
  │   ... 此时 initStorage() 已完成，ready = true ...
  │
  └─ router.replace("/pages/index-full")
      │
      ├─ index-full.ux 脚本解析
      │   ├─ require(store)      ← 已缓存（welcome 已加载过）
      │   ├─ require(database)   ← 已缓存（app.ux 已加载过）
      │   ├─ require(8 modules)  ← 首次加载，但系统已稳定
      │   └─ device.getInfo()    ← 异步，此时系统已就绪
      │
      ├─ index-full.ux onInit()
      │   ├─ database.init(cb)   → ensureReady → ready=true → cb 立即执行 ✓
      │   ├─ database.getAllCourses() → ensureReady → ready=true → 立即执行 ✓
      │   └─ initAllModules()     → 8 个模块依次初始化 ✓
      │
      └─ isLoading = false → 页面正常渲染 ✓
```

### 场景 B：entry = `"pages/index-full"` （白屏流程）

```
冷启动
  │
  ├─ app.ux onCreate()
  │   ├─ database.init()         → ensureReady → ready=false → pendingCallbacks=[cb0]
  │   │                           → pendingCallbacks.length=1 → initStorage() 异步执行中...
  │   ├─ authStore.initAuth()
  │   └─ store.getBaseFontSize()
  │
  ├─ index-full.ux 脚本解析      ← 此时系统刚启动，资源紧张
  │   ├─ require(store)          ← 首次加载，需读取文件系统
  │   ├─ require(database)       ← 首次加载
  │   ├─ require(8 modules)      ← 8 个模块各 require 自己的依赖
  │   │   ├─ clock.js
  │   │   ├─ quick-add.js
  │   │   ├─ day-nav.js
  │   │   ├─ status-bar.js
  │   │   ├─ custom-content.js
  │   │   ├─ pinned-pages.js
  │   │   ├─ bottom-buttons.js
  │   │   └─ class-list.js      ← 自己也 require(store) + device.getInfo()
  │   └─ device.getInfo()        ← 异步，此时系统未就绪
  │
  ├─ index-full.ux onInit()
  │   ├─ database.init(cb1)     → ensureReady → ready=false
  │   │                           → pendingCallbacks=[cb0, cb1]
  │   │                           → length=2 > 1 → return (不重复 initStorage) ← 关键！
  │   │
  │   └─ 设置 8 秒超时 timer
  │
  ├─ [问题点1] 模板渲染
  │   └─ isCapsule = false（device.getInfo 尚未回调）
  │      → 胶囊屏设备上，按方形屏布局渲染 → 元素溢出/错位 → 白屏
  │
  ├─ [问题点2] 如果 initStorage() 中的异步操作耗时过长
  │   └─ isLoading 一直为 true → 只显示 "加载中..."
  │      → 8 秒后超时 → loadError = true → "数据加载失败"
  │
  └─ [问题点3] 如果 require(8 modules) 过程中任一模块抛出异常
      └─ 整个页面脚本执行失败 → 模板绑定全部失效 → 纯白屏
```

---

## 根因分析

### 根因 1：冷启动时 index-full 的模块加载过重

`index-full.ux` 在 `<script>` 顶层通过 `require()` 同步加载了 **8 个子模块**，每个子模块又有自己的依赖链。在冷启动阶段，文件系统 I/O 和 JS 解析都集中在同一时刻，对于手表设备（CPU 和内存有限）可能：

- 解析时间过长，超出框架的页面加载超时限制
- 内存峰值过高导致 GC 频繁，拖慢渲染
- 某个模块加载失败导致整个页面脚本执行中断

而 `welcome.ux` 只加载了 `store` 一个依赖，非常轻量。

### 根因 2：`ensureReady` 的并发调用设计

[database.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/data/database.js#L125-L131) 中的 `ensureReady` 函数：

```javascript
function ensureReady(callback) {
  if (ready) {
    callback()
    return
  }
  pendingCallbacks.push(callback)
  if (pendingCallbacks.length > 1) return  // ← 第二个调用者直接返回，不重复 init
  initStorage()
}
```

当 entry 是 `index-full` 时：

1. `app.ux` 调用 `database.init()` → push cb0 → initStorage() 开始
2. `index-full.ux` 调用 `database.init(cb1)` → push cb1 → length=2 → **直接 return**

此时 `cb1`（index-full 的回调）被放入 `pendingCallbacks`，等待 `initStorage` 完成。但如果 `initStorage` 中的异步操作（`loadScheduleIndex` → `migrateOldData` → `storage.set`）因为某种原因卡住或失败，`cb1` 就永远不会被调用，`database.getAllCourses` 也不会执行，导致 `isLoading` 永远为 `true`，页面一直处于"加载中"状态，看起来像白屏。

对比 welcome 场景：用户点击进入 index-full 时，`initStorage` 早已完成，`ready = true`，回调立即执行。

### 根因 3：`device.getInfo()` 的异步时序问题

[index-full.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/index-full.ux#L118-L125) 和 [class-list.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/modules/class-list.js#L8-L13) 都在顶层调用了异步的 `device.getInfo()`：

```javascript
var isCapsuleScreen = false
device.getInfo({
  success: function(data) {
    isCapsuleScreen = (shape === "capsule" || shape === "pill-shaped")
  }
})
```

`isCapsuleScreen` 初始值为 `false`。在冷启动时，`device.getInfo` 的回调可能延迟较久。在此期间：

- 模板已开始渲染，`isCapsule: false`
- 胶囊屏设备的实际屏幕宽度约为方形屏的一半
- 按方形屏布局渲染（字体 48px、padding 等）在胶囊屏上会导致元素严重溢出
- 快应用框架检测到布局异常后可能直接显示白屏

而 welcome 页面布局简单（居中文本+按钮），对屏幕尺寸不敏感。

### 根因 4：`$forceUpdate()` 缺失

对比两个页面的 `onInit`：

**welcome.ux onInit** 末尾没有 `$forceUpdate()`，因为它只是设置数据，模板会自动响应。

**index-full.ux onInit** 末尾也没有 `$forceUpdate()`。但 `initAllModules()` 中有多处 `try { self.$forceUpdate() } catch (e) {}`。如果 `initAllModules` 从未被调用（因为 `database.init` 的回调未触发），页面数据从未更新，模板可能停留在未初始化状态。

---

## 总结

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| 冷启动模块加载过重 | ⭐⭐⭐⭐⭐ | index-full 同步 require 8 个子模块，手表设备可能超时或 OOM |
| ensureReady 并发调用 | ⭐⭐⭐⭐ | 两次 database.init() 竞态，cb1 可能永不触发 |
| device.getInfo 异步时序 | ⭐⭐⭐ | 胶囊屏设备初始渲染布局错误 |
| welcome 作为缓冲层 | 设计意图 | welcome 页面轻量启动，给 app 初始化和用户交互留出时间 |

**核心结论**：`pages/welcome` 不是 bug 的 workaround，而是**有意设计**的启动缓冲页。它确保在进入重量级的 `index-full` 之前，app 已完成初始化（database ready、storage ready、模块缓存预热），从而避免冷启动时的各种竞态和性能问题。

---

## 如果一定要直接 entry 到 index-full 的修复建议

1. **将 `database.init()` 改为幂等且安全的重入调用**：确保即使 app.ux 和 index-full 同时调用 init，回调也能正确触发
2. **将 `device.getInfo()` 改为同步获取或在 onInit 中等待**：确保 `isCapsule` 在首次渲染前已确定
3. **延迟加载子模块**：将 8 个 `require()` 从模块顶层移到 `onInit()` 内部，避免阻塞启动
4. **添加启动骨架屏**：确保 `isLoading: true` 时有可见的 loading UI，而非空白