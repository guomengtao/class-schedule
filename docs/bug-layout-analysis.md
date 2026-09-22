# 首页宽度乱了 & 课程总览页面布局打乱 - Bug 分析

## 问题描述

1. 首页（schedule-page）宽度显示异常
2. 课程总览页面（week-view-page）布局完全打乱，格子系统不显示

## 根因分析

### 问题一：模板中存在多余的 `</div>` 闭合标签

**位置**: [index.ux:131](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L131)

```html
<!-- Line 130 -->
  </div>   ← 闭合 week-view-page
  </div>   ← 多余！没有对应的开标签
</template>
```

**原因**: 模板最外层 `<div>` 在 line 2 打开，line 95 闭合。`week-view-page` 的 `<div>` 在 line 97 打开，line 130 闭合。line 131 多出一个 `</div>` 没有对应的开标签，导致 DOM 结构异常，影响全局布局。

**标签配对追踪**:
```
Line 2:   <div>                                    ← 外层包装 (开)
Line 3:     <div class="schedule-page">             ← 日程页 (开)
Line 4:     <div class="upper-half">                ← 上半区 (开)
...
Line 76:     </div>                                 ← 合 upper-half
Line 78:     <div class="lower-half">               ← 下半区 (开)
...
Line 93:     </div>                                 ← 合 lower-half
Line 94:   </div>                                   ← 合 schedule-page
Line 95:   </div>                                   ← 合 外层包装

Line 97:   <div class="week-view-page">             ← 周视图 (开)
...
Line 130:   </div>                                  ← 合 week-view-page
Line 131:   </div>   ← 多余！无对应开标签
```

### 问题二：index.ux 缺少周视图的全部 CSS 样式

**位置**: [index.ux](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux) 的 `<style>` 部分（line 1026 起）

`index.ux` 在模板中内嵌了完整的周视图 HTML（line 97-130），但其 `<style>` 中**完全没有**定义周视图相关 CSS 类。

对比独立的 `week-view.ux` 文件，它定义了以下所有样式：

| CSS 类 | week-view.ux 中的样式 | index.ux 中是否存在 |
|--------|----------------------|---------------------|
| `.week-view-page` | `flex-direction: column; height: 100%;` | ❌ 缺失 |
| `.header` | 周视图头部（`flex-direction: row; position: relative`） | ❌ 缺失（且与 schedule-page 的 `.header` 冲突） |
| `.back-btn` | `position: absolute; left: 0;` 返回按钮 | ❌ 缺失 |
| `.header-title` | `font-size: 18px; font-weight: bold;` | ❌ 缺失 |
| `.schedule-name` | 课程表名称文字 | ❌ 缺失 |
| `.grid-wrapper` | `flex: 1; flex-direction: column;` | ❌ 缺失 |
| `.week-header` | `flex-direction: row;` 星期头部 | ❌ 缺失 |
| `.week-header-spacer` | `width: 50px;` 时间列占位 | ❌ 缺失 |
| `.week-day` | `flex: 1; text-align: center;` 每天格子 | ❌ 缺失 |
| `.week-day.today-day` | 今天高亮样式 | ❌ 缺失 |
| `.grid-scroll` | `flex: 1; overflow: auto;` 滚动区 | ❌ 缺失 |
| `.grid-container` | `flex-direction: column;` | ❌ 缺失 |
| `.time-row` | `flex-direction: row; min-height: 34px;` | ❌ 缺失 |
| `.time-label` | `width: 50px;` 时间标签 | ❌ 缺失 |
| `.course-row` | `flex: 1; flex-direction: row;` | ❌ 缺失 |
| `.course-cell` | `flex: 1; height: 32px; border-radius: 6px;` | ❌ 缺失 |
| `.course-cell.current-course` | 当前课程高亮 | ❌ 缺失 |
| `.course-char` | `font-size: 20px; font-weight: bold;` | ❌ 缺失 |
| `.course-empty` | `font-size: 10px;` 空单元格 | ❌ 缺失 |
| `.week-footer` / `.footer` | 底部统计栏 | ❌ 缺失 |

**结果**: 周视图中的所有元素都没有 flex 布局、没有尺寸、没有定位，所有元素堆叠在一起，布局完全打乱。

### 问题三：class 命名冲突

`index.ux` 中 schedule-page 的头部使用 `.header`：

```css
/* line 1043 - 用于 schedule-page 的头部 */
.header {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  margin-bottom: 4px;
}
```

而 `week-view.ux` 中周视图头部也使用 `.header`：

```css
/* week-view.ux - 用于周视图头部 */
.header {
  flex-direction: row;
  align-items: center;
  justify-content: center;
  position: relative;
}
```

两者样式不同，如果直接复用 `.header` 类名会导致冲突。因此 `index.ux` 中周视图头部使用了 `.week-view-header`（避免了冲突），但缺少对应的 CSS 定义。

## 修复方案

### 修复 1：删除多余的 `</div>`

删除 [index.ux:131](file:///Users/Banner/Documents/guomengtao/tom/class/class/src/pages/index/index.ux#L131) 多余的 `</div>`。

### 修复 2：添加周视图 CSS 样式到 index.ux

在 `index.ux` 的 `<style>` 末尾添加所有周视图样式，注意类名映射：

| week-view.ux 类名 | index.ux 中应使用的类名 |
|-------------------|------------------------|
| `.header` | `.week-view-header`（避免冲突） |
| `.footer` | `.week-footer`（避免冲突） |
| 其他所有类名 | 保持一致 |

## 总结

两个问题均出在 `index.ux` 文件中：

1. **多余 `</div>`** → 破坏 DOM 结构 → 首页宽度异常
2. **缺失 CSS 样式** → 周视图所有元素无布局属性 → 布局完全打乱

这两个问题很可能是之前将周视图的内联代码从独立页面 `week-view.ux` 合并到 `index.ux` 时，只复制了 HTML 模板，遗漏了 CSS 样式，且留下了一个多余的闭合标签。