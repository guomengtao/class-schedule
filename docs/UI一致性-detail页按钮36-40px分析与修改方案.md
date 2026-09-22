# UI 一致性：detail 页等按钮 36~40px 分析与修改方案

> 对应评分维度：**维度 8 — UI 一致性与防混乱**（当前 84/100，失 1.6 分）
> 问题定位：`detail` 页 `.back-btn` / `.header-trash-btn` / `.stepper-btn` 停在 **36~40px**，严重低于规范要求的 **48px**
> 关联文档：[标准版完善度综合评分.md](./标准版完善度综合评分.md)（L829「`detail` 等页按钮 36~40px 提至 48px」）

---

## 一、现状扫描

规范定义：**按钮高度 ≥ 48px**（[Ev课程表_手环字号规范_v1.md](./Ev课程表_手环字号规范_v1.md)）。

### 1.1 按文件扫描所有 <48px 按钮

#### A. `src/common/header.css` — 公共 header 样式（影响所有 `import header.css` 的页面）

| CSS 选择器 | 高度 | 低于 48？ | 备注 |
|:---|:--:|:--:|:---|
| `.header` | **40px** | ⚠️ | 基础样式，所有非胶囊屏页面共用 |
| `.header-back` | 30px | ⚠️ | 文字返回按钮（旧组件，仅 schedule-manager 等少数页面使用） |
| `.back-btn-wrapper` | **40px** | ⚠️ | 图标返回按钮容器，add-course / course-manager / settings 等大量页面使用 |
| `@media rect` `.header-back` | 34px | ⚠️ | rect 模式 |
| `@media circle` `.header-back` | 34px | ⚠️ | circle 模式 |

#### B. `src/pages/detail/detail.ux` — 编辑课程页（主要扣分页面）

| CSS 选择器 | 模式 | 宽度 | 高度 | 低于 48？ |
|:---|:---|:--:|:--:|:--:|
| `.back-btn` | 基础 | 48 | **40** | ⚠️ |
| `.header-trash-btn` | 基础 | **40** | **40** | ⚠️ 宽高均低 |
| `.keyboard-done-btn` | 基础 | 56 | **34** | ⚠️ |
| `.swipe-arrow` | 基础 | 50 | 50 | ✅ |
| `.stepper-btn` | 基础 | 48 | 48 | ✅ |
| `.weekday-btn` | 基础 | 48 | 48 | ✅ |
| — | — | — | — | — |
| `.back-btn` | circle | 44 | **40** | ⚠️ |
| `.stepper-btn` | circle | 44 | **44** | ⚠️ |
| — | — | — | — | — |
| `.back-btn` | capsule | 44 | **44** | ⚠️ 物理硬约束 |
| `.header-trash-btn` | capsule | 44 | **44** | ⚠️ 物理硬约束 |
| `.stepper-btn` | capsule | **44** | 48 | ⚠️ 宽度偏低 |
| `.swipe-arrow` | capsule | **36** | 44 | ⚠️ 宽度偏低 |
| — | — | — | — | — |
| `.back-btn` | rect | **44** | **36** | ⚠️ 最严重的，只 36px |
| `.prev-btn / .next-btn / .save-btn` | rect | — | **42** | ⚠️ |
| `.manage-btn` | rect | 80 | **42** | ⚠️ |

#### C. `src/pages/add-course/add-course.ux` — 添加课程页

| CSS 选择器 | 模式 | 高度 | 低于 48？ |
|:---|:---|:--:|:--:|
| `.mgmt-btn` | 基础 | **40** | ⚠️ |
| `.mgmt-btn` | capsule | **44** | ⚠️ |

#### D. `src/pages/course-manager/course-manager.ux` — 课程管理页

| CSS 选择器 | 模式 | 高度 | 低于 48？ |
|:---|:---|:--:|:--:|
| `.add-btn` | 基础 | **40** | ⚠️ 非胶囊屏 |
| `.add-btn-toolbar` | capsule | **44** | ⚠️ |

#### E. `src/pages/settings/settings.ux` — 设置页

