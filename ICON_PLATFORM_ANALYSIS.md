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

### 1. Phosphor Icons ★★★★☆ 推荐

| 维度 | 评价 |
|------|------|
| 风格 | 6 种粗细（thin/light/regular/bold/fill/duotone），非常灵活 |
| 低调 | ⭐⭐⭐⭐⭐ 极简线条，无多余装饰，最"不张扬" |
| 数量 | 1,000+，覆盖所有常用场景 |
| 体积 | SVG 单个 ~500B-2KB，总计约 30-50KB |
| 配色适应 | 可通过 `currentColor` 适配任意主题色 |
| 许可证 | MIT，完全免费 |
| 快应用兼容 | SVG inline 需转为 base64 或 path data，略麻烦 |

**适配方案**：提取所需图标的 SVG path data，内联到组件中，`fill`/`stroke` 使用主题变量。

---

### 2. Feather Icons / Lucide ★★★★☆

| 维度 | 评价 |
|------|------|
| 风格 | 极简线条，仅一种粗细（1.5px stroke），极其克制 |
| 低调 | ⭐⭐⭐⭐⭐ 极致简约，几乎是最低调的开源图标集 |
| 数量 | Feather 287 个，Lucide 850+ |
| 体积 | 单个 ~300B-1KB，极轻量 |
| 配色适应 | `stroke="currentColor"` 无缝适配 |
| 许可证 | MIT |
| 快应用兼容 | 与 Phosphor 类似，需内联 path data |

**适配方案**：对于课程表这种图标量小的场景，Feather 的克制风格天然匹配"不张扬"需求。

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
| **体积极小** | 单图标 path data 仅 200-500 字符 |
| **配色自由** | `stroke="currentColor"` 一行搞定多主题 |
| **数量刚好** | 课程表场景不超过 20 个图标，Feather 287 个够用 |
| **MIT 协议** | 商业使用无忧 |
| **中文社区接受度高** | 大量中文项目使用，风格符合国内审美 |

### 次选：Phosphor Icons

当需要更多图标或需要填充/线条双套风格时使用。Phosphor 的 Regular 粗细(1.5px) 与 Feather 非常接近。

---

## 实施建议

### 第一步：确定图标清单

课程表场景需要的图标（预估 15-20 个）：

```
首页 home         ← 已有，当前用的是 PNG
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

### 第二步：提取 SVG Path Data

```bash
# 安装 lucide（Feather 的现代化 fork）
npm install lucide-static

# 提取 path data
node -e "
const fs = require('fs');
const icons = ['home', 'arrow-left', 'plus', 'trash-2', 'check', 'x'];
icons.forEach(name => {
  const svg = fs.readFileSync('node_modules/lucide-static/icons/' + name + '.svg', 'utf8');
  const match = svg.match(/<path[^>]*\/>/g);
  console.log(name, match);
});
"
```

### 第三步：内联到快应用组件

快应用不支持 SVG 标签，但 `<image>` 标签支持 base64 编码的 SVG 转 PNG 或者直接用 path data 画。

**方案 A：Base64 PNG**（推荐，兼容性最好）

```html
<image src="data:image/svg+xml;base64,..."></image>
```

快应用 `<image>` 标签支持 base64 data URI。

**方案 B：Canvas 绘制**（备选）

用 `<canvas>` + JS 绘制 path data，但性能开销大，不推荐。

### 第四步：主题色适配

因为使用 Base64 内联，颜色在构建时注入或运行时动态替换：

```javascript
// 构建一套核心图标，颜色用占位符
const iconTpl = (name, color) => {
  const svg = svgMap[name];
  return 'data:image/svg+xml,' + encodeURIComponent(
    svg.replace(/stroke="currentColor"/g, `stroke="${color}"`)
  );
};
```

---

## 体积估算

| 方案 | 预估体积 | rpk 占比 |
|------|----------|----------|
| Feather 20 图标 Base64 | ~15KB | 1.5% |
| Phosphor 20 图标 Base64 | ~25KB | 2.5% |
| PNG 多主题 20×3 | ~30KB | 3% |
| 当前 home.png 单张 | 0.3KB | 0.03% |

即使采用 Feather 全集 15KB，对 1MB rpk 包影响微乎其微。

---

## 对比总结表

| | Feather | Phosphor | Heroicons | Material | 自定义PNG |
|---|---|---|---|---|---|
| 克制/不张扬 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 体积 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 多风格适配 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 维护成本 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 快应用兼容 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 综合推荐 | 🥇 | 🥈 | 🥉 | — | — |

---

## 最终建议

1. **立即采用 Feather Icons (Lucide)**，风格与"不张扬"需求完美匹配
2. 如需填充风格或更多选择，补充 **Phosphor Icons** 的 Fill 系列
3. 逐步替换现有页面中的 emoji 字符图标（如 `◀`、`⌂`），统一视觉语言
4. 后续如需动态主题切换，仅需替换颜色变量即可全部图标变色