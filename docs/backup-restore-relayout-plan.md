# 数据备份页 · 触底自适应重做规划

> **版本**：v1.0 | **日期**：2026-10-08
> **文件**：`src/pages/backup-restore/backup-restore.ux`
> **设计模式**：触底自适应（Bottom-Touch Adaptive）

---

## 一、现状分析

当前备份页已经在 CSS 中应用了四层触底自适应结构（base / width>=200 / width>=400 / circle），但布局仍存在以下问题：

| 问题编号 | 问题描述 | 影响 |
|----------|----------|------|
| P1 | 备份行卡片 `backup-row-footer` 在 base（手环 9 160px）上为 `column`，操作按钮堆叠在文字下方，浪费纵向空间 | 手环 9 上每行占用过高，列表可读条数少 |
| P2 | 进度条、结果提示、空状态三个信息区在模板中线性排列，无统一容器包裹 | 视觉碎片化，缺少整体感 |
| P3 | `信息区域`（备份内容说明）位于页面底部，与新建按钮之间缺乏视觉分组 | 用户难以区分"操作区"和"说明区" |
| P4 | 弹窗内 benefit 列表每项用独立 `<scroll>` 包裹，手环 9 上每项一行，弹窗过高 | 弹窗可能超出屏幕 |
| P5 | header 无返回按钮占位平衡，标题偏左 | 视觉不对称 |

---

## 二、目标布局结构

### 2.1 页面分区（从上到下）

```
┌────────────────────────────────────┐
│  Header（返回 · 标题 · 占位）        │  ← 三栏等宽，标题居中
├────────────────────────────────────┤
│  状态栏（结果提示 / 进度条）          │  ← 统一容器，按需显示
├────────────────────────────────────┤
│  备份列表（可滚动）                  │  ← 卡片列表，每行紧凑
│  ┌────────────────────────────┐    │
│  │ 备份名（横滚）              │    │
│  │ X门课程 · X张课表           │    │
│  │ [恢复] [删除]              │    │
│  └────────────────────────────┘    │
├────────────────────────────────────┤
│  操作区                            │
│  [+ 新建备份]                      │  ← 全宽按钮
├────────────────────────────────────┤
│  说明区                            │
│  备份内容：课程·课表·设置·主题…      │  ← 紧凑卡片
└────────────────────────────────────┘
```

### 2.2 关键改进点

1. **备份行卡片**：`backup-row-footer` 在 base 上改为 `row` 布局（meta 文字左对齐 + 操作按钮右对齐），节省纵向空间
2. **状态栏统一容器**：`result-text` 和 `progress-bar` 放在同一个 `status-area` 内，语义统一
3. **操作区与说明区分组**：各用一个带内边距的 section，视觉层级清晰
4. **弹窗 benefit 合并**：去掉每项独立 `<scroll>`，改为一个 `<scroll>` 包裹全部 benefit item
5. **Header 三栏对称**：确保返回按钮、标题、占位三栏等宽

---

## 三、触底自适应 CSS 规划

### 3.1 Base CSS（手环 9，160px 内容区）

| 元素 | 属性 | 值 | 说明 |
|------|------|----|------|
| `.page-body` | padding | `24px 8px 24px 8px` | 上下收紧，为内容腾空间 |
| `.status-area` | margin-bottom | `8px` | 状态信息与列表间距 |
| `.result-text` | font-size / line-height | `18px / 26px` | 紧凑但不截断 |
| `.progress-text` | font-size | `20px` | 略大于结果文本 |
| `.progress-track` | height | `6px` | 细进度条 |
| `.backup-row` | padding | `8px 8px` | 减少内边距 |
| `.backup-row-name` | font-size | `22px` | 适配窄屏 |
| `.backup-row-footer` | flex-direction | **`row`** | ← 关键改进 |
| `.backup-row-meta` | font-size | `18px` | 小字号 meta |
| `.row-restore-btn` / `.row-delete-btn` | width / height | `50px / 28px`; font-size `20px` | 更小按钮 |
| `.create-section` | margin-bottom | `8px` | 与说明区间距 |
| `.bottom-create-btn` | height / font-size | `38px / 22px` | 紧凑按钮 |
| `.info-section` | padding / font-size | `10px 8px` | 紧凑说明卡 |

### 3.2 宽度断点 >= 200px（手环 10 / 胶囊屏大号，内容区 ~180px）

增量调整（仅写与 base 不同的值）：

| 元素 | 属性 | 值 |
|------|------|----|
| `.page-body` | padding | `28px 10px 28px 10px` |
| `.result-text` | font-size / line-height | `20px / 28px` |
| `.backup-row-name` | font-size | `24px` |
| `.backup-row-meta` | font-size | `20px` |
| `.row-restore-btn` / `.row-delete-btn` | width / height | `56px / 32px`; font-size `22px` |
| `.bottom-create-btn` | height / font-size | `42px / 24px` |
| `.info-section` | padding | `12px 10px` |

### 3.3 宽度断点 >= 400px（Watch 6 / 方屏，内容区 ~400px）