| CSS 选择器 | 模式 | 高度 | 低于 48？ |
|:---|:---|:--:|:--:|
| `.toggle-btn` | rect | **38** | ⚠️ |
| `.save-btn` | rect | **42** | ⚠️ |
| `.modal-btn-primary` | capsule | **44** | ⚠️ |
| `.modal-btn-secondary` | capsule | **38** | ⚠️ |
| `.back-btn-wrapper` | capsule | **40** | ⚠️ 高度 40，仅 rect 模式 38 |

#### F. 其他页面

| 页面 | CSS 选择器 | 模式 | 高度 | 低于 48？ |
|:---|:---|:---|:--:|:--:|
| `black-screen-check.ux` | `.reset-btn` | circle | **36** | ⚠️ (demo 页) |
| `reset-data.ux` | `.modal-btn-primary` | 基础 | **40** | ⚠️ |
| `reset-data.ux` | `.modal-btn-secondary` | 基础 | **36** | ⚠️ |
| `homepage-settings.ux` | `.modal-btn-primary` | capsule | **40** | ⚠️ |
| `homepage-settings.ux` | `.modal-btn-secondary` | capsule | **36** | ⚠️ |

### 1.2 汇总统计

| 类别 | 36~40px 数量 | 41~44px 数量 | 备注 |
|:---|:--:|:--:|:---|
| 公共 header.css 影响 | 2（40+30） | — | `.header`, `.back-btn-wrapper` |
| detail.ux（非胶囊） | 3（36/40/40） | 2（42/42） | circle + rect |
| add-course.ux | 1（40） | — | `.mgmt-btn` |
| course-manager.ux | 1（40） | 1（44） | `.add-btn` |
| settings.ux | 2（38/42） | 1（44） | rect + capsule |
| 其他 | 3（36/40/40） | — | reset-data / homepage-settings |

**注意**：胶囊屏 header 区 44px 按钮（detail 的 `.back-btn`、`.header-trash-btn` 等）属于「布局与触控」维度的 192px 物理宽度硬约束，不在本维度的修改范围内。本文档聚焦**非胶囊屏**和**非 header 区**的按钮。

---

## 二、根因分析

### 2.1 为什么是 36~40px？

1. **历史基线问题**：`header.css` 的文件最早可能为正方形小屏手环（280×280）设计，40px header 在当时合理。后续屏幕尺寸增大、规范要求提升到 48px，但公共文件未被系统性更新。

2. **非胶囊屏被"遗忘"**：前几轮整改（第二轮：胶囊屏按钮提 48px）只覆盖了胶囊屏的 `@media (shape: capsule)` 查询，rect/circle 的 media query 和基础样式被遗漏。

3. **detail.ux 中的不一致**：
   - 基础样式：`.stepper-btn` 已经是 48×48 ✅，但 `.back-btn` 只有 40px ⚠️
   - rect 模式最严重：`.back-btn` 只有 **36px**，`.manage-btn` 42px
   - circle 模式：`.back-btn` 40px，`.stepper-btn` 44px

4. **内联 style 覆盖问题**：部分按钮用内联 `height: 48px` 写死（如 manage/next/prev/save/delete 按钮），压制了 CSS 媒体查询但方向是抬升，属良性覆盖。但 `.back-btn` 和 `.header-trash-btn` 没有内联保护。

### 2.2 为什么分类处理？

| 按钮位置 | 能否直接提到 48px？ | 原因 |
|:---|:---|:---|
| 非胶囊屏 header 返回按钮 | ✅ 可以 | rect 336px / circle 466px 宽度充足 |
| detail header 垃圾桶 | ✅ 可以 | 非胶囊屏宽度充足；胶囊屏已在 44px |
| add-course mgmt-btn | ✅ 可以 | 在 section-title-row 右侧，独立区域 |
| course-manager add-btn | ✅ 可以 | 非胶囊屏模式，80px 宽度已够 |
| detail stepper-btn (circle) | ✅ 可以 | circle 空间充足（466-72=394px 可用） |
| detail swipe-arrow (capsule) | ⚠️ 受限 | 中间卡片需要弹性空间 |
| capsule header 三件套 | ❌ 不可 | 192px 物理宽度硬约束 |

