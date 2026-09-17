# 课程表 胶囊屏 图标方案选型分析

## 背景约束

| 约束项 | 说明 |
|--------|------|
| 平台 | 快应用 (Quick App)，不支持 Web Font |
| 屏幕 | 胶囊屏优先（约 192x490），空间极小 |
| 包体积 | rpk < 1MB，解压后 < 2MB |
| 多风格 | 深色/浅色/多主题配色，图标需自适应 |
| 用户偏好 | 不张扬、低调、干净、耐看 |
| 图标数量 | 总量不大（课程表场景约 10-20 个图标） |

---

## 候选方案对比

### 1. Phosphor Icons ★★★★☆

| 维度 | 评价 |
|------|------|
| 风格 | 6 种粗细（thin/light/regular/bold/fill/duotone），非常灵活 |
| 低调 | ⭐⭐⭐⭐⭐ 极简线条，无多余装饰，最"不张扬" |
| 数量 | 1,000+，覆盖所有常用场景 |
| 体积 | PNG 48px 单张 ~0.5KB，总计约 10KB |
| 配色适应 | PNG 颜色固定；官网可按颜色导出，或后期批量换色 |
| 许可证 | MIT，完全免费 |
| 快应用兼容 | ⭐⭐⭐⭐⭐ 直接 `<image>` 标签引用 PNG，零兼容问题 |

**适配方案**：从 phosphoricons.com 选择 Regular 风格，下载 48px PNG，放入 `src/common/`。

---

### 2. Feather Icons / Lucide ★★★★☆

| 维度 | 评价 |
|------|------|
| 风格 | 极简线条，仅一种粗细（1.5px stroke），极其克制 |
| 低调 | ⭐⭐⭐⭐⭐ 极致简约，几乎是最低调的开源图标集 |
| 数量 | Feather 287 个，Lucide 850+ |
| 体积 | PNG 48px 单张 ~0.3KB，极轻量 |
| 配色适应 | PNG 颜色固定；从 lucide.dev 按颜色导出，或后期批量换色 |
| 许可证 | MIT |
| 快应用兼容 | ⭐⭐⭐⭐⭐ 直接 `<image>` 标签引用 PNG，零兼容问题 |

**适配方案**：从 lucide.dev 下载 48px PNG，放入 `src/common/`。Lucide 的克制风格天然匹配"不张扬"需求。

---

### 3. Heroicons (Tailwind 团队) ★★★☆☆

| 维度 | 评价 |
|------|------|
| 风格 | 两种：outline（线条）、solid（填充），风格偏现代 |
| 低调 | ⭐⭐⭐⭐ 干净利落，但比 Feather 略"设计感强" |
| 数量 | ~300 个，覆盖面一般 |
| 体积 | 单个 ~400B-1.5KB |
| 配色适应 | `currentColor` 支持 |
| 许可证 | MIT |

---

### 4. Material Design Icons (Google) ★★☆☆☆

| 维度 | 评价 |
|------|------|
| 风格 | Material Design 风格，识别度高但有"Google 味" |
| 低调 | ⭐⭐⭐ 风格存在感较强，不够克制 |
| 数量 | 5,000+（太多，选择困难） |
| 体积 | 单个 ~600B-2KB，全集太大 |
| 配色适应 | 支持 |
| 许可证 | Apache 2.0 |

**不推荐原因**：Material Design 风格辨识度太高，用户一看就知道是 Google 风格，不符合"不张扬"。

---

### 5. Font Awesome ★☆☆☆☆

| 维度 | 评价 |
|------|------|
| 风格 | 偏 Web 风格，存在感强 |
| 低调 | ⭐⭐ 大图标、粗线条，过于"张扬" |
| 体积 | 很大，不适合包体积限制 |

**不推荐**。

---

### 6. 自定义 PNG（当前方案）★★★☆☆

| 维度 | 评价 |
|------|------|
| 风格 | 完全可控 |
| 低调 | ⭐⭐⭐⭐⭐ 想怎么低调就怎么低调 |
| 体积 | 单张 200B-1KB，可极致优化 |
| 配色适应 | ❌ PNG 颜色固定，多主题需要多套 PNG |
| 维护 | ❌ 每个图标、每个主题、每个尺寸都要单独生成 |
| 缩放 | 栅格图在胶囊屏小尺寸下模糊风险 |

**当前问题**：我们的 home.png 是固定颜色，换了主题色就突兀。多主题需要多套图。

---

## 推荐结论

### 首选：Feather Icons / Lucide

| 理由 | 详情 |
|------|------|
| **最克制** | 仅 1.5px 统一描边，无任何多余设计元素 |
| **体积极小** | 单图标 ~300B-1KB，极轻量 |
| **数量刚好** | 课程表场景不超过 20 个图标，Feather 287 个够用 |
| **MIT 协议** | 商业使用无忧 |
| **中文社区接受度高** | 大量中文项目使用，风格符合国内审美 |