| 元素 | 属性 | 值 |
|------|------|----|
| `.page-body` | padding | `6px 8px 10px 8px` |
| `.backup-row-name` | font-size | `26px` |
| `.backup-row-meta` | font-size | `22px` |
| `.info-section` | padding | `14px 12px` |
| `.modal-card` | width | `80%` |

### 3.4 圆形表盘（shape: circle）

| 元素 | 属性 | 值 |
|------|------|----|
| `.page-body` | padding | `40px 32px 40px 32px` |
| `.backup-row` | padding | `14px 12px` |
| `.backup-row-name` | font-size | `28px` |
| `.backup-row-meta` | font-size | `24px` |

---

## 四、模板结构调整

### 4.1 当前模板问题

```html
<!-- 当前：三个信息元素线性排列，无包裹 -->
<text class="result-text" if="{{ resultMessage }}">…</text>
<div class="progress-bar" if="{{ restoreProgress >= 0 }}">…</div>
<text class="empty-msg" if="{{ backupList.length === 0 }}">…</text>
```

### 4.2 改进后

```html
<!-- 状态区统一包裹 -->
<div class="status-area" if="{{ resultMessage || restoreProgress >= 0 || backupList.length === 0 }}">
  <text class="result-text" if="{{ resultMessage }}" style="color: {{ resultSuccess ? theme.accent : theme.deleteText }}">{{ resultMessage }}</text>
  <div class="progress-bar" if="{{ restoreProgress >= 0 }}" style="background-color: {{ theme.cardLight }}">
    <text class="progress-text" style="color: {{ theme.accent }}">进度: {{ restoreProgress }}/{{ restoreTotal }}</text>
    <div class="progress-track" style="background-color: {{ theme.border || theme.borderLight }}">
      <div class="progress-fill" style="width: {{ restoreProgress / restoreTotal * 100 }}%; background-color: {{ theme.accent }}"></div>
    </div>
  </div>
  <text class="empty-msg" if="{{ backupList.length === 0 }}" style="color: {{ theme.textMuted }}">暂无备份</text>
</div>
```

### 4.3 备份行卡片改进

```html
<div class="backup-row" for="$item in backupList" style="background-color: {{ theme.card }}">
  <scroll scroll-x="true" class="name-scroll">
    <text class="backup-row-name" style="color: {{ theme.text }}">{{ $item.name }}</text>
  </scroll>
  <!-- footer 改为 row 布局：meta 左侧 + 按钮右侧 -->
  <div class="backup-row-footer">
    <scroll scroll-x="true" class="meta-scroll">
      <text class="backup-row-meta" style="color: {{ theme.textSecondary }}">{{ $item.courseCount }}门课程 · {{ $item.scheduleCount }}张课表</text>
    </scroll>
    <div class="backup-row-actions">
      <input class="row-restore-btn" type="button" value="恢复" onclick="restoreBackup($idx)"
             style="background-color: {{ theme.accent }}; color: {{ theme.bg }}" />
      <input class="row-delete-btn" type="button" value="{{ deleteConfirmIndex === $idx ? '确认' : '删除' }}"
             onclick="handleDeleteBackup($idx)"
             style="background-color: {{ deleteConfirmIndex === $idx ? theme.deleteText : 'transparent' }}; color: {{ deleteConfirmIndex === $idx ? theme.text : theme.deleteText }}; border-color: {{ theme.deleteText }}" />
    </div>
  </div>
</div>
```

### 4.4 弹窗 benefit 合并

```html
<!-- 之前：每项一个 scroll -->
<div class="benefit-list">
  <scroll scroll-x="true" class="benefit-scroll">
    <text class="benefit-item">✓ 多课表管理</text>
  </scroll>
  <!-- ×4 -->
</div>

<!-- 改进：单 scroll 包裹全部 -->
<scroll scroll-x="true" class="benefit-scroll">
  <div class="benefit-list">
    <text class="benefit-item" style="color: {{ theme.text }}">✓ 多课表管理</text>
    <text class="benefit-item" style="color: {{ theme.text }}">✓ 数据备份与恢复</text>
    <text class="benefit-item" style="color: {{ theme.text }}">✓ 首页自定义</text>
    <text class="benefit-item" style="color: {{ theme.text }}">✓ 多套主题</text>
  </div>
</scroll>
```

---

## 五、铁律自查清单

- [ ] 禁止 `@media (shape: pill-shaped)` —— 已确认无
- [ ] 禁止 `lines:` 属性 —— 已确认无
- [ ] 禁止 `text-overflow: ellipsis` —— 已确认无
- [ ] 所有文案在手环 9（160px 内容区）上完整可见 —— 字号 ≤ 22px for base
- [ ] `overlay-modal` 定位属性 inline（已符合）
- [ ] Base CSS 以手环 9 为基准，不依赖 media query
- [ ] 断点只做增量，不重复 base 值
- [ ] `@media (shape: circle)` 为唯一保留的 shape 查询

---

## 六、实施顺序

1. **先改 CSS**：按上述四层结构重写样式，从 base 到 circle
2. **再调模板**：统一状态区容器、合并弹窗 benefit
3. **验证**：在手环 9 模拟器（8554）、胶囊屏（8555）、方屏模拟器上分别确认
4. **提交**：分步 git commit + push