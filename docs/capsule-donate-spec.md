# 胶囊屏打赏栏目 UI 规范

## 一、整体布局

```
┌──────────────────────────────┐
│  ← 返回按钮      打赏支持     │  header: 48px 高
├──────────────────────────────┤
│  [微信]  [支付宝]  [爱发电]   │  tab-bar: 三栏等宽
├──────────────────────────────┤
│                              │
│        ◉  平台名称            │
│      ┌──────────┐           │
│      │          │           │  qr-card: 垂直居中
│      │  QR码    │           │
│      │          │           │
│      └──────────┘           │
│     扫码 微信                │
│                              │
│          ♥                   │
│        感谢支持               │  thanks-section
└──────────────────────────────┘
```

## 二、容器规格

### 页面容器 `.page`

| 属性 | 值 | 说明 |
|------|-----|------|
| padding | `30px 16px 30px 16px` | 上下为状态栏/TabBar留空间，左右16px防止内容贴边 |
| width | `100%` | |
| height | `100%` | |
| flex-direction | `column` | 垂直排列 |

**禁止**: padding 左右小于 16px，否则内容会贴边产生视觉压迫感，且小屏可能被遮挡。

---

## 三、逐元素规范

### 3.1 顶部导航栏 `.header`

| 属性 | 值 | 说明 |
|------|-----|------|
| height | `48px` | 触控区域充足 |
| margin-bottom | `8px` | 与tab-bar间距 |
| flex-direction | `row` | 水平排列 |
| align-items | `center` | 垂直居中 |

#### 3.1.1 返回按钮 `.back-btn`

| 属性 | 值 | 胶囊规范检查 |
|------|-----|-------------|
| width | `48px` | 触控区域足够 |
| height | `40px` | ≥ 40px ✅ |
| border-radius | `20px` | 半高圆角 |
| font-size | `24px` | ≥ 20px 最小字号 ✅ |
| line-height | `40px` | 24+16=40, ≥ 24+8=32 ✅ |
| text-align | `center` | |
| flex-shrink | `0` | 不被压缩 |

**防遮挡检查**:
- 文字 "◀" 单字符，24px 字号，容器 48×40，行高 40px → 垂直方向 40-24=16px 余量 → **不会遮挡** ✅
- 按钮不设 padding，文字通过 text-align: center + line-height 垂直居中

#### 3.1.2 标题 `.title`

| 属性 | 值 | 胶囊规范检查 |
|------|-----|-------------|
| font-size | `28px` | ≥ 26px 标题最小 ✅ |
| line-height | `44px` | 28+16=44, ≥ 28+8=36 ✅ |
| font-weight | `bold` | |
| text-align | `center` | |
| flex | `1` | 占据剩余空间 |
| lines | `1` | 单行不换行 |
| margin | `0 4px` | 左右留白避免贴按钮 |

**防遮挡检查**:
- `lines: 1` 强制单行 + `text-align: center` → 无宽度溢出 ✅
- 文本 "打赏支持" 4个字，28px×4=112px, 容器约 280px(414-48-48-8) → 不会溢出 ✅

---

### 3.2 标签切换栏 `.tab-bar` + `.tab-item` + `.tab-text`

| 属性 | 值 | 说明 |
|------|-----|------|
| margin-bottom | `10px` | |
| border-radius | `10px` | |

#### `.tab-item` (三个tab)

| 属性 | 值 | 胶囊规范检查 |
|------|-----|-------------|
| flex | `1` | 等宽分布 |
| height | `40px` | ≥ 40px ✅ |
| border-radius | `10px` | |
| margin | `0 2px` | tab间距 |
| justify-content | `center` | |
| align-items | `center` | |

#### `.tab-text`

| 属性 | 值 | 胶囊规范检查 |
|------|-----|-------------|
| font-size | `24px` | ≥ 20px 最小字号 ✅ |
| line-height | `32px` | 24+8=32 ✅ |
| font-weight | `bold` | |
| lines | `1` | 单行 |

