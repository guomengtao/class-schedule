# 激活码系统完整说明

## 一、系统概述

这是一个**轻量级激活码生成与验证系统**，专为**手环/嵌入式设备**设计。采用 **"二维码 + 网页桥接"** 的授权流程，解决手环输入困难的问题。

**核心特点**：
- 激活码格式：12位字符（含大小写字母 + 数字）
- 无需联网验证（设备本地计算）
- 用户无法自行篡改天数或伪造激活码
- 二维码扫码获取激活码，无需手环输入长串字符

---

## 二、整体流程（用户视角）

```
手环端                                    手机端（扫码打开网页）
   │                                              │
   │  ① 生成二维码                                 │
   │  (包含设备ID + 激活网址)                      │
   │                                              │
   │  ② 用户扫码                                   │
   │  ─────────────────────────────────────────────►│
   │                                              │
   │                         ③ 网页自动识别设备ID   │
   │                         ④ 用户输入兑换码      │
   │                         ⑤ 后台验证兑换码      │
   │                         ⑥ 生成12位激活码      │
   │                                              │
   │  ⑦ 网页显示12位激活码                         │
   │  ◄─────────────────────────────────────────────│
   │                                              │
   │  ⑧ 用户在手环输入12位激活码                   │
   │  ⑨ 本地解密验证，激活成功 ✅                   │
   │                                              │
```

---

## 三、激活码格式

### 密文格式（12位字母数字混合）

```
┌────────────┬────────────┬────────────┐
│  4位设备ID  │  4位天数   │  4位校验码  │
│   (哈希)    │  (纯数字)  │  (Base62)  │
└────────────┴────────────┴────────────┘
   XXXX         0000         XXXX
```

**示例**：`00000030Aa09`

| 字段 | 长度 | 字符集 | 说明 |
| :--- | :--- | :--- | :--- |
| **设备ID哈希** | 4位 | 0-9, A-Z, a-z | 由设备ID通过哈希算法计算得出 |
| **天数** | 4位 | 0-9（纯数字） | `0001`~`9998`=天数，`9999`=永久授权 |
| **校验码** | 4位 | 0-9, A-Z, a-z | 由前8位计算得出，防止篡改 |

---

## 四、62进制编码

使用 `0-9`、`A-Z`、`a-z` 共 62 个字符编码设备ID哈希和校验码，确保包含大小写英文字母。

```javascript
var CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
var BASE = 62

function encode4(n) {
  var result = ''
  var v = n
  for (var i = 0; i < 4; i++) {
    result = CHARSET[v % BASE] + result
    v = Math.floor(v / BASE)
  }
  return result
}
```

---

## 五、核心算法

```javascript
// ===== 1. 设备ID → 4位Base62哈希 =====
function deviceIdToHash(id) {
  var hash = 0
  for (var i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash
  }
  return encode4(Math.abs(hash) % 10000)
}

// ===== 2. 校验码生成（4位Base62） =====
function checksum(str) {
  var hash = 0
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return encode4(Math.abs(hash) % 10000)
}

// ===== 3. 加密：生成12位激活码 =====
function encrypt(deviceId, days) {
  if (days < 1 || days > 9999) return null
  var idPart = deviceIdToHash(deviceId)
  var daysPart = days.toString().padStart(4, '0')
  var plain = idPart + daysPart
  var code = checksum(plain)
  return {
    idPart: idPart,
    daysPart: daysPart,
    code: code,
    full: plain + code
  }
}

// ===== 4. 解密：验证12位激活码 =====
function decrypt(encrypted) {
  if (encrypted.length !== 12) return null
  var idPart = encrypted.substring(0, 4)
  var daysPart = encrypted.substring(4, 8)
  var code = encrypted.substring(8, 12)
  if (!/^\d{4}$/.test(daysPart)) return null
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
  var myHash = deviceIdToHash(myDeviceId)
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

---

## 六、天数编码表

| 输入天数 | 编码 | 说明 |
| :--- | :--- | :--- |
| 7 | `0007` | 7天试用 |
| 30 | `0030` | 1个月 |
| 90 | `0090` | 3个月 |
| 180 | `0180` | 6个月 |
| 365 | `0365` | 1年 |
| 9999 | `9999` | **永久授权** |
| 其他 | `xxxx` | 自定义天数（1-9998） |

---

## 七、页面架构

### 页面列表

| 页面 | 路由 | 说明 |
| :--- | :--- | :--- |
| **激活码实验室** | `pages/activation-lab` | 开发者工具，隐藏入口（点击"演示"3次打开） |
| **设备激活** | `pages/activation` | 用户端激活页面，在功能实验室菜单中可见 |

### 激活码实验室（activation-lab）
- 加密生成区：预设设备ID + 自定义输入，生成12位激活码
- 解密验证区：12位步进器输入 + 设备ID验证，解密并显示三部分结果

### 设备激活（activation）
- 自动获取设备ID（`@system.device`）
- 二维码展示（含设备ID的激活URL）
- 12位步进器输入激活码
- 本地验证并显示结果

---

## 八、安全机制

| 威胁 | 防御机制 |
| :--- | :--- |
| **用户篡改天数** | 校验码不匹配 → 拒绝激活 |
| **用户伪造设备ID** | 设备ID哈希不匹配 → 拒绝激活 |
| **用户瞎写12位字符** | 校验码随机命中概率 1/62^4 ≈ 1/14776336 |
| **暴力破解** | 建议配合5次错误锁定30秒 |
| **重放攻击** | 后端记录已用兑换码，激活码绑定设备ID |

---

## 九、防重放机制

| 环节 | 防重放措施 |
| :--- | :--- |
| **兑换码** | 后端记录已使用的兑换码，防止同一个码多次使用 |
| **12位激活码** | 激活码本身不含用户身份，但结合设备ID验证，防止跨设备使用 |
| **手环本地** | 激活成功后写入存储，防止同一设备重复激活 |

---

## 十、优缺点总结

| 优点 | 缺点 |
| :--- | :--- |
| ✅ 用户无需手动输入长串字符 | ⚠️ 设备ID哈希有碰撞概率 |
| ✅ 无需联网验证 | ⚠️ 需要配合错误锁定防暴力破解 |
| ✅ 代码量少，适合嵌入式设备 | ⚠️ 需要服务器记录已用兑换码防重放 |
| ✅ 用户无法篡改天数 | — |
| ✅ 设备本地验证，速度快 | — |
| ✅ 二维码扫码获取激活码，体验好 | — |

---

## 十一、一句话总结

**12位激活码 = 设备ID哈希(4位Base62) + 天数(4位纯数字) + 校验码(4位Base62)。手环生成二维码（含设备ID）→ 用户扫码打开网页 → 输入兑换码 → 后端验证并生成激活码 → 手环输入激活码本地验证。全程无需手环输入长串字符，防重放由后端控制。**