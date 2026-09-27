# 骨架屏（Skeleton Screen）说明与页面分析

## 什么是骨架屏？

**骨架屏**（Skeleton Screen）是在页面数据加载完成前，显示的一个**占位预览结构**。它不是空白页，也不是简单的"加载中..."文字，而是一个**模仿最终页面布局的灰色/浅色占位块**。

### 对比

| 方案 | 用户体验 |
|------|----------|
| **白屏** | 用户不知道发生了什么，以为应用卡死 |
| **"加载中..."文字** | 用户知道在加载，但不知道要等多久、页面长什么样 |
| **骨架屏** | 用户看到页面结构轮廓，感知到"内容即将出现"，减少焦虑感 |

```
白屏（最差）：
┌──────────────┐
│              │
│              │
│    (空白)     │
│              │
└──────────────┘

"加载中..."（一般）：
┌──────────────┐
│              │
│  加载中...    │
│              │
└──────────────┘

骨架屏（最佳）：
┌──────────────┐
│ ████████     │  ← 模拟标题栏
│ ░░░░░░░░░░░░ │  ← 模拟内容行
│ ░░░░░░░░░    │  ← 模拟内容行
│ ░░░░░░░░░░░░ │  ← 模拟内容行
└──────────────┘
```

### 为什么手表更需要骨架屏？

1. **性能受限** — 手表 CPU 慢，数据加载时间相对更长
2. **屏幕小** — 空白或简单文字在小屏幕上更显突兀
3. **冷启动慢** — 首次打开页面需从 storage 读取数据，延迟明显

---

## 当前项目已有的 Loading 状态（3个页面）

