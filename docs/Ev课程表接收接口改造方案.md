# Ev课程表接收接口改造方案（对接同步器）

> 回答一个问题：**同步器那边对准包名就行了吗？还是 Ev课程表也要改代码？**
>
> **一句话答案：必须改代码。** 包名只是"**寻址**"（让插件知道发给谁），**不等于"接收"**。
> 就像快递：包名是**收件地址**，`onmessage` 接收是**签收的人**——只有地址、没人签收，包裹送到也取不走。

---

## 零、直接回答

| 问题 | 答案 |
|---|---|
| 对准包名就行了吗？ | ❌ 不够。包名只解决"发给谁" |
| Ev课程表要改代码吗？ | ✅ **必须改**，要写接收逻辑 |
| 当前最关键的缺失 | ⚠️ `manifest.json` 的 features 里**没有 `system.interconnect`** |

---

## 一、当前代码状态核查（事实）

| 检查项 | 状态 | 位置 |
|---|---|---|
| **features 声明** | ❌ **缺 `system.interconnect`** | `src/manifest.json`（现有：router / storage / prompt / device / vibrator / request / app / resident） |
| **接收代码** | ❌ 无 | `src/` 全量扫描 `interconnect` / `onmessage` 均 0 命中 |
| **后台常驻** | ✅ **已有** | `src/app.ux` 已实现 `resident.start()`（由 `background_running_config.running` 控制） |
| **签名文件** | ✅ 已有 | `sign/certificate.pem`、`sign/private.pem` |
| **包名** | `com.application.watch.classschedule` | 与同步器 v1.0.20 提示的一致 ✅ |

**好消息**：后台常驻（`system.resident`）已经做过了，接收链路少了一大块工作量。

---

## 二、必须做的四项改造

### 2.1 声明 feature（缺一不可）

`src/manifest.json` 的 `features` 数组必须加：

```json
{ "name": "system.interconnect" }
```

> 不声明就用不了 `@system.interconnect`。这是**当前第一处硬缺失**。

### 2.2 写接收逻辑（放在 `app.ux` 的 `onCreate`）

官方 API（`iot.mi.com/vela/quickapp/zh/features/network/interconnect.html`）：

```js
var interconnect = null
try {
  interconnect = require("@system.interconnect")
} catch (e) {
  dlog("[SYNC] interconnect not available: " + e)
}

function initSyncReceiver() {
  if (!interconnect) return
  var connect = interconnect.instance()

  connect.onmessage = function (data) {
    // ① 解析（必须 try/catch —— 项目约定：JSON.parse 全量保护）
    // ② 校验字段（day 1-7 / HH:MM / 开始早于结束）
    // ③ 写入 @system.storage（allCourses_N）
    // ④ 刷新页面 / Toast 提示
  }

  connect.onopen = function (data) { dlog("[SYNC] opened") }
  connect.onclose = function (data) { dlog("[SYNC] closed") }
  connect.onerror = function (data) { dlog("[SYNC] error: " + data.code) }
}
```

**⚠️ 项目约定提醒**：本仓 QA 多次标记 ES6+ 语法风险（`?.` / `??` / 箭头函数 / 模板串）。
**官方示例里的 `(data) => {}` 箭头函数请不要直接抄**，改用 `function (data) {}`，与全仓风格保持一致。

### 2.3 数据落地（写入现有格式 A）

直接复用 `docs/import-export-json-format-analysis.md` 的**格式 A**，避免二次转换：

```
解析 payload → 校验 → 写入 storage 键 allCourses_N → 通知页面刷新
```

**必做的保护**（沿用项目既有约定）：
- `JSON.parse` 必须 `try/catch` + 兜底
- 导入会**覆盖**用户课表 → 必须做**二次确认 + 备份/撤销**（项目已有"删除二次确认 + 5 秒撤销"的模式可直接复用）

### 2.4 后台接收（已有基础，但需引导）

`system.resident` 已实现，但**由用户配置 `background_running_config.running` 控制**。
如果用户没开后台运行，快应用切到后台会暂停 → **可能收不到数据**。

建议：
- 同步器导入前，提示用户"请在课程表设置中开启后台运行"；
- 或让插件先拉起应用再发送（需验证 AstroBox 是否支持）。

---

## 三、关键风险：签名要求（两条路径不同）

官方文档明确写着一条**很硬的约束**：

> "interconnect 通信前提要保证快应用和**三方应用安卓端**两者的**包名及签名保持一致**"

即官方标准路径要求：
- 快应用 `package` = 手机端安卓 App 的包名
- 快应用签名 = 手机端安卓 App 的签名（从 `.jks` 提取私钥与证书）

**但走 AstroBox 插件路径时，情况不同**：

