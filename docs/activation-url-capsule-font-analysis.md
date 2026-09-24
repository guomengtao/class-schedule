# 激活 URL 胶囊屏字体偏大分析报告（修正版）

## 分析目标

只看 URL 中的设备参数，判断用户胶囊屏幕的真实尺寸，并与项目开发设置的尺寸对比，找出字体偏大的根因。

---

## 一、URL 解码：用户的真实屏幕尺寸

```
https://app-auth.gudq.com/activate.html?deviceId=uuid-9&m=ap
&p=Xiaomi%20Smart%20Band%209
&o=198145
&v=1200
&t=band
&s=pill-shaped
&w=192      ← screenWidth
&h=490      ← screenHeight
&a=2        ← API Level
&l=zh
&r=1.6.21
&c=t-9-r
```

**用户的设备**：小米手环 9（`Xiaomi Smart Band 9`）
**屏幕形态**：`pill-shaped`（胶囊屏）
**物理/逻辑像素**：**192×490**

这些参数来源自 `activation.ux` 中 `device.getInfo()` 的真实返回值，`w` 和 `h` 即框架报告的屏幕宽高。

---

## 二、项目开发设置：CSS 像素坐标系

### 2.1 `manifest.json` 关键配置

```json
"config": {
    "designWidth": "device-width"
}
```

`designWidth: device-width` 的含义：**CSS 1px = 设备 1px**。即 CSS 坐标系宽度 = `device.getInfo().screenWidth`。

### 2.2 结论

对于小米手环 9（`screenWidth = 192`）：

```
CSS 视口宽度 = 192px    ← 与 device.getInfo() 返回值一致
```

**用户在真实设备上看到的尺寸 = 192×490，项目在模拟器/IDE 中对接的尺寸也应该是 192×490。两者一致，没有坐标系的差异。**

✅ **宽高一致**：URL 的 `w=192 / h=490` 与 `designWidth: device-width` + 真机返回值完全匹配。

---

## 三、但是：项目内存在一份误导性的基准文档

### [CAPSULE_HEADER_ANALYSIS.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/CAPSULE_HEADER_ANALYSIS.md) — 基准数据错误 ⚠️

这份文档定义"胶囊版手表屏幕参数"时，引用的设备是：

| 设备 | 屏幕宽度 | 形状 |
|------|----------|------|
| **HUAWEI Watch GT 4 (胶囊)** | **466px** | capsule |
| **HUAWEI Watch GT 3 Pro (胶囊)** | **454px** | capsule |
| Honor Watch 4 Pro | **466px** | capsule |
| **HUAWEI Watch GT 5 Pro** | **466px** | capsule |

**这些是华为/荣耀的圆形智能手表（AMOLED 圆屏，454-466px），不是小米手环的胶囊屏！**

该文档据此得出"胶囊版基准宽度 466px"的结论，然后整篇分析都是基于 466px 宽度展开的：

| 形状 | 宽度 | 页面 padding | 可用内容宽 |
|------|------|-------------|-----------|
| capsule | 466px | 6px 左右 | 454px |
| pill-shaped | 454px | 6px 左右 | 442px |
| rect | 336px | 8px 左右 | 320px |

> ⚠️ **这组数据不属于本项目的小米手环胶囊屏。** 本项目（小米手环 9/10）的胶囊屏物理/逻辑宽度是 **192-212px**，不是 454-466px。

### 对比：其他文档的正确数据

其他文档的正确数据：

