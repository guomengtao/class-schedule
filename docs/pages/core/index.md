# 首页（课程表主页）

> 路由：`pages/index` ｜ 源码：`src/pages/index/index.ux`（约 1750 行）

## 1. 页面职责

全应用的核心页：按当天课表渲染当日课程，支持自定义内容、字号缩放、首页模板、模块初始化，并提供去周课表/明天/作息信息的入口。页面最大，逻辑最重。

## 2. 界面结构

- 日期/星期标题区：currentDateStr、dayDisplayText
- 当日课程列表：currentClasses
- 自定义内容区：customContent（首页可挂自定义文案）
- 导航入口：周课表 goToWeekView、明天 goToTomorrow、作息信息 goToWorkdayInfo

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `loadScheduleData` | 载入当前课表数据 |
| `loadHomepageSettings` | 载入首页显示偏好 |
| `loadFontScale` | 读取字号缩放比例 |
| `applyHomepageTemplate` | 套用首页模板样式 |
| `computeFontSizes` | 按屏幕尺寸计算各区域字号 |
| `applyFontSizes` | 把计算结果落到样式 |
| `initAllModules` | 逐模块初始化（模块故障互不影响） |
| `initOneModule` | 单个模块初始化 |
| `goToWeekView` | 跳周课表 |
| `goToTomorrow` | 切到明天 |
| `goToWorkdayInfo` | 跳作息信息 |
| `goBack / onBackPress` | 返回处理 |

## 4. 主要数据字段

- `currentClasses`
- `currentDateStr`
- `currentDay`
- `currentDayIndex`
- `currentScheduleName`
- `customContent`
- `dayTitleColor`
- `dayTitleSize`
- `displaySize`

## 5. 注意事项

- 1750 行的大页面，任何初始化异常都要 try 住——initOneModule 的设计就是防止单点崩溃连累整页
- 字号与布局需同时兼顾胶囊屏与方屏；改动前先跑真机

## 6. 胶囊屏提醒条（status-bar）宽度账（2026-11-03 去图标定稿）

单行结构：`剩余时间 + 课程名`（2026-11-03 起不再有状态灯图标），实测值（192×490，v1.9.106）：

| 段 | 尺寸 | 说明 |
|---|---|---|
| 页面横向 padding | 12 | ev-six 口径：内容宽 168（原 16 → 只剩 160） |
| 条内距 | 6 | 条高 26 + 12 = 38px |
| 时间「36m」 | 38 | 18px |
| 时间后间距 | 4 | |
| **课程名实得** | **114** | 18px 粗体，可完整放 5 汉字（实测「机械设计制…」） |

**为什么去掉状态灯（原 16px + 4px 间距 = 20px）**

1. 那 20px 占提醒条 13% 宽度，只为表达 now / soon / holiday 三种状态；而这层语义已由倒计时文案与课程卡底色承载，属于纯装饰位。
2. 移走后课名从「必保 4 字」升级为「必保 4 字 + 多数情况 5 字」：18px 下 4 字需 90 ≤ 114 稳定；5 字需 108 ≤ 114，仅当倒计时是 3 字符（「36m」）时成立；倒计时长到「1h36m」（约 57px）时课名剩 95px，退化为 4 字。
3. **不要给方屏补图标**：方屏走的是 `status-tag` 文字标签（上课中/即将上课），语义更强；212px 宽下 tag 约 84 + 图标 24 会把课名压到 88px，反而更早截断。

三条硬约束（都实测踩过）：

1. **Vela 的 `text-overflow: ellipsis` 会预留一个字宽再决定是否截断**。实测盒宽 76px、字号 20px 时只放 2 字就出省略号（「机械…」）。「能放几个字」的公式是 `(盒宽 − 1字) / 1字`，不是 `盒宽 / 1字`。
2. **课名字号固定 18px，不要调回 20**：20px 下 4 字需 4×20+20 = 100，倒计时一变长（114−57−4 = 53……）就必然截断。
3. 超过 5 字（演示数据「机械设计制造及其自动化」11 字）仍走省略号——单行物理装不下，属预期；要完整显示只能拆两行（条高 38→64，列表少一行）。

## 7. 手势与「右划退出」（2026-11-02 定稿）

