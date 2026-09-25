# 第二轮结果：A~E 全部通过、F 卡住 —— 五个单项嫌疑全部排除

> 日期：2026-09-25
> 实测结果：**A ✅ / B ✅ / C ✅ / D ✅ / E ✅ / F（完整 pill 键盘）❌ 卡住**
> 结论性质：这是本轮**最有价值的负面证据** —— 它一次性排除了五个单项假设，把范围推向「组合 / 组件机制 / A~E 未覆盖的节点」。

---

## 一、这条结果排除了什么

| 项 | 构造内容 | 结果 | 结论 |
|:---:|---|:---:|---|
| A | 26 个纯文本（无尺寸/边框/圆角/背景） | ✅ 通过 | 节点数量不是问题 |
| B | 26 个按键，复刻 `.calbtn66`（60×60 + `border:3px` + `border-radius:30px`） | ✅ 通过 | **`border` + `border-radius` 不是元凶** |
| C | 横向 `<scroll scroll-x>` 容器 | ✅ 通过 | **`scroll-x` 不是元凶** |
| D | 8 张 `arc/` PNG 图片 | ✅ 通过 | **PNG 图片不是元凶** |
| E | 3 层 `position:absolute` 堆叠 | ✅ 通过 | **绝对定位本身不是元凶** |
| **F** | **完整 pill 键盘（真实组件）** | **❌ 卡住** | 问题在「组合 / 组件机制」 |

### ⚠️ 重要副产物：极简重写方案被证伪

我此前提出的"极简重写"（去掉全部 PNG、去掉描边圆角、去掉绝对定位、候选行不用 scroll、高度自适应）—— **即使当时执行了，也不会解决问题**，因为被去掉的每一项都已单独证明无害。

**当时决定回滚是正确的判断**：既避免了影响所有跑道屏用户的界面，也避免了一次无效改动。

---

## 二、F 与 A~E 的本质差异（差异点 = 嫌疑点）

A~E 是**在诊断页里直接构造的静态 DOM**；F 是**引入真实组件**。差异如下：

| 差异维度 | A~E | F（组件） |
|---|:---:|:---:|
| 渲染主体 | 页面内 `<div>` / `<text>` | 组件内部模板（200+ 节点） |
| **根节点定位** | 普通流式 / `position: relative` | **`position:absolute; left:0; bottom:0`** |
| `onInit` 逻辑 | 无 | 解析 maxlength、`cvalList` 循环 |
| **`device.getInfo`** | 页面 onInit 调 1 次 | 组件 `onInit` 里**又调 1 次**（`adjustScreenWidth`） |
| `$watch` | 无 | 注册 4 个 |
| 额外节点 | 无 | **`cvalrow-wrap`**、候选行、功能键行 |
| 数据来源 | 页面私有 `keyRows` | 组件 `data.keys`（`full` / `sign` / `sign_jp` 三套） |
| 父容器 | 各自普通 div | **放在 `<scroll>` 内** |

---

## 三、修订后的根因优先级

### R1（最可疑）：组件根 `position:absolute; bottom:0` 与父级 `<scroll>` 的组合

组件根节点的定义：

```html
  <div class="page" style="flex-direction: column; height: {{hide ? '0px' : 'auto'}}; overflow: {{hide ? 'hidden' : 'visible'}};">
```

```css
.page {
	width:100%;
	position:absolute;
	left:0;
	bottom:0
}
```

而它被放进 `<scroll>` 里 —— 诊断页如此，真实输入页 `src/pages/chinese-input/chinese-input.ux` 也如此：

```32:43:src/pages/chinese-input/chinese-input.ux
    <!-- 键盘区：下展面板已移除，不再存在「scroll 套 list」的嵌套滚动冲突，恢复原有 scroll 包裹 -->
    <scroll class="keyboard-scroll" scroll-y="true">
      <input-method
        hide="{{ keyboardHidden }}"
        ...
      ></input-method>
    </scroll>
```

**为什么这条最吻合**：
- **A~E 全部使用普通流式布局，唯独 F 用了「绝对定位根 + scroll 父级」**；
- 绝对定位元素不参与父级 scroll 的内容高度计算，`bottom:0` 会把溢出部分推向可视区**上方**（而不是下方），表现为"出不来/卡住"；
- 这正是我在第一轮分析中标记过的"结构性放大项"（当时被更高的嫌疑盖过，现在其余嫌疑全被排除，它浮到第一位）。

### R2：组合负载

26 个按键 + 8 张 PNG + 2 个 `scroll` + 候选行 + 功能行**同屏**渲染。A~E 每项只加载其中**一份**，F 是全部叠加。弱设备上可能渲染超时/卡死。

### R3：`adjustScreenWidth()` 在 `onInit` 触发第二次 `device.getInfo`

组件 `onInit` 中：

```javascript
    if (this.screentype === "rect" || this.screentype === "pill-shaped") {
      this.adjustScreenWidth();
    }
```

而 A~E 完全没有这一步。虽然诊断页自己也调过一次 `device.getInfo` 并正常，但"同帧第二次调用 + 随后立刻渲染键盘"的组合值得怀疑。

### R4：`cvalrow-wrap` 等"组件独有节点"
`<div if="{{screentype !== 'circle'}}" class="cvalrow-wrap">` 在 pill 屏上**必然存在于 DOM**（`if` 只是条件，节点会创建）。

### R5：`$watch` 机制（4 个 watch 注册）

---

## 四、为什么 10 Pro 没事

