#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
苹果表盘复刻 · 指针形状量化对比工具（纯 PIL，不依赖 numpy）

为什么不用整图差分：苹果基准图是固定时刻（约 10:09:3x），模拟器是当前时刻，
两图指针角度根本不同，整图逐像素差分只会把「角度差」算成「形状差」。
所以本工具按【单根指针】做独立量化：
  ① 自动识别基准图里时针/分针/秒针的角度（角向暗像素峰值）；
  ② 沿指针轴线，逐 1px 半径测「垂直宽度」→ 得到 width(r) 剖面；
  ③ 细颈/尾部形状 = width(r) 在 r∈[0,30] 段的形状（苹果是细→粗的锥形过渡）。

用法:
  python3 tools/wf-apple-compare.py                      # 用默认基准图 + /tmp/wf_v8.png
  python3 tools/wf-apple-compare.py --mine /tmp/x.png    # 指定我方截图
  python3 tools/wf-apple-compare.py --zoom 8             # 放大倍数（默认 8）
输出:
  /tmp/wf-cmp/side.png      并排（同尺度）
  /tmp/wf-cmp/zoom-*.png    中心 80x80 放大图（苹果 / 我方 / 并排）
  /tmp/wf-cmp/profiles.txt  宽度剖面数值
  stdout                    关键结论
