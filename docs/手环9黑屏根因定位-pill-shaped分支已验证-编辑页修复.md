# 手环 9 黑屏重启根因定位 —— `@media (shape: pill-shaped)` 分支（已验证）

> 状态：**根因已确认（真机实测）**
> 日期：2026-10-04
> 关键结论：**手环 9（识别为 `pill-shaped`）上，命中列表页的 `@media (shape: pill-shaped)` 分支会导致页面黑屏重启；停用该分支后「编辑课程页」恢复正常。**
> 表妹手环 9 上，「课程表管理页」仍黑屏——它未做停用处理、仍命中该分支，恰好构成对照，反证根因一致。

---

## 一、一句话结果

详细对比：**detail 编辑课程页**临时停用 `pill-shaped` 分支后，**不再黑屏、能正常打开** ✅；
**schedule-manager 课程表管理页**未做处理、仍命中该分支，**依旧黑屏重启** ❌。

由此确认：**两个问题页面共用的 `@media (shape: pill-shaped)` 分支，就是手环 9 崩溃的真正触发点。**

---

## 二、时间线 & 验证经过

```
1.7.6x  编辑课程页 + 课程表管理页 在 手环9 黑屏重启；10Pro 正常
        │
        ├─ 初判 1：JS 里 $element().scrollTo() / getScrollRect()
        │           → 移除后真机仍崩 ❌ 假设证伪
        │
        └─ 初判 2：@media (shape: pill-shaped) 分支内某段 CSS
                    → 临时改成 (shape: capsule)（9 不命中→走 base）
                    → 编辑课程页 恢复打开 ✅ 假设成立
```

### 真机验证结果表（手环 9 = pill-shaped）

| 页面 | 改动 | 结果 |
|------|------|:---:|
| detail 编辑课程 | `@media (shape: pill-shaped)` → `@media (shape: capsule)`（临时诊断） | ✅ 打开，不再黑屏 |
| schedule-manager 课程表管理 | 未改动（对照） | ❌ 仍黑屏重启 |

> 说明：两个页面都命中 `(shape: pill-shaped)`。detail 停用分支后就正常；schedule-manager 没停用、仍黑屏——**反向证实根因就是该分支**。

---

## 三、根因

- 触发对象：**手环 9**（快应用 CSS 引擎识别为 `pill-shaped`）。
- 触发点：页面首次渲染时命中 **`@media (shape: pill-shaped) { ... }`** 分支并应用其中的样式，触发引擎崩溃 → 黑屏 + 重启。
- 为什么 10Pro 正常：**10Pro 不命中 `pill-shaped` 分支**（走的是 `rect` 或 base 样式），因此没有执行这段有问题的样式。
- 为什么首页 index 正常：首页用的是 **逗号写法** `@media (shape: capsule), (shape: pill-shaped)`，在手环 9 上**整条失效**、走 base 兜底样式——等于「没执行任何分支」，所以安全。这与「去逗号修复激活了单条件分支」的转折点完全吻合。

### 关键转折点（回归来源）

之前的「黑屏修复」把媒体查询从：
```
❌ @media (shape: capsule), (shape: pill-shaped)   // 9 上失效，走 base → 安全
```
改成：
```
✅ @media (shape: pill-shaped)                      // 9 上命中 → 触发崩溃
```
本是修复语法，却在**手环 9 上把这段有问题的样式真正激活了**，从而引入了两个页面的黑屏回归。

---

## 四、已证伪的假设（重要教训）

| 假设 | 证据 | 结论 |
|------|------|:---:|
| `$element().scrollTo()` / `getScrollRect()` 在加载期导致崩溃 | 移除后真机仍崩 | ❌ **证伪** |
| 手环 9 崩溃是「通用 CSS 语法错误」 | `@media screen and` 等语法实测全绿 | ❌ **证伪** |
| 崩溃在 JS 加载链 | 纯 CSS 变更（停用分支）就恢复 | ❌ **最大嫌疑排除** |
| **`@media (shape: pill-shaped)` 分支内容** | 停用后编辑页恢复 | ✅ **成立** |

> 教训：**跨屏型差异排查时，先核对 `@media (shape: X)` 在各设备上命中的分支**。设备 shape 决定了走哪段样式，是「A 设备崩、B 设备正常」最直接的分水岭。静态读 JS/CSS 猜测成本高且易错，**用「停用某个分支」做真机二分是最快路径**。

---

## 五、后续待办（仍未完成）

1. **还没定位到 `pill-shaped` 分支内的具体某条样式**：detail 停用整段即恢复正常，说明问题在某一条（或某几条）CSS 内。下一步需：
   - 先恢复 detail 的 `@media (shape: pill-shaped)`；
   - 在该分支内用「逐段注释 / 逐条二分」找到具体崩溃的样式声明（疑似方向：`flex-wrap: nowrap`、`min-width: 0`、`text-overflow: ellipsis`、`lines: 1`、`flex-shrink: 0`、超短间距等，需逐一验证）。
2. **schedule-manager 课程表管理页**同因，需同样处理其 `@media (shape: pill-shaped)` 分支（含 `docs/schedule-manager-*.md` 里记录过的胶囊 v2 底部弹层等）。
3. 定位到确切样式后，**给出 手环9 安全写法**（例如改用其它属性表达同样视觉，或对该分支单独规避），并**把当前 `TEMP-DIAG` 诊断改动恢复**。
4. 复查 **其它使用单条件 `@media (shape: pill-shaped)` 且在手环 9 上会命中的页面**，防止同类黑屏。

---

## 六、当前工作区状态（备忘）

- `src/pages/detail/detail.ux`：处于**临时诊断态**——`pill-shaped` 已临时改为 `(shape: capsule)`，并加载 `TEMP-DIAG` 注释。此改动**不可作为正式修复**，需在定位到具体样式后恢复并用安全写法替代。
- `src/pages/schedule-manager/schedule-manager.ux`：未做诊断改动（对照），仍黑屏。
- 此前提交 `d362d2c` 移除的两个页面 `$element` 加载期调用，**经真机验证为无效改动**（证伪假设），可按需回退。
- 已构建可复现包：`1.7.65`（内含 detail 诊断改动）。

---

## 七、相关参考

- 本仓库既有结论：
  - `docs/media-query逗号不兼容手环9.md` —— 手环 9 识别为 `pill-shaped`、逗号媒体查询失效的实测依据。
  - `docs/真机测试-编辑课程黑屏重启分析.md` —— 早前分析（当时判定「CSS 非根因」，现已被本次真机二分修正）。
- 排查方法复用：见第五节二分法。