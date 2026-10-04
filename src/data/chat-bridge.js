/**
 * 聊天桥（手环侧）
 *
 * 用途：让 EV 课程表具备【主动】给手机发消息的能力。
 *
 * ⚠️ 2026-10-04 重要修复（真机实测暴露）：
 *   aiot 打包会把本模块**分别**打进 app.js 和各页面文件 —— 是**两份互不相干的副本**。
 *   证据：build/app.js 与 build/pages/message-inbox/message-inbox.js 里
 *        各有一份 "./src/data/chat-bridge.js" 定义，各自带 "var connect = null"。
 *   后果：app.ux 里的 chatBridge.register(connect) 只写进了 app.js 那份副本；
 *        留言板页 require 拿到的是**另一份**，connect 永远是 null
 *        → 点快捷短语永远提示「设备未连接」（真机 100% 复现，与手机端/通道状态无关）。
 *
 *   现改为三级取用（取到即缓存）：
 *     ① 本文件内 register() 注入的（app.ux 与本文件在同一份副本时才有效）
 *     ② 全局桥 globalThis/global 上的 __evSyncConnect（app.ux 注册时会顺手挂一份）
 *     ③ 自己 require @system.interconnect 取实例（兜底）
 *
 * 用法：
 *   // app.ux / initSyncReceiver() 里
 *   chatBridge.register(connect)
 *
 *   // 任意页面
 *   var chatBridge = require("../../data/chat-bridge.js")
 *   chatBridge.send("要发的文字")
 */
var connect = null
var GLOBAL_KEY = "__evSyncConnect"

/** ② 全局桥：app.ux 注册时会把 connect 挂到全局对象上，跨文件副本可见 */
function fromGlobal() {
  try {
    if (typeof globalThis !== "undefined" && globalThis[GLOBAL_KEY]) {
      return globalThis[GLOBAL_KEY]
    }
  } catch (e) {}
  try {
    if (typeof global !== "undefined" && global[GLOBAL_KEY]) {
      return global[GLOBAL_KEY]
    }
  } catch (e) {}
  return null
}

/** ③ 兜底：本文件自己取一个 interconnect 实例 */
function selfAcquire() {
  try {
    var ic = require("@system.interconnect")
    if (ic && typeof ic.instance === "function") {
      return ic.instance()
    }
  } catch (e) {
    console.log("[CHAT] self-acquire failed: " + e)
  }
  return null
}

/** 取当前可用 connect：注入 → 全局桥 → 自取；取到即缓存 */
function current() {
  if (connect) {
    return connect
  }
  connect = fromGlobal() || selfAcquire()
  console.log("[CHAT] connect resolved = " + !!connect)
  return connect
}

module.exports = {

  /** 由 app.ux 的 initSyncReceiver() 调用，把 connect 注册进来（并顺手挂到全局桥） */
  register: function (c) {
    connect = c
    try {
      if (typeof globalThis !== "undefined") { globalThis[GLOBAL_KEY] = c }
    } catch (e) {}
    try {
      if (typeof global !== "undefined") { global[GLOBAL_KEY] = c }
    } catch (e) {}
    console.log("[CHAT] bridge registered, ready=" + !!c)
  },

  /** connect 是否已就绪（未就绪时发送会失败） */
  ready: function () {
    return !!current()
  },

  /**
   * 手环 → 手机：发一条工具箱遥控指令（不包装成 chat，避免进手机留言流）。
   * 手机端 CommandRouter 白名单分发：find_phone / phone_status / mute / countdown。
   * @return true = 已调用 send（注意：链路无 ACK，true 不代表对方已收到）
   */
  sendCmd: function (type, params) {
    var c = current()
    if (!c) {
      console.log("[CMD-TX] no connect（app.ux 未注册且自取失败）")
      return false
    }
    var msg = {
      action: "cmd",
      type: String(type || ""),
      ts: Date.now()
    }
    if (params) {
      for (var k in params) {
        msg[k] = params[k]
      }
    }
    try {
      c.send({ data: msg })
      console.log("[CMD-TX] send done: " + JSON.stringify(msg))
      return true
    } catch (e) {
      console.log("[CMD-TX] failed: " + e)
      connect = null
      return false
    }
  },

  /**
   * 手环 → 手机：发一条聊天消息
   * @return true = 已调用 send（注意：链路无 ACK，true 不代表对方已收到）
   */
  send: function (text) {
    var c = current()
    if (!c) {
      console.log("[CHAT-TX] no connect（app.ux 未注册且自取失败）")
      return false
    }
    var msg = {
      action: "chat",
      // ⚠️ id 必须**每条唯一**：手机端据此去重（防止同一条被提醒两次）。
      //    只用 Date.now() 时，同一毫秒内连发两条会撞 id → 手机端会把第二条误判为重复而漏提醒。
      id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 6),
      text: String(text === undefined || text === null ? "" : text),
      ts: Date.now()
    }
    try {
      // 官方文档：connect.send 的 data 是 Object，发字符串会双重转义
      c.send({ data: msg })
      console.log("[CHAT-TX] send done: " + JSON.stringify(msg))
      return true
    } catch (e) {
      console.log("[CHAT-TX] failed: " + e)
      connect = null
      return false
    }
  },

  /**
   * 手环 → 手机：已读回执（P2）。
   * 语义 = 手环「看见了」这些手机留言（与手机端 rx_ack「收到了」不同，别合并）。
   * 手机端收到后把对应 out 消息从「已送达」升为「已读」。
   *
   * @param ids 手机留言的 id 数组（= 手机端 out 消息的 id）
   * @return true = 已调用 send（链路无 ACK，true 不代表对方已收到）
   */
  sendRead: function (ids) {
    var c = current()
    if (!c) {
      console.log("[READ-TX] no connect（app.ux 未注册且自取失败）")
      return false
    }
    var arr = []
    if (ids && ids.length) {
      for (var i = 0; i < ids.length; i++) {
        if (ids[i]) { arr.push(String(ids[i])) }
      }
    }
    if (!arr.length) {
      return false
    }
    var msg = { action: "chat_read", ids: arr, ts: Date.now() }
    try {
      c.send({ data: msg })
      console.log("[READ-TX] send done, count=" + arr.length)
      return true
    } catch (e) {
      console.log("[READ-TX] failed: " + e)
      connect = null
      return false
    }
  },

  /**
   * 手环 → 手机：输入态（P3）。
   * state = "start" | "upd" | "stop"；text = 已输入的草稿（可空；stop 时可不带）。
   * 手机端按 ≥800ms 节流 + >3s 过期丢弃 + 5s 无包清除输入态。
   * ⚠️ 高频报文，手机端不回 rx_ack（避免回包风暴）。
   * @return true = 已调用 send（链路无 ACK，true 不代表对方已收到）
   */
  sendTyping: function (state, text) {
    var c = current()
    if (!c) {
      return false
    }
    var msg = { action: "typing", state: String(state || "upd"), ts: Date.now() }
    if (text !== undefined && text !== null) {
      msg.text = String(text).slice(0, 40)
    }
    try {
      c.send({ data: msg })
      return true
    } catch (e) {
      connect = null
      return false
    }
  }
}
