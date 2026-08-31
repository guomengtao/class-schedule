# 命令行激活码测试脚本使用说明

## 快速开始

```bash
node test/crypto.js <12位字符>
```

## 输入格式

12 位字符，分 4 组：

```
98ASDF39aA4D
││ │  ││ │  │
││ │  ││ │  └── 设备ID (4位: A-Z a-z 0-9)
││ │  ││ └── 月份数 (2位纯数字)
││ │  └── 校验码 (4位: A-Z 0-9)
││ └── 产品ID (2位纯数字)
```

| 组 | 长度 | 字符集 | 示例 | 说明 |
|----|------|--------|------|------|
| 产品ID | 2位 | 纯数字 0-9 | `98` | 产品标识 |
| 校验码 | 4位 | 大写字母+数字 A-Z 0-9 | `ASDF` | 防伪造校验 |
| 月份数 | 2位 | 纯数字 0-9 | `39` | 激活月数 |
| 设备ID | 4位 | 大小写字母+数字 A-Z a-z 0-9 | `aA4D` | 设备唯一标识 |

## 输出示例

```bash
$ node test/crypto.js 98ASDF19a34D

  加密结果: 2439 6572 8681 0482 07
  解密结果: 98ASDF19a34D
  对比一致 ✓
```

**输出说明：**
- **加密结果**：18 位纯数字激活码，每 4 位空格分隔，方便阅读
- **解密结果**：还原的原始 12 位字符
- **对比一致**：✓ 表示加密解密可逆，✗ 表示出错

## 常用测试用例

```bash
# 基础测试
node test/crypto.js 98ASDF19a34D

# 边界测试 - 最小值
node test/crypto.js 00AAAA00AAAA

# 边界测试 - 最大值
node test/crypto.js 99ZZZZ99zzzz

# 混合测试
node test/crypto.js 50MIXD50AbCd

# 产品ID=01，月份=03 的典型激活码
node test/crypto.js 01ASDF03aA4D
```

## 错误处理

```bash
# 缺少参数
$ node test/crypto.js

  Usage: node test/crypto.js <12-char-string>

  Format: 2 digits + 4 uppercase/digits + 2 digits + 4 mixed case
  Example: node test/crypto.js 98ASDF39aA4D

# 格式错误
$ node test/crypto.js 12345

  ERROR: Invalid input format.
  Expected: 12 characters (2 digits + 4 uppercase alphanumeric + 2 digits + 4 mixed case)
  Example: 98ASDF39aA4D
```

## 技术原理

脚本调用 `lib/crypto.js` 中的以下函数：

| 函数 | 作用 |
|------|------|
| `parseInput12(input)` | 解析 12 位字符为 4 个字段 |
| `generateActivationCode(input)` | 生成 18 位纯数字激活码 |
| `decryptActivationCode(code)` | 解密 18 位激活码，还原原始字段 |
| `fmtCode18(code)` | 格式化 18 位数字（每 4 位空格分隔） |

编码公式（BigInt 组合编码）：

```
combined = productIdIndex × 36⁴ × 100 × 62⁴
         + redeemNum × 100 × 62⁴
         + months × 62⁴
         + deviceNum
```

其中：
- `36⁴ = 1,679,616`（校验码取值范围）
- `62⁴ = 14,776,336`（设备ID取值范围）
- 最大组合值 ≈ 2.48×10¹⁷，可放入 18 位十进制数字