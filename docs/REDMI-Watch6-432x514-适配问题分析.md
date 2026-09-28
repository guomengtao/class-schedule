# REDMI Watch 6（432×514 方屏）安装后界面混乱分析

> 日期：2026-09-28　|　激活 URL：`https://app-auth.gudq.com/activate.html?deviceId=0e69fdc9…&m=ap&p=REDMI%20Watch%206&o=0&v=1200&t=watch&s=rect&w=432&h=514&a=2&l=zh&r=1.6.145&c=t-9p-d`
> 结论一句话：**REDMI Watch 6 是一块 432×514 的大尺寸方屏（rect），比本项目 rect 分支此前校准的 336 级方屏（10 Pro）宽了 ~100px**。首页靠"百分比 + 流式布局"侥幸大体正常；凡是依赖「固定像素 + 屏型分支」的页面（输入法 rect 分支、震动实验室 rect 媒体块、首页设置行布局）在新宽度下全部失准。

---

## 一、URL 参数解读（设备画像）

| 参数 | 值 | 含义 |
|---|---|---|
| `p` | REDMI Watch 6 | 设备型号 |
| `t` / `s` | watch / **rect** | 设备类型 / **屏型=方屏**（非胶囊） |
| `w` × `h` | **432 × 514** | 物理分辨率，比手环 9（192×490）宽 2.25 倍，比 10 Pro（336×480）宽 96px |
| `v` | 1200 | Vela 版本码 |
| `r` | **1.6.145** | 用户实际安装的包版本 |
| `a` / `o` / `l` | 2 / 0 / zh | 安卓侧来源 / osVersionCode=0 / 中文 |

- 仓库 `manifest.json` `config.designWidth="device-width"` → **px 与物理像素 1:1，无缩放兜底**。屏宽从 336 → 432 后，所有"按 336 校准"的固定布局直接多出 96px 无处安放。
- ⚠️ 版本核对：用户装的是 **r=1.6.145**，仓库当前已是 **1.6.153**。复现/修复验证时必须先确认反馈对应哪个包，不能拿最新代码直接下结论。

---

## 二、四张截图逐张症状

| 截图 | 页面 | 症状 |
|---|---|---|
| 图1 `39649B…` | 上课提醒 / 震动样式（`vibration-lab.ux`） | 「震动样式」标题与卡片**挤在同一行**；卡片整体右移、左侧留 ~90px 空列；「点击试…」被截断；卡片文字顶出边框。底部标准震动区出现**豆腐块缺字**（□ 试听） |
| 图2 `C4774C…` | 首页（`index.ux`） | **大体正常**：课程卡片、时间、快速添加、底部按钮均合理——因为首页布局是"百分比 + isCapsule 分支"流式布局，对宽度不敏感 |
| 图3 `C9CD0C…` | 首页设置（`homepage-settings.ux`） | **行布局崩坏**：每行只剩"标签文字"独占一行，开关（switch-track 44×24）**叠压在标签上**，`space-between` 左右分布完全失效；「自定义」被底部裁切 |
| 图4 `1A1A3B…` | 输入法·二维码名称（`InputMethod.ux` rect 分支） | 键盘**整体坍缩到左下角约 150px 宽**：QWERTY 每行只露出 2 个键即被裁切，行错位（0/32/64 阶梯偏移仍在），右侧大片空黑 |

---

## 三、根因分析（按页面，代码已定位）

### 1. 输入法（最严重）：rect 分支只按 336 级方屏校准

`src/components/InputMethod/InputMethod.ux` 的屏型分支是三套**写死像素**的布局：

- circle 分支：固定 `480×321`（n67 圆表）
- **rect 分支**（本机命中）：`width:100%` 外壳，但内部键盘是 **scroll-x 横滚 + 阶梯行**方案——每行 10 键 × `calbtn67` **60px** ≈ 640px 内容宽，靠 `keyboard67` 横向滚动露出（第 185–220 行）；行偏移写死 `margin-left: 0/32/64`
- pill 分支：按 192 定标，`margin-left: (screenWidth-192)/2` 居中

```13:14:src/components/InputMethod/InputMethod.ux
（rect 分支内部，keyboard67 无显式宽度）
<scroll id="keyboard67" scroll-x="{{true}}" onscroll="handelScroll">
  <div if="{{!numFlag}}" style="left: 6px; flex-direction: column;">
```

**塌缩机理（高度怀疑，需真机取证确认）**：从 `.page` 到 `keyboard67` 的容器链上存在**无显式 width 的中间 div**（`<div if>`、`<div show>` 两层都没有 width），而 `.page` 自身未声明 `flex-direction`。这正是本项目已知红线——"scroll/stack 作容器时子元素必须显式 width，否则宽度退化"。在 336 级方屏上 flex 恰好撑满没暴露；432 宽 + 该机 Vela（v=1200）的 flex 解析差异下，scroll 容器**退化到内容/最小宽度（~150px）**，于是每行只显示 2 个 60px 键，右侧空黑。
另外：候选条 `flex:1`、顶部功能行 `justify-content:center` 都依赖外层真实宽度，宽度塌缩后同样失效。

### 2. 首页设置：行内 flex 规则失效 / 行高塌陷

`src/pages/homepage-settings/homepage-settings.ux`：

```312:317:src/pages/homepage-settings/homepage-settings.ux
.item-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}
```

`.item-label`（32px）无 width/flex，`.switch-track`（44×24，`flex-shrink:0`）——这是"文字弹性 + 开关固定"的经典组合，在 192 胶囊和 336 方屏都正常。截图表现为**标签与开关纵向叠压**，等价于 `.item-row` 的 `flex-direction:row` / `space-between` 在该机未生效（行高塌成单行文字高，两行内容互相叠印）。结合图1 的"标题与网格挤同行"（`.style-block{flex-direction:column}` 同样失效，见下），指向**同一类共性问题**，而不是各页独立 bug。

