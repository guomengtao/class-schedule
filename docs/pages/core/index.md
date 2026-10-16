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