**防遮挡检查**:
- 每个tab文字 ≤ 3个中文字(微信/支付宝/爱发电)，24px×3=72px
- tab最小宽度 (414-32-16×2)/3 ≈ 116px × 3 → 充足 ✅
- line-height: 32px, tab-height: 40px → 上下各4px余量 → **不会遮挡** ✅

---

### 3.3 二维码区域

#### 3.3.1 区域容器 `.qr-section`

| 属性 | 值 | 说明 |
|------|-----|------|
| flex | `1` | 占据剩余空间 |
| justify-content | `center` | 垂直居中 |
| align-items | `center` | 水平居中 |

#### 3.3.2 卡片 `.qr-card`

| 属性 | 值 | 说明 |
|------|-----|------|
| border-radius | `14px` | |
| padding | `16px 14px` | 内边距 |
| width | `100%` | |

#### 3.3.3 平台名称 `.platform-name`

| 属性 | 值 | 胶囊规范检查 |
|------|-----|-------------|
| font-size | `32px` | ≥ 26px ✅ |
| line-height | `40px` | 32+8=40 ✅ |
| font-weight | `bold` | |
| margin-bottom | `14px` | 与QR码间距 |
| lines | `1` | 单行 |

**防遮挡检查**:
- "微信"/"支付宝"/"爱发电" 2-3字，32px字号，与line-height差8px → **不会遮挡** ✅

#### 3.3.4 QR码容器 `.qr-wrapper`

| 属性 | 值 | 说明 |
|------|-----|------|
| padding | `8px` | 白边 |
| background-color | `#ffffff` | 白色背景 |
| border-radius | `12px` | |
| margin-bottom | `12px` | |
| qrcode组件大小 | `120px × 120px` | 胶囊屏动态计算 |

**QR码尺寸自适应逻辑** (JS: `onInit`):
```
shape === "capsule" → qrSize = 120px
shape === "rect"    → qrSize = 130px
shape === "circle"  → qrSize = 160px
```

胶囊屏 QR = 120 + 8×2(padding) = 136px, 容器约 414-16×2-14×2 = 354px → **不会溢出** ✅

#### 3.3.5 扫码提示 `.scan-hint`

| 属性 | 值 | 胶囊规范检查 |
|------|-----|-------------|
| font-size | `22px` | ≥ 20px ✅ |
| line-height | `30px` | 22+8=30 ✅ |
| lines | `1` | 单行 |

**防遮挡检查**:
- "扫码 微信" 5个字符(含空格)，22px×5=110px，容器354px → 充足 ✅

---

### 3.4 感谢区 `.thanks-section`

| 属性 | 值 |
|------|-----|
| flex-direction | `column` |
| align-items | `center` |
| padding | `12px 0 6px 0` |

#### 3.4.1 爱心图标 `.thanks-icon`

| 属性 | 值 | 胶囊规范检查 |
|------|-----|-------------|
| font-size | `36px` | ≥ 20px ✅ |
| line-height | `44px` | 36+8=44 ✅ |
| margin-bottom | `6px` | |

#### 3.4.2 感谢文字 `.thanks-text`

| 属性 | 值 | 胶囊规范检查 |
|------|-----|-------------|
| font-size | `24px` | ≥ 20px ✅ |
| line-height | `32px` | 24+8=32 ✅ |
| text-align | `center` | |
| lines | `1` | |

**防遮挡检查**:
- "感谢支持" 4字，24px×4=96px，容器约354px → **不会溢出** ✅

---

## 四、完整胶囊屏 CSS

