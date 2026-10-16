# 打赏支持

> 路由：`pages/donate` ｜ 源码：`src/pages/donate/donate.ux`（约 344 行）

## 1. 页面职责

展示赞助渠道与收款二维码，二维码尺寸按屏幕自适应。纯展示页，无业务逻辑。

## 2. 界面结构

- 平台列表：platforms（各赞助渠道）
- 二维码：qrSize / calcQrSize / computeQrSize
- 说明文案：lines

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `calcQrSize` | 按屏宽计算二维码尺寸 |
| `computeQrSize` | 尺寸兜底裁剪 |
| `onShow` | 刷新展示 |

## 4. 主要数据字段

- `platforms`
- `qrSize`
- `lines`
- `iconTheme`

## 5. 注意事项

- 二维码过小会扫不出来：calcQrSize 需保证最小可扫尺寸
- 胶囊屏上注意二维码不要被圆角裁切