| 路径 | 包名要求 | 签名要求 | 依据 |
|---|---|---|---|
| **官方 interconnect**（自研手机 App） | 必须与安卓端 App **一致** | 必须用安卓端签名 | 官方文档"开发注意事项" |
| **AstroBox 插件**（`send_qaic_message`） | 插件**按包名查找**目标应用即可 | 由 AstroBox 宿主处理，**未见要求签名匹配** | 参考 `Varclass-Astrobox-rust`：不改包名、只按包名匹配即可通信 |

**结论**：
- 走 **AstroBox 插件** → **包名无需改**（仍是 `com.application.watch.classschedule`），**签名大概率也不用动**，但接收代码必须写。
- 走 **自研安卓 App** → 包名与签名都要对齐，改造成本显著更高。

> ⚠️ "签名不必匹配"是基于 Varclass 案例的**推断**，建议在真机上用你的包实测一次再定论。

---

## 四、官方 API 速查（改造时对照）

| 接口 | 用途 |
|---|---|
| `interconnect.instance()` | 获取连接单例 |
| `connect.onmessage = fn(data)` | **接收手机端数据**（`data.data` 为字符串） |
| `connect.onopen / onclose / onerror` | 连接状态回调 |
| `connect.getReadyState({...})` | 查询状态：`1` 已连接 / `2` 断开 |
| `connect.diagnosis({...})` | 诊断：`0` OK / `204` 超时 / `1001` 对端未安装 / `1000` 其他 |
| `connect.send({data, success, fail})` | **回包给手机端**（用于告诉插件"收到了"） |

错误码：`1000` 未知 / `1001` 手机 App 未安装 / `1006` 连接断开 / `204` 超时。

---

## 五、验收清单（内测必须过这几条）

1. ✅ `manifest.json` 已声明 `system.interconnect`
2. ✅ 插件发送后，手环 `onmessage` **确实收到**（日志可查）
3. ✅ `data.data` 能被 `JSON.parse` 正确解析（含异常兜底）
4. ✅ 解析后**写入 `allCourses_N`**，且**手环界面显示随之更新**
5. ✅ 导入前有二次确认；导入后可撤销 / 有备份
6. ✅ 后台未开启时的表现明确（有提示，而非静默失败）
7. ✅ `@system.interconnect` 不可用时（`require` 失败）不崩溃

---

## 六、工作量估计

| 项 | 量级 |
|---|---|
| 声明 feature | 极小（1 行） |
| 接收 + 解析 + 写 storage | **小~中**（主要工作量） |
| 二次确认 / 撤销 / 备份 | 中（可复用现有模式） |
| 后台运行引导 | 小 |
| 真机联调 | **中**（签名/在线状态/载荷都需实测） |

**整体：小~中等，且已经有后台常驻打底。**

---

## 七、一句话总结

> **包名是"告诉快递送到哪"，`onmessage` 才是"开门签收的人"。**
> 同步器已经知道地址了（包名 `com.application.watch.classschedule` 无误），
> 现在缺的是**在 Ev课程表里写一个"签收+入库"的人**——也就是 `connect.onmessage` → 解析 → 写 storage → 刷新。
> 另外，别忘了先给 `manifest.json` 补上 `system.interconnect` 声明。

---

## 八、参考改动方案审查（逐条核对）

> 场景：外部给出的"只需改 3 处"参考方案，经与本仓实测核对，结论如下。

| # | 建议项 | 判定 | 问题 |
|---|---|---|---|
| 1 | 改包名 `com.example.classschedule` → `com.application.watch.classschedule` | ❌ **错** | 本仓 `package` **已经是** `com.application.watch.classschedule`（实测）。且 AstroBox 路径是按包名**查找**，无需改名 |
| 2 | 添加 `system.interconnect` feature | ✅ **对** | 方向正确；但 diff 上下文错——本仓 features **没有 `system.shortcut`**，实际末尾是 `system.resident` |
| 3 | `interconnect.onmessage = function(data){}` | ❌ **致命错** | 官方 API 要求先 `interconnect.instance()` 取得 `connect`，再挂 `connect.onmessage`。直接挂 `interconnect` 上不生效 |
| 4 | `JSON.parse(data)` | ❌ **错** | 回调数据在 **`data.data`**（官方：`connect.onmessage = (data)=>{ console.log(data.data) }`） |
| 5 | `parsed.schedules?.[0]?.courses?.length` | ❌ **硬伤** | 可选链 `?.` 属 ES6+，本仓 QA **明确禁用**（"`?.` 0 处"是优势指标）。轻则报错，重则整段脚本不执行（白屏） |
| 6 | "app.ux 现在是空壳 `export default {}`" | ❌ **危险** | **严重不符**：`app.ux` 已有 6 大块逻辑（见下）。按"重写"会全部删光 |
| 7 | 用 `import` 且无 try/catch | ⚠️ | 本仓统一 `require` + `try/catch`（`resident` 即如此）；`interconnect` 不可用时直接崩 |
| 8 | 存独立 key `astrobox_sync_data` | ✅ 可行 | 但应登记到 `storage-tables.js`；且**导入会覆盖课表，必须二次确认**（原方案完全没提） |
| 9 | "内部格式是 `class_schedule_data`" | ⚠️ **错** | 本仓实际存储键是 **`allCourses_N`**（`database.js` 中 `STORAGE_KEY = "allCourses"` + 索引） |
| 10 | 无回包 `connect.send` | ⚠️ | 插件侧 `register_interconnect_recv` 在等回包，不回可能超时判失败 |
| 11 | 无 `onopen/onerror/diagnosis` | ⚠️ | 连接异常时无从排查 |

