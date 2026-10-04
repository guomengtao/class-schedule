# `@media screen and` 在手环9上根本没失效

## 关键证据

基础 CSS 里 `.menu-item` 是 `flex-direction: row`（1行横排）：

```css
.menu-item {
  flex-direction: row;    /* ← 1行！ */
  justify-content: space-between;
  align-items: center;
}
```

之前 `@media screen and` 版本，你看到的是 **2行竖排**。如果 `screen and` 真的"失效"了，回退到基础 CSS 应该是 1 行才对。

**事实正好相反：`@media screen and (shape: pill-shaped)` 在手环 9 上能正常匹配！**

## 这意味着什么

之前的分析结论**需要修正**：

| 之前以为 | 实际情况 |
|---------|---------|
| `@media screen and` 在手环9上解析失败 | ✅ 能正常匹配，CSS 里面的样式生效 |
| 失效 → 回退基础CSS → 3个页面变好 | ❌ 没失效，胶囊专用样式一直在生效 |
| 批量 sed 替换防止崩溃 | ⚠️ 可能不必要，首页崩溃另有原因 |

## 设备信息页 2行→1行的真正原因

```
之前（@media screen and）:
  匹配成功 → .menu-item { flex-direction: column } → 2行 ✅

现在（@media 已删掉 column）:
  匹配成功 → 胶囊块里没有 flex-direction → 用基础CSS的 row → 1行 ❌
```

跟 `screen and` 语法没关系，纯粹是我们把 `flex-direction: column` 删掉了。

## 首页崩溃真正原因推测

首页 index.ux 崩溃可能不是 `@media screen and` 导致的，而是同一批 commit 里的其他改动：

- 探针代码（`d417913`, `c94245f`）在 `onInit` 里加了阻塞逻辑
- `store.js` 的 `warmCache` 预加载
- 首页某些 CSS 属性组合触发了渲染引擎 bug

sed 替换同时改了 `@media` 前缀，**碰巧**跟 revert 探针代码一起提交，让我们错误归因了。

## 下一步

对于这 3 个页面，正确的处理是：
- 保留 `@media screen and` 语法（它本来就能用）
- 只调整**过度优化的样式值**（padding 太宽、字号太大、按钮太窄）
- **不删结构级属性**（`flex-direction: column` 这种）