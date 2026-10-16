# 启动欢迎页

> 路由：`pages/welcome` ｜ 源码：`src/pages/welcome/welcome.ux`（约 280 行）

## 1. 页面职责

应用启动后的首个落地页，承担「去向分流」：进入课表、打开课表盘、进设置或直接退出。同时展示版本号，是低端设备冷启动后唯一必定渲染的页面。

## 2. 界面结构

- 品牌/版本区：展示应用名与 versionName
- 主操作：进入课程表（enterSchedule）
- 次操作：打开课表盘（openSchedulePanel）、进入设置（openSettings）
- 退出：exitApp

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `onInit` | 读取设备宽高（width/height）与 theme，为后续布局定基调 |
| `enterSchedule` | 跳转课程表主页 |
| `openSchedulePanel` | 跳转课表盘相关页 |
| `openSettings` | 跳转设置页 |
| `exitApp` | 退出应用 |
| `onBackPress` | 返回键拦截，避免误退出 |

## 4. 主要数据字段

- `targetPage`
- `versionName`
- `theme`
- `width`
- `height`

## 5. 注意事项

- 启动时不要做重 IO：本页是冷启动第一屏，卡在这里会被用户感知为「白屏」
- width/height 需兼容胶囊屏（圆屏/方屏）两种形态
