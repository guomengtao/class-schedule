# 留言板

> 路由：`pages/message-inbox` ｜ 源码：`src/pages/message-inbox/message-inbox.ux`（约 926 行）

## 1. 页面职责

应用内留言收发：消息列表、快捷短语（可滑动切换/管理）、发送、对方输入态、手机端状态展示。

## 2. 界面结构

- 消息列表：messages（expandedIdx 控制展开）
- 快捷短语：phrases / phraseIdx / onPhraseSwipe / persistPhrases
- 发送：doSend / appendLocal
- 对方状态：peerTyping / peerTypingActive
- 手机端状态：phoneStatus / phoneStatusColor
- 管理模式：manageMode（批量清理 clearAll）

## 3. 核心方法

| 方法 | 说明 |
|---|---|
| `loadMessages` | 载入消息 |
| `doSend` | 发送消息 |
| `appendLocal` | 本地先追加（乐观更新） |
| `loadPhrases / persistPhrases` | 快捷短语读写 |
| `onPhraseSwipe` | 滑动切换短语 |
| `checkPendingReply` | 轮询待回复 |
| `checkPhraseEdit` | 短语编辑态检查 |
| `clearAll` | 清空消息 |

## 4. 主要数据字段

- `messages`
- `phrases`
- `phraseIdx`
- `expandedIdx`
- `manageMode`
- `peerTyping`
- `peerTypingActive`
- `phoneStatus`
- `phoneStatusColor`

## 5. 注意事项

- 有轮询（checkPendingReply）：onHide/onDestroy 必须停掉，否则后台耗电
- swiper 与列表滚动在手环上易冲突，滑动手势要分别验证
