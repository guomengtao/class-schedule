# 激活码 URL 扫码传参升级方案

## 一、背景

当前激活流程中，二维码仅携带 `deviceId` 一个参数。遇到兼容性问题时，缺少设备型号、系统版本、屏幕形态等关键信息，排查困难。

本次升级在二维码 URL 中附带精简设备信息，便于服务端快速定位兼容性 BUG，同时保持原有激活方式完全兼容。

## 二、当前状态

### 2.1 现有激活流程

```
用户扫码 → 打开 activate.html?deviceId=xxx → 输入兑换码 → 获取18位激活码 → 手表输入激活码
```

### 2.2 现有 QR 文本生成

[activation.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation/activation.ux) 中 `fetchDeviceId()` 方法：

```js
var ACTIVATION_URL = "https://app-auth.gudq.com/activate.html?deviceId="

fetchDeviceId() {
  var device = require("@system.device")
  device.getDeviceId({
    success: function(data) {
      self.deviceId = data.deviceId || '未知'
      self.qrText = ACTIVATION_URL + self.deviceId
    }
  })
}
```

### 2.3 设备信息获取已有基础

[device-info.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/device-info/device-info.ux) 中 `fetchDeviceInfo()` 已实现 `device.getInfo()` 调用：

```js
device.getInfo({
  success: function(ret) {
    // ret.model, ret.product, ret.osVersionCode, ret.platformVersionCode,
    // ret.deviceType, ret.screenShape, ret.screenWidth, ret.screenHeight,
    // ret.APILevel, ret.language, ret.region, ...
  }
})
```

## 三、方案设计

### 3.1 核心原则

| 原则 | 说明 |
|------|------|
| 向后兼容 | 旧版客户端只传 deviceId 仍可正常激活 |
| 长度控制 | 整个 URL ≤ 200 字符 |
| 隐私安全 | 不传 serial、明文 deviceId、storage |
| 排障优先 | 保留定位兼容 BUG 的核心字段 |

### 3.2 精简参数字段

9 个字段，覆盖绝大多数兼容问题排障场景：

| 参数名 | 字段 | 示例值 | 长度 | 用途 |
|--------|------|--------|------|------|
| `d` | deviceId | `a1b2c3...` | ~36 | 设备绑定 |
| `m` | model | `Watch S4` | ~15 | 设备型号 |
| `p` | product | `vela_ws4` | ~12 | 设备代号 |
| `o` | osVersionCode | `42` | ~3 | 系统版本 |
| `v` | platformVersionCode | `10` | ~3 | 运行时版本 |
| `t` | deviceType | `watch` | ~6 | 手表/手环 |
| `s` | screenShape | `rect` | ~6 | 屏幕形态 |
| `w` | screenWidth | `466` | ~4 | 屏幕宽度 |
| `h` | screenHeight | `466` | ~4 | 屏幕高度 |
| `a` | APILevel2 | `12` | ~3 | API 等级 |

### 3.3 URL 长度计算

使用短参数名后，完整 URL 示例：

```
https://app-auth.gudq.com/a?d=DEVICEID&m=Watch%20S4&p=vela_ws4&o=42&v=10&t=watch&s=rect&w=466&h=466&a=12
```

| 组成部分 | 字符数 |
|----------|--------|
| 协议 + 域名 + 路径 | 35 |
| 参数名 + 分隔符 | 27 |
| 参数值（含编码） | ~95 |
| deviceId (UUID) | 36 |
| **总计** | **≈193** |

✅ 控制在 200 字符以内。

若极端情况超长，可进一步压缩：`deviceId` 取后 8 位、`model` 做 URL-safe Base64 编码。

### 3.4 新旧 URL 对比

| | 旧格式 | 新格式 |
|---|---|---|
| URL | `activate.html?deviceId=xxx` | `a?d=xxx&m=...&p=...&o=...&v=...&t=...&s=...&w=...&h=...&a=...` |
| 路径 | `/activate.html` | `/a` |
| 参数 | 仅 deviceId | deviceId + 8 个设备字段 |
| 长度 | ~80 字符 | ~193 字符 |

## 四、兼容性策略

### 4.1 服务端兼容

服务端 `/a` 接口同时支持两种格式：

```
旧格式: /a?deviceId=xxx
新格式: /a?d=xxx&m=Watch%20S4&p=vela_ws4&o=42&...
```

服务端解析逻辑：

```js
// 服务端伪代码
function handleActivate(req) {
  const deviceId = req.query.d || req.query.deviceId
  const deviceInfo = {
    model: req.query.m || '',
    product: req.query.p || '',
    osVersionCode: req.query.o || '',
    platformVersionCode: req.query.v || '',
    deviceType: req.query.t || '',
    screenShape: req.query.s || '',
    screenWidth: req.query.w || '',
    screenHeight: req.query.h || '',
    apiLevel: req.query.a || ''
  }
  // deviceId 必填，设备信息选填
  // 有设备信息时记录日志用于排障
  // 无设备信息时走旧逻辑，不影响激活
}
```

### 4.2 客户端兼容

旧版客户端生成的 `qrText` 依然指向旧 URL，新版客户端生成新 URL。两版客户端均可正常激活。

## 五、客户端实现步骤

### 5.1 修改 activation.ux

在 `activation.ux` 中新增 `fetchDeviceInfo()` 方法，与现有 `fetchDeviceId()` 并行：

