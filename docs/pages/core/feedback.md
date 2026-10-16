# 反馈

> 路由：`pages/feedback` ｜ 源码：`src/pages/feedback/feedback.ux`（约 362 行）

## 1. 页面职责

提交用户反馈：拼装带设备型号与应用版本的反馈链接，支持复制交流群号。

## 2. 界面结构

- 反馈入口：feedbackUrl / feedbackUrlShort（长短链）
- 复制群号：copyGroup
- 上下文：deviceModel、versionName、channel

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `buildUrl` | 拼装带设备/版本参数的反馈链接 |
| `copyGroup` | 复制交流群号到剪贴板 |

## 4. 主要数据字段

- `feedbackUrl`
- `feedbackUrlShort`
- `channel`
- `deviceModel`
- `versionName`

## 5. 注意事项

- 长链在手环上无法完整展示，需提供短链 feedbackUrlShort
- 复制失败要有 toast 提示，否则用户以为没点上
