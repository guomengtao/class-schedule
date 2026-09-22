# 胶囊屏 UI 问题全面分析报告

> **分析日期**：2026-09-14
> **基于规范**：[胶囊屏UI规范.md](./胶囊屏UI规范.md) v1.1
> **分析范围**：全部 35 个 `.ux` 页面文件
> **分析方法**：逐文件扫描 font-size、line-height、@media、padding、text-overflow 等属性

---

## 一、总体统计

| 指标 | 数值 |
|------|------|
| 总页面数 | 35 个 `.ux` 文件 |
| 总 `font-size` 声明数 | **1081** 条 |
| 总 `line-height` 声明数 | **380** 条 |
| **缺失行高比例** | **≈65%**（701 条 font-size 无对应 line-height） |
| 已包含 capsule @media 的页面 | **32** 个 |
| **缺失** capsule @media 的页面 | **3** 个 |
| 字号低于 18px（规范底线）的声明 | **≈100** 条 |
| 使用非规范中间字号（25/26/27/29/31/33/34/35/37/38/39px） | **65** 条 |

---

## 二、缺失胶囊屏 @media 适配的页面（🔴 P0 致命）

这 3 个页面在胶囊屏上没有任何适配规则，会按方屏默认样式渲染，体验极差。

| # | 页面 | 文件 | 影响 |
|---|------|------|------|
| 1 | **lab-add-course**（实验室添加胶囊版） | `src/pages/lab-add-course/lab-add-course.ux` | 页面已有 `circle`/`rect` 适配，但**缺少 `@media (shape: capsule), (shape: pill-shaped)` 块** |
| 2 | **add-course-v2**（添加课程V2） | `src/pages/add-course-v2/add-course-v2.ux` | **完全没有 shape 媒体查询**，所有屏幕一个样式 |
| 3 | **lab-edit-course**（实验室编辑胶囊版） | `src/pages/lab-edit-course/lab-edit-course.ux` | 有 `circle`/`rect` 适配，但**缺少 `@media (shape: capsule), (shape: pill-shaped)` 块** |

### 解决方案

为每个缺失页面补充完整的 capsule 适配块：

```css
@media (shape: capsule), (shape: pill-shaped) {
  .page {
    padding-top: 30px;
    padding-bottom: 30px;
    padding-left: 16px;
    padding-right: 16px;
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
    line-height: 40px;
    flex-shrink: 0;
  }
  .title {
    font-size: 28px;
    line-height: 44px;
    text-align: center;
    flex: 1;
    lines: 1;
    margin: 0 4px;
  }
}
```

---

## 三、字号过小问题（🔴 P0/P1）

规范 v1.1 规定胶囊屏绝对底线字号为 **18px**。以下页面在胶囊屏（默认样式或 capsule 媒体查询内）存在低于 18px 的字号，真机上几乎看不清。

### 3.1 严重（<14px，完全无法阅读）

| 页面 | 实际字号 | 位置 | 用途 | 建议 |
|------|----------|------|------|------|
| `bs-demo1` | **11px** | back-btn | 返回按钮 | → 20px |
| `black-screen-check` | **11px** | back-btn | 返回按钮 | → 20px |
| `schedule-manager` | **12px** | 多个地方 | 列表项文字 | → 20px |
| `welcome` | **12px** | 按钮文字 | 设置按钮 | → 20px |
| `index-full` | **12px** | week-text | 底部周指示器 | → 20px |
| `vibration-lab` | **12px** | 多处 | 各种标签 | → 20px |
| `activation` | **13px** | 链接文字 | pin-link | → 20px |
| `pinned-pages` | **13px** | back-btn | 返回按钮文字 | → 20px |
| `lab` | **13px** | pin-link | 固定链接 | → 20px |
| `vibration-lab` | **13px** | pin-link | 固定链接 | → 20px |
| `schedule-manager` | **13px** | pin-link | 固定链接 | → 20px |
| `schedule-manager` | **13px** | 胶囊内 | 多处调整 | → 20px |

### 3.2 中等（14-17px，勉强可读但低于规范底线）

