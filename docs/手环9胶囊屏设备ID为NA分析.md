# 手环9胶囊屏 `deviceId=NA` 诊断与修复方案

## 问题描述

部分小米手环 9 胶囊屏（pill-shaped）用户，在激活页面生成的二维码 URL 中，`deviceId` 参数值为 `NA`，但其他设备信息（型号、分辨率、OS 版本等）全部正常获取。

### 问题 URL 示例

```
https://app-auth.gudq.com/activate.html?deviceId=NA&m=ap&p=Xiaomi%20Smart%20Band%209&o=198145&v=1200&t=band&s=pill-shaped&w=192&h=490&a=2&l=zh&r=1.6.21&c=t-9-r
```

| 参数 | 值 | 状态 |
|------|-----|:--:|
| `deviceId` | `NA` | ❌ |
| `m` (model) | `ap` | ✅ |
| `p` (product) | `Xiaomi Smart Band 9` | ✅ |
| `o` (osVersionCode) | `198145` | ✅ |
| `v` (platformVersionCode) | `1200` | ✅ |
| `t` (deviceType) | `band` | ✅ |
| `s` (screenShape) | `pill-shaped` | ✅ |
| `w` (screenWidth) | `192` | ✅ |
| `h` (screenHeight) | `490` | ✅ |
| `a` (APILevel) | `2` | ✅ |
| `l` (language) | `zh` | ✅ |
| `r` (appVersion) | `1.6.21` | ✅ |
| `c` (channel) | `t-9-r` | ✅ |

---

## 涉及文件

| 文件 | 说明 |
|------|------|
| [activation.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation/activation.ux) | 激活页面，`fetchDeviceId()` 获取 deviceId |
| [device-info.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/device-info/device-info.ux) | 现有设备信息页面 |
| [tools.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/tools/tools.ux) | 工具页面，新诊断入口添加位置 |
| [manifest.json](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/manifest.json) | 权限声明、路由注册 |

---

## 根因分析

### 两个 API 的本质区别

激活页面中，设备信息通过**两个独立的 API** 获取：

| API | 用途 | 数据来源 | 权限要求 |
|-----|------|---------|---------|
| `device.getInfo()` | 设备元数据（型号、屏幕、OS版本等） | 固件编译时写入的静态属性 | **无** |
| `device.getDeviceId()` | 设备唯一硬件标识 | 硬件安全模块 / provisioning 数据 | `hapjs.permission.DEVICE_INFO` |

- `getInfo()` 返回**固化在固件中的静态属性**，几乎所有设备都能正常返回。
- `getDeviceId()` 返回**硬件唯一标识**，需要从安全模块读取，依赖 provisioning 状态和运行时权限。

### 代码层面的触发路径

在 [activation.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation/activation.ux) 中：

```javascript
// L378-L391
device.getDeviceId({
    success: function(data) {
        self.deviceId = data.deviceId || '未知'    // "NA" 是 truthy，不走 fallback
        self.updateQrText()
        self.fetchDeviceInfo()                      // ← getInfo() 正常执行
    },
    fail: function(data, code) {
        self.deviceId = '获取失败(' + code + ')'     // ← 没走到这里
    }
})
```

`getDeviceId()` 返回 `success`（不是 `fail`），但 `data.deviceId = "NA"`。因为 `"NA"` 是 truthy 字符串，不触发 `|| '未知'` 的 fallback，最终 URL 变成 `deviceId=NA`。同时 `getInfo()` 独立运行，所有固件属性正常返回。

### 可能的原因

1. **设备未完成 provisioning**（最可能）：生产流程中未写入唯一硬件 ID
2. **API Level 2 兼容性问题**：Band 9 的 Vela 版本较低，`getDeviceId()` 底层实现不完善
3. **Vela 框架对 band 设备的特殊处理**：手环不像手表有 eSIM/支付等强身份需求，硬件 ID 体系可能不完整
4. **特定固件版本的 bug**：可能仅特定批次的固件受影响