---

## 三、修改方案

### 3.0 前提原则

**只改非胶囊屏基础样式 + rect/circle media query + 非 header 区按钮。胶囊屏 header 44px 按钮维持不变（属于布局与触控维度）。**

### 3.1 公共 `header.css` — 影响面最大，优先级最高

**现状**：`.back-btn-wrapper` 高度 40px，rect/circle 均为 34px。

**修改**：非胶囊屏全部提到 48px。

```css
/* 基础样式：40 → 48 */
.back-btn-wrapper {
  width: 48px;
  height: 48px;       /* was 40 */
  border-radius: 8px;
}

/* rect 模式补充 */
@media screen and (shape: rect) {
  .back-btn-wrapper {
    width: 48px;
    height: 48px;       /* was 34 (via header-back) */
  }
}

/* circle 模式补充 */
@media screen and (shape: circle) {
  .back-btn-wrapper {
    width: 48px;
    height: 48px;       /* was 34 (via header-back) */
  }
}
```

**影响页面**：`add-course`、`course-manager`、`schedule-manager`、`settings`、`backup-restore`、`reset-data`、`homepage-settings` 等所有 `import header.css` 的页面。

### 3.2 `detail.ux` — 本次最大扣分源

**逐个按钮处理**：

| 按钮 | 当前 | 改为 | 布局影响 |
|:---|:---|:---|:---|
| `.back-btn` 基础 | 40px | **48px** | header 增高 8px，标题仍有足够空间 |
| `.header-trash-btn` 基础 | 40 | **48px** | 与 back-btn 同步对齐 |
| `.back-btn` rect | 36px | **48px** | rect 宽度 336px，完全够 |
| `.back-btn` circle | 40px | **48px** | circle 宽度 466px，绰绰有余 |
| `.stepper-btn` circle | 44px | **48px** | 单行 48+56+48+10gap=162，circle 安全 |
| `.manage-btn` rect | 42px | **48px** | 与 prev/next/save 同步 |
| `.prev-btn / .next-btn / .save-btn` rect | 42px | **48px** | 三个按钮统一 |
| `.keyboard-done-btn` | 34px | **44px** | 虚拟键盘完成按钮，非主操作，宽松目标 |

**修改后的 CSS**：

```css
/* 基础样式 */
.back-btn {
  width: 48px;
  height: 48px;       /* was 40 */
  border-radius: 10px;
  font-size: 28px;
  text-align: center;
  line-height: 48px;  /* was 36 */
}

.header-trash-btn {
  width: 48px;        /* was 40 */
  height: 48px;       /* was 40 */
  border-radius: 10px;
}

.keyboard-done-btn {
  width: 56px;
  height: 44px;       /* was 34，宽松目标 */
  border-radius: 10px;
  font-size: 24px;
}

/* circle 模式 */
@media (shape: circle) {
  .back-btn {
    width: 48px;
    height: 48px;     /* was 40 */
  }
  .stepper-btn {
    width: 48px;
    height: 48px;     /* was 44 */
  }
}

/* rect 模式 */
@media (shape: rect) {
  .back-btn {
    width: 48px;
    height: 48px;     /* was 36 */
  }
  .prev-btn,
  .next-btn,
  .save-btn {
    height: 48px;     /* was 42 */
    line-height: 48px;
    border-radius: 24px;
  }
  .manage-btn {
    height: 48px;     /* was 42 */
    line-height: 48px;
    border-radius: 24px;
  }
}

/* capsule 模式：维持 44px（物理硬约束），不修改 */
```

### 3.3 `add-course.ux` — mgmt-btn

| 按钮 | 当前 | 改为 | 布局影响 |
|:---|:---|:---|:---|
| `.mgmt-btn` 基础 | 40px | **48px** | `section-title-row` 增高 8px，不影响滚动区 |

```css
.mgmt-btn {
  width: 60px;
  height: 48px;       /* was 40 */
  border-radius: 24px; /* was 12 */
  font-size: 22px;
  line-height: 48px;  /* was 36 */
}
```

