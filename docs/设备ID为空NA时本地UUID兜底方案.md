# 设备 ID 为 `NA` / 空值时本地 UUID 兜底方案

> **定位**：当 `device.getDeviceId()` 返回 `"NA"`、`"unknown"`、`"null"` 或空字符串时，客户端生成本地持久化 UUID 作为设备标识，服务端通过 `uuid-` 前缀识别并走软绑定（次数限制）策略。

---

## 目录

1. [问题背景](#1-问题背景)
2. [方案概述](#2-方案概述)
3. [客户端改造](#3-客户端改造)
4. [服务端改造](#4-服务端改造)
5. [存量兼容](#5-存量兼容)
6. [UI 展示规范](#6-ui-展示规范)
7. [风险与边界](#7-风险与边界)

---

## 1. 问题背景

### 1.1 现象

部分小米手环 9 胶囊屏设备上，`device.getDeviceId()` 走 `success` 回调但返回 `data.deviceId = "NA"`（字符串）。

```javascript
// 当前代码：NA 是 truthy，不触发 fallback
self.deviceId = data.deviceId || '未知'    // → "NA"
```

最终二维码 URL 为：`https://app-auth.gudq.com/activate.html?deviceId=NA&...`

### 1.2 根因

详见 [手环9胶囊屏设备ID为NA分析.md](./手环9胶囊屏设备ID为NA分析.md)。核心原因是硬件安全模块（provisioning）未写入唯一标识，API 返回占位符 `"NA"`。

### 1.3 本方案解决什么

| 问题 | 本方案处理方式 |
|------|---------------|
| deviceId = `"NA"` | 丢弃，生成本地 UUID |
| deviceId = `""` 空字符串 | 丢弃，生成本地 UUID |
| deviceId = `"unknown"` | 丢弃，生成本地 UUID |
| deviceId = `"null"` | 丢弃，生成本地 UUID |
| deviceId 正常（32 位 hex） | 按原流程走硬件绑定 |
| 存量 4 位短 ID | 降级为「疑似」，不做强校验 |

---

## 2. 方案概述

### 2.1 核心链路

```
客户端激活页面
    │
    ├── device.getDeviceId()
    │       │
    │       ├── success, value 合法（非 NA/空/unknown）
    │       │       → 硬件 ID，走 hard 绑定
    │       │
    │       ├── success, value = NA / 空 / unknown / null
    │       │       → 生成/读取本地 UUID，走 soft 绑定
    │       │
    │       └── fail
    │               → 生成/读取本地 UUID，走 soft 绑定
    │
    └── 后续流程不变（展示二维码、输入激活码等）
```

### 2.2 前缀规则

```
硬件 ID：  原样，如 d4cd0dabcf4caa22ad92fab40844c786
本地 UUID： uuid-<32位hex>，如 uuid-8f3e1b2c9a5d4e6f7a8b9c0d1e2f3a4b
```

- 前缀统一使用小写 `uuid-`
- 后续 32 位为随机 hex 字符（0-9a-f）
- 总长度 = 4（前缀）+ 32 = 36 字符

---

## 3. 客户端改造

### 3.1 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/activation/activation.ux` | `fetchDeviceId()` 增加 NA 判断和本地 UUID 生成逻辑 |
| （新增）`src/utils/device-uuid.js` | 本地 UUID 生成与持久化工具函数 |

### 3.2 工具模块：`device-uuid.js`

```javascript
// src/utils/device-uuid.js

var UUID_KEY = 'device_uuid_v1'

function generateUUID32() {
  var s = ''
  var chars = '0123456789abcdef'
  for (var i = 0; i < 32; i++) {
    s += chars.charAt(Math.floor(Math.random() * 16))
  }
  return s
}

/**
 * 获取本地设备标识
 * 优先读取 storage 中已持久化的 UUID，不存在则生成新值
 * @param {function} cb - 回调，接收完整 deviceId（含 uuid- 前缀）
 */
function getLocalDeviceId(cb) {
  var storage = require('@system.storage')

  storage.get({
    key: UUID_KEY,
    success: function(data) {
      if (data) {
        cb(String(data))
      } else {
        var id = 'uuid-' + generateUUID32()
        storage.set({ key: UUID_KEY, value: id }, function() {
          cb(id)
        })
      }
    },
    fail: function() {
      // storage 不可用（如首次运行无权限），生成临时值，不写盘
      cb('uuid-' + generateUUID32())
    }
  })
}

/**
 * 判断设备 ID 是否为本地生成的 UUID
 * @param {string} deviceId
 * @returns {boolean}
 */
function isLocalUUID(deviceId) {
  return typeof deviceId === 'string' && /^uuid-[0-9a-f]{32}$/.test(deviceId)
}

module.exports = {
  getLocalDeviceId: getLocalDeviceId,
  isLocalUUID: isLocalUUID,
  generateUUID32: generateUUID32
}
```

### 3.3 改造 `fetchDeviceId()`

```javascript
// src/pages/activation/activation.ux

// 在文件顶部引入
var deviceUuid = require('../../utils/device-uuid')

// ACTIVATION_URL 保持不变
var ACTIVATION_URL = 'https://app-auth.gudq.com/activate.html?deviceId='

// ─────────────────────────────────────────────
// 改造后的 fetchDeviceId
// ─────────────────────────────────────────────

fetchDeviceId: function() {
  var self = this

  // 先尝试获取硬件 ID
  self.fetchHardwareDeviceId(function(rawId) {
    if (rawId && rawId !== 'NA' && rawId !== 'unknown' && rawId !== 'null') {
      // 硬件 ID 有效
      self.deviceId = rawId
      self.deviceIdDisplay = rawId.slice(-6)
      self.updateQrText()
      self.fetchDeviceInfo()
    } else {
      // 硬件 ID 无效，降级到本地 UUID
      deviceUuid.getLocalDeviceId(function(uuid) {
        self.deviceId = uuid
        self.deviceIdDisplay = uuid.slice(-6)
        self.updateQrText()
        self.fetchDeviceInfo()
      })
    }
  })
},

// ─────────────────────────────────────────────
// 抽取的硬件 ID 获取方法
// ─────────────────────────────────────────────

fetchHardwareDeviceId: function(cb) {
  try {
    var device = require('@system.device')
    device.getDeviceId({
      success: function(data) {
        var raw = data.deviceId || ''
        cb(raw)
      },
      fail: function() {
        cb('')  // fail 时传空字符串，触发 UUID 降级
      }
    })
  } catch (e) {
    cb('')  // 异常也传空字符串
  }
}
```

### 3.4 核心判断逻辑（精简版）

如果不想抽方法，直接在 `fetchDeviceId` 里内联：

```javascript
fetchDeviceId: function() {
  var self = this
  try {
    var device = require('@system.device')
    device.getDeviceId({
      success: function(data) {
        var raw = data.deviceId || ''
        if (!raw || raw === 'NA' || raw === 'unknown' || raw === 'null') {
          // ── 降级到本地 UUID ──
          deviceUuid.getLocalDeviceId(function(id) {
            self.deviceId = id
            self.deviceIdDisplay = id.slice(-6)
            self.updateQrText()
            self.fetchDeviceInfo()
          })
          return  // 不再继续执行下面
        }
        // ── 正常硬件 ID ──
        self.deviceId = raw
        self.deviceIdDisplay = raw.slice(-6)
        self.updateQrText()
        self.fetchDeviceInfo()
      },
      fail: function() {
        // ── API 失败也降级到本地 UUID ──
        deviceUuid.getLocalDeviceId(function(id) {
          self.deviceId = id
          self.deviceIdDisplay = id.slice(-6)
          self.updateQrText()
          self.fetchDeviceInfo()
        })
      }
    })
  } catch (e) {
    // ── require 等异常降级 ──
    deviceUuid.getLocalDeviceId(function(id) {
      self.deviceId = id
      self.deviceIdDisplay = id.slice(-6)
      self.updateQrText()
      self.fetchDeviceInfo()
    })
  }
}
```

### 3.5 客户端边界情况

| 场景 | 行为 |
|------|------|
| 首次安装，storage 为空 | 生成新 UUID，写入 storage |
| 非首次安装，storage 有值 | 读取已有 UUID |
| storage 写入失败（磁盘满等） | 生成临时 UUID（不持久化），本次会话可用 |
| storage 读取返回 `null`/空字符串 | 视为无值，重新生成 |
| 卸载重装 | 生成全新 UUID（旧 ID 丢失，不影响激活码绑定计数） |
| OTA 升级 | storage 数据保留，UUID 不变 |

### 3.6 `manifest.json` 权限

```json
{
  "permissions": [
    {
      "name": "hapjs.permission.DEVICE_INFO"
    }
  ]
}
```

`device.getDeviceId()` 本身需要此权限，本地 UUID 方案**不新增权限**。`@system.storage` 无需额外权限声明。

---

## 4. 服务端改造

### 4.1 识别本地 UUID

```javascript
/**
 * 判断是否为本地生成的 UUID（vs 硬件 ID）
 */
function isLocalUUID(deviceId) {
  return typeof deviceId === 'string' && /^uuid-[0-9a-f]{32}$/.test(deviceId)
}
```

### 4.2 激活码绑定逻辑

```javascript
function processActivation(code, deviceId, userInfo) {
  if (isLocalUUID(deviceId)) {
    // ── 软绑定：次数限制 ──
    return softBind(code, deviceId)
  } else {
    // ── 硬绑定：严格校验 ──
    return hardBind(code, deviceId)
  }
}
```

### 4.3 软绑定（soft bind）

**数据结构**：

```json
{
  "activation_code": "XXXX-XXXX-XXXX",
  "bind_type": "soft",
  "bind_count": 1,
  "bind_limit": 3,
  "devices": [
    "uuid-8f3e1b2c9a5d4e6f7a8b9c0d1e2f3a4b"
  ],
  "created_at": "2026-09-24T10:00:00Z",
  "updated_at": "2026-09-24T10:00:00Z"
}
```

| 字段 | 说明 |
|------|------|
| `bind_type` | `"soft"` 表示软绑定 |
| `bind_count` | 当前绑定的设备数 |
| `bind_limit` | 允许的最大绑定数，建议 **3** |
| `devices` | 已绑定的设备 ID 列表 |

**绑定流程**：

```javascript
function softBind(code, deviceId) {
  var record = db.findCode(code)

  // 该设备已绑定 → 直接通过
  if (record.devices.includes(deviceId)) {
    return { success: true, message: '已在该设备上激活' }
  }

  // 超限 → 拒绝
  if (record.bind_count >= record.bind_limit) {
    return { success: false, message: '该激活码已绑定超过上限（' + record.bind_limit + '台）' }
  }

  // 未超限 → 绑定新设备
  record.devices.push(deviceId)
  record.bind_count += 1
  record.updated_at = new Date().toISOString()
  db.saveCode(record)

  return { success: true, message: '激活成功（软绑定 ' + record.bind_count + '/' + record.bind_limit + '）' }
}
```

### 4.4 硬绑定（hard bind）

保持现有逻辑不变：一个激活码只能绑定**一个**硬件 ID，不可更换设备。

### 4.5 混合场景说明

场景：一个激活码先被硬件设备绑定，后被软绑定设备使用。

建议处理方式：

| 场景 | 处理 |
|------|------|
| 先 hard 绑定，后 soft 绑定 | 拒绝（hard 独占，不允许混合） |
| 先 soft 绑定，后 hard 绑定 | 拒绝（同上） |
| 所有绑定都是 hard | 走原逻辑 |
| 所有绑定都是 soft | 走软绑定的次数限制 |

> **理由**：`bind_type` 由**首个激活设备**决定。一旦激活码被 hardware 激活，就锁定为 hard；首次被 UUID 激活，就锁定为 soft。不允许混合，避免绕过 hard 限制。

```javascript
function getBindType(record) {
  if (record.bind_type === 'soft') return 'soft'
  if (record.bind_type === 'hard') return 'hard'
  // 兼容旧数据：无 bind_type 字段时，根据首个设备判断
  if (record.bind_count > 0 && record.devices.length > 0) {
    return isLocalUUID(record.devices[0]) ? 'soft' : 'hard'
  }
  return 'hard'  // 默认 hard
}
```

---

## 5. 存量兼容

### 5.1 现有数据特征

老的激活记录中 `device_id` 可能为：

- 32 位完整硬件 hex（正常）
- 4 位短 ID（如 `"ab12"`，仅末尾切片）
- `"NA"`（无效值）
- 空字符串

### 5.2 服务端匹配规则

```javascript
function classifyDeviceId(deviceId) {
  if (!deviceId || deviceId === 'NA' || deviceId === 'unknown' || deviceId === 'null') {
    return 'invalid'
  }
  if (/^uuid-[0-9a-f]{32}$/.test(deviceId)) {
    return 'local-uuid'
  }
  if (deviceId.length === 4) {
    return 'legacy-short'
  }
  if (/^[0-9a-f]{32}$/i.test(deviceId)) {
    return 'hardware'
  }
  return 'unknown'
}
```

| 分类 | 处理方式 |
|------|---------|
| `invalid` | 拒绝，提示重新获取设备信息 |
| `local-uuid` | 走软绑定（次数限制） |
| `legacy-short` | 降级为「疑似」：匹配时只做参考，不做强校验，允许管理员手动合并 |
| `hardware` | 走硬绑定（原逻辑） |
| `unknown` | 按硬绑走，可能会失败，记录日志 |

### 5.3 4 位短 ID 降级策略

老数据中 `device_id` 只有 4 位（如 `"ab12"`）的情况：

```javascript
function matchLegacyDevice(record, incomingDeviceId) {
  // 只有双方都是 legacy 格式才做匹配
  if (record.device_id.length === 4 && incomingDeviceId.length === 4) {
    return record.device_id === incomingDeviceId
  }
  // legacy vs new → 不自动匹配，走人工审核
  return false
}
```

---

## 6. UI 展示规范

### 6.1 客户端激活页面

```
┌──────────────────────────────┐
│  使用本地标识（soft）         │  ← 当 deviceId 为 uuid- 前缀时显示
│  ID: uuid-8f3e…3a4b          │
│  激活码: _  _  _  _  _  _    │
│  [激活]                      │
└──────────────────────────────┘
```

| 场景 | 显示 |
|------|------|
| 硬件 ID | 正常显示，不加标注 |
| 本地 UUID | 在 ID 旁边显示「本地标识」灰色标签 |

### 6.2 后台管理

```
┌──────────────────────────────────────────┐
│  设备ID                         类型     │
│  uuid-8f3e1b2c…1e2f3a4b  本地标识（soft）│  ← 灰色标注
│  d4cd0dabcf4caa22…44c786  硬件          │  ← 正常
│  ab12                       旧数据（疑似）│  ← 橙色标注
└──────────────────────────────────────────┘
```

### 6.3 掩码规则

统一使用后 6 位作为显示截断，规则不变：

```javascript
deviceIdDisplay = deviceId.slice(-6)
```

- `uuid-8f3e1b2c9a5d4e6f7a8b9c0d1e2f3a4b` → `…3a4b`
- `d4cd0dabcf4caa22ad92fab40844c786` → `…c786`

---

## 7. 风险与边界

### 7.1 已知风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 卸载重装 UUID 改变 | 同一设备激活码额度重新计数 | 软绑定限制 3 台，正常用户不会频繁重装 |
| storage 被清除 | 同上 | 识别为全新设备，计入绑定次数 |
| 多个用户共享激活码 | 一台设备用完 3 次额度后其他设备无法使用 | 这是**预期行为**——本来就不允许多设备共享 |
| UUID 碰撞（概率极低） | 极小概率两台设备生成相同的 32 位随机 hex | 2^128 空间，碰撞概率可忽略 |
| 刷机 / 恢复出厂 | storage 被清，UUID 丢失 | 同上，按全新设备处理 |

### 7.2 与现有诊断方案的关系

本文档与 [手环9胶囊屏设备ID为NA诊断与修复方案](./手环9胶囊屏设备ID为NA分析.md) 的关系：

| 文档 | 定位 | 状态 |
|------|------|------|
| 诊断方案 | 先诊断，确认哪些 API 在 Band 9 上可用 | 🟡 建议先行 |
| 本方案（UUID 兜底） | 当诊断确认所有硬件 API 不可用后的落地修复 | ✅ 可独立上线 |

> **建议执行顺序**：
> 1. 先上线本方案的客户端代码（`uuid-` 降级 + storage 持久化），解决用户当前无法激活的问题
> 2. 同时部署诊断页面收集数据
> 3. 根据数据决定是否调整激活模型

### 7.3 回滚方案

| 组件 | 回滚操作 |
|------|---------|
| 客户端 | 恢复 `fetchDeviceId()` 到原版（`data.deviceId \|\| '未知'`） |
| 服务端 | 移除 `bind_type` 字段识别逻辑，停用软绑定配置 |
| 数据 | 软绑定记录保留，不影响硬绑定逻辑 |

> **回滚不会影响已有数据**：软绑定记录中的 `devices` 列表保留，如需回退到硬绑定，已软绑定的设备数据可作为人工审核参考。

---

## 附录 A：完整 URL 示例

```
# 硬件 ID（正常）
https://app-auth.gudq.com/activate.html?deviceId=d4cd0dabcf4caa22ad92fab40844c786&m=ap&p=Xiaomi%20Smart%20Band%209&o=198145&v=1200&t=band&s=pill-shaped&w=192&h=490&a=2&l=zh&r=1.6.21&c=t-9-r

# 本地 UUID（兜底）
https://app-auth.gudq.com/activate.html?deviceId=uuid-8f3e1b2c9a5d4e6f7a8b9c0d1e2f3a4b&m=ap&p=Xiaomi%20Smart%20Band%209&o=198145&v=1200&t=band&s=pill-shaped&w=192&h=490&a=2&l=zh&r=1.6.21&c=t-9-r
```

## 附录 B：数据库迁移参考 SQL

```sql
-- 激活记录表增加 bind_type 字段
ALTER TABLE activation_codes
  ADD COLUMN bind_type VARCHAR(8) NOT NULL DEFAULT 'hard'
  COMMENT '绑定类型: hard=硬件绑定, soft=软绑定(次数限制)';

-- 增加 bind_limit 和 bind_count
ALTER TABLE activation_codes
  ADD COLUMN bind_limit INT NOT NULL DEFAULT 1
  COMMENT '软绑定最大设备数';
ALTER TABLE activation_codes
  ADD COLUMN bind_count INT NOT NULL DEFAULT 1
  COMMENT '当前已绑定设备数';

-- 增加 devices 列表（JSON 数组）
ALTER TABLE activation_codes
  ADD COLUMN devices JSON NOT NULL DEFAULT ('[]')
  COMMENT '已绑定的设备 ID 列表';

-- 存量数据迁移：原有单设备记录初始化
UPDATE activation_codes
  SET bind_count = 1,
      devices = JSON_ARRAY(device_id),
      bind_type = CASE
        WHEN LENGTH(device_id) <= 4 THEN 'hard'  -- 旧 4 位数据保持 hard
        ELSE 'hard'
      END
  WHERE bind_count IS NULL;
```

---

## 附录 C：改动文件清单

| 文件 | 操作 | 说明 |
|------|:----:|------|
| `src/utils/device-uuid.js` | **新建** | UUID 生成与持久化工具函数 |
| `src/pages/activation/activation.ux` | 修改 | `fetchDeviceId()` 增加 NA 判断 + UUID 降级 |
| `src/manifest.json` | 无需改动 | 已有 DEVICE_INFO 权限，storage 无需声明 |
| 服务端激活码处理 | 修改 | 增加 `isLocalUUID()` 识别 + `softBind` 逻辑 |
| 服务端数据库 | 迁移 | 新增 `bind_type`/`bind_limit`/`bind_count`/`devices` 字段 |
| 后台管理 UI | 修改 | 设备 ID 列表增加类型标注（本地标识/硬件/疑似） |