**但在没有更多设备实测数据之前，这些都是推测。** 我们需要实测数据来确认哪个 API 能用。

---

## 方案：先诊断，再修复

> **核心理念**：在不知道哪些 API 能在 Band 9 上正常工作时，不要急于写 fallback 代码。先让真实设备跑一遍所有候选 API，拿到数据后再决定用哪个。

### "能获取到" ≠ "唯一" ≠ "稳定"

一个 API 必须同时满足四个维度才适合用作设备唯一标识：

| 维度 | 要回答的问题 |
|------|-------------|
| **能拿到** | API 是否返回了非 NA / 非空的合法值？ |
| **唯一** | 两台同型号设备返回的值是否不同？ |
| **稳定** | 同一台设备多次调用 / 重启后是否一致？ |
| **持久** | 卸载重装 / OTA 后是否仍然相同？ |

光看"能拿到"可能选错。比如 MAC 地址在 Vela 上可能被随机化（能拿到但不唯一），内存地址可能每次变化（唯一但不稳定）。

---

## 实施计划：设备 ID 诊断页面

### 第一步：确认分发路径（先决问题，必须最先解决） 🔴

诊断页面要在用户设备上运行，必须先确认**怎么送到用户手里**：

| 方案 | 可行性 | 说明 |
|------|:--:|------|
| **A. 扩展现有 `device-info.ux`** | ⭐⭐⭐ | 该页面已存在且通过 `设置 → 工具 → 设备信息` 可访问。直接在页面中加入所有 API 的测试结果，成本最低，用户无需额外操作。 |
| **B. 新建 `device-id-diagnosis.ux`，加入工具栏目** | ⭐⭐⭐ | 在 `tools.ux` 增加"设备ID诊断"入口。独立页面，不干扰现有设备信息页。 |
| **C. 通过实验室 `test-area.ux` 入口** | ⭐⭐ | 实验室页面支持动态列表，可快速添加。但用户路径较长（设置 → 功能实验室 → 找条目）。 |
| **D. 让用户装专门的测试 App** | ⭐ | 分发成本太高，不现实。 |

**推荐方案 B**：新建独立诊断页面，加入工具栏目。原因：
- `device-info.ux` 是面向普通用户的信息展示页，加上原始 API dump 会比较混乱
- 工具栏目（[tools.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/tools/tools.ux)）已有 `router.push({ uri: "/pages/xxx" })` 的成熟模式
- 独立的诊断页面可以自由设计 UI，不受设备信息页限制

**现状确认**：`device-info.ux` 页面可以通过正常路径打开（`设置 → 工具 → 设备信息`）。该页面已经调用了 `getInfo()`、`getDeviceId()`、`getSerial()`，可以作为对照参考。

#### 涉及改动

| 文件 | 操作 | 说明 |
|------|:--:|------|
| `src/pages/device-id-diagnosis/device-id-diagnosis.ux` | **新建** | 诊断页面（单文件组件） |
| `src/pages/tools/tools.ux` | 修改 | 添加"设备ID诊断"入口行 + `openDeviceIdDiagnosis()` 方法 |
| `src/manifest.json` | 修改 | 注册 `pages/device-id-diagnosis` 路由 |

### 第二步：确定要测试的 API 清单

每个 API 都**独立 try/catch**，一个失败不影响其他的。按优先级排列：

