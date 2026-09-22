# 胶囊屏字号保护规则

> 胶囊屏（shape: capsule / pill-shaped）屏幕窄小，字号必须严格管控，确保可读性和界面整洁。

## 1. 最小字号

| 元素 | 最小字号 | 说明 |
|------|:---:|------|
| 标题 | 26px | 页面主标题 |
| 正文/列表项 | 24px | 课程名、设置项 |
| 辅助文字 | 20px | 时间、提示、标签 |
| 按钮文字 | 22px | 操作按钮 |

禁止使用 18px 及以下字号，用户无法看清。

## 2. 禁止换行

所有文字必须设置 `lines: 1` 和 `text-overflow: ellipsis`，防止多行换行导致界面混乱。

```css
.row-name {
  font-size: 26px;
  lines: 1;
  text-overflow: ellipsis;
}
```

## 3. 行高规则

`line-height` 必须 >= `font-size + 8px`。禁止行高小于字号，会挤压文字导致上下裁切。

```css
/* 正确 */
.title { font-size: 28px; line-height: 40px; }
/* 错误 - 禁止！ */
.title { font-size: 28px; line-height: 28px; }
```

## 4. 按钮/输入框尺寸

- 按钮高度 >= 40px，上下留足间距避免误触
- 输入框高度 >= 44px，内边距 >= 8px
- 文字区域宽度 >= 文字实际宽度 + 16px padding
- 禁止文字贴边或被边框裁切

## 5. 快速检查清单

- [ ] 所有字号 >= 20px
- [ ] 所有文字 `lines: 1` + `text-overflow: ellipsis`
- [ ] `line-height` >= `font-size + 8px`
- [ ] 按钮高度 >= 40px
- [ ] 文字与容器边缘间距 >= 8px