首页有三个手势，全部与列表纵向滚动正交（实现见 `modules/gesture.js`）：左滑→总课表、右滑→退出应用、下拉→回今天（限顶栏起手）。

### 7.1 为什么列表区右划曾经退不出去

`<scroll class="class-list">` 与每张 `.class-grid-item` 都挂了 `onswipe="onCardSwipe"`（左滑进总课表用的第二条通道）。一旦挂上，**这块区域的滑动就交给 JS 手势通道，系统返回手势不再触发**；而 `onCardSwipe` 当时只处理 `left`，于是列表区右划成了死手势。顶栏与底部没有 scroll，系统手势照常 → 用户看到的就是「上面下面能退出，中间列表退不出去」。

### 7.2 现在的做法（两条通道都补，缺一不可）

| 通道 | 触发条件 | 处理 |
|---|---|---|
| `onCardSwipe`（onswipe） | 列表区 / 卡片上的快速滑动 | `direction === 'right'` → `backOnce()` |
| 根节点 touch | 触摸流能冒泡上来的区域 | `dx >= 34` 且横向主导 → `backOnce()` |

`backOnce()` 做的事与系统返回**完全同一语义链**：先调页面 `onBackPress()`（成功才 `return true`，内含 `utils.exitApp()` 的 exit/terminate/finish 三入口探测）；退出入口不可用时退回 `router.back()`。700ms 内只处理第一次，避免卡片 + scroll 各报一次导致重复执行。

### 7.3 两条红线

1. **不能撤 `onswipe` 绑定**。撤了左滑又只剩根 touch，回到「只有某一块能滑进去」的老问题——左右两条方向必须在同一条通道里处理完。
2. **右滑处理必须复用 `onBackPress` 语义**，不要自己写 `app.exit()`：`docs/cannot-exit-analysis.md` §7.1 记的就是「返回键被消费但什么也没做，用户主观感受是退不出去」。

## 8. 四向手势与触觉反馈（2026-11-03 定稿 · v1.9.106）

### 8.1 四向总表

| 方向 | 起手区 | 动作 | 通道 |
|---|---|---|---|
| 左滑 | 全屏（排除快速添加横向滚动区 `onHScrollStart`） | 总课表 `/pages/week-view` | 根 touch + `onCardSwipe` |
| 右滑 | 全屏 | 退出应用（`onBackPress` → `exitApp`） | 根 touch + `onCardSwipe` + `onBottomSwipe` |
| 下拉 | **顶栏区** `y ≤ headLimit`（屏高 20%）＋ 列表在顶部 | 回到今天 | 根 touch |
| 上划 | **底部区** `y ≥ footY`（屏高 80% 处起） | 设置页 `/pages/settings` | 根 touch + `onBottomSwipe` |

阈值：横向 `MIN_DX = 34`（屏宽 18%）、纵向 `MIN_DY = 60`（屏高 12%）、主轴须达次轴 2 倍。
192×490 下 `headLimit = 98`、`footY = 392`；屏幕尺寸由 `device.getInfo` 现算，拿不到时用这两个缺省。

### 8.2 三条实现红线

1. **上下手必须带起手区**。列表占屏高约 78%，纵向手势与「看更多课程」抢同一块语义区——不限定起手，每一次滚动都会先触发导航。顶栏 / 底部两个 20% 是刻意留出的对称带。
2. **任何挂 `onswipe` 的容器都必须同时处理 right**。一旦挂上，这块区域的滑动就从系统手势手里拿走了（§7.1 的教训）；只写自己想加的那个方向，等于把该区域的右划退出变成死手势。底部按钮区（2026-11-03 挂 `onBottomSwipe`）同理。
3. **触觉反馈统一在 `onPageTouchEnd` 的动作执行前震一次**（`buzzOnce()`，300ms 去重，卡片 + 容器双报只震一下）。不要放在 `touchmove` 判定成立处：那时手指还没抬起，震动与跳转错开，感知模糊。

### 8.3 验证边界

模拟器控制台鼠标注入口**无法可靠产生拖拽手势**（`_console_drag` 的滑动会被塌成点击或被静默丢弃），四向手势只能在真机手动复核。模拟器只用于验收静态排版（提醒条宽度、间距、截断）。