### 次选：Phosphor Icons

当需要多个风格变体（填充/线条）时使用。Phosphor 的 Regular 粗细(1.5px) 与 Feather 几乎一致。

---

## 实施建议

### 原则：不使用 SVG，直接使用下载的 PNG 图

快应用不支持 SVG 标签，SVG inline / base64 方案兼容性差，调试成本高。**直接下载 PNG 位图**是最简单、最稳定、最兼容的方案。

### 第一步：确定图标清单

课程表场景需要的图标（预估 15-20 个）：

```
首页 home
返回 arrow-left
设置 settings
搜索 search
添加 plus
删除 trash-2 / x
编辑 edit
二维码 qr-code
分享 share
下载 download
备份 upload-cloud
刷新 refresh-cw
课程 book-open
时间 clock
展开 chevron-down
收起 chevron-up
勾选 check
关闭 x
信息 info
感叹号 alert-circle
```

### 第二步：从图标库网站下载 PNG

#### Lucide (lucide.dev) 下载方式

```
https://lucide.dev/icons/home        → 浏览器打开
https://lucide.dev/api/icons/home    → 直接下载 SVG

# 命令行批量下载 PNG（推荐用 48px 尺寸，适配胶囊屏）
# Lucide 官网每个图标页面可下载 PNG，选择 size=48, stroke-width=1.5
# 或者用以下脚本：

for icon in home arrow-left plus check x settings trash-2; do
  curl -o "src/common/icon_${icon}.png" \
    "https://lucide.dev/api/icons/${icon}?size=48&color=%237ec8e3"
done
```

#### Phosphor Icons (phosphoricons.com) 下载方式

```
https://phosphoricons.com/?q=home    → 在线选择粗细/尺寸，右键下载 PNG
```

推荐下载参数：
- **尺寸**：48px（胶囊屏无需更大）
- **风格**：Regular（线条）或 Fill（填充，按需）
- **颜色**：使用主题色（如 `#7ec8e3` 蓝），或中性灰色 `#666666` 适配多主题

### 第三步：存放到项目中

```
src/common/
├── home.png              ← 已有
├── icon_arrow-left.png
├── icon_plus.png
├── icon_check.png
├── icon_x.png
├── icon_settings.png
├── icon_trash-2.png
├── icon_edit.png
├── icon_qr-code.png
├── icon_share.png
├── icon_download.png
├── icon_upload-cloud.png
├── icon_refresh-cw.png
├── icon_book-open.png
├── icon_clock.png
├── icon_chevron-down.png
├── icon_chevron-up.png
├── icon_info.png
├── icon_alert-circle.png
└── icon_search.png
```

### 第四步：在快应用中使用

```html
<image class="home-icon" src="../../common/icon_home.png"></image>
```

注意路径是相对于当前 `.ux` 文件所在页面目录。

### 第五步：多主题适配

PNG 颜色固定，处理多主题有几种策略：

**策略 A：统一中性色（推荐，最简单）**

全部图标使用中性灰色（`#888888` 或 `#999999`），在浅色和深色背景下都不过分突兀。

**策略 B：使用主题近似的颜色**

第一版选择一个主推主题的颜色（如当前蓝色 `#7ec8e3`），后续做多主题时再批量替换颜色。

**策略 C：多套 PNG（包体积允许时）**

```
src/common/
├── icons/light/     ← 浅色主题用
│   ├── home.png
│   └── ...
└── icons/dark/      ← 深色主题用
    ├── home.png
    └── ...
```

每套约 20 张 × 0.5KB = 10KB，两套 20KB，rpk 占比仅 2%，完全可接受。

---

## 体积估算

| 方案 | 预估体积 | rpk 占比 |
|------|----------|----------|
| Lucide 20 图标 PNG (48px) | ~10KB | 1% |
| 浅色+深色双套 PNG | ~20KB | 2% |
| Phosphor 20 图标 PNG (48px) | ~12KB | 1.2% |
| 当前 home.png 单张 | 0.3KB | 0.03% |

即使双套主题 20KB，对 1MB rpk 包影响微乎其微。

---

## 对比总结表

| | Feather | Phosphor | Heroicons | Material | 自定义PNG |
|---|---|---|---|---|---|
| 克制/不张扬 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 体积 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 多风格适配 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 维护成本 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 快应用兼容 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 综合推荐 | 🥇 | 🥈 | 🥉 | — | — |

---

## 最终建议

1. **禁止使用 SVG inline / base64**，兼容性差，调试困难
2. **立即采用 Lucide 图标库**，从官网逐一下载 PNG（48px, 1.5px stroke）放入 `src/common/`
3. 首次使用中性灰色（`#888888`），一个颜色适配浅色/深色双主题
4. 如需多套配色，以后可追加 `src/common/icons/dark/` 目录，成本仅 10KB
5. 逐步替换现有页面中的 emoji 字符图标（如 `◀`、`⌂`），统一视觉语言