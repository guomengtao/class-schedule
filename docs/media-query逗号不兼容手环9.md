# 媒体查询逗号语法在手环 9 上不兼容

## 一句话结论

`@media (shape: capsule), (shape: pill-shaped)` 中的**逗号**在手环 9 快应用 CSS 引擎中不生效，整条媒体查询被忽略。

---

## 时间线

```
0f45018（原版）
  40 个页面使用 @media screen and (shape: pill-shaped)
  手环 9 上正常工作 ✅
       │
       ▼
sed 批量替换（修复"黑屏重启"）
  → @media (shape: capsule), (shape: pill-shaped)
  逗号分隔的媒体查询在手环 9 上不匹配 ❌
       │
       ▼
1.7.48（本次修复）
  3 页恢复 0f45018 原版：@media screen and (shape: pill-shaped)
  34 页改为：@media (shape: pill-shaped)（去逗号）
```

---

## 根因：逗号不支持

### 测试证据

在手环 9 上用测试页 `src/pages/media-test/media-test.ux` 实测：

| 测试项 | 语法 | 结果 |
|--------|------|:---:|
| 1 | `@media (shape: pill-shaped)` | 🟢 匹配 |
| 2 | `@media screen and (shape: pill-shaped)` | 🟢 匹配 |
| 5 | `@media screen and (width >= 100px)` | 🟢 匹配 |
| 7 | `@media (width >= 100px)` | 🟢 匹配 |

**两种写法都支持**：
- W3C 标准：`@media screen and (shape: pill-shaped)` ✅
- 快应用简化：`@media (shape: pill-shaped)` ✅

**逗号不支持**：
- `@media (shape: capsule), (shape: pill-shaped)` ❌

### 页面级证据

设备信息页对比：

| 版本 | 语法 | 胶囊屏布局 |
|------|------|:---:|
| 0f45018 原版 | `@media screen and (shape: pill-shaped)` | 2 行 ✅ |
| sed 替换后 | `@media (shape: capsule), (shape: pill-shaped)` | 1 行 ❌ |
| 恢复 0f45018 | `@media screen and (shape: pill-shaped)` | 2 行 ✅ |

逗号版本中 `flex-direction: column` 等胶囊样式完全不生效，回退到基础 CSS 的 `flex-direction: row`。

### 为什么 3 个页面"看起来更好"

设备信息、欢迎、设置 3 页的胶囊样式有**过度优化**问题（padding 太小、按钮太窄等）。

sed 加逗号后媒体查询失效 → 这些过度优化的值没生效 → 基础 CSS 接管 → **巧合**显得更协调。

但副作用是 `flex-direction: column` 也丢了 → 设备信息页挤成一行。

---

## 为什么"黑屏"跟 `@media screen and` 无关

测试页在手环 9 上 7 项全绿，证明 `@media screen and` 语法完全支持。

首页崩溃的真正原因不是 `@media screen and`，可能是：
- 探针代码（已回退）
- `warmCache` 方法（已回退）
- 或这些代码与特定 CSS 组合时触发的边缘 case

但 CSS 语法本身没问题。

---

## 修复方案

去逗号，用单一 shape 查询：

```
❌ @media (shape: capsule), (shape: pill-shaped) { ... }
✅ @media (shape: pill-shaped) { ... }
✅ @media screen and (shape: pill-shaped) { ... }   // 同样可用
```

手环 9 识别为 `pill-shaped`，不需要 `capsule` 关键词做 fallback。

---

## 教训

1. **不要假设 W3C 标准语法在嵌入式设备上完全支持**——逗号分隔的媒体查询列表在桌面浏览器通用，但在快应用 CSS 引擎中不支持
2. **任何时候改 CSS 应该在真机上验证**——尤其是媒体查询语法
3. **批量替换有风险**——sed 一次性改 40 个页面，误判根因导致引入新 bug