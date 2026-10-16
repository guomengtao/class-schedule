# 设置

> 路由：`pages/settings` ｜ 源码：`src/pages/settings/settings.ux`（约 1016 行）

## 1. 页面职责

全局设置：主题切换、字号调节、昵称、隐藏周末、关于信息、退出应用。多数偏好在此落库并被其他页面读取。

## 2. 界面结构

- 主题：applyTheme / currentThemeKey / closeThemeDrawer
- 字号：increaseFont / decreaseFont（previewClassSize 预览）
- 昵称：loadNickname
- 隐藏周末：loadHideWeekend
- 关于：showAbout
- 退出：handleExitApp（exitConfirm 二次确认）
- 高级版入口：goToPremium / dismissPremiumDialog
- 回到欢迎页：goToWelcome

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `applyTheme` | 切换并持久化主题 |
| `increaseFont / decreaseFont` | 字号步进，带预览 |
| `loadNickname` | 读取昵称 |
| `loadHideWeekend` | 读取隐藏周末开关 |
| `handleExitApp` | 退出（带确认倒计时 clearExitConfirmTimer） |
| `goToWelcome` | 回欢迎页 |
| `closeThemeDrawer` | 关闭主题抽屉 |

## 4. 主要数据字段

- `currentThemeKey`
- `nickname`
- `hideWeekend`
- `showAbout`
- `exitConfirm`
- `previewClassSize`
- `previewDisplaySize`
- `iconTheme`

## 5. 注意事项

- 子页面：settings/phone-remote（手机远程）、settings/lab（实验功能）
- 主题切换要同步图标主题 iconTheme，否则深色底出现深色图标
