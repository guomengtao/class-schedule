/**
 * 聊天桥（手环侧）
 *
 * 用途：让 EV 课程表具备【主动】给手机发消息的能力。
 *
 * 背景：interconnect 的 connect 实例原本只是 app.ux 里 initSyncReceiver() 的局部变量，
 *       导致 EV 只能在"收到手机消息时回包"，没法自己开口 —— 这是"手环 → 手机"做不出来的根因。
 *
 * 做法：**不依赖全局变量**（快应用的 app.ux 顶层函数对页面不一定可见），
 *       改用一个共享模块：app.ux 拿到 connect 后 register 进来，页面 require 同一个模块调用 send。
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

module.exports = {

  /** 由 app.ux 的 initSyncReceiver() 调用，把 connect 注册进来 */
  register: function (c) {
    connect = c
    console.log("[CHAT] bridge registered, ready=" + !!c)
  },

  /** connect 是否已就绪（未就绪时发送会失败） */
  ready: function () {
    return !!connect
  },

  /**
   * 手环 → 手机：发一条聊天消息
   * @return true = 已调用 send（注意：链路无 ACK，true 不代表对方已收到）
   */
  send: function (text) {
    if (!connect) {
      console.log("[CHAT-TX] connect not registered yet（先让手机发一条，或重启 EV）")
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
      connect.send({ data: msg })
      console.log("[CHAT-TX] send done: " + JSON.stringify(msg))
      return true
    } catch (e) {
      console.log("[CHAT-TX] failed: " + e)
      return false
    }
  }
}