**胶囊屏 `.mgmt-btn`** 当前 44px，维持不变（避免挤压标题行）。

### 3.4 `course-manager.ux` — add-btn

| 按钮 | 当前 | 改为 | 布局影响 |
|:---|:---|:---|:---|
| `.add-btn` 基础 | 40px | **48px** | 非胶囊屏 header 增高 8px |

```css
.add-btn {
  width: 80px;
  height: 48px;       /* was 40 */
  border-radius: 24px; /* was 20 */
  font-size: 22px;
  line-height: 48px;  /* was 36 */
}
```

**注意**：`.add-btn` 仅在 `!isCapsule` 时显示，所以只影响非胶囊屏。

### 3.5 `settings.ux` — 按钮统一

| 按钮 | 模式 | 当前 | 改为 |
|:---|:---|:--:|:--:|
| `.toggle-btn` | rect | 38px | **48px** |
| `.save-btn` | rect | 42px | **48px** |
| `.modal-btn-secondary` | capsule | 38px | **44px**（弹窗内，次要按钮可宽松）|
| `.modal-btn-primary` | capsule | 44px | **48px**（弹窗主按钮应达标）|

### 3.6 其他页面（投入产出比低，排后）

| 页面 | 按钮 | 当前 | 改为 | 优先级 |
|:---|:---|:--:|:--:|:--:|
| `reset-data.ux` | `.modal-btn-primary` | 40px | 48px | 低（标准版用户极少进入） |
| `reset-data.ux` | `.modal-btn-secondary` | 36px | 44px | 低 |
| `homepage-settings.ux` | `.modal-btn-*` | 36/40px | 44/48px | 低（高级版功能页） |

---

## 四、实施步骤

按改一行就能影响最多的顺序排：

| 步骤 | 文件 | 改动量 | 影响按钮数 | 预估覆盖 |
|:--:|:---|:--:|:--:|:---|
| 1 | `common/header.css` | 3 处数值 | **12+ 页面** | 所有页面的返回按钮 |
| 2 | `detail.ux` 基础样式 | 3 处数值 | 2 类按钮 | 非胶囊屏编辑页 |
| 3 | `detail.ux` rect @media | 4 处数值 | 5 类按钮 | rect 编辑页 |
| 4 | `detail.ux` circle @media | 2 处数值 | 2 类按钮 | circle 编辑页 |
| 5 | `add-course.ux` 基础样式 | 3 处数值 | 1 类按钮 | 非胶囊屏添加页 |
| 6 | `course-manager.ux` 基础样式 | 3 处数值 | 1 类按钮 | 非胶囊屏管理页 |
| 7 | `settings.ux` 各 @media | 4 处数值 | 4 类按钮 | 设置页 |

### 4.1 验证清单

- [ ] `detail.ux` 非胶囊屏 header：◀ 返回按钮 48×48 ✅，标题「编辑课程」不因 header 增高而被裁切
- [ ] `detail.ux` header 垃圾桶图标 48×48，与返回按钮对齐
- [ ] `detail.ux` rect 模式 底部 prev/next/save/manage 按钮均为 48px
- [ ] `detail.ux` circle 模式 stepper-btn 48×48，step 2 时间行不溢出
- [ ] `add-course.ux` mgmt-btn 48px，section-title-row 布局不破
- [ ] `course-manager.ux` add-btn 48px，header 三件套不挤压
- [ ] `settings.ux` 按钮 48px 统一
- [ ] Build 通过，RPK < 1MB

---

## 五、预期效果

修改完成后：

- **UI 一致性维度**：非胶囊屏所有操作按钮达成 48px 标准，胶囊屏 header 区维持 44px（物理约束），跨页面返回按钮高度统一
- **预计提分**：84 → **90~95**（取决于 settings / reset-data 等低频页是否一并改）
- **副作用**：非胶囊屏各页面 header 区增高约 8px，内容区减少约 8px。对 rect（336×480）和 circle（466×466）而言，8px 占高度不到 2%，影响可忽略