### ⚠️ 最重要的一条：`app.ux` 不是空壳，不能"重写"

`src/app.ux` 现有内容（实测）：

| 逻辑 | 作用 |
|---|---|
| `database.init()` | 课程数据库初始化 |
| `authStore.initAuth()` | **授权/激活状态初始化** |
| `migrateFontScale()` | 字号设置迁移 |
| `migrateBuiltinHolidays()` | **内置假期数据补齐** |
| `initBackgroundRunning()` → `startResident()` | **后台常驻** |
| `onDestroy()` → `stopResident()` | 退出清理 |

**若按"重写"执行 → 数据库不初始化、授权丢失、假期数据丢失、后台常驻失效。**

### 结论

> 参考方案的**思路对**（manifest 加 feature + app.ux 加接收），
> 但**包名、API 调用方式、数据字段、ES6 语法、app.ux 现状**五处与实际不符，
> **不可直接照抄**，需按下一节的修正版落地。

---

## 九、可直接落地的修正版（增量，不重写）

### 9.1 `src/manifest.json` — 只加一项

在 `features` 数组末尾（当前最后一项是 `system.resident`）追加：

```json
{ "name": "system.interconnect" }
```

> 包名**不用改**（已是 `com.application.watch.classschedule`）。

### 9.2 `src/app.ux` — 只做增量，保留全部现有逻辑

**第 1 步**：在文件顶部（`resident` 的 try/catch 之后）追加：

```js
var interconnect = null

try {
  interconnect = require("@system.interconnect")
} catch (e) {
  dlog("[SYNC] interconnect not available: " + e)
}

function initSyncReceiver() {
  if (!interconnect) {
    return
  }
  var connect = interconnect.instance()

  connect.onmessage = function (data) {
    var raw = (data && data.data) || ""
    var parsed = null
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      dlog("[SYNC] parse failed: " + e)
      return
    }
    if (!parsed) {
      return
    }

    var storage = require("@system.storage")
    storage.set({
      key: "astrobox_sync_data",
      value: JSON.stringify(parsed),
      success: function () {
        dlog("[SYNC] saved")
        try {
          connect.send({ data: { ok: true } })
        } catch (e) {
          dlog("[SYNC] ack failed: " + e)
        }
      },
      fail: function () {
        dlog("[SYNC] storage set failed")
      }
    })
  }

  connect.onopen = function () { dlog("[SYNC] opened") }
  connect.onerror = function (data) { dlog("[SYNC] error: " + (data && data.code)) }
  connect.onclose = function () { dlog("[SYNC] closed") }
}
```

**第 2 步**：在 `onCreate()` 末尾**只加一行调用**（其余全部保留）：

```js
onCreate() {
  database.init()
  authStore.initAuth()
  store.getBaseFontSize(function(size) { ... })
  migrateFontScale()
  migrateBuiltinHolidays()
  this.initBackgroundRunning()
  initSyncReceiver()      // ← 只加这一行
}
```

**要点对照**：

| 项 | 修正版 | 参考方案 |
|---|---|---|
| 取得连接 | `interconnect.instance()` | ❌ 漏了 |
| 取数据 | `data.data` | ❌ `data` |
| 可选链 | 无（用 `&&` 兜底） | ❌ `?.` |
| 模块引入 | `require` + `try/catch` | ❌ `import` 无保护 |
| 现有逻辑 | **全部保留** | ❌ 会被删光 |
| 回包 | `connect.send({ok:true})` | ❌ 无 |
| 风格 | `var` / `function` / `dlog` | ❌ 箭头函数 |

---

> 说明：本文 API 用法与签名约束引自 Xiaomi Vela 官方文档「设备通信 interconnect」（`iot.mi.com/vela/quickapp/zh/features/network/interconnect.html`）；项目现状基于本仓 `src/manifest.json`、`src/app.ux` 实测扫描（检索/核查时间 2026-09-22）。"AstroBox 路径不需签名匹配"为依据 Varclass 案例的**推断**，请以真机实测为准。
