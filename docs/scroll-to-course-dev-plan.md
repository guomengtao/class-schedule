# 首页状态栏点击滚动到课程位置 - 开发计划

## 问题现状

经过两轮修复后，点击状态栏"正在上课"或"下一节"仍然没有任何反应。

### 已尝试的修复

| 轮次 | 修复内容 | 结果 |
|------|---------|------|
| 第1轮 | `scrolltop` → `scroll-top`（属性名修复） | ❌ 无效 |
| 第2轮 | 给 `status-current`/`status-next` 添加 `ontouchstart`（修复 onclick 被拦截） | ❌ 无效 |

### 可能原因

1. **`scroll-top` 属性在运行时不起作用**：虽然 `ElementConfig.js` 中定义了 `scroll-top` 属性，但实际运行时可能不支持通过数据绑定动态设置滚动位置，或者需要特定条件才能生效（如 scroll 组件必须有明确的固定高度、内容必须超出视口等）。

2. **onclick 事件仍然未触发**：添加 `ontouchstart` 后 onclick 可能仍然被父元素的触摸事件拦截，或者 QuickApp 的 `@click` 语法与 `onclick` 有差异。

3. **scroll 组件高度问题**：`.class-list` 使用 `flex: 1` 撑满剩余空间，scroll 组件可能没有获得确定的像素高度，导致 `scroll-top` 设置无效。

---

## 涉及文件

| 文件 | 路径 |
|------|------|
| 首页 | [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) |
| Vela 配置 | [ElementConfig.js](file:///Users/Banner/Documents/guomengtao/tom/class/class/node_modules/@aiot-toolkit/parser/lib/ux/config/vela/ElementConfig.js) |

---

## 方案对比

### 方案 A：使用 `@click` 事件 + `scroll-top` 最终尝试

**思路**：QuickApp 中 `@click` 和 `onclick` 可能有不同的行为。`@click` 是标准事件绑定语法，可能不受父元素 `ontouchstart` 影响。

**实现**：
1. 将 `onclick` 改为 `@click`
2. 在 `scrollToClassById` 中先将 `scrollListTop` 重置为 0，再通过 `setTimeout` 设置为目标值，强制触发值变化
3. 给 scroll 组件设置明确的 `height` 值（如 `height: 100%`）

**优点**：改动最小，如果成功则是最简洁的方案

**缺点**：如果 `scroll-top` 根本不支持动态设置，则此方案无效

**风险**：中

---

### 方案 B：替换为 `<list>` 组件 + `focusbehavior`

**思路**：用 `<list>` 组件替代 `<scroll>` 组件。`<list>` 支持 `focusbehavior` 属性，当某个 list-item 获得焦点时会自动滚动到该位置。

**技术要点**：
- `<list>` 需要 `<list-item>` 作为子元素
- `focusbehavior` 取值：`aligned`（居中）、`edged`（贴边）、`leadingedged`（贴前边）、`trailingedged`（贴后边）
- 需要通过某种方式让目标 list-item 获得焦点

**实现**：
```html
<list class="class-list" focusbehavior="aligned">
  <list-item for="{{ currentClasses }}" class="class-card-wrapper">
    ...
  </list-item>
</list>
```

**挑战**：如何在 QuickApp 中 programmatically focus 一个 list-item？可能需要：
- 使用 `id` 属性 + 某种 focus API
- 或者使用 `scrollpage` 属性配合数据变化

**优点**：如果 focus 机制可用，滚动效果流畅

**缺点**：需要将 div 改为 list-item，可能影响现有样式和滑动删除功能；focus API 可能不可用

**风险**：高

---

### 方案 C：视觉高亮代替滚动（推荐兜底方案）

**思路**：既然滚动不可靠，改为**高亮目标课程卡片**。点击状态栏后，目标课程卡片获得明显的视觉提示（如边框闪烁、背景色变化），用户手动滚动到该位置查看。

**实现**：
1. 添加 `highlightedId` 数据属性
2. 点击状态栏时设置 `highlightedId = targetCourseId`
3. 课程卡片根据 `highlightedId` 显示高亮样式（金色边框 + 短暂闪烁）
4. 3秒后自动取消高亮，或用户点击其他位置时取消

**模板示例**：
```html
<div class="class-card {{ swipedId === $item.id ? 'class-card-swiped' : '' }} 
     {{ highlightedId === $item.id ? 'class-card-highlighted' : '' }}" ...>
```

**CSS 示例**：
```css
.class-card-highlighted {
  border-color: #f39c12;
  border-width: 3px;
}
```

**优点**：100% 可靠，不依赖任何有问题的 API；用户体验可接受（有明确的视觉引导）

**缺点**：不会自动滚动，用户需要手动滑动查看

**风险**：低

---

### 方案 D：CSS 模拟滚动（使用 `margin-top` 负值）

**思路**：不使用 scroll 组件的滚动能力，而是将课程列表放在一个固定高度的容器中，通过修改容器的 `padding-top` 或内部元素的 `margin-top` 负值来模拟滚动效果。

**实现**：
```html
<div class="class-list-viewport" style="height: 400px">
  <div class="class-list-inner" style="margin-top: {{ -scrollListTop }}px">
    <div for="{{ currentClasses }}" ...>...</div>
  </div>
</div>
```

**优点**：不依赖 scroll 组件的 `scroll-top` 属性

**缺点**：
- 需要手动计算容器高度
- 可能不支持负 margin
- 滚动体验不流畅（没有惯性）
- 需要自行处理滑动删除的手势

**风险**：高

---

### 方案 E：彻底重构 - 点击后直接跳转到课程详情页

**思路**：既然滚动不可靠，改为点击状态栏后直接打开对应课程的详情页。

**实现**：
```js
scrollToCurrentClass() {
  if (!this.currentClass) return
  router.push({ uri: "/pages/course-detail", params: { id: this.currentClass.id } })
}
```

**优点**：最简单可靠，用户体验明确

**缺点**：不符合原始需求（用户想要滚动到列表中的位置，而不是跳转页面）

**风险**：低

---

## 推荐实施路径

```
方案 A（@click + scroll-top 最终尝试）
    ↓ 失败
方案 C（视觉高亮代替滚动）
    ↓ 作为兜底
方案 B（list 组件 + focusbehavior）— 如果时间允许，作为长期方案探索
```

### 第一步：方案 A 最终尝试

1. 将 `status-current` 和 `status-next` 的 `onclick` 改为 `@click`
2. 在 `scrollToClassById` 中添加重置逻辑：
   ```js
   scrollToClassById(id) {
     var classes = this.currentClasses
     for (var i = 0; i < classes.length; i++) {
       if (classes[i].id === id) {
         var targetTop = i * 110
         // 先重置为不同值，再设置目标值，确保触发变化
         this.scrollListTop = -1
         var self = this
         setTimeout(function() {
           self.scrollListTop = targetTop
         }, 50)
         return
       }
     }
   }
   ```
3. 给 `.class-list` 添加明确的 `height` 样式
4. 保留振动反馈用于调试

### 第二步：方案 C 视觉高亮（兜底）

如果方案 A 仍然无效，立即实施方案 C：
1. 添加 `highlightedId` 数据属性
2. 修改课程卡片模板，添加高亮样式
3. 添加自动取消高亮的定时器

### 第三步：增强"今"按钮

无论采用哪个方案，"今"按钮（`goToToday`）的行为统一增强：
- 点击"今"后，先跳转到今天
- 然后自动定位到当前正在上的课或即将上的课

---

## 实施步骤（按优先级）

### 1. 方案 A 实施（约 30 分钟）

**文件**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux)

