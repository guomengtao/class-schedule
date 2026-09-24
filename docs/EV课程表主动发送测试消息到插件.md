# EV 课程表主动发送测试消息到 AstroBox 插件 · 操作指南

> 对应「同步器根因分析」的 **S1′（决定性步骤）**：让 EV 侧主动发一条消息给插件，验证反向通道是否畅通。
> 当前状态：**插件已确认能拉起 EV**（手环上 EV 课程表能立即打开），但 `ping`/`export` 回包从未到达插件。
> 本指南通过在手环 EV 上添加一个测试按钮，让 EV **主动**向插件发送消息，从而将问题一分为二。

---

## 一、背景与目的

### 1.1 当前困境

| 已知 | 未知 |
|---|---|
| ✅ 插件能拉起 EV（手环立即打开） | ❓ EV 是否收到过 `{action:"ping"}` |
| ✅ 插件 register / send 返回 `Ok` | ❓ EV 是否回了回包 |
| ✅ 宿主→插件事件通路活着（Timer 事件到达） | ❓ 回包有没有被派发回插件 |

**核心障碍**：链路后半段（蓝牙下发 → EV 分发 → 回包路由）完全不可观测，日志看起来一切正常，但就是 0 条 `InterconnectMessage`。

### 1.2 S1′ 的原理

> 之前全是 **插件 → EV** 方向（插件发 ping/export，等 EV 回包），如果 EV 的接收或回包处理有 bug，永远不会知道。
>
> **S1′ 反过来**：在手环 EV 界面上点一个按钮 → EV **主动**调用 `connect.send()` 发消息 → 通过宿主路由回插件。这一步能一刀劈开：

```
EV主动发的能收到 → 插件订阅 + 宿主派发都正常 → 锁定"插件→EV"方向（EV 不认识 action / 时机问题）
EV主动发的也收不到 → 插件订阅或宿主派发有问题 → 与 EV 业务逻辑无关
```

---

## 二、需要改动的文件

### 2.1 `src/app.ux` — 暴露 connect 对象

**问题**：`initSyncReceiver()` 内部创建的 `connect` 是局部变量，外部页面无法调用 `connect.send()`。

**改动**：把 `connect` 存入全局变量，并提供全局函数供各页面调用。

#### 改动 A：声明全局变量（在文件顶部，`var interconnect = null` 附近）

```js
var interconnect = null
var _syncConnect = null          // ← save connect instance globally
```

#### 改动 B：在 `initSyncReceiver()` 中赋值（`connect.onmessage` 之后）

找到 `initSyncReceiver()` 函数，在 `connect.onclose` 回调之后添加：

```js
  connect.onclose = function (data) {
    console.log("[SYNC-EVT] onclose code=" + (data && data.code))
  }
  // ↓↓↓ expose connect for global/page use
  _syncConnect = connect
```

#### 改动 C：新增全局发送函数（放在 `syncReply` 附近）

```js
// test entry for pages to send messages to plugin
function syncSendTestMessage(type) {
  if (!_syncConnect) {
    console.log("[SYNC-TEST] connect not ready yet")
    return
  }
  var msg = null
  if (type === "ping") {
    msg = { action: "ping", fromEv: true, timestamp: Date.now() }
  } else if (type === "hello") {
    msg = { action: "hello", fromEv: true, message: "EV is alive", timestamp: Date.now() }
  } else {
    msg = { action: type || "test", fromEv: true, timestamp: Date.now() }
  }
  console.log("[SYNC-TEST] sending type=" + (type || "test"))
  _syncConnect.send({ data: msg })
  console.log("[SYNC-TEST] send done")
}
```

> **说明**：
> - `fromEv: true` 是自定义标记，让插件侧一眼区分是 EV 主动发还是回包。
> - `timestamp` 便于两边日志对照。
> - `action: "ping"` 复用已有协议，但加了 `fromEv` 标记不会与插件发的 ping 混淆。

### 2.2 `src/pages/tools/tools.ux` — 添加测试按钮

**位置**：在「课程表管理 V2」后面添加一个新的 section。

#### template 改动（在 `</div>` 之前，最后一个 section 之后）

```html
    <!-- ===== Sync Test Section (debug only, remove before release) ===== -->
    <div class="section" style="background-color: {{ theme.card }}">
      <div class="item-row" onclick="syncTestPing">
        <text class="item-label" style="color: {{ theme.accent }}">🔁 Send Ping to Plugin</text>
        <text class="item-hint" style="color: {{ theme.textMuted }}">Reverse Test</text>
      </div>
      <div class="row-divider" style="background-color: {{ theme.border }}"></div>
      <div class="item-row" onclick="syncTestHello">
        <text class="item-label" style="color: {{ theme.accent }}">📤 Send Hello to Plugin</text>
        <text class="item-hint" style="color: {{ theme.textMuted }}">Custom Message</text>
      </div>
    </div>
```

#### script 改动（在 methods 中添加）

