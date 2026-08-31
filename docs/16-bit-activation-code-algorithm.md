# 16位激活码加密解密算法规范

> 本文档描述 16 位纯数字激活码的完整加密、解密、校验算法。  
> 作为外部系统集成的唯一权威参考。

---

## 1. 格式总览

激活码为 **16 位纯数字字符串**，由 4 个部分组成，每部分 4 位数字：

```
PPPP HHHH DDDD CCCC
│    │    │    │
│    │    │    └── 校验码 (4位数字)
│    │    └── 天数 (4位数字, 补零)
│    └── 设备ID哈希 (4位数字)
└── 产品ID (4位数字)
```

- **无空格**：16 位连续数字，如 `0001643700025787`
- **带空格**（仅用于展示）：`0001 6437 0002 5787`

### 自定义输入格式

用户自定义输入时，使用 **空格分隔的 4 部分**，合计 16 位：

```
产品ID 设备ID 天数
```

示例：
```
0001 Ae19 30
0001 BbX2 90
0001 Xy99 365
0001 AbCd 9999
```

> `9999` 天表示**永久激活**。

---

## 2. 核心编码函数：encode4

**用途**：将任意整数编码为 4 位纯数字字符串。

**算法**：取绝对值后模 10000，补零到 4 位。

```
encode4(n):
  return pad4(abs(n) % 10000)
```

**JavaScript 参考实现**：
```js
function encode4(n) {
  return (Math.abs(n) % 10000).toString().padStart(4, '0')
}
```

**示例**：
```
encode4(0)      → "0000"
encode4(30)     → "0030"
encode4(365)    → "0365"
encode4(9999)   → "9999"
encode4(12345)  → "2345"
encode4(-123)   → "0123"
```

---

## 3. 哈希与校验算法

### 3.1 滚动哈希（Rolling Hash）

设备 ID 哈希和校验码均使用相同的滚动哈希算法。

```
hash(str):
  hash = 0
  for each char c in str:
    hash = ((hash << 5) - hash) + charCodeAt(c)
    hash = hash & hash    // 强制截断为 32 位有符号整数
  return abs(hash)
```

**JavaScript 参考实现**：
```js
function rollingHash(str) {
  var hash = 0
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}
```

> **说明**：`hash & hash` 是 JavaScript 中将值强制转换为 32 位有符号整数的惯用写法（等价于 `hash | 0`）。  
> 在其他语言中，使用 32 位有符号整数类型或相应转换即可。

**各语言等价实现**：

C/C++:
```c
int32_t hash = 0;
for (int i = 0; str[i]; i++) {
    hash = ((hash << 5) - hash) + (unsigned char)str[i];
}
int checksum = abs(hash) % 10000;
```

Java:
```java
int hash = 0;
for (char c : str.toCharArray()) {
    hash = ((hash << 5) - hash) + c;
}
int checksum = Math.abs(hash) % 10000;
```

Python:
```python
hash_val = 0
for c in str_val:
    hash_val = ((hash_val << 5) - hash_val) + ord(c)
    hash_val = hash_val & 0xFFFFFFFF  # 保持 32 位
    if hash_val >= 0x80000000:
        hash_val -= 0x100000000       # 转换为有符号
checksum = abs(hash_val) % 10000
```

### 3.2 设备 ID 哈希：deviceIdToHashV2

**用途**：将任意设备 ID 字符串转换为 4 位数字哈希。

```
deviceIdToHash(id):
  return encode4(hash(id))
```

**JavaScript 参考实现**：
```js
function deviceIdToHashV2(id) {
  var hash = 0
  for (var i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash
  }
  return encode4(Math.abs(hash))
}
```

**示例**：
```
deviceIdToHashV2("Ae19")   → "5052"
deviceIdToHashV2("BbX2")   → "3162"
deviceIdToHashV2("Xy99")   → "9713"
deviceIdToHashV2("AbCd")   → "2770"
deviceIdToHashV2("wS09")   → "6437"
```

### 3.3 校验码：checksumV2