| 页面 | 实际字号 | 建议 |
|------|----------|------|
| `welcome` | 14px × 3 处 | → 20px |
| `schedule-manager` | 14px、15px × 2、16px × 3、17px | → 20px |
| `vibration-lab` | 14px × 5、15px × 4、16px × 3 | → 20px |
| `index-full` | 15px、16px × 4 | → 20px |
| `week-view` | 16px | → 20px |
| `bs-demo1` | 14px、17px | → 20px |

### 解决方案

统一替换为规范档位：**20px（脚注）或 24px（辅助说明）**

```css
/* 所有 pin-link / small text */
.pin-link { font-size: 20px; line-height: 28px; }
/* 所有 back-btn 文字 */
.back-btn { font-size: 20px; line-height: 28px; }
/* bottom indicators */
.week-text { font-size: 20px; line-height: 28px; }
```

---

## 四、非规范中间字号问题（🟡 P1）

规范 v1.1 胶囊屏字号必须是标准档位：**36/30/28/24/22/20/18**。
以下页面在默认样式（非媒体查询内）使用了非规范中间值，胶囊屏上会生效。

### 4.1 34px（应改为 30px 页面标题或 36px 特大数字）

| 页面 | 出现次数 | 位置说明 |
|------|----------|----------|
| `add-course` | 3 处 | `.title` 标题 |
| `week-view` | 2 处 | `.wv-title` 标题 |
| `schedule-manager` | 1 处 | 标题 |
| `detail` | 3 处 | `.title` 标题 |
| `reset-data` | 3 处 | 标题 |
| `pinned-pages` | 2 处 | `.title` 标题 |
| `homepage-settings` | 1 处 | 标题 |
| `settings` | 1 处 | 标题 |
| `lab-edit-course` | 3 处 | 标题（rect/circle 媒体内） |

### 4.2 26px（应改为 24px 辅助或 28px 列表主文字）

| 页面 | 出现次数 |
|------|----------|
| `lab-add-course` | 7 处 |
| `add-course-v2` | 7 处 |
| `schedule-manager` | 4 处 |
| `reset-data` | 3 处 |
| `backup-restore` | 5 处 |
| `lab` | 2 处（circle 内） |
| `homepage-settings` | 4 处 |
| `chinese-input` | 2 处 |
| `settings` | 2 处 |
| `black-screen-check` | 2 处 |
| `bs-demo 系列` | 6 处 |

### 解决方案

```css
/* 34px → 30px（页面标题） */
.title { font-size: 30px; line-height: 40px; }

/* 26px → 24px（辅助说明）或 28px（列表主文字） */
.section-title { font-size: 28px; line-height: 38px; }
.manage-btn { font-size: 24px; line-height: 32px; }
```

---

## 五、行高缺失/不当问题（🔴 P0）

> 1081 条 `font-size` 声明中只有 **380 条**（35%）有对应的 `line-height`。
> **65% 的字号声明依赖浏览器默认行高**，不同引擎表现不一致，可能导致文字被挤或被切。

### 5.1 行高缺失最严重的页面

| 页面 | font-size 声明 | line-height 声明 | 缺失率 |
|------|:---:|:---:|:---:|
| `week-view` | 29 | 3 | **90%** |
| `schedule-manager` | 35 | 6 | **83%** |
| `activation` | 33 | 3 | **91%** |
| `vibration-lab` | 68 | 3 | **96%** |
| `settings` | 40 | 4 | **90%** |
| `index-full` | 32 | 9 | **72%** |
| `detail` | 60 | 6 | **90%** |
| `bs-demo1-5` | 22-34 | 1-8 | **65%-96%** |
| `add-course` | 74 | 34 | **54%** |
| `add-course-v2` | 17 | 17 | 0%（全部有） |
| `lab-edit-course` | 43 | 26 | **40%** |
| `lab-add-course` | 19 | 19 | 0%（全部有） |

### 5.2 行高<字号的问题（字被挤压）

| 文件 | 问题 |
|------|------|
| `bs-demo1.ux:89` | `font-size: 11px` 无 line-height |
| `week-view` | 29 个 font-size 只有 3 个 line-height，课程表单元格文字极易被挤 |

