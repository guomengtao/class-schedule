# 手环 9（胶囊屏）「编辑课程」第一步 课程名被箭头挤压成省略号 分析

> 反馈来源：用户 @Carp **多次反馈**
> 现象：小米手环 9 真机，进入「编辑课程」第一步（选择课程），**课程名称被挤成「2 个白点」（省略号）**，看不出正在编辑哪门课
> 根因：**布局挤压，不是颜色问题** —— 课程名称框 `.course-card` 用了 `flex: 1`，在 Vela 窄屏下 flex 压缩退化，被两侧左右切换箭头挤扁，课名被 `text-overflow: ellipsis` 截成省略号
> 状态：**已修复**（见第 4 节）
> 分析日期：2026-09-30
> 目标页面：`src/pages/detail/detail.ux`

---

## 0. TL;DR

| 项 | 内容 |
|---|---|
| 设备 | 小米手环 9 = **胶囊屏（`pill-shaped`），192×490** |
| 页面 | 编辑课程 = `detail.ux`（4 步向导），问题在 **Step 1「选择课程」** |
| 现象 | 课程名称显示成省略号（用户说的「2 个白点」） |
| 根因 | `.course-card { flex: 1; min-width: 0; width: auto }` + `.swiper-wrapper { justify-content: space-between }`：**Vela 在窄屏下 `flex:1` 的 grow 退化，卡片宽度塌缩到接近 0**，两侧箭头各 36px 固定占位，课名被 `ellipsis` 截断 |
| 修复 | 课程卡改**固定宽度 100px + `flex-shrink:0`**，箭头 36→26px，`justify-content` 改 `center`，页面 padding 16→12px |

---

## 1. 设备与页面定位

### 1.1 「9 手环」

激活 URL 的 `device.getInfo()` 快照（`docs/手环9跑道屏课程表管理页右侧黑板分析.md`）：

```
p=Xiaomi Smart Band 9
s=pill-shaped     ← 胶囊屏（跑道屏）
w=192  h=490
```

### 1.2 问题在哪一步

`detail.ux` 是 4 步向导：① 选择课程 → ② 时间 → ③ 位置与星期 → ④ 确认。
问题在 **Step 1**，模板结构（`detail.ux:32-41`）：

```html
<div class="swiper-wrapper">
  <image class="swipe-arrow-icon" src=".../icon_back.png" onclick="swipePrev" ... />   <!-- 左箭头 -->
  <div class="course-card" if="{{ courseIndex < presetCourses.length }}" ...>           <!-- 课程名框 -->
    <text class="card-course-name">{{ presetCourses[courseIndex].name }}</text>
  </div>
  <image class="swipe-arrow-icon" src=".../icon_chevron_right.png" onclick="swipeNext" ... /> <!-- 右箭头 -->
</div>
```

三个元素一行：**左箭头 + 课程名框 + 右箭头**。

---

## 2. 根因分析

### 2.1 修复前的胶囊屏样式（`@media (shape: capsule), (shape: pill-shaped)` 块）

```css
.edit-course-page { padding: 38px 16px 50px 16px; }   /* 左右各 16px */

.swiper-wrapper { flex-direction: row; flex-wrap: nowrap; align-items: center;
                  justify-content: space-between; }
.swipe-arrow-icon { width: 36px; height: 48px; flex-shrink: 0; }   /* ×2 = 72px */

.course-card { flex: 1; min-width: 0; width: auto; height: 80px;
               padding: 6px; margin: 0 4px; }                        /* ← 问题源 */
.card-course-name { font-size: 22px; lines: 1; text-overflow: ellipsis; }
```

### 2.2 为什么被挤成白点

宽度账（设计预期）：

```
可用宽度 = 192 − 16×2(padding) = 160px
课程卡   = 160 − 36×2(箭头) − 4×2(margin) = 80px   ← 设计预期 80px，22px 能放 2~3 字
```

但真机实测课程卡**远小于 80px，甚至接近 0**，课名只能显示省略号。原因是 Vela 快应用的 flex 布局缺陷（`docs/手环9跑道屏课程表管理页右侧黑板分析.md` 已记录同类机理）：

> **「`flex: 1`、`width: 100%` 这类依赖父容器剩余空间的声明，在测量阶段退化」**

具体到这一步：

1. `.course-card` 写的是 `flex: 1; min-width: 0; width: auto`。`flex: 1` 展开为 `flex-grow:1; flex-shrink:1; flex-basis:0%`，本应从 0 撑满剩余空间。
2. 但 Vela 窄屏下 `flex-grow` 未按预期生效，`width: auto` 又让 flex-basis 回落到「内容宽度」——而课名加了 `ellipsis` 后内容宽度本身很小 → 卡片塌缩。
3. 同时 `.swiper-wrapper` 是 `justify-content: space-between`：中间元素不撑开时，两侧箭头被推到两端，中间卡片宽度归零。
4. 结果：`.card-course-name` 的 `text-overflow: ellipsis` 把课名截成「…」——即用户看到的「2 个白点」。