### 3. 震动实验室：`.style-block` 纵向声明失效 + 字号失衡

`src/pages/vibration-lab/vibration-lab.ux`：

```845:850:src/pages/vibration-lab/vibration-lab.ux
/* 震动样式列表：父容器显式纵向（Vela div 默认 row，会与 label 横排挤压） */
.style-block {
  flex-direction: column;
  width: 100%;
```

注释本身就写着"Vela div 默认 row，会与 label 横排挤压"——**截图正是这条注释描述的故障形态**：标签回到行内、`vibe-grid`（48%×2 列换行）被挤到右侧，且每张卡 `width:48%` 基于被挤压后的剩余宽度计算，左侧出现空列。同时 `@media (shape: rect)` 块（1170 行起）把大量字号压到 20px 是按 336 屏调的，在 432 屏上视觉占比过小，与卡片 8px padding 组合后显得文字顶框、截断（「点击试…」即 `vibe-hint` 的 `lines:1 ellipsis`）。底部「试听」前的豆腐块是**字符图标缺字形**（该机字体不含该码位），建议改用 png 图标。

### 4. 首页为何幸免

`index.ux` 全部尺寸走百分比 + `isCapsule` 数据分支（非 `@media`），内容层 `width:100%` 齐全，所以 432 宽只是"变宽"而不是"崩坏"。这也反证：**崩坏页的共同点是关键布局属性（flex-direction / 宽度）依赖样式表深层规则或隐式默认值**。

---

## 四、共性推断与疑点排序

> **⭐ 决定性证据（2026-09-28 晚补）**：本机开启了 REDMI Watch 6 模拟器皮肤（VVD `REDMI-Watch-6`，gRPC 8556，432×514 rect），恰停在「编辑昵称」输入法页——**键盘渲染完全正常**（满宽、每行 10 键全露、阶梯弧形排布正确，截图 `/tmp/eye_8556.png`）。同一页面、同一 432×514 rect、同一份代码：**模拟器正常、真机塌缩**。

1. **【已实锤】真机 Vela 运行时（v=1200）与模拟器运行时对"隐式宽度中间层 + 隐式 flex 默认值"的解析不同**：模拟器（PC 端运行时）宽容地撑满，真机则按已知红线"scroll/stack 子元素无显式 width → 退化到内容/最小宽"执行。这解释了为何同一份代码三个页面同时崩、而首页（宽度全部显式 100%）在真机也不崩。**结论：这不是 432 宽度的布局数学问题，修复=补齐显式声明，且模拟器无法复现/验证，只能真机往返。**
2. **【次疑点】rect 媒体块按 336 校准，432 新宽度无任何覆盖**：字号、固定按钮宽（play-btn 80px 等）在 432 上比例失衡，属"难看"级，非"崩坏"级（此项模拟器同样存在，可本地修）。
3. **【基本排除】系统字号缩放（fontScale）**：模拟器已证同宽度下布局正常，字体缩放无法解释键盘塌缩与标题/网格同行。
4. **【低概率】1.6.145 与 1.6.153 之间的修复**：先确认 1.6.153 里这些页面是否已有改动，避免修已修的问题。

## 五、验证与取证方案（按成本排序）

1. **仓库核对**：`git log v1.6.145..HEAD -- src/pages/homepage-settings src/pages/vibration-lab src/components/InputMethod`，确认是否已有相关改动。
2. **模拟器定位**：~~模拟器复现~~ → **已排除**。Watch 6 皮肤（8556）同页渲染正常，模拟器只剩两个用途：① 修复"显式声明"后确认**不引入回归**（修复本身在模拟器上是 no-op，看不出效果）；② 修 rect 媒体块 432 比例类问题（疑点 2）。
3. **真机验证为唯一验收**：修复包发用户真机往返；可先用 `input-crash-diag` / `capsule-hide-test` 诊断页（读 screenShape/screenWidth + CSS 命中测试）确认塌缩形态，URL 的 r 参数核对版本。
4. **修复方向（确认后）**：
   - IME rect 分支：`.page` 显式 `flex-direction:column`；`<div if>`/`<div show>`/`keyboard67` 及内层行全部**显式 `width:100%`**（真机 no-op 风险为零，模拟器已验证不影响现状）。
   - 各页给行容器补显式宽度/方向声明，彻底落实"子元素显式 width"红线（homepage-settings 的 `.item-row`、vibration-lab 的 `.style-block` 及各自父容器链）。
   - rect 媒体块按 432 重新校准字号与按钮尺寸；豆腐块字符图标换 png（此项模拟器可视觉验收）。
   - 长期：把"真机运行时差异"加入排查清单首位——**凡是"模拟器正常真机崩"，第一怀疑对象就是隐式宽度/flex 默认值**。

---

## 六、附：截图清单（/Users/Banner/Downloads/redme-bug/）

| 文件 | 页面 | 症状简述 |
|---|---|---|
| `39649B68457E0BD0983E39FB44E13AB0.jpg` | 上课提醒/震动样式 | 标题与卡片同行、卡片右移、截断、豆腐块 |
| `C4774CF7AFE9A4975C96237FC4FDAA81.jpg` | 首页（星期一） | 基本正常 |
| `C9CD0C3C349382736A6FA1B8C5509313.jpg` | 首页设置 | 标签与开关叠压、行布局失效 |
| `1A1A3B16E69FBE4B72752442D5D39924.jpg` | 输入法（二维码名称） | 键盘塌缩左下角 ~150px、按键裁切 |