| 维度 | 手环 9（pill） | 10 Pro（rect） |
|---|:---:|:---:|
| 键盘分支高度 | **305px** | **255px** |
| 屏幕高度 | 490 | 480 |
| 绝对定位根 + scroll 父级 | 同样存在 | 同样存在 |
| 结果 | **卡住** | 正常 |

**结构相同、结果不同** → 说明这是一个**临界型问题**（高度 / 负载 / 时序），而不是"某个元素必然崩"。这也解释了为什么它只在部分设备复现、且难用静态阅读定位。

pill 分支的键盘比 rect 高 50px，且多一条 28px 拼音行 —— 在 490 高的屏上，可用空间本就紧张（第一轮算过：可用约 292px，pill 需要约 333px）。

---

## 五、下一步：两条路

### 路线 1：继续细分 F（再测一轮，成本高）

| 编号 | 变体 | 判读 |
|:---:|---|---|
| F1 | 组件 `screentype="circle"`（走圆屏分支） | 也卡 → 与分支无关，是组件机制；正常 → pill 分支特有 |
| F2 | 组件 `screentype="rect"` | 正常 → 反证问题在 pill 分支 |
| F3 | pill 分支去掉候选行/功能行（只留键盘 scroll） | 正常 → 组合负载是主因 |
| F4 | 暂时注释掉 `adjustScreenWidth()` | 正常 → R3 成立 |
| F5 | **组件根改普通流式（去掉 absolute）** | **正常 → R1 直接坐实** |

### 路线 2（推荐）：直接做最小修复 + 验证

**核心思路**：既然唯一与现象吻合的差异是"组件根的绝对定位 + scroll 父级"，就只动这一个点，**其余一律不碰**（键盘外观、PNG、圆角、滚动全保留）。

**改法 A（最保守，一行 CSS）**：给父容器加定位上下文

```css
/* chinese-input.ux 与诊断页的宿主容器 */
.keyboard-scroll { position: relative; }
```

让组件根的 `bottom: 0` 有正确参照物，而不是落在外层 scroll 的内容区。

**改法 B（推荐，改动仍小且只影响跑道屏）**：组件根**按屏型动态定位**

```html
  <div class="page" style="flex-direction: column; position: {{screentype === 'pill-shaped' ? 'relative' : 'absolute'}}; height: {{hide ? '0px' : 'auto'}}; overflow: {{hide ? 'hidden' : 'visible'}};">
```

- 跑道屏（pill）→ 普通流式占位，彻底摆脱 scroll 里的绝对定位问题；
- **方屏（rect）/ 圆屏（circle）完全不受影响**（10 Pro 零风险）；
- 视觉影响：pill 键盘在页面流中由内容撑高（约 333px），与现状基本一致。

**验证方式**：改完让用户跑第二轮，看 F 项是否通过。若通过，再打开真实输入页确认端到端可用。

---

## 六、结论

1. **A~E 全过 = 五个单项嫌疑全部无罪**；"极简重写"方案被证伪（幸好当时回滚，既没白改也没影响用户界面）。
2. 元凶收敛到「**组件机制 / 组合负载**」这一类，其中 **`position:absolute; bottom:0` 根节点 + `<scroll>` 父级** 是与现象最吻合、且改动最小的突破点。
3. 建议按**改法 B** 做一次最小修复（只影响跑道屏），让用户验证 F 项。
4. 若改法 B 无效，再走路线 1 的 F1~F5 逐项细分 —— 但那时改法 B 已被排除，可进一步锁定 R2（组合负载）或 R3（二次 `device.getInfo`）。

---

## 七、已应用修复（改法 B，2026-09-25）

按用户确认，已落地**改法 B**，改动只有两处，全部**只影响跑道屏**：

### 7.1 组件根节点按屏型切换定位

`src/components/InputMethod/InputMethod.ux` 模板根节点：

```html
  <div class="page" style="flex-direction: column; position: {{screentype === 'pill-shaped' ? 'relative' : 'absolute'}}; height: {{hide ? '0px' : 'auto'}}; overflow: {{hide ? 'hidden' : 'visible'}};">
```

- **pill-shaped → `position: relative`**：走普通流式，彻底摆脱"绝对定位根 + 父级 scroll"的组合问题；
- **rect / circle → `position: absolute`**：保持原行为，**方屏（10 Pro）与圆屏视觉零变化**；
- CSS `.page` 里的 `position:absolute; left:0; bottom:0` 保留作非胶囊屏默认值；`left/bottom` 对 `relative` 元素为偏移 0，无副作用（已加注释说明）。

### 7.2 诊断页宿主容器改为自适应高度

两个诊断页的 `.ime-host`：`height: 305px` → **`min-height: 305px`**，让组件走普通流式时按内容撑开，不被固定高度裁剪。

### 7.3 预期效果与验证

- **预期**：pill 键盘在页面流中由内容撑高（约 333px），scroll 容器内容高度不再为 0 → 键盘可见，且可正常上下滚动；
- **顺带改善**：原先绝对定位贴底时，溢出部分可能被推到可视区**上方**且无法滚动；改为流式后内容高度正常，可滚动查看完整键盘；
- **验证方式**：用户跑一次第二轮，看 **F 项是否通过**；通过后再打开真实输入页（从设置 → 昵称）确认端到端可用。
- **回滚**：`git checkout HEAD~1 -- src/components/InputMethod/InputMethod.ux`（一行定位表达式，回滚成本极低）
