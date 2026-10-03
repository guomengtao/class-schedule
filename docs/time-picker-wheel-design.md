# 时间选择器 Demo 方案（上下滑动滚轮）

> 需求：在「设置 → 工具」栏目加入一个 Demo 入口；进入后页面展示当前时间，
> 点击时间弹出**全屏**的上下滑动选择器，小时 / 分钟各一列滚轮，手指上下滑动快捷选择，确认后回填。

## 1. 入口与路由
- 工具页 `pages/tools/tools.ux` 新增一行「时间选择器 Demo」，点击 `router.push('/pages/time-picker-demo')`。
- 新页面 `pages/time-picker-demo/time-picker-demo.ux` 需在 `src/manifest.json` 的 `router.pages` 注册。

## 2. 交互
- 页面主体：大号显示已选时间 `HH:mm`，下方按钮「选择时间」。
- 点击 → 全屏覆盖层（`position: absolute` 占满，`rgba(0,0,0,.5)` 遮罩）。
- 覆盖层内：标题 + 滚轮区（小时列 / 分钟列并排）+ 底部「取消 / 确认」。

## 3. 滚轮实现（鸿蒙 ArkUI FA 模型，无原生 WheelPicker，自绘）
- 每列用 `<scroll scroll-y>` 竖向滚动，内部列表 0–23 / 0–59，每项固定高 `ITEM_H = 56px`。
- 列表顶部 / 底部各加一块高度为 `(视口高 - ITEM_H)/2` 的空白 spacer，使首末项也能滚到正中。
- 视口高 = 5 项（280px），中央高亮带为绝对定位的 `56px` 横条，落在视口正中。
- 初始位置：`scrolltop` 绑定 `SPACER + 当前值*ITEM_H`，打开即定位到当前时间。
- 滚动中：`@scroll` 事件拿 `e.scrollY`，`index = clamp(round((scrollY - SPACER)/ITEM_H), 0, 最大值)`，实时更新临时选中值并显示在滚轮上方预览。
- 确认：`selected = 临时值`，关闭覆盖层；取消：丢弃临时值。

## 4. 视觉
- 复用 `store.getTheme()` 主题（深色 `bg/card/accent/text`），与设置 / 工具页一致。
- 高亮带用 `accent` 半透明底；选中数字用 `accent` 加粗，未选中用 `textMuted`。
- 适配 `shape: pill-shaped` / `circle`：滚轮视口高度按屏型降档，字号同步。

## 5. 边界
- 小时 0–23、分钟 0–59；滑动越界自动 clamp。
- 不依赖任何手机端能力，纯手环本地选择，结果为字符串 `HH:mm`，后续可被课程时间等场景复用。

## 6. 验收
- 工具页出现入口；进入后点击时间弹出全屏滚动选择；上下滑动小时 / 分钟实时联动；确认后时间更新；App(EiOS/真机) 与 EvOps 任务页无关，仅本 Demo 自测。
