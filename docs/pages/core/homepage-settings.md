# 首页设置

> 路由：`pages/homepage-settings` ｜ 源码：`src/pages/homepage-settings/homepage-settings.ux`（约 707 行）

## 1. 页面职责

定制首页显示哪些模块：日期导航（总/明/今）开关、固定栏、字号、自定义内容。多数高级项需 Pro。

## 2. 界面结构

- 日期导航开关：showDayNavZong / showDayNavMing / showDayNavJin
- 固定栏开关：showPinnedBar
- 字号：showFontSize / increaseFont / decreaseFont
- 自定义内容：showCustomContent / customContent / openCustomContentEdit
- 固定页管理：openPinnedPages
- Pro 门禁：requirePremium / goToPremium / checkAndShowOverlay

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `loadSettings` | 载入首页偏好 |
| `saveSettings` | 保存偏好 |
| `openCustomContentEdit` | 编辑自定义文案 |
| `openPinnedPages` | 管理固定页 |
| `requirePremium` | 高级功能权限校验 |
| `checkAndShowOverlay` | 需要 Pro 时展示遮罩 |
| `increaseFont / decreaseFont` | 首页字号 |

## 4. 主要数据字段

- `showDayNavZong`
- `showDayNavMing`
- `showDayNavJin`
- `showPinnedBar`
- `showFontSize`
- `showCustomContent`
- `customContent`
- `displaySize`

## 5. 注意事项

- 设置变更后需触发首页重新渲染（index 页 loadHomepageSettings 会读这些字段）
- 自定义内容为空时的占位文案要处理，不能显示 undefined