**用途**：对 12 位明文（产品ID + 设备哈希 + 天数）计算 4 位校验码，防止篡改。

```
checksum(str):
  return encode4(hash(str))
```

**JavaScript 参考实现**：
```js
function checksumV2(str) {
  var hash = 0
  for (var i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return encode4(Math.abs(hash))
}
```

**示例**：
```
checksumV2("000150520030") → "4534"
checksumV2("000131620090") → "3118"
checksumV2("000164370002") → "5787"
```

---

## 4. 加密算法：encryptV2

### 4.1 输入参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `deviceId` | string | 设备 ID，任意字符串 |
| `productId` | string | 产品 ID，必须在 `PRODUCTS` 表中存在 |
| `days` | int | 激活天数，范围 1-9999，9999 表示永久 |

### 4.2 加密步骤

```
Step 1: 验证 productId 存在于产品表中
Step 2: 验证 days 在 1-9999 范围内
Step 3: idHash   = deviceIdToHashV2(deviceId)       // 4位
Step 4: daysPart = pad4(days)                        // 4位
Step 5: plain    = productId + idHash + daysPart     // 12位
Step 6: code     = checksumV2(plain)                 // 4位
Step 7: full     = plain + code                      // 16位
```

### 4.3 伪代码

```
function encryptV2(deviceId, productId, days):
  if productId not in PRODUCTS → return null
  if days < 1 or days > 9999 → return null

  idHash   = deviceIdToHashV2(deviceId)
  daysPart = pad4(days)
  plain    = productId + idHash + daysPart
  code     = checksumV2(plain)

  return {
    productId: productId,
    idHash:   idHash,
    daysPart: daysPart,
    checksum: code,
    full:     plain + code
  }
```

### 4.4 完整示例

```
输入:
  deviceId  = "wS09"
  productId = "0001"
  days      = 2

Step 1: productId = "0001" (已存在于产品表)
Step 2: days = 2 (在 1-9999 范围内)
Step 3: idHash   = deviceIdToHashV2("wS09") = "6437"
Step 4: daysPart = pad4(2)                  = "0002"
Step 5: plain    = "0001" + "6437" + "0002" = "000164370002"
Step 6: code     = checksumV2("000164370002") = "5787"
Step 7: full     = "000164370002" + "5787" = "0001643700025787"

输出: "0001643700025787"
展示: "0001 6437 0002 5787"
```

---

## 5. 解密算法：decryptV2

### 5.1 输入格式

16 位纯数字字符串（空格会被自动去除）。

### 5.2 解密步骤

```
Step 1: 去除所有空格
Step 2: 验证长度 === 16 且为纯数字
Step 3: 拆分各部分:
          productId = encrypted[0:4]
          idHash    = encrypted[4:8]
          daysPart  = encrypted[8:12]
          code      = encrypted[12:16]
Step 4: plain = productId + idHash + daysPart
Step 5: 重新计算 checksumV2(plain)，与 code 比较
Step 6: 如果不匹配 → 返回 null (校验失败)
Step 7: days = parseInt(daysPart)
Step 8: isPermanent = (days === 9999)
```

### 5.3 伪代码

```
function decryptV2(encrypted):
  if not match /^\d{16}$/ → return null

  productId = encrypted[0:4]
  idHash    = encrypted[4:8]
  daysPart  = encrypted[8:12]
  code      = encrypted[12:16]

  plain = productId + idHash + daysPart
  if checksumV2(plain) != code → return null

  days = parseInt(daysPart)

  return {
    productId:   productId,
    productName: PRODUCTS[productId].name,
    idHash:      idHash,
    days:        days == 9999 ? -1 : days,
    isPermanent: days == 9999
  }
```

### 5.4 完整示例

```
输入: "0001643700025787"

Step 1: 格式验证 → 16位纯数字 ✓
Step 2: 拆分:
          productId = "0001"
          idHash    = "6437"
          daysPart  = "0002"
          code      = "5787"
Step 3: plain = "0001" + "6437" + "0002" = "000164370002"
Step 4: checksumV2("000164370002") = "5787"
Step 5: "5787" === "5787" ✓
Step 6: days = 2, isPermanent = false

输出: {
  productId: "0001",
  productName: "EV课程表",
  idHash: "6437",
  days: 2,
  isPermanent: false
}
```

