# 设置页首次打开黑屏分析

> 复现路径：全新安装 → 启动 App（欢迎页）→ 点「设置」→ 黑屏

---

## 1. 复现条件

| 条件 | 说明 |
|------|------|
| 首次安装 | storage 无任何数据，migration/defaults 触发 |
| 从欢迎页直接进设置 | 跳过了「进入首页」，未经过 index 页初始化 |
| router.push | welcome 页面保留在栈中，settings 叠加在上 |

## 2. 相关代码路径

```
app.ux onCreate()                ← 冷启动入口
  ├── database.init()            ← 异步，加载课表索引
  ├── store.getBaseFontSize()    ← 异步，初始化字号
  ├── migrateFontScale()         ← 异步
  ├── runDefaults()              ← 异步，首次写入默认值，可能 clearCache
  └── initBackgroundRunning()    ← 异步

→ welcome 页 onInit()
  └── store.getTheme()           ← 异步，首次 storage.get

→ 点击「设置」
  └── router.push → settings 页 onInit()
        ├── store.getAvailableThemes()  ← 同步，安全
        ├── store.getTheme()            ← 异步，依赖 _cache
        ├── store.getBaseFontSize(_, true) ← 异步，forceRefresh
        ├── loadNickname()              ← 异步
        └── loadHideWeekend()           ← 异步
```

## 3. 根因分析（按可能性排序）

### 3.1 ⭐ 核心嫌疑：`runDefaults()` 与 settings `onInit` 竞态

```js
// app.ux onCreate
runDefaults()   // 异步，首次运行时会写入 storage 并 clearCache

// settings.ux onInit（几乎同时发生）
store.getTheme(function(t, name) { ... })  // 走 storage.get 或 cache
```

**时序**：
1. `app.ux onCreate` 调用 `runDefaults()`
2. 欢迎页渲染，用户立即点「设置」
3. settings 页 `onInit` 调用 `store.getTheme()`
4. 此时 `runDefaults()` 可能正在执行，Apply 完成后调用 `store.clearCache()`
5. 如果 `clearCache` 发生在 settings 的 `getTheme` 回调之前 → `_cache.theme` 被清空
6. 但 settings 的 `getTheme` 已经发起了 `storage.get`，回调时应该正常返回。**通常不会黑屏**，除非 storage API 同时被多方调用导致异常

**更危险的场景**：如果 `runDefaults()` 的 `storage.set` 与 settings 的 `storage.get` 发生底层竞态，某些 quickapp 引擎的 storage 实现不是线程安全的，可能导致回调被丢弃 → 页面永远等不到 theme 数据，但 UI 默认值已渲染，理论上不会黑屏。

### 3.2 ⭐⭐ 高概率嫌疑：`scroll` + `flex:1` 首次高度坍塌

```css
.settings-page {
  height: 100%;       /* 依赖父容器高度 */
}
.settings-scroll {
  flex: 1;            /* 依赖 .settings-page 的实际高度 */
}
.settings-body {
  padding: 44px 10px 12px 10px;
}
```

**问题**：
- `.settings-page` 的 `height: 100%` 依赖其父容器（quickapp 的 page 容器）
- 首次从 welcome `router.push` 到 settings 时，quickapp 引擎可能需要一帧来布局 page 容器
- 如果 page 容器在首帧高度为 0，`.settings-page` → `.settings-scroll` 全部高度为 0
- `.settings-body` 的 padding 也是 0 高度内，内容不可见 → **黑屏**

**为什么后续打开不会？**
- 第二次进入 settings 时，page 容器已经布局过，高度缓存可用
- 或者 welcome→index→settings 的路径中，index 页触发了一次完整布局

**验证方法**：
- 在 settings 页给 `.settings-page` 加 `min-height: 100%` 看是否修复
- 去掉 scroll，直接用 div 看是否复现

### 3.3 ⭐⭐ 可能嫌疑：`<import>` 组件加载失败

```html
<import name="unlock-dialog" src="../../components/unlock-dialog"></import>
```

- 首次访问 settings 页时，unlock-dialog 组件需要从磁盘编译加载
- 如果编译失败或超时，部分 quickapp 引擎会阻止整个页面渲染
- unlock-dialog 的 `show="{{ visible }}"` 默认 `visible: false`，组件不显示，但 **import 本身就可能触发引擎加载**

**验证方法**：注释掉 `<import>` 行看是否复现。

### 3.4 ⭐ 低概率嫌疑：`store.getBaseFontSize(_, true)` 双开

```js
// app.ux onCreate
store.getBaseFontSize(function(size) { ... })  // storage.get "baseFontSize"

// settings.ux onInit（同时）
store.getBaseFontSize(function(size) { ... }, true)  // forceRefresh 也 storage.get
```

同一 key 同时发起两个 `storage.get`，某些引擎可能只回调一次，导致另一个 callback 丢失。settings 的 `displaySize` 保持初始值 48，但这不是黑屏的直接原因。

### 3.5 低概率：welcome 页已 pop 或被覆盖

如果某些 quickapp 版本在 `router.push` 时行为异常（比如把 welcome 从视图树移除但没正确挂载 settings），可能出现黑屏。概率较低。

---

## 4. 推荐修复优先级

| 优先级 | 方案 | 改动量 | 说明 |
|--------|------|--------|------|
| P0 | 给 `.settings-page` 加 `min-height: 100%` | 1 行 CSS | 防止 flex scroll 高度坍塌 |
| P1 | settings `onInit` 加兜底渲染锁 | 少量 JS | theme 未就绪时显示 loading 占位 |
| P2 | `onInit` 中 `store.getTheme` 先取同步默认值 | 少量 JS | `store.getThemeSync()` 立即返回默认值 |
| P3 | 考虑移除 settings 页的 `scroll` 组件 | 模板改动 | 测试是否 scroll 导致首帧异常 |
| P4 | 欢迎页加短暂延迟后再允许点「设置」 | UX 改动 | 等 app.ux onCreate 完成 |

---

## 5. 快速验证命令

```bash
# 1. 注释 unlock-dialog import，构建部署，看是否复现
# 2. .settings-page 加 min-height，构建部署，看是否复现
# 3. 去掉 scroll 组件，改用普通 div，看是否复现
```

---

## 6. 补充观察

- 如果黑屏后按返回键能回到欢迎页且欢迎页正常，说明是 settings 页自身的渲染问题，不是全局 crash
- 如果黑屏后按任何键都没反应，可能是 settings 页的 JS 抛了未捕获异常导致页面卡死