> 旁证：同文件 circle 块（`detail.ux:1328-1330`）已有注释记录同款坑——「固定 200px 会与两侧箭头 96px 相加超出 160px 内容区，flex 压缩后**课程名一个字都显示不出，真机实测**」。说明「卡片 + 箭头在窄屏被 flex 挤压」是本页反复踩过的坑。

### 2.3 排除项

- ❌ **不是颜色/主题问题**：全页文字色都是 `theme.text` token，深/浅主题下文字与背景对比度正常；「看不见」不是白字白底，而是文字被 `ellipsis` 截断。
- ❌ **不是 `@media` 未命中**：`detail.ux` 胶囊块已是 `(shape: capsule), (shape: pill-shaped)`，手环 9（`pill-shaped`）能命中。
- ❌ **不是旧包**：本文件胶囊块为当前代码即可复现，与版本无关。

---

## 3. 修复方案（已实施）

目标：让课程名框**固定宽度、不被箭头挤压**，箭头缩窄给课名让位。

```css
/* @media (shape: capsule), (shape: pill-shaped) 块内 */
.edit-course-page { padding: 38px 12px 50px 12px; }   /* 16→12，可用宽度 160→168px */

.swiper-wrapper { justify-content: center; }            /* space-between → center */

.swipe-arrow-icon { width: 26px; height: 48px; border-radius: 13px; flex-shrink: 0; }

.course-card {
  width: 100px;        /* 固定宽，禁用 flex:1（Vela 窄屏会塌缩） */
  min-width: 100px;    /* 显式 min-width 保护 */
  flex-shrink: 0;      /* 不被箭头挤压 */
  height: 80px;
  padding: 6px;
  margin: 0 4px;
}

.card-course-name { font-size: 20px; line-height: 28px; }  /* 22→20，4 字课名放得下 */
```

### 3.1 宽度核算

```
26(左箭头) + 4(margin) + 100(卡片) + 4(margin) + 26(右箭头) = 160px
+ 卡片边框 2×2 = 4px → 164px
可用宽度 = 192 − 12×2(padding) = 168px
余量 = 4px ✅
```

### 3.2 课程名可显示字数

卡片 100px，文字区 = 100 − 6×2(padding) − 2×2(border) = 84px：

| 课名 | 字数 | 20px 字宽 | 结果 |
|---|---|---|---|
| 语文 / 数学 / 英语 | 2 字 | 40px | ✅ |
| 大学英语 / 高等数学 | 4 字 | 80px | ✅ |
| 道德与法治 | 5 字 | 100px | `ellipsis` 兜底（192px 物理极限，可接受） |

---

## 4. 涉及文件与改动

| 文件 | 位置 | 改动 |
|---|---|---|
| `src/pages/detail/detail.ux` | 胶囊屏块 `.edit-course-page` | padding 16→12px |
| `src/pages/detail/detail.ux` | 胶囊屏块 `.swiper-wrapper` | `space-between` → `center` |
| `src/pages/detail/detail.ux` | 胶囊屏块 `.swipe-arrow-icon` | 36→26px |
| `src/pages/detail/detail.ux` | 胶囊屏块 `.course-card` | `flex:1/width:auto` → 固定 `width:100px` + `flex-shrink:0` |
| `src/pages/detail/detail.ux` | 胶囊屏块 `.card-course-name` | 22→20px |

> 方屏（rect 336px）与圆屏（circle 466px）宽度充足，`flex:1` 正常撑满，未改动。

---

## 5. 真机验证清单（手环 9）

1. 首页点一门课 → 进编辑课程 Step 1 → **确认课程名完整显示**（2~4 字课名不再出现省略号）
2. 左右箭头仍在同一行、可正常点击切换课程，`「n / 共N门」` 计数同步
3. 课程名含 5 字（如「道德与法治」）时，显示为「道德与法…」而非整段消失
4. 滑到末尾出现「+」卡片，右滑可退回最后一门课
5. 手环 9 Pro / 8 Pro（rect）与圆屏回归：Step 1 布局无变化

---

## 6. 相关历史文档

- `docs/手环9跑道屏课程表管理页右侧黑板分析.md` —— Vela「flex:1 / width:100% 测量退化」的机理与铁律
- `docs/编辑课程页面优化方案.md` —— 本页 Step 1 轮播区「三元素一行」的历史设计
- `docs/edit-page-capsule-redesign.md` —— 胶囊屏重设计（Step 1 箭头 36px + 卡片 100px 的原始计算）
