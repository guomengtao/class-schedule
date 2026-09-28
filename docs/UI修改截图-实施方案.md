# UI 修改截图：实施与自动化方案

> 目标：所有涉及界面变更（字号/布局/样式）的任务，**强制先截"修改前"、改完截"修改后"**，两张截图直接用 macOS `open` 打开展示给开发者肉眼对比。
> 设备：xiaomi_band 192×490，adb `emulator-5554` / gRPC `8554`。

---

## 一、核心流程（每次 UI 修改必须走这 4 步）

```
修改前截图 ──→ 执行代码修改 ──→ 修改后截图 ──→ 肉眼核对清单
(open 展示)     (UX/样式)        (open 展示)     (7 项必查)
```

### Step 1：修改前截图（开始改代码之前）

```bash
# 1. 确认模拟器已启动、在目标页面
# 2. 截图
node scripts/emulator-eye.js shot 8554 before-<功能名>

# 3. 立即打开截图（Preview.app 自动弹出）
open screenshots/before-<功能名>.png
```

**必须和用户确认截图正确**（导航到了对的页面、对的元素在屏幕内）。

### Step 2：修改代码

正常修改 `.ux` / `.less` / `.js` 文件。

### Step 3：修改后截图（验证改动效果）

```bash
# 1. reload 应用、回到同一页面
# 2. 截图
node scripts/emulator-eye.js shot 8554 after-<功能名>

# 3. 打开截图
open screenshots/after-<功能名>.png
```

### Step 4：肉眼核对清单（7 项必查）

| # | 检查项 | 操作 | 历史坑 |
|---|--------|------|--------|
| 1 | **左右对称** | `node scripts/png-measure.js runrow <图> <y>` | 百分比宽度+padding 双算法导致左小右大 |
| 2 | **字号/截断** | 肉眼 + `lines: N` 检查 | 17 字文案写 `lines: 2` 挤成省略号 |
| 3 | **底部安全区** | 肉眼 | 胶囊屏圆弧压住最后一行/按钮 |
| 4 | **热区整行** | 肉眼确认整行可点 | 192px 上只有文字框可点 |
| 5 | **弹窗几何** | 肉眼测左右 padding | 同文件两个 capsule `@media` 块级联不稳定 |
| 6 | **多屏完整性** | `scrollshot` | 滚动到底后最后一段被裁 |
| 7 | **传值正确性** | 肉眼对比首页→编辑页 | detail_day 中英文断裂 |

---

## 二、自动化程度分级

### 级别 0：手动（当前起点）
- 每次 UI 修改时 AI 自己记住规则，主动执行 Step 1-4。
- **无需任何新代码**，纯流程约束。

### 级别 1：脚本封装（可选，10 分钟落地）
新增 `scripts/ui-diff.sh`：
```bash
#!/bin/bash
# 用法: ./scripts/ui-diff.sh <功能名>
# 功能: shot before → 等用户确认 → shot after → 两张一起 open
NAME=$1
PORT=${2:-8554}

echo "=== Step 1: 修改前截图 ==="
node scripts/emulator-eye.js shot $PORT before-$NAME
open screenshots/before-$NAME.png
read -p "截图已打开。确认后按回车开始修改代码..."

echo "=== 修改代码中...（Ctrl+C 停止） ==="
read -p "代码修改完毕、应用已 reload 后按回车截修改后..."

echo "=== Step 3: 修改后截图 ==="
node scripts/emulator-eye.js shot $PORT after-$NAME
open screenshots/after-$NAME.png

echo "=== Step 4: 核对清单 ==="
echo "请肉眼检查以下 7 项："
echo "  [ ] 左右对称"
echo "  [ ] 字号/截断"
echo "  [ ] 底部安全区"
echo "  [ ] 热区整行"
echo "  [ ] 弹窗几何"
echo "  [ ] 多屏完整性"
echo "  [ ] 传值正确性"
echo ""
echo "两张截图:"
echo "  screenshots/before-$NAME.png"
echo "  screenshots/after-$NAME.png"
```

### 级别 2：AI 自动执行（目标态）
AI 在每次检测到 UI 变更任务时自动：
1. 先截 before
2. `open` 展示
3. 等待用户说"可以改了"
4. 执行代码修改
5. 截 after
6. `open` 展示
7. 自动跑 `png-measure.js runrow` 量化左右边距并报告

---

## 三、与现有工具链的关系

| 工具 | 用途 | 在本方案中的角色 |
|------|------|-----------------|
| `emulator-eye.js shot` | 单张截图 | Step 1/3 主力 |
| `emulator-eye.js scrollshot` | 多屏滚动连拍 | 多屏页 before/after |
| `emulator-eye.js flow` | 流程步骤截图 | 流程页 before/after |
| `png-measure.js runrow` | 量化左右边距 | Step 4 第 1 项 |

---

## 四、落地检查清单

- [x] `project_rules.md` 新增第 6 节「UI 修改截图规则」
- [x] 目录更新：6 → UI 修改截图规则，7 → 旧规则问题
- [x] 新建 `scripts/ui-diff.sh`（级别 1 封装脚本）
- [x] `chmod +x scripts/ui-diff.sh`
- [ ] 下次 UI 修改任务时，AI 自动执行 Step 1-4
- [ ] 验证：修改前后截图都能被 `open` 打开，macOS Preview.app 正常显示

---

## 五、常见场景速查

### 场景 A：改字体大小
```bash
node scripts/emulator-eye.js shot 8554 before-font-size
open screenshots/before-font-size.png
# → 用户确认 → 修改 .less 中 font-size → reload →
node scripts/emulator-eye.js shot 8554 after-font-size
open screenshots/after-font-size.png
```

### 场景 B：改布局（padding/margin）
```bash
# 同场景 A，功能名用 before-layout / after-layout
# Step 4 额外跑:
node scripts/png-measure.js runrow screenshots/after-layout.png <y坐标>
```

### 场景 C：多屏页修改
```bash
# before 用 scrollshot 连拍
node scripts/emulator-eye.js scrollshot 8554 before-page 10 500 96 430 175 14
# after 同样连拍
node scripts/emulator-eye.js scrollshot 8554 after-page 10 500 96 430 175 14
open screenshots/before-page-s0.png screenshots/before-page-s1.png
open screenshots/after-page-s0.png screenshots/after-page-s1.png
```