| # | API 方法 | 说明 | 为什么测 |
|:-:|---------|------|---------|
| 1 | `device.getDeviceId()` | 设备唯一标识 | **已知返回 NA 的基线** |
| 2 | `device.getSerial()` | 硬件序列号 | 最值得试的候选，可能比 deviceId 更可靠 |
| 3 | `device.getInfo()` 全字段 dump | 设备元数据 | 看返回对象里是否有 `deviceId`/`serialNumber`/`udid` 等隐藏字段 |
| 4 | `device.getMac()` | MAC 地址（如果 Vela 支持） | 可能唯一，但 Vela 可能随机化 |
| 5 | `device.getId()` | 设备 ID（别名，部分文档提及） | 确认是否存在此 API |
| 6 | `device.getUA()` | User Agent（部分设备支持） | 可能包含设备指纹 |
| 7 | 本地持久化 UUID | 首次运行时 `storage` 生成并存储 | 兜底方案：不唯一但持久 |

每个 API 的记录格式：

```
[#1] device.getDeviceId
  状态：success / fail / exception
  耗时：xx ms
  返回类型：string / object / undefined
  原始值：<JSON.stringify 原样输出>
  错误码：（fail 时）
  备注：（为空/NA/null/正常）
```

> **关键**：必须打印**原始返回值和 `typeof`**。因为 `"NA"` 是 truthy 字符串，容易误判。看到原始值才知道是字符串 `"NA"` 还是其他类型。

### 第三步：诊断页面 UI 设计

用户在 **192×490** 的胶囊屏上操作，UI 必须紧凑且字号足够大。

```
┌──────────────────────────────┐
│ ◀  设备ID诊断              │  ← 返回按钮 + 标题
├──────────────────────────────┤
│ 型号  Xiaomi Smart Band 9   │  ← 环境信息（小字）
│ 固件  198145  │  API 2      │
│ 时间  09-24 15:30           │
├──────────────────────────────┤
│ #1 getDeviceId               │  ← 每项：API 名称
│  ❌ NA                       │  ← 大号结果（30px+）
│    类型:string  耗时:12ms    │  ← 元信息（小字 18px）
├──────────────────────────────┤
│ #2 getSerial                 │
│  ✅ SN2024A9X8K3M2          │  ← 大号结果
│    类型:string  耗时:8ms     │
├──────────────────────────────┤
│ #3 getInfo.did               │
│  ❌ undefined                │
│    无此字段                  │
├──────────────────────────────┤
│ #4 getMac                    │
│  ❌ fail(1001)               │
│    API 不支持                │
├──────────────────────────────┤
│ #5 getId                     │
│  ❌ exception                │
│    require 失败               │
├──────────────────────────────┤
│ #6 getUA                     │
│  ❌ fail(1001)               │
│    API 不支持                │
├──────────────────────────────┤
│ #7 本地UUID                  │
│  ✅ a3f8-2b1c-9d4e          │
│    首次生成  持久:✅          │
├──────────────────────────────┤
│ [ 重新测试 ]  [ 复制结果 ]   │  ← 两个大按钮
└──────────────────────────────┘
```

#### 设计要点

1. **结果值大号显示**：API 返回值用 30px+ 字号，胶囊屏用户能看清
2. **每个 API 独立卡片**：失败项显示 `❌` 和原因，成功项显示 `✅` 和值
3. **一键复制结果**：用户点"复制结果"，把全部文本写入剪贴板，方便发给你
4. **可重复测试**：点"重新测试"重建所有 API，验证稳定性
5. **环境信息置顶**：型号、固件版本、API Level、时间，方便你知道是哪台设备

#### 结果回传方式

| 方案 | 实现 | 适用场景 |
|------|------|---------|
| **自动上报** | 页面 POST 到 `/api/beacon?test=device-id` | 网络通畅时自动回传，最省事 |
| **二维码** | 把结果文本生成二维码，用户手机扫 | 无网络时兜底 |
| **复制文本** | 写入剪贴板，用户手动微信发你 | 最通用，100% 可用 |

推荐 **上报 + 二维码 + 复制** 三种都支持：网络好用时自动上报；网络不通时出二维码或手动复制。

### 第四步：诊断页面不该做的事