**改动点**：
- [ ] 模板：`onclick` → `@click`（status-current, status-next, status-bar）
- [ ] 模板：scroll 组件添加 `style="height: 100%"` 
- [ ] 脚本：`scrollToClassById` 添加重置逻辑
- [ ] 脚本：保留 `playVibration` 调试振动

### 2. 方案 C 实施（约 20 分钟，如果方案 A 失败）

**文件**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux)

**改动点**：
- [ ] 数据：添加 `highlightedId: ""`
- [ ] 模板：课程卡片添加高亮 class
- [ ] 样式：添加 `.class-card-highlighted` 样式
- [ ] 脚本：`scrollToClassById` 设置 `highlightedId` + 定时取消
- [ ] 脚本：`dismissSwipe` 中同时清除 `highlightedId`

### 3. "今"按钮增强（约 10 分钟）

**文件**：[index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux)

**改动点**：
- [ ] 脚本：`goToToday` 方法末尾调用 `scrollToCurrentOrUpcomingClass`
- [ ] 脚本：新增 `scrollToCurrentOrUpcomingClass` 方法，优先当前课，其次下一节，其次即将上的课

---

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `scroll-top` 完全不可用 | 无法滚动 | 兜底方案 C（视觉高亮） |
| `@click` 语法与 `onclick` 行为一致 | 无改进 | 直接进入方案 C |
| `list` 组件的 focus 机制不可用 | 方案 B 无效 | 不采用方案 B |
| 负 margin 不支持 | 方案 D 无效 | 不采用方案 D |