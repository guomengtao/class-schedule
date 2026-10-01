#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
emu_buddy.py —— EvEmuBuddy 菜单栏主程序（PyObjC / AppKit）

交互：
  · 左键 = 立即启动（清已死残留 → 起默认模拟器 → 装所选项目并拉起），全程后台线程，不阻塞菜单栏
  · 右键 = 弹菜单（选项目、切设备、开关、停/重启、日志、配置、退出）

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
        self.current_app = None
        self.running_avds_cache = []   # 菜单构建用（tick 里刷新，避免右键时现跑 ps）
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
        try:
            self.running_avds_cache = core.running_avds()
        except Exception:
            self.running_avds_cache = []

        NSTimer.scheduledTimerWithTimeInterval_target_selector_userInfo_repeats_(
            6.0, self, b"tick:", None, True
        )
        # 开机自启：让「配置开关」与「LaunchAgents 里的 plist」保持一致（仅在不一致时动手）
        try:
            ok, msg = core.sync_autostart(core.load_config())
            core.log(f"[autostart] {msg}")
        except Exception:
            core.log("[autostart] 同步失败：\n" + traceback.format_exc())
        # 环境健康行：proc_list=0 行 = ps 被系统挡住（会让"多开/清理"判断失准），必须一眼可见
        try:
            core.log(
                f"[env] proc_list={len(core.proc_list())} 行 · "
                f"在跑 AVD={core.running_avds() or '（无）'} · "
                f"死掉 AVD={core.dead_avds()}"
            )
        except Exception:
            core.log("[env] 进程探测失败：\n" + traceback.format_exc())
        core.log("[app] EvEmuBuddy 已启动")

    @objc.python_method
    def _default_label(self):
        cfg = core.load_config()
        dev = core.device_of(cfg, cfg.get("defaultDevice", "band9"))
        return dev.get("label", cfg.get("defaultDevice", "band9"))

    @objc.python_method
    def _default_app_label(self):
        cfg = core.load_config()
        return core.app_of(cfg, cfg.get("defaultApp", "tank")).get("label", "未选项目")

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
        app = core.app_of(cfg, cfg.get("defaultApp", "tank"))
        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
            f"立即启动（{dev.get('label', '')} · {app.get('label', '')}）", b"menuStart:", ""
        )
        it.setTarget_(self)
        it.setEnabled_(not self.busy)
        menu.addItem_(it)

        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("停止所有模拟器", b"menuStop:", "")
        it.setTarget_(self)
        it.setEnabled_(not self.busy)
        menu.addItem_(it)

        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("重启默认设备", b"menuRestart:", "")
        it.setTarget_(self)
        it.setEnabled_(not self.busy)
        menu.addItem_(it)

        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("清理已死残留（不碰在跑的）", b"menuClean:", "")
        it.setTarget_(self)
        it.setEnabled_(not self.busy)
        menu.addItem_(it)
        menu.addItem_(NSMenuItem.separatorItem())

        live = set(self.running_avds_cache)

        # 启动设备（可多开：只起这一台，正在跑的其它实例不受影响）
        parent = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("启动设备（可多开）", None, "")
        sub = NSMenu.alloc().init()
        for alias in core.ordered_aliases(cfg):
            d = cfg["devices"][alias]
            avd = d.get("avd", "?")
            title = f"{d.get('label', alias)}   ({avd})" + ("   ● 在跑" if avd in live else "")
            mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, b"menuLaunchDevice:", "")
            mi.setTarget_(self)
            mi.setRepresentedObject_(alias)
            mi.setEnabled_(not self.busy)
            sub.addItem_(mi)
        parent.setSubmenu_(sub)
        menu.addItem_(parent)

        # 选择默认设备（下次左键 / 「立即启动」用它）
        parent = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("选择默认设备", None, "")
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

        # 启动项目（勾选，默认坦克大战）：左键 /「立即启动」会先把所选项目装进模拟器再拉起
        parent = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("启动项目（勾选）", None, "")
        sub = NSMenu.alloc().init()
        for alias in core.ordered_apps(cfg):
            a = cfg["apps"][alias]
            rpk, _why = core.find_rpk(cfg, alias, cfg.get("defaultDevice"))
            title = f"{a.get('label', alias)}   ({a.get('package', '?')})" + ("" if rpk else "   ⚠️ 无包")
            mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, b"menuPickApp:", "")
            mi.setTarget_(self)
            mi.setRepresentedObject_(alias)
            mi.setState_(1 if alias == cfg.get("defaultApp") else 0)
            sub.addItem_(mi)
        parent.setSubmenu_(sub)
        menu.addItem_(parent)

        # 手动装载：把所选项目立刻装进默认设备那个实例（单次操作，force 覆盖）
        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
            f"装载「{app.get('label', '')}」到默认设备实例", b"menuDeployNow:", ""
        )
        it.setTarget_(self)
        it.setEnabled_(not self.busy)
        menu.addItem_(it)

        # 停止指定设备（只停这一台，别的继续跑）
        parent = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("停止指定设备", None, "")
        sub = NSMenu.alloc().init()
        seen_avd = set()
        for alias in core.ordered_aliases(cfg):
            d = cfg["devices"][alias]
            avd = d.get("avd", "?")
            if avd not in live or avd in seen_avd:
                continue
            seen_avd.add(avd)
            mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(
                f"{d.get('label', alias)}   ({avd})", b"menuStopDevice:", ""
            )
            mi.setTarget_(self)
            mi.setRepresentedObject_(alias)
            mi.setEnabled_(not self.busy)
            sub.addItem_(mi)
        if sub.numberOfItems() == 0:
            mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("（没有在跑的实例）", None, "")
            mi.setEnabled_(False)
            sub.addItem_(mi)
        parent.setSubmenu_(sub)
        menu.addItem_(parent)
        menu.addItem_(NSMenuItem.separatorItem())

        # 开关
        for key, title, default in (
            ("autoDeployApp", "启动后自动装载所选项目（同包跳过）", True),
            ("cleanBeforeStart", "启动前清理已死残留（推荐）", True),
            ("showWindow", "显示模拟器窗口", True),
        ):
            mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, b"menuToggle:", "")
            mi.setTarget_(self)
            mi.setRepresentedObject_(key)
            mi.setState_(1 if cfg.get(key, default) else 0)
            menu.addItem_(mi)

        # 开机自启（LaunchAgent）
        mi = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("开机自动启动", b"menuToggleAutostart:", "")
        mi.setTarget_(self)
        mi.setRepresentedObject_("launchAtLogin")
        mi.setState_(1 if cfg.get("launchAtLogin", True) else 0)
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

    def menuClean_(self, sender):
        """手动清理「确认已死」的残留（僵尸 qemu / 孤儿 crashpad / 卡死部署 / 无实例 AVD 残锁）。
        正在跑的实例一律不碰。"""
        if self.busy:
            core.notify(APP_TITLE, "正在执行中，请稍候…")
            return

        def work():
            self.set_status("busy", "清理已死残留…")
            acts = core.clean()
            core.log(f"[ui] 手动清理 → {acts}")
            live = core.running_avds()
            tail = f"；在跑 {len(live)} 台未动" if live else ""
            self.set_status("ready" if live else "idle", f"清理完成（{len(acts)} 项）{tail}")

        self.busy = True
        threading.Thread(target=lambda: self._wrap(work), daemon=True).start()

    def menuLaunchDevice_(self, sender):
        """启动指定设备。可多开：只起这一台，其它正在跑的实例完全不受影响。"""
        alias = sender.representedObject()
        dev = core.device_of(core.load_config(), alias)
        core.log(f"[ui] 启动设备 → {alias}（{dev.get('avd')}）")
        self.begin_flow(alias)

    def menuStopDevice_(self, sender):
        """只停指定设备这一台，其它继续跑。"""
        if self.busy:
            core.notify(APP_TITLE, "正在执行中，请稍候…")
            return
        alias = sender.representedObject()
        dev = core.device_of(core.load_config(), alias)
        avd = dev.get("avd")
        label = dev.get("label", alias)

        def work():
            self.set_status("busy", f"停止{label}…")
            handled = core.stop_avd(avd)
            core.log(f"[ui] 停止 {avd} → {handled}")
            left = core.running_avds()
            if left:
                self.set_status("ready", f"已停止{label}（还剩 {len(left)} 台）")
            else:
                self.set_status("idle", f"已停止{label}")

        self.busy = True
        threading.Thread(target=lambda: self._wrap(work), daemon=True).start()

    def menuToggle_(self, sender):
        key = sender.representedObject()
        cfg = core.load_config()
        cfg[key] = not bool(cfg.get(key, False))
        core.save_config(cfg)
        core.log(f"[ui] {key} → {cfg[key]}")

    def menuPickApp_(self, sender):
        """勾选要启动的项目。只改默认，不会立刻装包（要立刻装用下面的「装载…」）。"""
        alias = sender.representedObject()
        cfg = core.load_config()
        if alias not in (cfg.get("apps") or {}):
            return
        cfg["defaultApp"] = alias
        core.save_config(cfg)
        a = core.app_of(cfg, alias)
        rpk, why = core.find_rpk(cfg, alias, cfg.get("defaultDevice"))
        core.log(f"[ui] 启动项目 → {alias}（{why}）")
        core.notify(APP_TITLE, f"启动项目已选为 {a.get('label', alias)}\n下次启动用它：{why if rpk else '未找到 rpk'}")

    def menuDeployNow_(self, sender):
        """把所选项目立刻装进「默认设备」那个在跑的实例（单次，强制覆盖，不落盘）。"""
        if self.busy:
            core.notify(APP_TITLE, "正在执行中，请稍候…")
            return
        cfg = core.load_config()
        alias = cfg.get("defaultApp", "tank")
        dev_alias = cfg.get("defaultDevice", "band9")
        dev = core.device_of(cfg, dev_alias)
        avd = dev.get("avd")
        label = dev.get("label", dev_alias)
        app_label = core.app_of(cfg, alias).get("label", alias)

        def work():
            self.set_status("busy", f"装载{app_label}…")
            serial = core.serial_for_avd(cfg, avd)
            if not serial:
                self.set_status("fail", f"{label} 没在跑")
                core.notify(APP_TITLE, f"{label} 还没启动，先「立即启动」或「启动设备」")
                return
            ok, msg = core.deploy_app(cfg, serial, alias, dev_alias, force=True,
                                      progress=lambda m: self.set_status("busy", m))
            core.log(f"[ui] 手动装载 {alias} → {msg}")
            if ok:
                self.current_app = alias
                self.set_status("ready", f"{app_label} 已装载（{serial}）")
                core.notify(f"{APP_TITLE} · {app_label}", msg, sound="Glass")
            else:
                self.set_status("fail", f"{app_label} 装载失败")
                core.notify(f"{APP_TITLE} · {app_label} 装载失败", msg, sound="Basso")

        self.busy = True
        threading.Thread(target=lambda: self._wrap(work), daemon=True).start()

    def menuToggleAutostart_(self, sender):
        """开机自启：以「磁盘上是否已有 plist」为准取反，并把结果写回配置。"""
        want = not core.autostart_installed()
        ok, msg = core.set_autostart(want)
        cfg = core.load_config()
        cfg["launchAtLogin"] = want
        core.save_config(cfg)
        core.log(f"[ui] 开机自启 → {want}（{msg}）")
        core.notify(APP_TITLE, ("已开启开机自启 —— " if want else "已关闭开机自启 —— ") + msg)
        self.apply_status_ui(self.state, self.status_text)

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

            # 步 1：只清「确认已死」的残留。正在跑的其它模拟器一律不动 —— 支持多开。
            if cfg.get("cleanBeforeStart", True):
                self.set_status("busy", "清理已死残留…")
                acts = core.clean()
                core.log(f"[flow] clean → {acts}")
            # 步 1.5：强制重启 → 只停目标设备这一台，不动别人
            if force_restart:
                self.set_status("busy", f"重启{label}…")
                stopped = core.stop_avd(avd)
                core.log(f"[flow] force_restart：停 {avd} → {stopped}")

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

            # 其它同时开着的实例（多开时给个可见提示）
            others = [a for a in core.running_avds() if a != avd]
            tail = f"；另有 {len(others)} 台在跑：{', '.join(others)}" if others else ""

            # 步 5-7：把「所选项目」装进模拟器并拉起（M3）
            # 同包跳过：同一个包文件（路径+mtime+size 一致）且已在机上 → 不重装，只重新拉起，
            # 避免每次都重置该应用的数据（激活码 / 课程表）。
            app_alias = cfg.get("defaultApp", "tank")
            app = core.app_of(cfg, app_alias)
            app_label = app.get("label", app_alias)
            self.current_app = app_alias

            if cfg.get("autoDeployApp", True):
                self.set_status("busy", f"装载{app_label}…")

                def dprog(m):
                    self.set_status("busy", m if len(m) < 40 else f"装载{app_label}…")

                ok2, msg2 = core.deploy_app(cfg, serial, app_alias, alias, progress=dprog)
                if not ok2:
                    self.set_status("fail", f"{label} 就绪，但{app_label}装载失败")
                    core.notify(f"{APP_TITLE} · {app_label} 装载失败",
                                f"{label} 已就绪，但 {msg2}{tail}", sound="Basso")
                    return
                self.set_status("ready", f"{label} · {app_label}{tail}")
                core.notify(f"{APP_TITLE} · {app_label} 已就绪",
                            f"{label}（{serial}）· {msg2}{tail}", sound="Glass")
                return

            self.set_status("ready", f"{label} 已就绪（未装载项目）{tail}")
            core.notify(f"{APP_TITLE} · {label} 已就绪",
                        f"{serial} 可以部署了（「启动后自动装载」已关，可在菜单里单次装载）{tail}",
                        sound="Glass")
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
        avds = sorted({i["avd"] for i in inst})
        self.running_avds_cache = avds
        if avds:
            state = "ready"
            text = " · ".join(avds) + f" 在跑（{len(avds)} 台）"
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


def _dump_menu() -> int:
    """离线体检：构建一遍右键菜单并打印（不创建状态项、不占菜单栏）。

    用法：`<bundle>/venv/bin/python emu_buddy.py --dump-menu`
    """
    NSApplication.sharedApplication()
    c = EvEmuBuddyApp.alloc().init()
    menu = c.build_menu()

    def walk(m, indent=0):
        for i in range(m.numberOfItems()):
            it = m.itemAtIndex_(i)
            if it.isSeparatorItem():
                print("  " * indent + "----")
                continue
            mark = "[x]" if it.state() == 1 else "[ ]"
            print(f"{'  ' * indent}{mark} {it.title()}" + ("" if it.isEnabled() else "   (disabled)"))
            sub = it.submenu()
            if sub is not None:
                walk(sub, indent + 1)

    walk(menu)
    print(f"\n== 菜单构建成功：{menu.numberOfItems()} 个顶层项 ==")
    return 0


if __name__ == "__main__":
    if "--dump-menu" in sys.argv:
        sys.exit(_dump_menu())
    main()