- ❌ **不要真的用于激活**：诊断页只收集数据，不跑激活流程，避免污染线上数据
- ❌ **不要只测一次就下结论**：至少让用户测 3 次、重启后再测 1 次
- ❌ **不要只发一台设备**：找 3~5 台不同固件/批次的 Band 9，区分"全型号问题"还是"某批次问题"
- ❌ **不要忘了对照设备**：找一台**正常手表**（能拿到 deviceId 的）跑同一个页面，对比哪些 API 的返回值是正常/异常的

### 第五步：拿到数据后的决策树

```
测试数据收集完毕
    │
    ├── 有 API 返回「唯一 + 稳定 + 持久」的值
    │       → 作为主用 deviceId
    │
    ├── 有 API 返回「唯一 + 稳定」但不持久
    │       → 作为主用 + storage 持久化补丁
    │
    ├── 有 API 返回唯一但可能随机化
    │       → 作为辅助 ID，激活改为「账号绑定」模型
    │
    └── 所有 API 都拿不到唯一 ID
            → 接受现实：Band 9 硬件不提供唯一标识
            → 激活模型改为「设备指纹 + 首次激活时间」，服务端做速率/数量限制
```

> **如果最终确认 Band 9 硬件层面不提供唯一 ID**，那就不应该再费劲 fallback 拼假 ID，而是诚实地调整激活模型。这比用 `product + version` 拼一个假 ID 更可维护。

---

## 行动顺序

| 步骤 | 内容 | 优先级 |
|:--:|------|:--:|
| **1** | 确认诊断页面分发路径（决定用方案 A/B/C） | 🔴 P0 |
| **2** | 找一台正常手表跑现有 `device-info.ux`，验证页面本身能跑通 | 🔴 P0 |
| **3** | 新建诊断页面，在模拟器上跑通所有 API 调用 | 🔴 P0 |
| **4** | 发版（含诊断页面），找 3~5 台 Band 9 用户跑测试、回传结果 | 🟡 P1 |
| **5** | 拿到数据后，按决策树选定主用 API + 备用链 | 🟡 P1 |
| **6** | 同步在服务端加监控告警：出现 `deviceId=NA`/`unknown`/`fallback-` 就记录 | 🟢 P2 |

---

## 诊断页面技术细节

### 新增文件

#### `src/pages/device-id-diagnosis/device-id-diagnosis.ux`

单文件组件，结构如下：