### 解决方案

每条 `font-size` 声明必须同步设定 `line-height`，比例参考规范：

| 字号 | 必须行高 | 比例 |
|------|----------|------|
| 36px | 46px | 1.28× |
| 30px | 40px | 1.33× |
| 28px | 38px | 1.36× |
| 24px | 32px | 1.33× |
| 22px | 30px | 1.36× |
| 20px | 28px | 1.4× |

---

## 六、文字遮挡/截断问题（🟡 P1）

### 6.1 text-overflow: clip 导致截断无省略号

| 文件 | 位置 | 问题 |
|------|------|------|
| `week-view.ux:764` | `.wv-name` | `text-overflow: clip` → 文字过长直接切断，无 "…" 提示 |

**解决方案**：改为 `text-overflow: ellipsis`

### 6.2 缺少 lines 限制导致多行溢出

以下页面有长文本但未设置 `lines: N` 限制：
- `schedule-manager` 课程名称
- `course-manager` 课程卡片
- `week-view` 课程单元格（最窄处仅约 42px）

**解决方案**：所有可能超长的文本都添加：
```css
lines: 1;
text-overflow: ellipsis;
```

### 6.3 padding-top < 30px 导致顶部被半圆遮挡

胶囊屏顶部半圆半径 96px，规范要求 `padding-top: 30px`。几乎所有页面的 capsule 适配块都未达到此值：

| 页面 | capsule padding | 偏差 |
|------|-----------------|------|
| `index-full` | 28px | 差 92px |
| `settings` | 20px | 差 100px |
| `welcome` | 60px | 差 60px |
| `week-view` | 60px | 差 60px |
| `lab` | 未指定 padding-top | 缺失 |
| 大部分其他页面 | 未在 capsule 块中重设 padding | 继承默认 44px |

**解决方案**：在 all capsule media blocks add:
```css
@media (shape: capsule), (shape: pill-shaped) {
  .page {
    padding-top: 30px;
    padding-bottom: 30px;
  }
}
```

---

## 七、文字换行错乱问题（🟡 P2）

### 7.1 滚动容器中 flex-wrap 未明确禁用

| 页面 | 问题 |
|------|------|
| `index-full` | header 内有 `flex-wrap: nowrap`（正确），但底部按钮组没有 |
| `schedule-manager` | 管理页长名称可能换行错位 |
| `template-picker` | `.scroll-wrap` 内卡片文字可能溢出换行 |

### 7.2 中英混排换行问题

由于项目面向中国用户，课程名可能包含中英文混合。胶囊屏 192px 宽内容区仅 160px：
- 英文单词可能在不正确的位置断行
- 中文和数字混合时不换行导致溢出

**解决方案**：
```css
word-break: break-all;
overflow-wrap: break-word;
```

---

## 八、按页面逐一问题清单

### 8.1 首页（index-full）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| capsule padding-top 只有 28px | 遮挡 | 🔴 |
| 12 个字号低于 18px（12px-16px） | 过小 | 🔴 |
| 32 个 font-size 只有 9 个 line-height（72%缺失） | 行高缺失 | 🔴 |
| `.week-text` 16px 在胶囊屏上太小 | 过小 | 🟡 |

### 8.2 欢迎页（welcome）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| `.enter-btn` 19px、`.settings-btn` 14px | 过小/非规范 | 🔴 |
| capsule padding-top 60px | 遮挡 | 🔴 |
| 15 个 font-size 只有 6 个 line-height | 行高缺失 | 🟡 |

### 8.3 设置（settings）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 40 个 font-size 只有 4 个 line-height（90%缺失） | 行高缺失 | 🔴 |
| 34px 标题（非规范） | 非规范 | 🟡 |
| 26px 多处（非规范） | 非规范 | 🟡 |
| capsule `.settings-page { padding: 20px }` | 遮挡 | 🔴 |

### 8.4 添加课程（add-course）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 34px 标题 × 3 | 非规范 | 🟡 |
| 74 个 font-size，34 个 line-height（54%缺失） | 行高缺失 | 🔴 |