```js
  syncTestPing() {
    if (typeof syncSendTestMessage === "function") {
      syncSendTestMessage("ping")
      prompt.showToast({ message: "Test: Ping sent to plugin" })
    } else {
      prompt.showToast({ message: "syncSendTestMessage not defined" })
    }
  },

  syncTestHello() {
    if (typeof syncSendTestMessage === "function") {
      syncSendTestMessage("hello")
      prompt.showToast({ message: "Test: Hello sent to plugin" })
    } else {
      prompt.showToast({ message: "syncSendTestMessage not defined" })
    }
  },
```

> **注意**：快应用的 `prompt` 模块需要 `require("@system.prompt")`，tools.ux 中可能已有，如果没有需要引入。

---

## 三、插件侧预期输出

### 3.1 正常情况（反向通道通）

在 AstroBox 插件日志中应当出现：

```
[event] EventType::InterconnectMessage payload={"action":"ping","fromEv":true,"timestamp":...}
```

或

```
[event] EventType::InterconnectMessage payload={"action":"hello","fromEv":true,"message":"EV is alive",...}
```

插件现有的 `handle_device_message()`（`src/lib.rs:300-409`）会处理 `InterconnectMessage` 事件，日志会出现 `[RX]` 前缀。

### 3.2 异常情况（反向通道不通）

- 日志中 **依然只有** `EventType::Timer`，没有 `InterconnectMessage`
- 这意味着：插件能收到宿主派发的 Timer，但收不到 interconnect 回包 → **问题锁定在宿主的路由/派发层**（与 EV 业务逻辑无关）

### 3.3 预期结论对应表

| 实验结果 | 结论 |
|---|---|
| EV 主动发的消息被插件收到 ✅ | 插件订阅 + 宿主派发正常 → 问题在 **插件→EV 方向**（EV 不认识 ping/export action，或发送时机不对） |
| EV 主动发的消息也收不到 ❌ | **插件订阅或宿主派发有问题**（R4/R6），与 EV 业务逻辑无关 → 需要升级排查到 AstroBox 宿主层 |
| 有时能收到、有时收不到 | 宿主派发有竞态窗口 → 回到 R4（注册/发送间距问题） |

---

## 四、使用流程

### 4.1 准备

1. 确认手环上已安装含上述改动的 EV 课程表 RPK（版本号可在工具页看到）
2. 确认 AstroBox 插件已安装且 EV 在线
3. 准备查看插件日志的方法（AstroBox 日志界面 / adb logcat）

### 4.2 操作步骤

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 在 AstroBox 中打开 EV Schedule Sync 插件 | 插件连接状态显示正常 |
| 2 | 在插件中点「Ping 探针」验证已有流程 | 日志显示 `send=Ok`（但可能无回包） |
| 3 | **手环上打开 EV 课程表 → 进入「工具」页** | — |
| 4 | 点击「发送 Ping 给插件」按钮 | 手环显示 toast「已发送 Ping 到插件」 |
| 5 | 立即查看插件日志 | 期待出现 `InterconnectMessage` |
| 6 | 再点「发送 Hello 给插件」 | 重复确认，排除单次偶然性 |
| 7 | **连点 3~5 次**，记录每次是否成功 | 排除竞态窗口 |

### 4.3 注意事项

- **发版前记得删除测试代码**：`app.ux` 中的 `_syncConnect`、`syncSendTestMessage`，以及 `tools.ux` 中的测试 section。
- Toast 提示使用 `prompt.showToast`，如果设备不支持可改用 `console.log` + 看日志确认。
- 测试按钮只有在 `initSyncReceiver()` 执行完毕后才会生效（即 app `onCreate` 之后）。如果刚打开 EV 就点按钮，`_syncConnect` 可能还是 `null`。

---

## 五、不修改代码的替代方案

如果不想改 EV 代码，也可以用手环上 **已有** 的触发入口来反向测试：

| 入口 | 触发方式 | 会发什么 |
|---|---|---|
| EV 课程表的「导出课表」功能（如果有） | 手动点导出 | `{ok: true, action: "export", data: ...}` 回包 |
| 任何会触发 `syncReply` 的操作 | 导入/编辑等 | 对应回包 |

> 检查 EV 课程表当前版本是否有上述入口。如果没有，或者想控制发送的精确内容，还是建议用上述的「测试按钮」方案。

---

## 六、附录：验证插件日志接收代码

插件侧处理 `InterconnectMessage` 的位置（供参考，无需修改）：

| 文件 | 行号 | 说明 |
|---|---|---|
| `src/lib.rs` | 203-210 | `EventType::InterconnectMessage` 分支，调 `handle_device_message()` |
| `src/lib.rs` | 300-409 | `handle_device_message()` — 解析回包，日志前缀 `[RX]` |

插件侧如果收到 EV 主动发的消息，日志将出现 `[RX]` 前缀行，可以直接看到消息的 action 和 payload。