```javascript
<script>
import router from "@system.router"
const device = require("@system.device")
const storage = require("@system.storage")
const store = require("../../data/store.js")

var STORAGE_KEY = "diag_uuid_v1"

function generateUUID() {
  var d = new Date().getTime()
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
  return uuid
}

export default {
  data: {
    theme: {},
    iconTheme: "dark",
    envInfo: { model: '', product: '', osVersionCode: '', platformVersionCode: '',  apiLevel: '', deviceType: '', screenShape: '', testTime: '' },
    results: [],
    tested: false,
    testing: false
  },

  onInit() {
    var self = this
    store.getTheme(function(t, themeName) {
      self.theme = t
      self.iconTheme = (themeName === 'light' || themeName === 'warm') ? 'light' : 'dark'
    })
    self.runAllTests()
  },

  runAllTests() {
    var self = this
    self.testing = true
    self.results = []
    self.tested = false

    // 先获取环境信息
    self.testGetInfo(function() {
      self.testGetDeviceId()
      self.testGetSerial()
      self.testGetMac()
      self.testGetId()
      self.testGetUA()
      self.testLocalUUID()
      self.tested = true
      self.testing = false
    })
  },

  // 每个测试独立 try/catch，互相不影响

  testGetInfo(callback) {
    var self = this
    var start = Date.now()
    try {
      device.getInfo({
        success: function(ret) {
          var elapsed = Date.now() - start
          self.envInfo = {
            model: ret.model || '',
            product: ret.product || '',
            osVersionCode: ret.osVersionCode,
            platformVersionCode: ret.platformVersionCode,
            apiLevel: ret.APILevel,
            deviceType: ret.deviceType,
            screenShape: ret.screenShape,
            testTime: new Date().toLocaleString()
          }
          // 追加 getInfo 完整 dump 到结果
          self.results.push({
            api: 'getInfo (全字段dump)',
            status: 'success',
            type: typeof ret,
            value: JSON.stringify(ret),
            displayValue: ret.deviceId || ret.serialNumber || ret.udid || '(无隐藏ID字段)',
            elapsed: elapsed,
            error: '',
            note: ''
          })
          callback()
        },
        fail: function(data, code) {
          self.results.push({ api: 'getInfo', status: 'fail', type: '', value: '', displayValue: 'fail(' + code + ')', elapsed: Date.now() - start, error: code, note: '' })
          callback()
        }
      })
    } catch (e) {
      self.results.push({ api: 'getInfo', status: 'exception', type: '', value: '', displayValue: 'exception', elapsed: Date.now() - start, error: '', note: String(e) })
      callback()
    }
  },

  testGetDeviceId() {
    var self = this
    var start = Date.now()
    try {
      device.getDeviceId({
        success: function(data) {
          var elapsed = Date.now() - start
          var raw = data.deviceId
          var display = raw || '(空)'
          var note = ''
          if (!raw) note = '返回空值'
          else if (raw === 'NA') note = '返回 NA（无效）'
          self.results.push({ api: 'getDeviceId', status: 'success', type: typeof raw, value: JSON.stringify(raw), displayValue: display, elapsed: elapsed, error: '', note: note })
        },
        fail: function(data, code) {
          self.results.push({ api: 'getDeviceId', status: 'fail', type: '', value: '', displayValue: 'fail(' + code + ')', elapsed: Date.now() - start, error: code, note: '' })
        }
      })
    } catch (e) {
      self.results.push({ api: 'getDeviceId', status: 'exception', type: '', value: '', displayValue: 'exception', elapsed: Date.now() - start, error: '', note: String(e) })
    }
  },

  testGetSerial() {
    var self = this
    var start = Date.now()
    try {
      device.getSerial({
        success: function(data) {
          var elapsed = Date.now() - start
          var raw = data.serial
          var display = raw || '(空)'
          var note = ''
          if (!raw) note = '返回空值'
          else if (raw === 'NA') note = '返回 NA（无效）'
          self.results.push({ api: 'getSerial', status: 'success', type: typeof raw, value: JSON.stringify(raw), displayValue: display, elapsed: elapsed, error: '', note: note })
        },
        fail: function(data, code) {
          self.results.push({ api: 'getSerial', status: 'fail', type: '', value: '', displayValue: 'fail(' + code + ')', elapsed: Date.now() - start, error: code, note: '' })
        }
      })
    } catch (e) {
      self.results.push({ api: 'getSerial', status: 'exception', type: '', value: '', displayValue: 'exception', elapsed: Date.now() - start, error: '', note: String(e) })
    }
  },

  testGetMac() {
    var self = this
    var start = Date.now()
    try {
      if (typeof device.getMac !== 'function') {
        self.results.push({ api: 'getMac', status: 'fail', type: '', value: '', displayValue: 'API不存在', elapsed: 0, error: '', note: 'device.getMac is not a function' })
        return
      }
      device.getMac({
        success: function(data) {
          var elapsed = Date.now() - start
          var raw = data.mac || data.address || ''
          var display = raw || '(空)'
          self.results.push({ api: 'getMac', status: 'success', type: typeof raw, value: JSON.stringify(raw), displayValue: display, elapsed: elapsed, error: '', note: '' })
        },
        fail: function(data, code) {
          self.results.push({ api: 'getMac', status: 'fail', type: '', value: '', displayValue: 'fail(' + code + ')', elapsed: Date.now() - start, error: code, note: '' })
        }
      })
    } catch (e) {
      self.results.push({ api: 'getMac', status: 'exception', type: '', value: '', displayValue: 'exception', elapsed: Date.now() - start, error: '', note: String(e) })
    }
  },

  testGetId() {
    var self = this
    var start = Date.now()
    try {
      if (typeof device.getId !== 'function') {
        self.results.push({ api: 'getId', status: 'fail', type: '', value: '', displayValue: 'API不存在', elapsed: 0, error: '', note: 'device.getId is not a function' })
        return
      }
      device.getId({
        success: function(data) {
          var elapsed = Date.now() - start
          self.results.push({ api: 'getId', status: 'success', type: typeof data, value: JSON.stringify(data), displayValue: JSON.stringify(data), elapsed: elapsed, error: '', note: '' })
        },
        fail: function(data, code) {
          self.results.push({ api: 'getId', status: 'fail', type: '', value: '', displayValue: 'fail(' + code + ')', elapsed: Date.now() - start, error: code, note: '' })
        }
      })
    } catch (e) {
      self.results.push({ api: 'getId', status: 'exception', type: '', value: '', displayValue: 'exception', elapsed: Date.now() - start, error: '', note: String(e) })
    }
  },

  testGetUA() {
    var self = this
    var start = Date.now()
    try {
      if (typeof device.getUA !== 'function') {
        self.results.push({ api: 'getUA', status: 'fail', type: '', value: '', displayValue: 'API不存在', elapsed: 0, error: '', note: 'device.getUA is not a function' })
        return
      }
      device.getUA({
        success: function(data) {
          var elapsed = Date.now() - start
          self.results.push({ api: 'getUA', status: 'success', type: typeof data, value: JSON.stringify(data), displayValue: JSON.stringify(data), elapsed: elapsed, error: '', note: '' })
        },
        fail: function(data, code) {
          self.results.push({ api: 'getUA', status: 'fail', type: '', value: '', displayValue: 'fail(' + code + ')', elapsed: Date.now() - start, error: code, note: '' })
        }
      })
    } catch (e) {
      self.results.push({ api: 'getUA', status: 'exception', type: '', value: '', displayValue: 'exception', elapsed: Date.now() - start, error: '', note: String(e) })
    }
  },

  testLocalUUID() {
    var self = this
    var start = Date.now()
    try {
      storage.get({
        key: STORAGE_KEY,
        success: function(data) {
          var elapsed = Date.now() - start
          if (data) {
            self.results.push({ api: '本地UUID(storage)', status: 'success', type: typeof data, value: JSON.stringify(data), displayValue: String(data), elapsed: elapsed, error: '', note: '已持久化（重启后不变）' })
          } else {
            var uuid = generateUUID()
            storage.set({
              key: STORAGE_KEY,
              value: uuid,
              success: function() {
                self.results.push({ api: '本地UUID(storage)', status: 'success', type: typeof uuid, value: JSON.stringify(uuid), displayValue: uuid, elapsed: Date.now() - start, error: '', note: '首次生成，已持久化' })
              },
              fail: function() {
                self.results.push({ api: '本地UUID(storage)', status: 'fail', type: '', value: uuid, displayValue: uuid + '(存储失败)', elapsed: Date.now() - start, error: '', note: '生成成功但存储失败' })
              }
            })
          }
        },
        fail: function() {
          self.results.push({ api: '本地UUID(storage)', status: 'fail', type: '', value: '', displayValue: 'storage读取失败', elapsed: Date.now() - start, error: '', note: '' })
        }
      })
    } catch (e) {
      self.results.push({ api: '本地UUID(storage)', status: 'exception', type: '', value: '', displayValue: 'exception', elapsed: Date.now() - start, error: '', note: String(e) })
    }
  },

  // 复制结果到剪贴板
  copyResults() {
    var self = this
    var text = '===== 设备ID诊断报告 =====\n'
    text += '型号:' + self.envInfo.model + '\n'
    text += '产品:' + self.envInfo.product + '\n'
    text += '固件:' + self.envInfo.osVersionCode + ' / API ' + self.envInfo.apiLevel + '\n'
    text += '类型:' + self.envInfo.deviceType + ' / ' + self.envInfo.screenShape + '\n'
    text += '时间:' + self.envInfo.testTime + '\n'
    text += '---\n'
    self.results.forEach(function(r) {
      text += '[' + r.api + ']\n'
      text += '  状态:' + r.status + '\n'
      text += '  类型:' + r.type + '\n'
      text += '  值:' + r.value + '\n'
      text += '  耗时:' + r.elapsed + 'ms\n'
      if (r.error) text += '  错误码:' + r.error + '\n'
      if (r.note) text += '  备注:' + r.note + '\n'
      text += '\n'
    })
    // Vela 剪贴板 API（如果支持）
    try {
      var clipboard = require("@system.clipboard")
      if (clipboard) {
        clipboard.set({ text: text })
      }
    } catch (e) {}
    // fallback：用 prompt 展示全部文本让用户手动复制场景
    // 胶囊屏用户可能无法全量查看，但至少有一段文本
  },

  goBack() {
    router.back()
  }
}
</script>
```

