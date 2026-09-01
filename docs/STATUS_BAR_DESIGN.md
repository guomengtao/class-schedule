# 首页状态栏三段式布局方案

## 目标

在首页 `status-bar` 区域实现**所有信息在一行内完整可见**，不滚动、不截断关键信息。

## 核心思路

将 `status-bar` 拆成三个固定区域，每个区域各司其职：

```
[状态标签]  [课程名称]  [时间/倒计时]
   左           中           右
```

- **左（标签）**：固定宽度，不压缩，显示状态类型
- **中（名称）**：弹性宽度，超长自动截断 `...`
- **右（时间）**：固定宽度，不压缩，显示时间信息

## 模板结构

```html
<div class="status-bar" onclick="goToStatusClass">
  <div class="status-left">
    <text class="status-tag">{{ statusTag }}</text>
  </div>
  <text class="status-middle">{{ statusMainText }}</text>
  <text class="status-right">{{ statusTimeText }}</text>
</div>
```

## 各状态显示效果

| 状态 | 左（标签） | 中（名称） | 右（时间） |
|------|-----------|-----------|-----------|
| 上课中 | `[上课中]` | `高等数学` | `32min` |
| 即将上课 | `[即将上课]` | `大学英语` | `5min后` |
| 有课（非今天） | `[有课]` | `物理 周三` | `10:00` |
| 无课程 | `[暂无]` | `今日无课程安排` | （空） |

## CSS 关键样式

```css
.status-bar {
  flex-direction: row;
  align-items: center;
  height: 44px;        /* 固定高度，确保单行 */
  overflow: hidden;    /* 防止溢出 */
}

.status-left {
  flex-shrink: 0;      /* 不压缩 */
}

.status-middle {
  flex: 1;             /* 占剩余空间 */
  max-lines: 1;
  text-overflow: ellipsis;  /* 超长截断 */
  overflow: hidden;
}

.status-right {
  flex-shrink: 0;      /* 不压缩 */
  text-align: right;
}
```

## 各屏幕适配

| 屏幕 | 高度 | 标签字号 | 名称字号 | 时间字号 |
|------|------|---------|---------|---------|
| 默认 | 44px | 14px | 18px | 16px |
| 圆形 | 38px | 12px | 16px | 14px |
| 胶囊 | 36px | 11px | 14px | 13px |
| 矩形 | 34px | 10px | 13px | 12px |

## 优势

- 左侧标签和右侧时间始终完整可见，不压缩
- 中间课程名超长时自动显示省略号
- 用户无需等待滚动，一眼获取所有信息
- 点击状态栏可跳转到当前/下一节课详情