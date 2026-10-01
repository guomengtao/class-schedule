#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
emu_buddy.py —— EvEmuBuddy 菜单栏主程序（PyObjC / AppKit）

交互：
  · 左键 = 立即启动（清干净 → 起默认模拟器 → 等就绪），全程后台线程，不阻塞菜单栏
  · 右键 = 弹菜单（切设备、开关、停/重启、日志、配置、退出）

外观：
  · Dock 不显示（LSUIElement + Accessory 策略）
  · 手表轮廓模板图随系统深浅色自动反色；右侧小圆点用状态色（灰/黄/绿/红）

设计依据：docs/Mac菜单栏模拟器保姆-EvEmuBuddy设计方案.md（M1 骨架 + M2 清理/就绪态）
"""

from __future__ import annotations

import fcntl
import os
import sys
import threading
import time
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import emubuddy_core as core  # noqa: E402

import objc  # noqa: E402
from PyObjCTools import AppHelper  # noqa: E402

from AppKit import (  # noqa: E402
    NSApplication,
    NSApplicationActivationPolicyAccessory,
    NSApp,
    NSColor,
    NSDeviceRGBColorSpace,
    NSEventMaskLeftMouseUp,
    NSEventMaskRightMouseUp,
    NSEventTypeRightMouseUp,
    NSFont,
    NSForegroundColorAttributeName,
    NSFontAttributeName,
    NSImage,
    NSImageLeft,
    NSMenu,
    NSMenuItem,
    NSMakePoint,
    NSMakeSize,
    NSBitmapImageRep,
    NSGraphicsContext,
    NSBezierPath,
    NSMutableParagraphStyle,
    NSParagraphStyleAttributeName,
    NSStatusBar,
    NSTimer,
    NSVariableStatusItemLength,
    NSWorkspace,
)
from Foundation import NSObject, NSURL, NSMakeRect, NSBundle  # noqa: E402

APP_TITLE = "EvEmuBuddy"
LAUNCH_AGENT_LABEL = "com.ev.emubuddy"
LAUNCH_AGENT_PATH = os.path.expanduser(f"~/Library/LaunchAgents/{LAUNCH_AGENT_LABEL}.plist")

STATE_COLORS = {
    "idle": None,                       # 模板色（系统自动反色）
    "busy": (1.00, 0.72, 0.10),         # 黄
    "ready": (0.20, 0.78, 0.35),        # 绿
    "fail": (1.00, 0.30, 0.26),         # 红
}
STATE_LABEL = {"idle": "空闲", "busy": "执行中", "ready": "已就绪", "fail": "失败"}


# --------------------------------------------------------------------------
# 菜单栏图标：程序内绘制（无需外部 PNG），手表轮廓模板图
# --------------------------------------------------------------------------
def draw_watch_icon(px: int = 36) -> NSImage:
    """画一只手表轮廓（表体圆角矩形 + 上下表带），模板图，随深浅色自动反色。

    ⚠️ 坐标系坑：setSize_ 会改变绘图上下文的有效尺寸（触发 CTM 缩放），
    必须在**绘制完成之后**再设点尺寸，否则图形会被放大裁掉一半。这里全程用像素坐标绘制。
    """
    rep = NSBitmapImageRep.alloc().initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bytesPerRow_bitsPerPixel_(
        None, px, px, 8, 4, True, False, NSDeviceRGBColorSpace, 0, 0
    )
    ctx = NSGraphicsContext.graphicsContextWithBitmapImageRep_(rep)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.setCurrentContext_(ctx)

    NSColor.blackColor().set()

    # 表带（上下各一条，填充；比表体窄，与表体间留一点缝）
    for y in (px * 0.762, px * 0.048):
        NSBezierPath.bezierPathWithRoundedRect_xRadius_yRadius_(
            NSMakeRect(px * 0.395, y, px * 0.21, px * 0.185), px * 0.045, px * 0.045
        ).fill()

    # 表体（圆角矩形，描边）
    body = NSBezierPath.bezierPathWithRoundedRect_xRadius_yRadius_(
        NSMakeRect(px * 0.215, px * 0.235, px * 0.57, px * 0.53), px * 0.13, px * 0.13
    )
    body.setLineWidth_(px * 0.082)
    body.stroke()

    NSGraphicsContext.restoreGraphicsState()

    # ← 绘制完成后才设点尺寸（2x retina）
    rep.setSize_(NSMakeSize(px / 2.0, px / 2.0))
    img = NSImage.alloc().initWithSize_(NSMakeSize(px / 2.0, px / 2.0))
    img.addRepresentation_(rep)
    img.setTemplate_(True)
    return img


# --------------------------------------------------------------------------
# 主控制器
# --------------------------------------------------------------------------
class EvEmuBuddyApp(NSObject):
    def init(self):
        # ⚠️ ObjC 子类必须用 objc.super，否则 PyObjC 报 ObjCSuperWarning
        self = objc.super(EvEmuBuddyApp, self).init()
        if self is None:
            return None
        self.busy = False
        self.state = "idle"
        self.status_text = "空闲"
        self.fail_until = 0.0        # 失败提示的保护期（期间不被轮询覆盖）
        self.current_serial = None
        self.current_alias = None
        self.status_item = None
        self.button = None
        self.icon = draw_watch_icon(36)
        return self

    # ---------------- 启动 ----------------
    @objc.python_method
    def setup(self):
        bar = NSStatusBar.systemStatusBar()
        self.status_item = bar.statusItemWithLength_(NSVariableStatusItemLength)
        self.status_item.setHighlightMode_(True)
        btn = self.status_item.button()
        self.button = btn
        btn.setImage_(self.icon)
        btn.setImagePosition_(NSImageLeft)
        btn.setTarget_(self)
        btn.setAction_(b"onClick:")
        # 左右键都要触发 action，右键才能分流到菜单
        btn.sendActionOn_(NSEventMaskLeftMouseUp | NSEventMaskRightMouseUp)
        self.status_text = "无模拟器在跑"
        self.apply_status_ui("idle", self.status_text)
        self._diag_done = False

        NSTimer.scheduledTimerWithTimeInterval_target_selector_userInfo_repeats_(
            6.0, self, b"tick:", None, True
        )
        core.log("[app] EvEmuBuddy 已启动")

    @objc.python_method
    def _default_label(self):
        cfg = core.load_config()
        dev = core.device_of(cfg, cfg.get("defaultDevice", "band9"))
        return dev.get("label", cfg.get("defaultDevice", "band9"))

    # ---------------- 点击分流 ----------------
    def onClick_(self, sender):
        ev = NSApp.currentEvent()
        if ev is not None and ev.type() == NSEventTypeRightMouseUp:
            self.popup_menu()
        else:
            if self.busy:
                core.notify(APP_TITLE, "正在执行中，请稍候…")
                return
            self.begin_flow(None)

    @objc.python_method
    def popup_menu(self):
        menu = self.build_menu()
        btn = self.button
        try:
            menu.popUpMenuPositioningItem_atLocation_inView_(None, NSMakePoint(0, 0), btn)
        except Exception:
            core.log("[ui] 菜单弹出失败：\n" + traceback.format_exc())

    # ---------------- 菜单 ----------------
    @objc.python_method
    def build_menu(self) -> NSMenu:
        cfg = core.load_config()
        menu = NSMenu.alloc().init()

        # 状态行（只读）：status_text 只放细节，状态词由 STATE_LABEL 提供
        head = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
            f"状态：{STATE_LABEL.get(self.state, '空闲')} · {self.status_text}", None, ""
        )
        head.setEnabled_(False)
        menu.addItem_(head)
        menu.addItem_(NSMenuItem.separatorItem())

        # 立即启动
        dev = core.device_of(cfg, cfg.get("defaultDevice", "band9"))
        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
            f"立即启动（{dev.get('label', '')}）", b"menuStart:", ""
        )
        it.setTarget_(self)
        it.setEnabled_(not self.busy)
        menu.addItem_(it)

        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("停止所有模拟器", b"menuStop:", "")
        it.setTarget_(self)
        it.setEnabled_(not self.busy)
        menu.addItem_(it)

        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("重启当前模拟器", b"menuRestart:", "")
        it.setTarget_(self)
        it.setEnabled_(not self.busy)
        menu.addItem_(it)
        menu.addItem_(NSMenuItem.separatorItem())

        # 设备子菜单
        parent = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("选择设备", None, "")
        sub = NSMenu.alloc().init()
        for alias in core.ordered_aliases(cfg):
            d = cfg["devices"][alias]
            title = f"{d.get('label', alias)}   ({d.get('avd', '?')})"
            mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, b"menuPickDevice:", "")
            mi.setTarget_(self)
            mi.setRepresentedObject_(alias)
            mi.setState_(1 if alias == cfg.get("defaultDevice") else 0)
            sub.addItem_(mi)
        parent.setSubmenu_(sub)
        menu.addItem_(parent)
        menu.addItem_(NSMenuItem.separatorItem())

        # 开关
        for key, title, default in (
            ("cleanBeforeStart", "启动前先清理（推荐）", True),
            ("showWindow", "显示模拟器窗口", True),
            ("autoInstallRpk", "启动后自动装最新 rpk 包（M3 待实现）", False),
        ):
            mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, b"menuToggle:", "")
            mi.setTarget_(self)
            mi.setRepresentedObject_(key)
            mi.setState_(1 if cfg.get(key, default) else 0)
            if key == "autoInstallRpk":
                mi.setEnabled_(False)
            menu.addItem_(mi)

        # 开机自启（M4 待实现）
        mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("开机自启（M4 待实现）", None, "")
        mi.setState_(1 if cfg.get("launchAtLogin", True) else 0)
        mi.setEnabled_(False)
        menu.addItem_(mi)
        menu.addItem_(NSMenuItem.separatorItem())

        # 工具
        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("打开日志", b"menuOpenLog:", "")
        it.setTarget_(self)
        menu.addItem_(it)
        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("打开配置文件", b"menuOpenConfig:", "")
        it.setTarget_(self)
        menu.addItem_(it)
        menu.addItem_(NSMenuItem.separatorItem())

        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("退出", b"menuQuit:", "")
        it.setTarget_(self)
        menu.addItem_(it)
        return menu

    # ---------------- 菜单动作 ----------------
    def menuStart_(self, sender):
        self.begin_flow(None)

    def menuStop_(self, sender):
        def work():
            self.set_status("busy", "正在停止…")
            handled = core.stop_all()
            core.log(f"[ui] 停止：{handled}")
            self.set_status("idle", "已停止" if handled else "本来就没在跑")
        if self.busy:
            core.notify(APP_TITLE, "正在执行中，请稍候…")
            return
        self.busy = True
        threading.Thread(target=lambda: self._wrap(work), daemon=True).start()

    def menuRestart_(self, sender):
        self.begin_flow(None, force_restart=True)

    def menuPickDevice_(self, sender):
        alias = sender.representedObject()
        cfg = core.load_config()
        if alias in cfg.get("devices", {}):
            cfg["defaultDevice"] = alias
            core.save_config(cfg)
            core.log(f"[ui] 默认设备 → {alias}")
            self.apply_status_ui(self.state, self.status_text)
            core.notify(APP_TITLE, f"默认设备已切换为 {cfg['devices'][alias].get('label', alias)}")

    def menuToggle_(self, sender):
        key = sender.representedObject()
        cfg = core.load_config()
        cfg[key] = not bool(cfg.get(key, False))
        core.save_config(cfg)
        core.log(f"[ui] {key} → {cfg[key]}")

    def menuOpenLog_(self, sender):
        self._open(core.LOG_PATH)

    def menuOpenConfig_(self, sender):
        if not os.path.exists(core.CONFIG_PATH):
            core.save_config(core.load_config())
        self._open(core.CONFIG_PATH)

    def menuQuit_(self, sender):
        core.log("[app] 退出")
        NSApp.terminate_(None)

    @objc.python_method
    def _open(self, path):
        NSWorkspace.sharedWorkspace().openURL_(NSURL.fileURLWithPath_(path))

    # ---------------- 流程 ----------------
    @objc.python_method
    def begin_flow(self, alias, force_restart=False):
        if self.busy:
            core.notify(APP_TITLE, "正在执行中，请稍候…")
            return
        self.busy = True
        self.set_status("busy", "准备中…")
        threading.Thread(target=self._flow, args=(alias, force_restart), daemon=True).start()

    @objc.python_method
    def _wrap(self, fn):
        try:
            fn()
        except Exception:
            core.log("[ui] 任务异常：\n" + traceback.format_exc())
        finally:
            self.busy = False

    @objc.python_method
    def _flow(self, alias, force_restart=False):
        label = "?"
        try:
            cfg = core.load_config()
            alias = alias or cfg.get("defaultDevice", "band9")
            dev = core.device_of(cfg, alias)
            avd = dev.get("avd")
            label = dev.get("label", alias)
            self.current_alias = alias

            # 步 0：环境自检
            ok, msg = core.check_env(cfg)
            if not ok:
                self.set_status("fail", "SDK 环境缺失")
                core.notify(f"{APP_TITLE} · 环境缺失", msg)
                return

            # 步 1：清理（清干净再起，解决卡顿）
            if cfg.get("cleanBeforeStart", True) or force_restart:
                self.set_status("busy", "清理残留…")
                acts = core.clean()
                core.log(f"[flow] clean → {acts}")
                stopped = core.stop_all()
                core.log(f"[flow] stop all → {stopped}")

            # 步 2-4：启动 + 等 guest 就绪
            self.set_status("busy", f"启动{label}…")

            def prog(m):
                self.set_status("busy", m if len(m) < 40 else f"启动{label}…")

            ok, serial, msg = core.start_avd(
                cfg, avd, show_window=cfg.get("showWindow", True), progress=prog
            )
            if not ok:
                self.set_status("fail", f"{label} 启动失败")
                core.notify(f"{APP_TITLE} · {label} 启动失败", msg, sound="Basso")
                return
            self.current_serial = serial

            # 步 5-6：装包（M3）
            if cfg.get("autoInstallRpk", False):
                core.log("[flow] autoInstallRpk=true，但装包为 M3 功能，本期跳过")
                self.set_status("ready", f"{label} 已就绪（未装包）")
                core.notify(f"{APP_TITLE} · {label} 已就绪",
                            f"{serial} 可部署（自动装包功能待 M3）", sound="Glass")
                return

            self.set_status("ready", f"{label} 已就绪")
            core.notify(f"{APP_TITLE} · {label} 已就绪", f"{serial} 可以部署了", sound="Glass")
        except Exception:
            core.log("[flow] 未捕获异常：\n" + traceback.format_exc())
            self.set_status("fail", f"{label} 异常")
            core.notify(f"{APP_TITLE} · 异常", "详情见日志 ~/.ev_emubuddy.log")
        finally:
            self.busy = False

    # ---------------- 状态刷新 ----------------
    @objc.python_method
    def set_status(self, state, text):
        """任意线程调用，内部切换到主线程更新 UI。"""
        if state == "fail":
            self.fail_until = time.time() + 60
        self.performSelectorOnMainThread_withObject_waitUntilDone_(
            b"applyStatus:", (state, text), False
        )

    def applyStatus_(self, payload):
        state, text = payload[0], payload[1]
        self.state = state
        self.status_text = text
        self.apply_status_ui(state, text)

    @objc.python_method
    def apply_status_ui(self, state, text):
        btn = self.button
        if btn is None:
            return
        rgb = STATE_COLORS.get(state)
        tip = f"{APP_TITLE} · {STATE_LABEL.get(state, '')} · {text}"
        if rgb is None:
            btn.setAttributedTitle_(None)
            btn.setTitle_("")
        else:
            color = NSColor.colorWithCalibratedRed_green_blue_alpha_(rgb[0], rgb[1], rgb[2], 1.0)
            attrs = {
                NSForegroundColorAttributeName: color,
                NSFontAttributeName: NSFont.systemFontOfSize_(9.0),
            }
            from Foundation import NSAttributedString  # noqa: PLC0415
            btn.setAttributedTitle_(
                NSAttributedString.alloc().initWithString_attributes_(" ●", attrs)
            )
        btn.setImage_(self.icon)
        btn.setToolTip_(tip)

    def tick_(self, timer):
        """轻量轮询：空闲时反映外部（IDE）起的实例；失败提示 60s 内不被覆盖。"""
        if self.busy:
            return
        if self.state == "fail" and time.time() < self.fail_until:
            return
        try:
            inst = core.running_instances()
        except Exception:
            return
        if inst:
            state = "ready"
            text = " · ".join(sorted({i["avd"] for i in inst})) + f" 在跑（{len(inst)} 个）"
        else:
            state = "idle"
            text = "无模拟器在跑"
        if (state, text) != (self.state, self.status_text):
            core.log(f"[tick] {state} · {text}")
        self.state = state
        self.status_text = text
        self.apply_status_ui(state, text)
        # 心跳：证明进程与 run loop 还活着（诊断用，稳定后可降频）
        self._hb = getattr(self, "_hb", 0) + 1
        if self._hb % 5 == 1:
            core.log(f"[hb] #{self._hb} {state} · {text}")
        # 诊断：run loop 起来后读状态项在屏幕上的真实位置（setup 阶段窗口还没布局）
        if not getattr(self, "_diag_done", False):
            self._diag_done = True
            try:
                win = self.button.window()
                f = win.frame() if win else None
                b = NSBundle.mainBundle()
                core.log(
                    f"[ui] visible={self.status_item.isVisible()} winFrame={f} "
                    f"winVisible={win.isVisible() if win else None} "
                    f"bundleId={b.bundleIdentifier()} bpath={b.bundlePath()} "
                    f"policy={NSApp.activationPolicy()} active={NSApp.isActive()} "
                    f"running={NSApp.isRunning()}"
                )
            except Exception:
                core.log("[ui] 图标诊断失败：\n" + traceback.format_exc())


_controller_ref = {"c": None}


class AppDelegate(NSObject):
    """NSApplication 委托。状态项**不**在这里创建 —— 见 main() 里照抄 rumps 的启动顺序。"""

    def applicationDidFinishLaunching_(self, notification):
        core.log("[app] applicationDidFinishLaunching")

    def applicationWillTerminate_(self, notification):
        core.log("[app] applicationWillTerminate")


def _acquire_single_instance():
    """单实例锁（EvNotifier 同款思路）：多开会在菜单栏出现好几个图标。"""
    try:
        fp = open(os.path.join(core.HOME, ".ev_emubuddy.lock"), "w")
        fcntl.flock(fp, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fp.write(str(os.getpid()))
        fp.flush()
        return fp
    except OSError:
        return None


def main():
    def _fatal(exc_type, exc, tb):
        core.log("[fatal] 未捕获异常：\n" + "".join(traceback.format_exception(exc_type, exc, tb)))
        try:
            core.notify(APP_TITLE, "程序异常退出，详情见 ~/.ev_emubuddy.log")
        except Exception:
            pass

    sys.excepthook = _fatal
    lock = _acquire_single_instance()
    if lock is None:
        core.log("[app] 已有实例在运行，本次启动退出")
        return
    try:
        # ⚠️ 启动顺序照抄 rumps（EvNotifier 已验证可用），差一步状态项就挂不上菜单栏：
        #   1) sharedApplication → 2) setActivationPolicy_ → 3) activateIgnoringOtherApps_
        #   4) setDelegate_ → 5) 创建状态项 → 6) AppHelper.runEventLoop()
        # 注意 6) 必须是 AppHelper.runEventLoop()，直接 app.run() 在本环境下状态项窗口
        # 会退化成 (0,0,w,0)（屏幕上空无一物），这正是"顶部菜单看不到东西"的原因。
        app = NSApplication.sharedApplication()
        app.setActivationPolicy_(NSApplicationActivationPolicyAccessory)
        app.activateIgnoringOtherApps_(True)
        controller = EvEmuBuddyApp.alloc().init()
        _controller_ref["c"] = controller
        app.setDelegate_(AppDelegate.alloc().init())
        controller.setup()
        core.log("[app] 进入事件循环（AppHelper.runEventLoop）")
        AppHelper.runEventLoop()
        core.log("[app] 事件循环已退出")
    except Exception:
        core.log("[fatal] main 异常：\n" + traceback.format_exc())
        raise


if __name__ == "__main__":
    main()
