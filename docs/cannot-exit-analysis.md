# 安装后无法退出应用 — 根因分析

## 一、现象

用户安装 Ev课程表 手环快应用后，在首页或设置页面按返回键（物理返回键 / 侧滑返回），无法退出应用。

---

## 二、当前页面栈与返回逻辑

### 2.1 入口路由

```json
// src/manifest.json
{
  "router": {
    "entry": "pages/welcome"   // 启动后最先加载欢迎页
  }
}
```

### 2.2 页面跳转链路

```
启动 → welcome（欢迎页）
         ├── 点击「进入首页」→ router.replace("/pages/index") → index（首页）
         │                                                        └── onBackPress → app.exit() ✅ 唯一出口
         └── 点击「设置」→ router.push("/pages/settings") → settings（设置页）
                                  └── 返回 → router.back() → welcome
                                                               └── 按返回 → ??? ❌ 无处理
```

### 2.3 全仓 onBackPress 扫描

```
$ grep -rn "onBackPress" src/
src/pages/index/index.ux:470:  onBackPress() {

结果：全仓仅 1 处
```

| 页面 | `onBackPress` | `goBack` 行为 | 能否退出 |
|------|:---:|---|:---:|
| **welcome**（入口页） | ❌ 无 | 无返回按钮 | ❌ |
| **index**（首页） | ✅ `app.exit()` | `router.back()` | ✅（仅限此页） |
| **settings**（设置） | ❌ 无 | `router.back()` | ❌ |
| homepage-settings | ❌ 无 | `router.back()` | ❌ |
| detail / add-course / week-view 等全部二级页 | ❌ 无 | `router.back()` | ❌ |
| app.ux（全局） | ❌ 无 | — | ❌ |

---

## 三、根因分析

### 根因 1：仅 index 页有退出逻辑，其他页面按返回只回退不退出

`index.ux` 第 470-474 行：

```javascript
onBackPress() {
    var app = require("@system.app")
    app.exit()
    return true
}
```

这是全仓 **唯一** 的退出实现。其他所有页面（包括入口页 `welcome`）都没有 `onBackPress`，它们的 `goBack()` 只是 `router.back()`——在页面栈中后退一格，不会退出应用。

### 根因 2：welcome 作为入口页没有退出处理

`welcome.ux` 是 `manifest.json` 中 `router.entry` 指定的入口页。当用户在 welcome 页按返回键时：

- welcome 没有 `onBackPress`
- 系统默认行为：在某些快应用运行时上，入口页按返回 **不会退出**，而是无响应
- 在小米手环/手表上尤其常见——系统不会自动 kill 入口页面的快应用

**触发路径：**

```
welcome → 点击「设置」→ settings
settings → 返回 → welcome（栈底，只有这一页了）
welcome → 按返回键 → 无反应 ❌
```

### 根因 3：`router.replace` 可靠性存疑

`welcome.ux` 的 `enterSchedule()` 使用 `router.replace()` 跳转首页：

```javascript
// welcome.ux 第 83-87 行
enterSchedule() {
    var router = require("@system.router")
    var uri = "/pages/" + this.targetPage
    router.replace({ uri: uri })
}
```

`router.replace` 的语义是「替换当前页」。如果快应用运行时没有正确替换入口页（某些版本/设备有 bug），页面栈可能变成：

```
[welcome, index]   ← welcome 没被替换掉，index 被 push 到上面
```

此时 index 的 `onBackPress` 虽然调用了 `app.exit()`，但如果 `app.exit()` 在某些设备上不生效（见根因 4），用户按返回会回到 welcome，然后卡住。

### 根因 4：`@system.app.exit()` 兼容性风险

```javascript
var app = require("@system.app")
app.exit()
```

`@system.app.exit()` 在部分快应用运行时（尤其是较旧版本的手环/手表系统）上可能：
- 不被支持（方法不存在，静默失败）
- 被系统拦截（安全策略不允许应用自退出）
- 仅仅最小化应用而非真正退出

没有 fallback 机制，一旦 `exit()` 无效，用户无路可退。

---

## 四、用户操作路径 × 退出结果矩阵

| 操作路径 | 最后一页 | 有 `onBackPress`? | 按返回结果 |
|----------|---------|:---:|------|
| 启动 → 进入首页 → 按返回 | index | ✅ | `app.exit()`，**可能退出** |
| 启动 → 按返回 | welcome | ❌ | **无反应** |
| 启动 → 设置 → 返回 → 按返回 | welcome | ❌ | **无反应** |
| 首页 → 设置 → 返回(welcome) → 按返回 | welcome | ❌ | **无反应** |
| 首页 → 课程详情 → 返回 → 首页 → 按返回 | index | ✅ | `app.exit()` |
| 首页 → 设置 → 首页设置 → 返回 → 返回(welcome) | welcome | ❌ | **无反应** |

