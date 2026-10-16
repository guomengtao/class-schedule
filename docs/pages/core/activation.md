# 高级版激活

> 路由：`pages/activation` ｜ 源码：`src/pages/activation/activation.ux`（约 1117 行）

## 1. 页面职责

激活码核验入口：获取设备 ID/设备信息，输入激活码（格子式键盘），校验并写入授权状态，保留历史记录与备用渠道二维码。

## 2. 界面结构

- 设备信息区：deviceId / deviceIdDisplay / deviceInfoParams
- 激活码输入：cell0~cell16 + cursor，onKeyPress / onDelete / onClear
- 校验：doVerify
- 二维码备用渠道：apkQrText / updateQrText
- 赞助渠道：afdianUrl
- 历史：loadHistory

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `fetchDeviceId` | 获取设备唯一标识 |
| `fetchDeviceInfo` | 获取设备型号等参数 |
| `doVerify` | 提交激活码校验 |
| `onKeyPress / onDelete / onClear` | 键盘输入处理 |
| `onCellClick` | 点击格子定位光标 |
| `loadStatus` | 载入当前授权状态 |
| `loadHistory` | 载入激活历史 |
| `updateQrText` | 生成二维码文本 |
| `_fallbackToLocalUUID` | 设备 ID 取不到时的本地兜底 |

## 4. 主要数据字段

- `deviceId`
- `deviceIdDisplay`
- `deviceInfoParams`
- `cursor`
- `cell0`
- `cell4`
- `cell8`
- `cell12`
- `cell16`
- `afdianUrl`
- `apkQrText`
- `channelParam`

## 5. 注意事项

- 设备 ID 是授权凭证的锚点；_fallbackToLocalUUID 兜底不一致会导致「换环境就要重新激活」
- 激活码校验涉网络，失败要给出可重试提示，不要静默失败