"""
import argparse
import math
import os
import sys

from PIL import Image, ImageDraw

REF_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "docs", "reference", "apple-clock-widget")
DEFAULT_REF = os.path.join(REF_DIR, "widget-analog-numerals-white.png")
OUT_DIR = "/tmp/wf-cmp"


# ────────────────────────── 基础 ──────────────────────────
def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def is_dark(p, th=140):
    return lum(p) < th


def is_reddish(p, min_span=60):
    """秒针：橙红（R 明显大于 G/B）"""
    r, g, b = p[0], p[1], p[2]
    return r > 170 and (r - g) > min_span and (r - b) > min_span


def card_bbox(im, th=235, min_frac=0.30):
    """找白色卡片的包围盒（亮度 > th 的最大连通区域近似：按行/列覆盖率裁）"""
    w, h = im.size
    px = im.load()
    rows, cols = [], []
    for y in range(h):
        c = sum(1 for x in range(0, w, 2) if lum(px[x, y]) > th)
        if c > (w / 2) * min_frac:
            rows.append(y)
    for x in range(w):
        c = sum(1 for y in range(0, h, 2) if lum(px[x, y]) > th)
        if c > (h / 2) * min_frac:
            cols.append(x)
    if not rows or not cols:
        return None
    return (cols[0], rows[0], cols[-1], rows[-1])


def norm_card(im, target=320):
    """把白色卡片裁出来并缩放到 target×target，返回 (方形图, 卡片边长)"""
    bb = card_bbox(im)
    if bb is None:
        raise SystemExit("没找到白色卡片区域")
    x0, y0, x1, y1 = bb
    side = min(x1 - x0 + 1, y1 - y0 + 1)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    half = side // 2
    box = (cx - half, cy - half, cx - half + side, cy - half + side)
    return im.crop(box).resize((target, target), Image.LANCZOS), side


# ────────────────────── 角向识别指针 ──────────────────────
def angular_peaks(im, rmin=40, rmax=105, pick="dark", step=0.5):
    """返回 [(angle_deg, score)]，按 score 降序。角度 0=12点，顺时针。"""
    w, h = im.size
    cx = cy = (w - 1) / 2.0
    px = im.load()
    pred = is_dark if pick == "dark" else (lambda p: is_reddish(p))
    bins = {}
    a = 0.0
    while a < 360.0:
        rad = math.radians(a)
        ux, uy = math.sin(rad), -math.cos(rad)
        hit = 0
        r = rmin
        while r <= rmax:
            x = int(round(cx + ux * r))
            y = int(round(cy + uy * r))
            if 0 <= x < w and 0 <= y < h and pred(px[x, y]):
                hit += 1
            r += 0.5
        bins[a] = hit
        a += step
    # 局部极大 + 半高宽去重
    keys = sorted(bins)
    peaks = []
    for k in keys:
        v = bins[k]
        if v < 8:
            continue
        nb = [bins[(k + d) % 360] for d in (-step, step)]
        if v >= max(nb):
            peaks.append((k, v))
    peaks.sort(key=lambda t: -t[1])
    out = []
    for ang, sc in peaks:
        if all(min(abs(ang - a2), 360 - abs(ang - a2)) > 12 for a2, _ in out):
            out.append((ang, sc))
    return out


def width_profile(im, angle, rmax=160, half=9.0, pick="dark"):
    """沿 angle 方向，测每个半径 r 的垂直墨迹宽度（亚像素采样）。"""
    w, h = im.size
    cx = cy = (w - 1) / 2.0
    px = im.load()
    rad = math.radians(angle)
    ux, uy = math.sin(rad), -math.cos(rad)
    pxv, pyv = math.cos(rad), math.sin(rad)
    pred = is_dark if pick == "dark" else (lambda p: is_reddish(p))
    prof = []
    r = 0.0
    while r <= rmax:
        left = right = None
        t = -half
        while t <= half:
            x = int(round(cx + ux * r + pxv * t))
            y = int(round(cy + uy * r + pyv * t))
            if 0 <= x < w and 0 <= y < h and pred(px[x, y]):
                if left is None:
                    left = t
                right = t
            t += 0.25
        prof.append((r, 0.0 if left is None else (right - left + 0.25)))
        r += 1.0
    return prof


def first_solid(prof, min_w=1.0):
    for r, wd in prof:
        if wd >= min_w:
            return r
    return None


def last_solid(prof, min_w=1.0):
    last = None
    for r, wd in prof:
        if wd >= min_w:
            last = r
    return last


def describe(prof, label):
    """输出 r=4..40 的宽度序列 + 收敛到「全宽」的半径"""
    full = max(wd for _, wd in prof) if prof else 0
    reach = None
    for r, wd in prof:
        if wd >= full * 0.9:
            reach = r
            break
    seg = [(r, wd) for r, wd in prof if r <= 40]
    return {
        "label": label, "full": full, "reach90": reach,
        "len": last_solid(prof), "start": first_solid(prof),
        "seg": seg,
    }


# ────────────────────── 可视化 ──────────────────────
def zoom_center(im, box=90, scale=8):
    w, h = im.size
    cx, cy = w // 2, h // 2
    half = box // 2
    crop = im.crop((cx - half, cy - half, cx + half, cy + half))
    return crop.resize((box * scale, box * scale), Image.NEAREST)


def label(im, text, height=22):
    out = Image.new("RGB", (im.width, im.height + height), (255, 255, 255))
    out.paste(im, (0, height))
    d = ImageDraw.Draw(out)
    d.text((4, 5), text, fill=(0, 0, 0))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default=DEFAULT_REF)
    ap.add_argument("--mine", default="/tmp/wf_v8.png")
    ap.add_argument("--zoom", type=int, default=8)
    ap.add_argument("--box", type=int, default=90, help="中心放大取景边长(px，卡片坐标系)")
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    ref0 = Image.open(args.ref).convert("RGB")
    mine0 = Image.open(args.mine).convert("RGB")
    ref, ref_side = norm_card(ref0)
    mine, mine_side = norm_card(mine0)
    print(f"[输入] 基准 {args.ref} 卡片边长 {ref_side} → 归一 320")
    print(f"[输入] 我方 {args.mine} 卡片边长 {mine_side} → 归一 320")

    # 并排
    side = Image.new("RGB", (640 + 12, 320), (250, 250, 250))
    side.paste(ref, (0, 0))
    side.paste(mine, (332, 0))
    side.save(os.path.join(OUT_DIR, "side.png"))

    # 中心放大并排
    zr = zoom_center(ref, args.box, args.zoom)
    zm = zoom_center(mine, args.box, args.zoom)
    lg = 8
    zs = Image.new("RGB", (zr.width * 2 + lg, zr.height), (255, 0, 0))
    zs.paste(zr, (0, 0))
    zs.paste(zm, (zr.width + lg, 0))
    zs.save(os.path.join(OUT_DIR, "zoom-center-side.png"))
    label(zr, "APPLE").save(os.path.join(OUT_DIR, "zoom-apple.png"))
    label(zm, "MINE").save(os.path.join(OUT_DIR, "zoom-mine.png"))

    # 角向识别
    ref_dark = angular_peaks(ref)
    mine_dark = angular_peaks(mine)
    ref_red = angular_peaks(ref, rmin=30, rmax=110, pick="red")
    mine_red = angular_peaks(mine, rmin=30, rmax=110, pick="red")
    print(f"\n[角度] 基准 黑色指针峰值: {[(round(a,1), s) for a,s in ref_dark[:4]]}")
    print(f"[角度] 我方 黑色指针峰值: {[(round(a,1), s) for a,s in mine_dark[:4]]}")
    print(f"[角度] 基准 橙色秒针峰值: {[(round(a,1), s) for a,s in ref_red[:3]]}")
    print(f"[角度] 我方 橙色秒针峰值: {[(round(a,1), s) for a,s in mine_red[:3]]}")

    lines = []
    results = []
    for name, img, peaks, pick in (
        ("REF-hour", ref, ref_dark, "dark"),
        ("MINE-hour", mine, mine_dark, "dark"),
        ("REF-second", ref, ref_red, "red"),
        ("MINE-second", mine, mine_red, "red"),
    ):
        if not peaks:
            lines.append(f"{name}: 未识别到指针")
            continue
        ang = peaks[0][0]
        prof = width_profile(img, ang, rmax=165, pick=pick)
        d = describe(prof, f"{name}@{ang:.1f}deg")
        lines.append(f"\n=== {d['label']}  全长={d['len']}  起始r={d['start']}  90%宽度在r={d['reach90']}  最宽={d['full']:.2f}")
        for r, wd in d["seg"]:
            lines.append(f"  r={r:5.1f}  w={wd:5.2f}")
        results.append(d)

    # 分针单独：取第二峰
    for name, img, peaks in (("REF-minute", ref, ref_dark), ("MINE-minute", mine, mine_dark)):
        if len(peaks) < 2:
            continue
        ang = peaks[1][0]
        prof = width_profile(img, ang, rmax=165)
        d = describe(prof, f"{name}@{ang:.1f}deg")
        lines.append(f"\n=== {d['label']}  全长={d['len']}  起始r={d['start']}  90%宽度在r={d['reach90']}  最宽={d['full']:.2f}")
        for r, wd in d["seg"]:
            lines.append(f"  r={r:5.1f}  w={wd:5.2f}")

    path = os.path.join(OUT_DIR, "profiles.txt")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(lines[-40:]))
    print(f"\n[输出] {OUT_DIR}/side.png · zoom-center-side.png · profiles.txt")


if __name__ == "__main__":
    main()