**结论：只要用户最后停在 welcome 页（或任何非 index 页），按返回键就无法退出。**

---

## 五、修复建议

### 5.1 方案 A：在 welcome 页加 `onBackPress`（推荐，最小改动）

```javascript
// welcome.ux 的 export default 中增加：
onBackPress() {
    var app = require("@system.app")
    app.exit()
    return true
}
```

**优点**：一行代码，覆盖入口页退出场景。
**缺点**：仍依赖 `app.exit()` 的兼容性。

### 5.2 方案 B：在 `app.ux` 全局注册 `onBackPress`

在 `app.ux` 的 `onCreate` 或顶层注册全局返回拦截：

```javascript
onBackPress() {
    // 如果当前页面栈只剩 1 页（入口页），退出
    var app = require("@system.app")
    app.exit()
    return true
}
```

**优点**：兜底所有页面。
**缺点**：可能影响正常的页面内返回逻辑，需判断当前是否为根页面。

### 5.3 方案 C：`app.exit()` 失败时的 fallback

```javascript
onBackPress() {
    try {
        var app = require("@system.app")
        app.exit()
    } catch (e) {
        // fallback: 跳转系统桌面
        var router = require("@system.router")
        router.back()  // 至少尝试回到上一页
    }
    return true
}
```

### 5.4 推荐组合：A + C

1. welcome 页增加 `onBackPress` → 覆盖入口页退出
2. 增加 try/catch 兜底 → 防止 `exit()` 静默失败
3. index 页保留现有 `onBackPress` → 首页退出已有覆盖

---

## 六、涉及文件

| 文件 | 问题 |
|------|------|
| [welcome.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/welcome/welcome.ux) | **缺少 `onBackPress`**，入口页无法退出 |
| [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L470-L474) | 有 `onBackPress` 但仅限本页，且无 fallback |
| [app.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/app.ux) | 无全局 `onBackPress`，无退出兜底 |
| [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json#L55) | `entry: "pages/welcome"` — welcome 是入口页，必须有退出能力 |

---

## 七、修复记录（2026-09-19）

> ⚠️ 本文档 §2.3 / 根因 1 / 根因 2 基于**旧代码快照**（当时 `welcome` 确实没有 `onBackPress`）。当前代码中 welcome **已补上** `onBackPress`，但该 bug 仍然存在，说明**真正的根因是根因 4 的变体**，见下。

### 7.1 真正的根因：返回键被"吃掉"却什么也没做

修复前的写法（`welcome.ux` / `index.ux` 相同）：

```javascript
onBackPress() {
  try {
    var app = require("@system.app")
    app.exit()
  } catch (e) {}   // ← 异常被静默吞掉
  return true      // ← 无论退出成功与否，都拦截返回键
}
```

`onBackPress` 返回 `true` 的语义是"**已消费返回键，阻止系统默认行为**"。因此：

- 若 `app.exit()` 在当前运行时**不存在或被拦截** → 抛异常 → 被 `catch(e){}` 吞掉 → 什么都没发生；
- 但函数仍 `return true` → **系统默认的返回/退出行为被拦截**；
- 结果：用户按返回键**毫无反应**，主观感受就是"装了就退不出去"。

这与用户反馈的现象完全吻合，也解释了为什么"补一个 `onBackPress` 就好了"（§5.1 方案 A）**没能真正修好**。

### 7.2 修复方案

| # | 改动 | 文件 |
|:--:|:---|:---|
| 1 | 新增 `exitApp()`：依次探测 `exit` / `terminate` / `finish` 三种退出入口，返回是否成功调用 | `src/data/utils.js` |
| 2 | `onBackPress` 改为**只有退出成功才 `return true`**，失败则 `return false` 交还系统默认行为 | `welcome.ux`、`index.ux` |
| 3 | welcome 页新增**显式「退出」按钮**作为最后兜底（返回键在某些运行时可能完全不响应） | `welcome.ux` |
| 4 | 退出入口全部不可用时 toast 提示「请用系统手势退出应用」，避免"点了没反应" | `welcome.ux` |
| 5 | 顺带修正 welcome 页按钮高度：胶囊屏 `40px → 48px`、圆屏 `44px → 48px`（此前未纳入核心页评估，低于 48px 规范） | `welcome.ux` |

修复后的核心逻辑：

```javascript
onBackPress() {
  var utils = require("../../data/utils.js")
  return utils.exitApp() === true   // 成功才拦截，失败交还系统
}
```

### 7.3 仍需真机确认

- 目标设备上 `@system.app` 实际暴露的是 `exit` / `terminate` / `finish` 中的哪一个（现为逐个探测，兼容三者）
- 若三者**均不存在**，则依赖"交还系统默认行为"（`return false`）——此时需确认系统默认行为是否真能退出入口页；若不能，用户仍只能靠显式「退出」按钮或系统手势/后台清理