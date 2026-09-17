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

### 关于 Lucide：为什么它不适合胶囊屏？

Lucide 是优秀的图标库，但它是为 **网页/常规 App** 设计的，在智能手环/胶囊屏场景下存在三个关键问题：

| 问题 | 详情 |
|------|------|
| **小尺寸视觉失衡** | 基于 24x24 网格设计，在 24-32px 胶囊屏实际尺寸下，部分图标显得比同尺寸其他图标更细更小，视觉不统一 |
| **缺乏多风格变体** | 仅有一套线性风格，无填充/双色变体。课程表需要靠不同风格区分"已选/未选"等状态时，Lucide 帮不上忙 |
| **设计初衷非极小屏幕** | 1.5px 描边在 48px 网页上很漂亮，但在胶囊屏实际约 2mm 大小的图标上，太细的线条辨识度不足 |

**结论：Lucide 适合网页，不适合手环。需要专门为小屏幕优化过的图标库。**

---

### 推荐方案

### 1. Remix Icon ★★★★★ 首选

| 维度 | 评价 |
|------|------|
| 风格 | 中性柔和，线条清晰，3200+ 图标，风格非常克制不张扬 |
| 低调 | ⭐⭐⭐⭐⭐ 扁平化设计，无多余装饰，非常适合中文场景 |
| 数量 | 3,200+，远超课程表需求 |
| 体积 | PNG 单张 ~0.5KB |
| PNG 支持 | ✅ 官网 remixicon.com 点击图标直接下载 PNG |
| 小屏幕 | ⭐⭐⭐⭐ 图标结构清晰，缩放后辨识度高 |
| 许可证 | Apache 2.0 |

**适配方案**：从 remixicon.com 搜索图标 → 选择尺寸 → 下载 PNG → 放入 `src/common/`。

---

### 2. IconPark (字节跳动) ★★★★★ 首选

| 维度 | 评价 |
|------|------|
| 风格 | 四种变体：线性(Linear)、填充(Fill)、双色(TwoTone)、四色(FourColor) |
| 低调 | ⭐⭐⭐⭐⭐ 线性风格极简干净，和 Lucide 风格相近但设计更成熟 |
| 数量 | 2,000+ |
| 体积 | PNG 单张 ~0.5KB |
| PNG 支持 | ✅ 官网 iconpark.oceanengine.com 直接下载 PNG |
| 小屏幕 | ⭐⭐⭐⭐ 字节系产品大量用于移动端，小屏幕验证充分 |
| 许可证 | Apache 2.0 |

**适配方案**：iconpark.oceanengine.com → 选择 Linear 风格 → 下载 PNG。中文社区出品，设计风格贴合国内用户审美。

---

### 3. Radix Icons ★★★★☆ 极小屏专用

| 维度 | 评价 |
|------|------|
| 风格 | 318 个极简图标，**专为小尺寸设计**，基于 15x15 像素网格 |
| 低调 | ⭐⭐⭐⭐⭐ 极致克制，小尺寸下最为清晰锐利 |
| 数量 | 318 个，刚好够用 |
| 体积 | PNG 单张 ~0.3KB |
| PNG 支持 | 提供 SVG，PNG 需自行转换（简单脚本即可） |
| 小屏幕 | ⭐⭐⭐⭐⭐ 15x15 网格专为密集 UI 优化，胶囊屏完美适配 |
| 许可证 | MIT |

**适配方案**：从 radix-icons.com 下载 SVG → 用脚本批量转 PNG → 放入 `src/common/`。如果你对极小尺寸下的锐利度有极致要求，这是最佳选择。

---

### 4. Tabler Icons ★★★★☆

| 维度 | 评价 |
|------|------|
| 风格 | 5000+ 图标，2px 描边，风格统一，比 Lucide 略粗更适合小屏 |
| 低调 | ⭐⭐⭐⭐ 设计干净，无多余装饰 |
| 数量 | 5,000+ |
| 体积 | PNG 单张 ~0.5KB |
| PNG 支持 | ✅ 官方 NPM 包 `@tabler/icons-png`，命令行批量导出 |
| 小屏幕 | ⭐⭐⭐⭐⭐ 2px 描边在小尺寸下辨识度明显优于 Lucide 的 1.5px |
| 许可证 | MIT |

**适配方案**：`npm install @tabler/icons-png` → 批量导出 48px PNG → 放入 `src/common/`。

---

### 5. Phosphor Icons ★★★☆☆

| 维度 | 评价 |
|------|------|
| 风格 | 6 种粗细，非常灵活 |
| 低调 | ⭐⭐⭐⭐ 风格干净 |
| 数量 | 1,000+ |
| 体积 | PNG 单张 ~0.5KB |
| PNG 支持 | 官网可按尺寸/颜色导出，略麻烦 |
| 小屏幕 | ⭐⭐⭐ 设计初衷非小屏幕 |

---

### 不推荐的方案

### Material Design Icons ★★☆☆☆