### 8.5 添加课程 V2（add-course-v2）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| **完全缺失 capsule @media** | 致命 | 🔴 |
| 26px × 7 处（非规范） | 非规范 | 🟡 |
| 但 line-height 100% 覆盖（+） | — | ✅ |

### 8.6 编辑课程（detail）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 34px 标题 × 3 | 非规范 | 🟡 |
| 60 个 font-size，6 个 line-height（90%缺失） | 行高缺失 | 🔴 |

### 8.7 周视图（week-view）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| `.wv-name { text-overflow: clip }` 无省略号 | 截断 | 🔴 |
| 29 个 font-size，3 个 line-height（90%缺失） | 行高缺失 | 🔴 |
| `font-size: 16px` | 过小 | 🔴 |
| 34px 标题 × 2 | 非规范 | 🟡 |

### 8.8 课程管理器（schedule-manager）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 12px/13px/14px/15px/16px/17px × 多处 | 过小 | 🔴 |
| 35 个 font-size，6 个 line-height（83%缺失） | 行高缺失 | 🔴 |
| 34px/26px 非规范字号 | 非规范 | 🟡 |

### 8.9 课程管理器（course-manager）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 36 个 font-size，26 个 line-height（28%缺失） | 行高缺失 | 🟡 |

### 8.10 振动实验室（vibration-lab）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 68 个 font-size，3 个 line-height（96%缺失） | 行高缺失 | 🔴 |
| 大量 12px/13px/14px/15px/16px | 过小 | 🔴 |

### 8.11 激活页（activation）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 33 个 font-size，3 个 line-height（91%缺失） | 行高缺失 | 🔴 |
| 13px pin-link | 过小 | 🟡 |

### 8.12 统计（statistics）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 26 个 font-size，7 个 line-height（73%缺失） | 行高缺失 | 🟡 |

### 8.13 重置数据（reset-data）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 93 个 font-size，29 个 line-height（69%缺失） | 行高缺失 | 🔴 |
| 13px/34px/26px 非规范字号 | 过小/非规范 | 🟡 |

### 8.14 实验室（lab）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| 13px pin-link | 过小 | 🟡 |
| 27 个 font-size，15 个 line-height（44%缺失） | 行高缺失 | 🟡 |

### 8.15 实验室添加课程（lab-add-course）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| **完全缺失 capsule @media** | 致命 | 🔴 |
| 26px × 7 处（非规范） | 非规范 | 🟡 |
| line-height 覆盖 100%（+） | — | ✅ |

### 8.16 实验室编辑课程（lab-edit-course）

| 问题 | 类型 | 严重度 |
|------|------|--------|
| **缺失 capsule @media**（有 circle/rect 无 capsule） | 致命 | 🔴 |
| 34px × 3 / 26px × 2（非规范） | 非规范 | 🟡 |

### 8.17 其余页面

| 页面 | 主要问题 |
|------|----------|
| `nickname-edit` | line-height 缺失 57% |
| `custom-content-edit` | line-height 缺失 65% |
| `pinned-pages` | 13px 字号，line-height 缺失 69% |
| `template-picker` | line-height 缺失 47% |
| `chinese-input` | 26px 非规范，line-height 缺失 65% |
| `qrcode-generator` | line-height 缺失 55% |
| `schedule-qrcode` | line-height 缺失 74% |
| `device-info` | line-height 缺失 57% |
| `homepage-settings` | 34px/26px 非规范 |
| `black-screen-check` | 11px 字号，26px 非规范 |
| `backup-restore` | 26px × 多处 |
| `donate` | line-height 基本覆盖（+） |
| `bs-demo1-5` | 仅为测试页面，优先级低 |

---

## 九、解决方案优先级矩阵

### P0 — 必须立即修复（本周）

| 序号 | 任务 | 影响页面 |
|------|------|----------|
| 1 | 为 `lab-add-course` 补充 capsule @media | 1 |
| 2 | 为 `add-course-v2` 补充完整的 shape 媒体查询 | 1 |
| 3 | 为 `lab-edit-course` 补充 capsule @media | 1 |
| 4 | 所有 sub-18px 字号统一升至 ≥20px | ~15 页 |
| 5 | 为所有 font-size 声明补充 line-height | 全 35 页 |
| 6 | `week-view` text-overflow: clip → ellipsis | 1 |

