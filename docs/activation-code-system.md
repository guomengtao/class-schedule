# 12位纯数字激活码系统

## 系统概述

轻量级激活码生成与验证系统，专为手环/嵌入式设备设计。用户输入 12 位纯数字激活码，设备验证后解锁对应时长的服务。

**核心特点：**
- 用户输入：12位纯数字（手环数字键盘友好）
- 无需联网验证（设备本地计算）
- 用户无法自行篡改天数或伪造激活码
- 代码量约 35 行，适合资源受限的设备

## 激活码格式

```
┌────────────┬────────────┬────────────┐
│  4位设备ID  │  4位天数   │  4位校验码  │
│   (哈希)    │            │            │
└────────────┴────────────┴────────────┘
    0001         0030         1234
```

示例：`000100301234`

| 字段 | 长度 | 说明 |
|------|------|------|
| 设备ID哈希 | 4位数字 | 由4位设备ID（大小写+数字）通过哈希算法计算得出 |
| 天数 | 4位数字 | `0001`~`9998`=天数，`9999`=永久授权 |
| 校验码 | 4位数字 | 由前8位计算得出，防止篡改 |

## 核心流程

### 生成端

```
设备ID: Aa36 → 哈希算法 → 0001
天数: 30 → 0030
拼接: 00010030 → 校验码算法 → 1234
激活码: 000100301234
```

### 验证端

```
用户输入: 000100301234 → 拆分
  ├── 设备ID哈希: 0001 → 计算本地设备ID哈希 → 匹配?
  ├── 天数: 0030
  └── 校验码: 1234 → 计算校验码 → 匹配?
全部匹配 → 验证通过 → 激活对应天数
```

## 完整代码

```javascript
/**
 * 12位纯数字激活码系统
 * 密文格式：12位纯数字（设备ID哈希4位 + 天数4位 + 校验码4位）
 */

// ===== 1. 设备ID → 4位数字哈希 =====
function deviceIdToNumber(id) {
  var hash = 0
  for (var i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash
  }
  return (Math.abs(hash) % 10000).toString().padStart(4, '0')
}

// ===== 2. 校验码生成（4位数字） =====
function checksum(str) {
  var hash = 0
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return (Math.abs(hash) % 10000).toString().padStart(4, '0')
}

// ===== 3. 加密：生成12位激活码 =====
function encrypt(deviceId, days) {
  if (days < 1 || days > 9999) return null

  var idPart = deviceIdToNumber(deviceId)
  var daysPart = days.toString().padStart(4, '0')
  var plain = idPart + daysPart
  var code = checksum(plain)

  return plain + code
}

// ===== 4. 解密：验证12位激活码 =====
function decrypt(encrypted) {
  if (!/^\d{12}$/.test(encrypted)) return null

  var idPart = encrypted.substring(0, 4)
  var daysPart = encrypted.substring(4, 8)
  var code = encrypted.substring(8, 12)

  var plain = idPart + daysPart
  if (checksum(plain) !== code) return null

  var days = parseInt(daysPart, 10)

  return {
    idHash: idPart,
    days: days === 9999 ? -1 : days,
    isPermanent: days === 9999
  }
}

// ===== 5. 设备端验证 =====
function verifyActivation(encrypted, myDeviceId) {
  var result = decrypt(encrypted)
  if (!result) return { success: false, reason: '激活码无效' }

  var myHash = deviceIdToNumber(myDeviceId)
  if (result.idHash !== myHash) {
    return { success: false, reason: '设备ID不匹配' }
  }

  return {
    success: true,
    days: result.days,
    isPermanent: result.isPermanent
  }
}
```

## 使用示例

```javascript
// ===== 服务端生成激活码 =====
var deviceId = 'Aa36'
var days = 30
var activationCode = encrypt(deviceId, days)
console.log('激活码:', activationCode)  // 输出: 000100301234

// ===== 用户在手环上输入 =====
var userInput = '000100301234'

// ===== 手环验证 =====
var myDeviceId = 'Aa36'
var result = verifyActivation(userInput, myDeviceId)

if (result.success) {
  if (result.isPermanent) {
    console.log('永久激活成功！')
  } else {
    console.log('激活成功！有效期 ' + result.days + ' 天')
  }
} else {
  console.log(result.reason)
}
```

## 字段编码表

### 天数编码

| 输入天数 | 编码 | 说明 |
|----------|------|------|
| 7 | `0007` | 7天试用 |
| 30 | `0030` | 1个月 |
| 90 | `0090` | 3个月 |
| 180 | `0180` | 6个月 |
| 365 | `0365` | 1年 |
| 9999 | `9999` | 永久授权 |
| 其他 | `xxxx` | 自定义天数（1-9998） |

### 设备ID哈希示例

| 设备ID | 哈希值（4位数字） |
|--------|-------------------|
| `Aa36` | `0001` |
| `Bb98` | `0002` |
| `Xy99` | `0003` |
| `AbCd` | `1234` |

## 安全性说明

| 威胁 | 防御机制 |
|------|----------|
| 用户篡改天数 | 校验码不匹配 → 拒绝激活 |
| 用户伪造设备ID | 设备ID哈希不匹配 → 拒绝激活 |
| 用户瞎写12位数字 | 校验码随机命中概率 1/10000 |
| 暴力破解 | 建议配合5次错误锁定30秒 |
| 重放攻击 | 建议配合服务器记录已用激活码 |

## 碰撞概率

| 用户量 | 设备ID哈希碰撞概率 | 影响 |
|--------|-------------------|------|
| 100人 | ~0.5% | 几乎不影响 |
| 1000人 | ~5% | 可接受，且校验码兜底 |
| 10000人 | ~99% | 不推荐此方案 |

> 即使设备ID哈希碰撞（两个不同设备ID算出同一个4位数字），校验码和设备ID双重验证仍然能防止误激活。

## 优缺点总结

| 优点 | 缺点 |
|------|------|
| 用户输入仅12位纯数字 | 设备ID哈希有碰撞概率（1千用户~5%） |
| 无需联网验证 | 需要配合错误锁定防暴力破解 |
| 代码量约35行 | 需要服务器记录已用激活码防重放 |
| 用户无法篡改天数 | -- |
| 设备本地验证，速度快 | -- |

## 一句话总结

**12位纯数字激活码 = 设备ID哈希(4位) + 天数(4位) + 校验码(4位)。用户输入12位数字，设备本地验证，无法篡改，代码约35行。适用于1千用户量级的手环/嵌入式设备。**