| 维度 | 评价 |
|------|------|
| 风格 | Material Design 风格，Google 辨识度太高 |
| 低调 | ⭐⭐⭐ 风格存在感太强 |
| 数量 | 5,000+（选择困难） |
| 不推荐原因 | 风格太"Google"，不符合"不张扬"需求 |

### Font Awesome ★☆☆☆☆

| 维度 | 评价 |
|------|------|
| 风格 | 偏 Web 风格，粗糙 |
| 体积 | 太大 |
| 不推荐原因 | 体积大、线条粗、过于"张扬" |

### 自定义 PNG ★★★☆☆

| 维度 | 评价 |
|------|------|
| 风格 | 完全可控 |
| 体积 | 可极致优化 |
| 不推荐原因 | 维护成本高，多主题需要多套图，缺乏专业设计 |

---

## 推荐结论

### 🥇 首选：Remix Icon 或 IconPark

| 维度 | Remix Icon | IconPark |
|------|-----------|----------|
| PNG 下载 | ✅ 官网一键下载 | ✅ 官网一键下载 |
| 图标数量 | 3,200+ | 2,000+ |
| 风格 | 中性柔和 | Linear/Fill/TwoTone 多风格 |
| 小屏适配 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 中文友好 | ✅ | ✅ 字节跳动出品 |

两者都支持直接下载 PNG，能极大简化工作流。**建议先去两个官网搜索"home"、"settings"等关键词，对比风格后选择更顺眼的那一个**。

### 🥈 次选：Radix Icons

如果对极小尺寸下的**锐利度有极致要求**，Radix Icons 的 15x15 像素网格专为手环/手表这种密集 UI 设计，是唯一专门面向极小屏幕的图标库。

### 🥉 备选：Tabler Icons

图标量最大（5000+），2px 描边比 Lucide 的 1.5px 在小屏幕下辨识度更好，且有官方 `@tabler/icons-png` NPM 包支持命令行批量导出。

---

## 实施建议

### 原则：直接下载 PNG，不用 SVG

快应用不支持 SVG 标签，SVG inline / base64 方案兼容性差。**从图标库官网直接下载 PNG 位图**是最简单、最稳定的方案。推荐从 Remix Icon 或 IconPark 官网下载，两者都支持一键导出 PNG。

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

#### Remix Icon (remixicon.com) 下载方式

```
1. 打开 https://remixicon.com
2. 搜索图标名（如 home、settings、arrow-left）
3. 点击图标 → 弹出设置面板
4. 选择 Size: 48px, Color: #888888（中性灰）
5. 点击下载 → 保存到 src/common/icon_xxx.png
```

#### IconPark (iconpark.oceanengine.com) 下载方式

```
1. 打开 https://iconpark.oceanengine.com/official
2. 搜索图标名（支持中文搜索）
3. 选择风格：Linear（线条，推荐首选）
4. 设置大小：48px，颜色：#888888
5. 点击下载 PNG
```

#### Tabler Icons 批量下载（命令行）

```bash
# Tabler 有官方 NPM 包，支持命令行批量导出 PNG
npm install @tabler/icons-png

# 导出所需的图标为 48px PNG
npx @tabler/icons-png --size 48 --color "#888888" \
  --icons home,arrow-left,plus,check,x,settings,trash,edit,qrcode
```

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
| Remix / IconPark 20 图标 PNG (48px) | ~10KB | 1% |
| Radix 20 图标 PNG (48px) | ~6KB | 0.6% |
| Tabler 20 图标 PNG (48px) | ~10KB | 1% |
| 浅色+深色双套 PNG | ~20KB | 2% |
| 当前 home.png 单张 | 0.3KB | 0.03% |

**结论**：任何方案 1-2 套 PNG 总成本不超过 20KB，rpk 占比 <2%，完全可接受。

---

## 对比总结表

| | Remix | IconPark | Radix | Tabler | Phosphor | Lucide |
|---|---|---|---|---|---|---|
| 克制/不张扬 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 体积 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| PNG 直接下载 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 小屏适配 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 多风格变体 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 中文友好 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 快应用兼容 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 综合推荐 | 🥇 | 🥇 | 🥈 | 🥉 | — | ❌ |

---

## 最终建议

1. **放弃 Lucide** — 它适合网页，不适合手环胶囊屏（线条太细、无多风格、非极小屏设计）
2. **首选 Remix Icon 或 IconPark**，两者都支持官网直接下载 PNG，工作流最简单
   - Remix Icon：风格中性柔和，3200+ 图标
   - IconPark：字节出品，Linear/Fill/TwoTone 多风格，中文友好
3. **如果对小屏锐利度有极致要求**，选 Radix Icons（15x15 网格），需要自行 SVG→PNG 转换
4. 使用 **48px + 中性灰色 #888888** 一套图标适配浅色/深色双主题
5. 逐步替换现有页面中的 emoji 字符图标（如 `◀`、`⌂`），统一视觉语言