```js
// 新增常量
var ACTIVATION_URL_V2 = "https://app-auth.gudq.com/a?"

// 新增方法：获取设备信息并生成新格式 QR
fetchDeviceInfoV2() {
  var self = this
  var device = require("@system.device")

  device.getInfo({
    success: function(ret) {
      var params = []
      // 拼接设备信息参数
      if (ret.model) params.push('m=' + encodeURIComponent(ret.model))
      if (ret.product) params.push('p=' + encodeURIComponent(ret.product))
      if (ret.osVersionCode != null) params.push('o=' + ret.osVersionCode)
      if (ret.platformVersionCode != null) params.push('v=' + ret.platformVersionCode)
      if (ret.deviceType) params.push('t=' + encodeURIComponent(ret.deviceType))
      if (ret.screenShape) params.push('s=' + encodeURIComponent(ret.screenShape))
      if (ret.screenWidth != null) params.push('w=' + ret.screenWidth)
      if (ret.screenHeight != null) params.push('h=' + ret.screenHeight)
      if (ret.APILevel != null) params.push('a=' + ret.APILevel)

      self.deviceInfoParams = params.join('&')
      self.updateQrText()
    },
    fail: function() {
      // 获取失败时仅用 deviceId，不影响激活
      self.deviceInfoParams = ''
      self.updateQrText()
    }
  })
}

// 修改：合并 deviceId 和设备信息
updateQrText() {
  var self = this
  if (self.deviceId && self.deviceId !== '获取中...') {
    var qr = ACTIVATION_URL_V2 + 'd=' + encodeURIComponent(self.deviceId)
    if (self.deviceInfoParams) {
      qr = qr + '&' + self.deviceInfoParams
    }
    self.qrText = qr
  }
}
```

### 5.2 修改 fetchDeviceId

在 `fetchDeviceId` 成功回调中增加调用 `fetchDeviceInfoV2()`：

```js
fetchDeviceId() {
  var self = this
  var device = require("@system.device")
  device.getDeviceId({
    success: function(data) {
      self.deviceId = data.deviceId || '未知'
      self.updateQrText()
      self.fetchDeviceInfoV2()  // 新增：获取设备信息
    },
    fail: function(data, code) {
      self.deviceId = '获取失败(' + code + ')'
      self.qrText = ACTIVATION_URL + 'unknown'
    }
  })
}
```

### 5.3 data 字段新增

```js
private: {
  // ... 现有字段 ...
  deviceInfoParams: '',  // 新增：设备信息参数字符串
}
```

## 六、URL 长度校验

构建 URL 后做长度检查，超长时做降级处理：

```js
updateQrText() {
  var self = this
  if (self.deviceId && self.deviceId !== '获取中...') {
    var qr = ACTIVATION_URL_V2 + 'd=' + encodeURIComponent(self.deviceId)
    if (self.deviceInfoParams) {
      qr = qr + '&' + self.deviceInfoParams
    }
    // 超长降级：仅保留 deviceId
    if (qr.length > 200) {
      console.warn('[ACTIVATION] QR URL too long (' + qr.length + '), fallback to deviceId only')
      qr = ACTIVATION_URL_V2 + 'd=' + encodeURIComponent(self.deviceId)
    }
    self.qrText = qr
  }
}
```

## 七、数据流示意图

```
┌─────────────────────────────────────────────────────────┐
│  手表端                                                  │
│                                                         │
│  device.getDeviceId() ──→ deviceId                      │
│  device.getInfo()     ──→ model, product, osVersionCode, │
│                            platformVersionCode,          │
│                            deviceType, screenShape,      │
│                            screenWidth, screenHeight,    │
│                            APILevel                      │
│                                                         │
│  拼接 URL: /a?d=DEVICEID&m=MODEL&p=PRODUCT&...          │
│  生成 QR Code                                           │
└──────────────────────┬──────────────────────────────────┘
                       │ 用户扫码
                       ▼
┌─────────────────────────────────────────────────────────┐
│  手机端 / 网页端                                         │
│                                                         │
│  打开 activate 页面，URL 携带设备信息                     │
│  输入兑换码 → 获取激活码                                 │
│  服务端记录设备信息用于排障                               │
└──────────────────────┬──────────────────────────────────┘
                       │ 18位激活码
                       ▼
┌─────────────────────────────────────────────────────────┐
│  手表端                                                  │
│                                                         │
│  用户输入18位激活码 → 本地验证 → 激活成功                 │
└─────────────────────────────────────────────────────────┘
```

## 八、改动清单

| 文件 | 改动 | 风险 |
|------|------|------|
| `src/pages/activation/activation.ux` | 新增 `fetchDeviceInfoV2()`、`updateQrText()`，修改 `fetchDeviceId()` | 低，仅扩展不修改现有逻辑 |
| 服务端 `activate.html` / `/a` | 支持新参数名解析 | 低，向下兼容旧参数名 |

## 九、测试要点

1. ✅ 旧版客户端（仅传 deviceId）仍可正常激活
2. ✅ 新版客户端 QR 码包含完整设备信息
3. ✅ URL 长度不超过 200 字符
4. ✅ `device.getInfo()` 失败时降级为仅 deviceId
5. ✅ URL 超长时自动降级
6. ✅ 不同设备（方形屏/圆形屏/胶囊屏）均正常
7. ✅ 模型名称含空格等特殊字符时正确编码