| 页面 | 方式 | 代码位置 |
|------|------|----------|
| **index-full** | `isLoading` → 显示"加载中..."文字 | [index-full.ux:L57-L58](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index-full/index-full.ux#L57-L58) |
| **device-info** | `loading` → 显示图标 + "获取中..." | [device-info.ux:L8-L10](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/device-info/device-info.ux#L8-L10) |
| **schedule-qrcode** | `!qrText` → 显示"加载中..." | [schedule-qrcode.ux:L50-L51](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-qrcode/schedule-qrcode.ux#L50-L51) |

---

## 需要增加骨架屏的页面分析

### 🔴 优先级 1：高影响（复杂异步、当前显示空白/零值）

#### 1. week-view（总课表）

**文件**：[week-view.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/week-view/week-view.ux)

**问题分析**：
- `onInit()` 同时发起 2 个异步操作（`store.getHideWeekend` + `storage.get weekview_index`），两者都完成后才调用 `loadData()`
- 有 800ms 超时兜底，但在数据到达前，**整个表格区域为空**
- 用户看到的是：标题栏 + 空的表格滚动区域 + 底部模板按钮
- 表格区域在数据到达前完全空白（灰色的列头下面什么都没有）

**建议**：在表格区域增加骨架占位 —— 用 5-6 行占位条模拟课表行的结构。

**实现要点**：
```
private: {
  isGridLoading: true   // 新增
}

// 模板中
<div if="{{ isGridLoading }}" class="skeleton-grid">
  <div for="{{ [1,2,3,4,5] }}" class="skeleton-row">
    <div class="skeleton-cell" style="width: {{ cellWidth }}px; height: {{ cellHeight }}px; background-color: {{ theme.borderLight }}"></div>
    <!-- 重复 N 列 -->
  </div>
</div>
```

---

#### 2. statistics（课程统计）

**文件**：[statistics.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/statistics/statistics.ux)

**问题分析**：
- `loadStatistics()` 链式调用 `storage.get` → `database.getAllCoursesWithIndex`
- 数据到达前，显示 `totalCourses: 0`、`weeklyCourses: 0`、`busiestDay: "-"`、各排行榜为空
- 用户看到的是 **"0门课"、"暂无课程数据"** 的错误暗示，然后数据突然跳变

**建议**：增加 `isLoading` 状态，在数据加载时显示骨架统计卡片。

---

#### 3. detail（编辑课程）

**文件**：[detail.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/detail/detail.ux)

**问题分析**：
- `onInit()` 中需要等 2 个 `storage.get`（classId + day）都完成才调用 `loadCoursesWithData()`
- `loadCoursesWithData()` 内部又链式调用 `storage.get` → `database.getAllCourses`
- 数据到达前，表单字段显示初始空值（课程名空、时间空、地点空）
- 步进器（stepper）显示默认时间值，但这不是正确的课程数据

**建议**：增加 `isLoading`，加载时显示骨架表单（模拟 stepper + 输入框结构）。

---

#### 4. schedule-manager（课表管理）

**文件**：[schedule-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/schedule-manager/schedule-manager.ux)

**问题分析**：
- `loadData()` 先获取课表名称列表，再逐个异步获取每张课表的课程数
- 初始 `list = []`，列表为空，然后逐个填充课程数
- 用户看到空列表 → 突然出现条目 → 数字逐个跳变

**建议**：在列表区域增加骨架占位（2-3 行模拟课表条目）。

---

#### 5. course-manager / course-manager-v2（课程管理）

**文件**：[course-manager.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager/course-manager.ux) / [course-manager-v2.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/course-manager-v2/course-manager-v2.ux)

**问题分析**：
- `loadCourses()` 从 storage 读取课程列表
- 读取失败时直接用 `defaultCourses`（预设课表），有兜底
- 但首次加载时，从 storage 读取到解析 JSON 有一定延迟
- 列表初始为默认数据/空，然后被实际数据替换

**建议**：增加 `isLoading`，加载时显示骨架列表（3-4 行模拟课程条目）。

---

### 🟡 优先级 2：中影响（有异步加载但页面较小）

#### 6. backup-restore（备份与恢复）

**文件**：[backup-restore.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/backup-restore/backup-restore.ux)

**问题**：`loadBackupList()` 异步读取备份列表，列表初始为空。

**建议**：简单方案 — 增加 `isLoading` 显示"加载中..."即可（页面较小，不需要复杂骨架）。

---

#### 7. countdown-manage（倒计时管理）

**文件**：[countdown-manage.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/countdown-manage/countdown-manage.ux)

**问题**：`loadList()` 异步读取倒计时列表，列表初始为空。

**建议**：简单方案 — 增加 `isLoading` 显示"加载中..."。

---

#### 8. activation（激活页面）

**文件**：[activation.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/activation/activation.ux)

**问题**：`onInit` 中 `fetchDeviceId()`、`loadStatus()`、`loadHistory()` 多个异步操作。

**当前状态**：已经有 `statusText: '加载中...'`，但二维码区域的"正在生成二维码..."只在 `!qrCodeData` 时显示。整体体验尚可。

**建议**：可维持现状，或在 `statusText === '加载中...'` 时增加简单的骨架卡片。

---

#### 9. pinned-pages（已钉页面）

**文件**：[pinned-pages.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/pinned-pages/pinned-pages.ux)

**问题**：`loadPinnedList()` 在 `onShow` 中异步加载，初始列表为空。

**建议**：简单方案 — 增加 `isLoading` 显示"加载中..."。

---

### 🟢 不需要骨架屏的页面

| 页面 | 原因 |
|------|------|
| **welcome** | 极轻量，只有 theme 读取，无延迟 |
| **settings** | 多项异步读取但都很快（storage 小数据），内容逐渐出现可接受 |
| **qrcode-generator** | onInit 极轻量，无数据加载 |
| **donate** | 仅设备信息获取，无数据加载 |
| **add-course / add-course-v2** | 有默认兜底数据，storage 读取失败也不影响展示 |
| **nickname-edit** | 单项数据读取，极快 |
| **homepage-settings** | 轻量 settings 读取 |
| **reset-data** | 无数据加载 |
| **chinese-input** | 无数据加载 |
| **custom-content-edit** | 单条数据读取 |
| **bs-demo1-5** | 测试/调试页面 |
| **test-area** | 测试页面 |
| **capsule-hide-test** | 测试页面 |
| **black-screen-check** | 测试页面 |
| **lab-add-course / lab-edit-course** | 测试页面 |
| **template-picker** | 轻量，仅预设数据 |
| **vibration-lab** | 无异步数据加载 |

---

## 推荐实现模式

### 最简单的方案（建议优先采用）

为每个需要的页面增加一个 `isLoading` 私有变量和一个统一的加载组件：

```html
<!-- 骨架加载组件，可抽取为公共组件 -->
<div class="skeleton-loading" if="{{ isLoading }}" style="background-color: {{ theme.card }}">
  <text class="skeleton-icon">⏳</text>
  <text class="skeleton-text" style="color: {{ theme.textMuted }}">加载中...</text>
</div>

<!-- 真实内容 -->
<div if="{{ !isLoading }}">
  <!-- 原有内容 -->
</div>
```

```css
.skeleton-loading {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.skeleton-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.skeleton-text {
  font-size: 24px;
}
```

### 进阶方案（复杂页面）

对于 week-view、statistics 这类复杂页面，可以用占位块模拟真实布局：

```html
<!-- 统计页骨架示例 -->
<div if="{{ isLoading }}" class="skeleton-stats">
  <div class="skeleton-card" style="background-color: {{ theme.card }}">
    <div class="skeleton-bar" style="width: 60%; height: 28px; background-color: {{ theme.borderLight }}; border-radius: 4px; margin-bottom: 12px;"></div>
    <div class="skeleton-bar" style="width: 80%; height: 16px; background-color: {{ theme.borderLight }}; border-radius: 4px;"></div>
  </div>
</div>
```

---

## 总结

| 优先级 | 页面数 | 建议 |
|--------|--------|------|
| 🔴 高 | 5 个（week-view, statistics, detail, schedule-manager, course-manager×2） | 必须增加加载状态 |
| 🟡 中 | 4 个（backup-restore, countdown-manage, activation, pinned-pages） | 建议增加简单的"加载中"提示 |
| 🟢 低 | 其余 20+ 个 | 无需改动 |

**核心原则**：任何有异步数据加载且初始状态为空/零值的页面，都应该有一个**可见的加载状态**，让用户知道"内容马上就来"，而不是误以为"这里什么都没有"。