```css
@media (shape: capsule), (shape: pill-shaped) {
  .page {
    padding: 30px 16px 30px 16px;
  }
  .header {
    height: 48px;
    margin-bottom: 8px;
    flex-direction: row;
    align-items: center;
  }
  .back-btn {
    width: 48px;
    height: 40px;
    border-radius: 20px;
    font-size: 24px;
    text-align: center;
    line-height: 40px;
    flex-shrink: 0;
  }
  .title {
    font-size: 28px;
    font-weight: bold;
    line-height: 44px;
    text-align: center;
    flex: 1;
    lines: 1;
    margin: 0 4px;
  }
  .tab-bar {
    flex-direction: row;
    margin-bottom: 10px;
    border-radius: 10px;
  }
  .tab-item {
    flex: 1;
    height: 40px;
    justify-content: center;
    align-items: center;
    border-radius: 10px;
    margin: 0 2px;
  }
  .tab-text {
    font-size: 24px;
    font-weight: bold;
    line-height: 32px;
    lines: 1;
  }
  .qr-section {
    flex: 1;
    justify-content: center;
    align-items: center;
  }
  .qr-card {
    padding: 16px 14px;
    border-radius: 14px;
  }
  .platform-name {
    font-size: 32px;
    font-weight: bold;
    line-height: 40px;
    margin-bottom: 14px;
    lines: 1;
  }
  .qr-wrapper {
    padding: 8px;
    border-radius: 12px;
    margin-bottom: 12px;
  }
  .scan-hint {
    font-size: 22px;
    line-height: 30px;
    lines: 1;
  }
  .thanks-section {
    padding: 12px 0 6px 0;
  }
  .thanks-icon {
    font-size: 36px;
    line-height: 44px;
    margin-bottom: 6px;
  }
  .thanks-text {
    font-size: 24px;
    line-height: 32px;
    text-align: center;
    lines: 1;
  }
}
```

---

## 五、文字遮挡检查清单

| # | 元素 | font-size | line-height | 差距(=line-font) | 要求≥8px | 单行(lines:1) | 结果 |
|---|------|-----------|-------------|-------------------|----------|---------------|------|
| 1 | `.back-btn` | 24px | 40px | 16px | ✅ | - | ✅ 不遮挡 |
| 2 | `.title` | 28px | 44px | 16px | ✅ | ✅ | ✅ 不遮挡 |
| 3 | `.tab-text` | 24px | 32px | 8px | ✅ | ✅ | ✅ 不遮挡 |
| 4 | `.platform-name` | 32px | 40px | 8px | ✅ | ✅ | ✅ 不遮挡 |
| 5 | `.scan-hint` | 22px | 30px | 8px | ✅ | ✅ | ✅ 不遮挡 |
| 6 | `.thanks-icon` | 36px | 44px | 8px | ✅ | - | ✅ 不遮挡 |
| 7 | `.thanks-text` | 24px | 32px | 8px | ✅ | ✅ | ✅ 不遮挡 |

**全票通过，无文字遮挡风险。**

---

## 六、字号阶梯对照

| 层级 | 元素 | 字号 | ≥ 最低标准 | 
|------|------|------|-----------|
| 标题级(≥26px) | `.platform-name` | 32px | ✅ |
| 标题级(≥26px) | `.title` | 28px | ✅ |
| 正文级(≥24px) | `.tab-text`, `.thanks-text` | 24px | ✅ |
| 辅助级(≥20px) | `.back-btn` | 24px | ✅ |
| 辅助级(≥20px) | `.scan-hint` | 22px | ✅ |
| 图标 | `.thanks-icon` | 36px | ✅ |

---

## 七、当前问题与修复

| # | 问题 | 当前值 | 应改为 |
|---|------|--------|--------|
| 1 | 无胶囊屏专属 `@media` 规则 | 基础样式混用 | 新增 `@media (shape: capsule)` 规则 |
| 2 | `.page` 左右padding过窄 | `8px` | `16px` |
| 3 | `.back-btn` 尺寸过小 | 40×30px | 48×40px |
| 4 | `.back-btn` 字号偏小 | 20px | 24px |
| 5 | `.title` 字号偏小 | 26px | 28px |
| 6 | `.title` margin-right 硬编码 | `40px`(为右对齐留空) | `0 4px`(居中，不设右边距) |
| 7 | `.tab-item` 高度不足 | 38px | 40px |