| 文档 | 胶囊屏宽度 | 来源依据 |
|------|-----------|---------|
| [胶囊屏UI规范.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/胶囊屏UI规范.md) | **192px** | 小米手环 9 物理分辨率 |
| [胶囊屏标准字号分析报告](file:///Users/Banner/Documents/guomengtao/tom/class/class/doc/capsule-font-standard.md) | **198px** | 小米手环系列 |
| QA 第 10 轮报告 | **192×490** / **212×520** | 小米手环 9/10 |
| 📌 本 URL 参数 | **192×490** | 真实用户设备 |

---

## 四、字体偏大的根因

### 根因：开发参考了错误的基准宽度

```
  CAPSULE_HEADER_ANALYSIS.md 定义的"胶囊宽度":  466px  ← ❌ 华为手表
  ├─ 推荐标题字号: 32~34px
  ├─ 推荐正文字号: 24~28px
  └─ 32px 标题占可视区: 32÷430 = 7.4%

  小米手环 9 胶囊屏真实宽度:                   192px  ← ✅ 本项目设备
  ├─ 如果沿用 32px 标题
  └─ 32px 标题占可视区: 32÷160 = 20%    ← 🔴 过大！
```

**具体对比：**

| 场景 | 基准宽度 | 标题 32px 占宽比 | 正文 24px 占宽比 | 观感 |
|------|---------|-----------------|-----------------|------|
| CAPSULE_HEADER_ANALYSIS 假设 | 466px | 32÷466=**6.9%** | 24÷466=**5.2%** | ✅ 正常 |
| 小米手环 9 实际 | 192px | 32÷192=**16.7%** | 24÷192=**12.5%** | 🔴 偏大 |
| 胶囊屏 UI 规范推荐（28px 标题） | 192px | 28÷192=**14.6%** | 24÷192=**12.5%** | ⚠️ 偏大但仍可用 |

> **数据来源不一致：** CAPSULE_HEADER_ANALYSIS.md 引用的是华为手表数据（466px），与项目实际设备（小米手环 9，192px）不匹配。

> ⚠️ **核实补充（2026-09-24）**：把字体偏大**单一归因**于"参考了错误基准"是推测、证据不足。更准确的双重表述：
> 1. `CAPSULE_HEADER_ANALYSIS.md` 的 466px 基准**确实错误**（华为手表数据，非本项目小米 192px）；
> 2. `activation.ux` 胶囊媒体查询**自身**存在反直觉放大（`.cell-text` 32→38、`.keypad-text` 28→32、`.verify-btn-text` 30→34），但这是否源于错误基准，无直接证据。

---

## 五、当前 CSS 样式中的实际字号验证

以 `activation.ux` 为例，看实际使用的字号在 192px 宽屏幕上的表现：

### 默认样式（无媒体查询时）

| 选择器 | 字号 | 在 192px 宽度占比 | 评价 |
|--------|------|------------------|------|
| `.status-main` | 40px | 40÷192=**20.8%** | 🔴 巨大，1行只能显示4字 |
| `.step-title` | 32px | 32÷192=**16.7%** | 🔴 偏大，辅助步骤标题偏大 |
| `.header-title` | 32px | 32÷192=**16.7%** | 🔴 偏大 |
| `.cell-text` | 32px | 32÷192=**16.7%** | 🔴 偏大 |
| `.step-desc` | 28px | 28÷192=**14.6%** | ⚠️ 大 |

### 胶囊屏媒体查询 `@media (shape: capsule), (shape: pill-shaped)`

| 选择器 | 字号 | 变化 | 在 192px 宽度占比 | 评价 |
|--------|------|------|------------------|------|
| `.header-title` | **28px** | 32→28 (-12.5%) | 28÷192=**14.6%** | ⚠️ 仍偏大 |
| `.cell-text` | **38px** | 32→38 (+18.8%) | 38÷192=**19.8%** | 🔴 反而放大，不合理 |
| `.keypad-text` | **32px** | 28→32 (+14.3%) | 32÷192=**16.7%** | 🔴 反而放大 |
| `.verify-btn-text` | **34px** | 30→34 (+13.3%) | 34÷192=**17.7%** | 🔴 反而放大 |

> ⚠️ 注意：`.cell-text`、`.keypad-text`、`.verify-btn-text` 在胶囊媒体查询中**不仅没缩小，反而放大了**。这在窄屏上是反直觉的。

---

## 六、结论

### 6.1 尺寸一致性 ✅

**URL 参数与开发设置一致：**
- URL: `w=192, h=490` → 小米手环 9 物理/逻辑分辨率
- `manifest.json`: `designWidth: device-width` → CSS 视口 = device 宽度
- 模拟器/IDE 对接的尺寸 = 192×490
- **没有坐标系差异，用户真实尺寸与开发设置一致**

### 6.2 字体偏大的真实原因 🔴

**CAPSULE_HEADER_ANALYSIS.md 基准数据有误，引用的是华为手表数据（466px）而非小米手环胶囊屏数据（192px）。**

| 项目 | 正确值 | CAPSULE_HEADER_ANALYSIS 错误值 | 偏差 |
|------|-------|-------------------------------|------|
| 胶囊屏宽度 | **192px**（小米手环 9） | **466px**（华为手表） | **2.4x** |
| 标题推荐字号 | **28px**（胶囊屏规范） | **32~34px**（华为基准） | ~20% |
| 内容区 padding | **16px**（胶囊屏规范） | **6px**（华为基准） | 2.7x |
| 适用设备 | **小米手环 9/10** | **HUAWEI Watch GT 4/5 Pro** | 不同品类 |

### 6.3 建议

1. **在 CAPSULE_HEADER_ANALYSIS.md 顶部加醒目警告**，说明其数据基于华为手表（466px），不适用于本项目的小米手环胶囊屏（192px）
2. **统一以 [胶囊屏UI规范.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/docs/胶囊屏UI规范.md) 为准**（正确使用 192px 基准宽度）
3. **activation.ux 胶囊媒体查询中修复反直觉的字号放大**：`.cell-text` 不应从 32px 放大到 38px，`.keypad-text` 不应从 28px 放大到 32px
   > ⚠️ 注意区分元素类型：`.cell-text` / `.keypad-text` / `.verify-btn-text` 是**键盘键位 / 按钮**，放大是为了保证**可点击区（高度 ≥48px）**，不宜按"正文字号 24px"硬砍；真正该缩的是**纯展示类**文字（`.step-title` 32px、`.step-desc` 28px、`.status-main` 40px）。
4. **所有胶囊媒体查询的标题字号统一为 28px**（按 [capsule-font-standard.md](file:///Users/Banner/Documents/guomengtao/tom/class/class/doc/capsule-font-standard.md) 标准），正文保持 24px