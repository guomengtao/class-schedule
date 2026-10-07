# 代码评审报告：`ev/class-schedule/src/app.ux`（全局层）

**评审人**：代码审查专家 ｜ **日期**：2026-10-07 ｜ **认领**：20261007-232349-40405
**范围**：全量 1175 行（app 启动 + interconnect 同步协议 + 激活校验 + 数据迁移）
**总体评价**：架构意识好——守门人白名单（SYNC_ACCESS）、未知 action 安全忽略、超时兜底回包、回包防重复，都是踩过坑的成熟设计。但存在 **3 个 Critical、3 个 Major**，其中两个直接影响发布包性能与激活安全。

---

## Critical

### C1. `DEBUG = true` 发布包开着（L11）——性能 + 报文泄露
```js
// 注释写着"发布态关闭"，实际是 true：
var DEBUG = true
```
且 `onmessage` 里每条报文都有**不受 DEBUG 保护**的硬编码 `console.log`：`JSON.stringify(Object.keys(raw))`（L943）、`raw.substring(0,120)`（L940）；`syncReply` 每次回包也 `JSON.stringify(payload).substring(0,100)`（L183）。手环上字符串拼接 + 日志 IPC 正是注释里自己写的开销来源；课表、激活回执全进系统日志。
**根因推断**：联调时改 true 忘了还原，且部分日志绕过了 dlog 体系——模式性问题（两套日志纪律并存）。
**正确方案**：
```js
var DEBUG = false   // 发布态；联调临时开
// syncReply / initSyncReceiver 里所有裸 console.log(...) 全部改成 dlog(...)
// 为什么对：单一开关管住全部日志输出，发布包零开销，联调一处打开全量可见
```

### C2. 每条报文无条件落盘 `astrobox_sync_data`（L957–962）——含高频 typing 报文
```js
storage.set({ key: "astrobox_sync_data", value: JSON.stringify(parsed), fail: function () {} })
```
它在 action 分发**之前**执行——代码注释自己说 typing 是"高频报文"，却每条都被全量序列化 + 写 flash。手环 flash 寿命有限，属慢性损耗；大课表 import 时同一份数据被序列化两次。
**正确方案**：
```js
if (parsed.action !== "typing") {
  storage.set({ key: "astrobox_sync_data", value: JSON.stringify(parsed), fail: function () {} })
}
// 为什么对：排错留档的价值集中在低频动作（import/export/activate），
// typing 每秒多条没有留档价值，省掉的正是最热的写路径
```

### C3. 激活校验：设备 ID 取不到时"空匹配"可能绕过绑定（L524–536, L562）
```js
if (!device || !device.getDeviceId) { finish(""); return }
...
fail: function () { finish("") }
```
`finish("")` 时 `last4 = ""`；若 `decrypted.deviceId` 恰为空串，`String("") !== ""` 为 false → **校验通过，激活码设备绑定形同虚设**。
**根因推断**：`finish("")` 本意是"降级放行"，但把"取不到 ID"与"码里没有绑定段"混在一个空串里比较了。
**正确方案**（显式拒绝空匹配）：
```js
if (!s || !decrypted.deviceId || String(decrypted.deviceId) !== last4) {
  syncReply(connect, {
    ok: false, action: "activate",
    reason: !s ? "无法获取设备ID，请到手环端激活" : "设备ID不匹配",
    codeDeviceId: decrypted.deviceId, localDeviceId4: last4
  })
  return
}
// 为什么对：绑定校验的失败模式必须是"拒绝"而非"意外放行"；
// 手环端 activation.ux 如有同样写法需同步修（本次未审，请自查）
```
（判断：`decryptActivationCode` 为纯本地校验、无服务端验签，存在离线重放面。用户量小、码分发可控时可接受；渠道扩大后建议加服务端核销。决定权在你。）

---

## Major

### M1. `onCreate` 无条件 `startResident()`，架空用户"后台运行"设置（L1160 vs L1164–1170）
`initBackgroundRunning()` 按 `config.running` 才启动常驻，但 `onCreate` 已无条件先 start——用户关闭后台运行后，每次冷启动都被重新拉起。耗电、系统查杀、商店"后台行为"审查风险。
**正确方案**：
```js
onCreate() { /* ...其余不变；删掉裸 startResident() */ this.initBackgroundRunning() },
initBackgroundRunning() {
  store.getBackgroundRunningConfig(function(config) {
    if (!config || config.running !== false) startResident()  // 默认开，显式关才不拉起
  })
}
// 为什么对：单一决策点；保留"开箱即常驻"体验，又让"关闭"真正生效
```

### M2. 聊天 ack 先于落库，存储失败即丢消息（L201–225）
`syncReply(chat_ack)` 在 storage 回调前同步发出，手机端认为"已送达"可能清队列；随后 `set fail` 只震一下，消息永久丢失。ack 语义应是"已持久化"。
**正确方案**：把回包移进 storage 回调：
```js
storage.set({
  key: "ev_chat_inbox", value: JSON.stringify(list),
  success: function () { vibrateLong(); syncReply(connect, { ok: true, action: "chat_ack", id: item.id, ts: Date.now() }) },
  fail: function () { vibrateLong(); syncReply(connect, { ok: false, action: "chat_ack", id: item.id, reason: "persist failed" }) }
})
// storage.get 的 fail 分支同样回 ok:false；手机端拿到 ok:false 可重试而非静默丢失
```

### M3. 备份键全局共用一个，连续导入互相覆盖（L378–380）
`astrobox_sync_backup` 固定单键：导入 A 表（备份 A）→ 导入 B 表（备份被覆盖）→ A 旧数据**无法回退**。
**正确方案**：`key: "astrobox_sync_backup_" + index`（每套课表独立备份位；改动最小、不引入清理负担）。

---

## Minor（顺手改，不阻塞发布）

1. **baseFontSize 非法值回包误导**（L903–909/919）：不合法时不 `pending++` 也不计错，若只有这一个字段，最终回 `{ok:false, reason:"no known field"}`——手机端误判字段名拼错。建议直接回 `fontSize out of range`。
2. **同名新建表并发竞态**（L350–367）：两次 import 同名新表可能重复建表。单线程+手动触发概率极低；治本是把"查名+建名"收进 store 原子回调。
3. **`syncNormalizeDay` 词表不全**（L106–112）：不认 "Tues"/"周一"。宽容性增强，遇到真实报文再加。
4. **deviceId 明文回传**（L415–425）：蓝牙点对点风险低；既只用于末 4 位比对，可只回 `deviceId4`（判断：优先级低）。

## 做得好的（保持）
- 守门人模型 `SYNC_ACCESS`：策略表集中、auth 只读且须显式请求——教科书级的"一张表管权限"。
- `syncCollectScopes` 的 `registered`/`finished` 防提前回包 + 2s 超时兜底，注释写清了"为什么"。
- 未知 action 安全忽略而非当 import 处理（L1064 记了历史教训）。

## 最该先修什么
**C1 → C2 → C3**：C1/C2 改约 5 行、发布包直接受益；C3 关系付费安全。M1/M2 各约 10 行可同批。**改完发我，我帮你复审确认。**
