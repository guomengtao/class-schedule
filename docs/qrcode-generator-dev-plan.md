# 文字转二维码 - 开发方案

## 概述
在设置页增加"文字转二维码"入口，跳转到二维码生成页面。用户输入任意文字，实时生成二维码显示在屏幕上，手机扫描即可获取文字。适用于手表/手环与手机之间快速传递文字。

## 页面结构
settings 设置页新增"文字转二维码"行 → qrcode-generator 页面
qrcode-generator: header + 输入区 + 二维码显示区 + 快捷内容按钮 + 提示文字

操作: 设置页 → 文字转二维码 → 点击输入区 → 中文输入 → 返回 → 自动生成二维码 → 手机扫描

## 涉及文件
- src/pages/qrcode-generator/qrcode-generator.ux (新建)
- src/lib/qrcode.js (新建, 纯 JS 二维码生成库)
- src/pages/settings/settings.ux (修改, 添加入口)
- src/manifest.json (修改, 注册路由)
- src/data/store.js (修改, qrcode_text 存储)

## 技术方案
Vela JS 不支持 canvas，采用 div 网格渲染。黑色单元格 = 黑色 div，白色 = 透明显示白色背景。
自研纯 JS 二维码库约 560 行，无依赖。完整的 QR 码编码器，包含：
- Galois Field GF(256) 算术（exp/log 表、乘法）
- Reed-Solomon 纠错码生成
- 40 版本 × 4 纠错级别 EC 块结构表
- Byte 模式编码（模式指示符 0100 + 字符计数 + 数据 + 终止符 + 填充）
- EC 块数据交织
- 8 种掩码模式 + 掩码评估打分
- 格式信息 BCH 编码
- 正确放置格式信息到矩阵
- 纠错级别 L(7%)/M(15%)/Q(25%)/H(30%)，默认 L + 自动版本升级

## 快捷内容
内置 6 种快捷内容，一键生成：
| 按钮 | 实际内容 | 用途 |
|------|------|------|
| Hello World | Hello World | 英文文本 |
| 网址示例 | https://www.example.com | URL 链接 |
| 手机号码 | 13800138000 | 电话号码 |
| WiFi信息 | WIFI:S:MyWiFi;T:WPA;P:12345678;; | WiFi 配置 |
| 邮箱地址 | user@example.com | 邮箱 |
| 纯数字 | 1234567890 | 数字文本 |

## 实施步骤
### 1. manifest.json 注册路由
pages/qrcode-generator: { component: "qrcode-generator" }

### 2. settings.ux 添加入口
在震动自定义行下方添加 info-section，onclick="openQrcodeGenerator"，跳转 /pages/qrcode-generator

### 3. 创建 qrcode.js 库
GF(256) → 生成多项式 → RS 纠错 → 模式编码 → 数据交织 → 矩阵构造 → 掩码评估 → 格式信息

### 4. 创建 qrcode-generator.ux 页面
onShow() 读取 store.getQrcodeText()，有文字则 generateQR()。
点击输入区跳转 chinese-input 页面。
usePreset(index) 快速切换预设内容。
generateQR: QRCode.create(text, "L")，cellSize = 180/size，div 网格渲染。

### 5. store.js 新增 setQrcodeText/getQrcodeText 方法

### 6. chinese-input.ux 适配
return_key === "qrcode_text" 时存到 qrcode_text

## 数据流
settings → qrcode-generator (onShow) → chinese-input (输入) → setQrcodeText → back → onShow → generateQR → 手机扫描
快捷内容 → usePreset → generateQR → 即时显示

## 二维码容量
L级别: 版本1(21x21) 25字符, 版本10(57x57) 271字符, 版本40(177x177) 4296字符

## 屏幕适配
手表390x390 / 手环192x490，二维码最大180x180px，版本1每格约8px清晰可扫描

## 开发量
新建2文件 + 修改3文件，约750行代码(含QR库560行)，无第三方依赖，难度四星