### 修改文件

#### `src/pages/tools/tools.ux` — 添加入口

在现有"设备信息"行下方增加：

```html
<div class="row-divider" style="background-color: {{ theme.border }}"></div>
<div class="item-row" onclick="openDeviceIdDiagnosis">
  <text class="item-label" style="color: {{ theme.accent }}">设备ID诊断</text>
  <text class="item-hint" style="color: {{ theme.textMuted }}">调试API</text>
</div>
```

在 `<script>` 中增加方法：

```javascript
openDeviceIdDiagnosis() {
  router.push({ uri: "/pages/device-id-diagnosis" })
}
```

#### `src/manifest.json` — 注册路由

在 `"pages"` 下添加：

```json
"pages/device-id-diagnosis": {
  "component": "device-id-diagnosis",
  "group": "实验室工具",
  "name_cn": "设备ID诊断"
}
```

同时在 `router._groups` 的 `"实验室工具"` 数组中追加 `"device-id-diagnosis"`。

---

## 测试完成后：数据驱动的决策

| 场景 | 决策 |
|------|------|
| `getSerial()` 返回合法唯一值 | 主用 serial，激活码绑定 serial |
| `getInfo()` 中有隐藏 deviceId 字段 | 主用该字段 |
| `getMac()` 返回稳定 MAC | 辅助 ID，与 serial 组合使用 |
| 本地 UUID 是唯一能用的方案 | 激活改为「设备指纹 + 首次激活时间」，接受一定共享风险 |
| 全部 API 都不可用 | 激活模型改为「账号绑定」或「服务端速率限制」 |

```javascript
// 激活码验证降级示例（服务端）
function resolveDeviceId(params) {
  // 优先级：serial > deviceId > mac > uuid > 指纹
  if (params.serial && params.serial !== 'NA') return params.serial
  if (params.deviceId && params.deviceId !== 'NA') return params.deviceId
  if (params.mac) return params.mac
  // 组合指纹作为最后兜底
  return [params.product, params.osVersionCode, params.platformVersionCode].join('-')
}
```

---

## 结论

| 项目 | 内容 |
|------|------|
| 当前状态 | `getDeviceId()` 在 Band 9 上返回 `"NA"`，根因待确认 |
| 行动策略 | **先诊断后修复**：创建诊断页面，让真实设备跑所有候选 API |
| 诊断页面 | 在工具栏目新建"设备ID诊断"，独立 try/catch 测试 7 个 API |
| 分发路径 | 工具栏目 → 诊断页面（正常发版后用户即可访问） |
| 后续决策 | 拿到实测数据后，按「唯一/稳定/持久」三维度选定主用 API |