### P1 — 应尽快修复（下周）

| 序号 | 任务 | 影响页面 |
|------|------|----------|
| 7 | 所有非规范中间字号替换为规范档位 | ~20 页 |
| 8 | capsule 适配块中 padding-top 升级到 30px | 全 32 已适配页 |
| 9 | 所有长文本添加 `lines: 1; text-overflow: ellipsis` | ~10 页 |

### P2 — 优化改进（下月）

| 序号 | 任务 | 影响页面 |
|------|------|----------|
| 10 | 中英混排添加 `word-break: break-all` | 全 35 页 |
| 11 | 检查所有 scroll 容器的 flex-wrap | ~5 页 |

---

## 十、批量修复参考 CSS 模板

### 10.1 通用胶囊屏适配块（可复制到任意页面）

```css
@media (shape: capsule), (shape: pill-shaped) {
  /* ----- 页面容器 ----- */
  .page {
    padding-top: 30px;
    padding-bottom: 30px;
    padding-left: 16px;
    padding-right: 16px;
  }

  /* ----- 头部 ----- */
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
    line-height: 40px;
    flex-shrink: 0;
  }
  .title {
    font-size: 28px;
    line-height: 44px;
    text-align: center;
    flex: 1;
    lines: 1;
    margin: 0 4px;
  }

  /* ----- 列表 ----- */
  .list-item {
    font-size: 28px;
    line-height: 38px;
  }
  .item-sub {
    font-size: 24px;
    line-height: 32px;
  }

  /* ----- 按钮 ----- */
  .btn {
    height: 52px;
    border-radius: 26px;
    font-size: 28px;
    line-height: 38px;
  }

  /* ----- 脚注/小字 ----- */
  .footnote, .pin-link, .version-text {
    font-size: 20px;
    line-height: 28px;
  }

  /* ----- 文字溢出保护 ----- */
  .text-ellipsis {
    lines: 1;
    text-overflow: ellipsis;
    word-break: break-all;
  }
}
```

### 10.2 字号规范速查

| 用途 | 规范字号 | 行高 |
|------|----------|------|
| 特大数字（时钟等） | 36px | 46px |
| 页面标题 | 30px | 40px |
| 列表主文字 / 按钮 | 28px | 38px |
| 辅助说明 / 标签 | 24px | 32px |
| 弹窗描述（仅弹窗内） | 22px | 30px |
| 脚注 / 版本号 | 20px | 28px |
| 绝对底线（极少用） | 18px | 26px |
| **禁止使用** | 25/26/27/29/31/33/34/35/37/38/39px | — |

---

## 十一、执行 Checklist

### 第一轮：P0 修复

- [ ] `lab-add-course.ux` — 补充 capsule @media 块
- [ ] `add-course-v2.ux` — 补充全部 shape 媒体查询
- [ ] `lab-edit-course.ux` — 补充 capsule @media 块
- [ ] `index-full.ux` — 12px/13px/15px/16px → 20px；补充缺失 line-height
- [ ] `settings.ux` — 补充缺失 line-height
- [ ] `week-view.ux` — text-overflow clip→ellipsis；补充缺失 line-height
- [ ] `schedule-manager.ux` — 12-17px → 20px；补充缺失 line-height
- [ ] `vibration-lab.ux` — 补充缺失 line-height（96%缺失）
- [ ] `detail.ux` — 补充缺失 line-height
- [ ] `activation.ux` — 补充缺失 line-height
- [ ] `welcome.ux` — 12px/14px/16px → 20px

### 第二轮：P1 修复

- [ ] 全量 34px → 30px（页面标题）
- [ ] 全量 26px → 24px 或 28px（按用途）
- [ ] 全量 capsule 适配块 padding-top → 30px

### 第三轮：P2 优化

- [ ] 中英混排 word-break
- [ ] 长文本 lines + ellipsis
- [ ] scroll 容器 flex-wrap 检查

---

> **本报告自动生成于 2026-09-14，基于代码静态分析。真机验证将对所有修复进行最终确认。**