---

## 6. 设备验证：verifyActivationV2

### 6.1 用途

在解密基础上，额外验证设备 ID 是否匹配，用于激活场景。

### 6.2 伪代码

```
function verifyActivationV2(encrypted, myDeviceId, expectedProductId = null):
  result = decryptV2(encrypted)
  if not result:
    return { success: false, reason: "Invalid activation code" }

  if expectedProductId and result.productId != expectedProductId:
    return { success: false, reason: "Product ID mismatch" }

  myHash = deviceIdToHashV2(myDeviceId)
  if result.idHash != myHash:
    return { success: false, reason: "Device ID mismatch" }

  return {
    success:     true,
    productId:   result.productId,
    productName: result.productName,
    days:        result.days,
    isPermanent: result.isPermanent
  }
```

---

## 7. 辅助函数

### 7.1 pad4

```
function pad4(n):
  s = String(n)
  while s.length < 4: s = "0" + s
  return s
```

| 输入 | 输出 |
|------|------|
| 30 | `"0030"` |
| 365 | `"0365"` |
| 9999 | `"9999"` |

### 7.2 fmtCode16

展示格式化：将 16 位连续数字添加空格分 4 组。

```
function fmtCode16(code):
  if length != 16 → return code
  return code[0:4] + " " + code[4:8] + " " + code[8:12] + " " + code[12:16]
```

**示例**：
```
fmtCode16("0001643700025787") → "0001 6437 0002 5787"
```

---

## 8. 算法总览表

| 函数 | 用途 | 输入 | 输出 |
|------|------|------|------|
| `encode4` | 数字编码为 4 位 | int | 4位数字字符串 |
| `rollingHash` | 滚动哈希 | string | int (32位) |
| `deviceIdToHashV2` | 设备ID → 4位哈希 | string | 4位数字字符串 |
| `checksumV2` | 12位明文 → 4位校验码 | string (12位) | 4位数字字符串 |
| `encryptV2` | 生成激活码 | (deviceId, productId, days) | 16位激活码 |
| `decryptV2` | 解密激活码 | 16位数字字符串 | 解密结果对象 |
| `verifyActivationV2` | 验证激活码+设备ID | (code, deviceId, ?productId) | 验证结果对象 |
| `fmtCode16` | 格式化展示 | 16位字符串 | 带空格的展示字符串 |

---

## 9. 错误处理

| 错误场景 | 返回值 |
|----------|--------|
| 产品ID不存在 | `encryptV2` 返回 `null` |
| 天数超出范围 | `encryptV2` 返回 `null` |
| 激活码长度不为16 | `decryptV2` 返回 `null` |
| 激活码含非数字字符 | `decryptV2` 返回 `null` |
| 校验码不匹配 | `decryptV2` 返回 `null` |
| 设备ID不匹配 | `verifyActivationV2` 返回 `{ success: false, reason: "Device ID mismatch" }` |

---

## 10. 集成检查清单

集成外部系统时，确保可以实现：

- [ ] `encode4`：整数取模 10000 后补零到 4 位
- [ ] 滚动哈希：`hash = (hash << 5) - hash + charCode`，32 位有符号整数语义
- [ ] `deviceIdToHashV2`：对设备 ID 滚动哈希后取 `encode4`
- [ ] `checksumV2`：对 12 位明文滚动哈希后取 `encode4`
- [ ] `encryptV2`：按 `产品ID(4) + 设备哈希(4) + 天数(4) + 校验码(4)` 组装 16 位激活码
- [ ] `decryptV2`：拆分 16 位后重新计算校验码比对，返回产品ID、设备哈希、天数
- [ ] `verifyActivationV2`：在解密基础上额外验证设备 ID 哈希是否匹配
- [ ] `9999` 天 = 永久激活