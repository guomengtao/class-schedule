#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
精确复刻验证工具 · EVX (Exact-Verify for Replication)
======================================================

定位：给「Mac 时钟组件 / 苹果表盘 / 手表表盘」的复刻稿做**通用量化核对**，
      不绑定某一种表盘形态，不依赖 numpy / OpenCV / scikit-image（纯 PIL）。

核心流程（四步，缺一步结论都不可信）：
  ① 定位主体   —— 背景分割求前景 + 行列覆盖率定主体 bbox；圆/方自适应；失败则要求 --crop
  ② 几何对齐   —— 缩放档位 × 平移网格搜索，取差异最小者（"调尺寸做重叠实验"的自动化版）
  ③ 同刻校验   —— 指针类自动反推两图时刻；时刻不一致时明确标注「差异含角度贡献」
  ④ 差异量化   —— SSIM / MAE / 超阈像素占比，按区域（同心环 或 九宫格）分别给分

与 wf-apple-compare.py 的分工：
  · wf-apple-compare.py  单款指针表盘的「针身宽度剖面」专项细查（窄而深）
  · wf-exact-verify.py   任意组件的「整体一致性 + 差异定位」通用核对（宽而稳）
  先跑本工具定位问题区域，再用针身剖面细查该区域。

用法：
  # 单例（同刻、同构图）
  python3 tools/wf-exact-verify.py --ref ref.png --mine shot.png --name apple-analog

  # 手动指定裁剪（自动定位失败时最可靠）
  python3 tools/wf-exact-verify.py --ref ref.png --mine shot.png \
      --crop-ref 10,10,310,310 --crop-mine 120,240,700,820

  # 数字表盘 / 非指针组件：跳过时刻读数
  python3 tools/wf-exact-verify.py --ref a.png --mine b.png --type digital

  # 批量
  python3 tools/wf-exact-verify.py --cases cases.json

  # 自校验（同一张图自比自，SSIM 必须 = 1.0，用于确认工具本身没问题）
  python3 tools/wf-exact-verify.py --self-test

退出码：
  0 = PASS   1 = WARN / FAIL   2 = INVALID（输入或定位不合格，拒绝出结论）

产物（默认 build/verify/<name>-<日期-时分秒>/）：
  side.png       并排同尺度
  overlay.png    50% 叠加（看重影/错位）
  diff.png       差异热力图（白=无差异，越红越差；叠在淡化底图上）
  blink.gif      A/B 闪烁（人眼找差异最快）
  report.md      人读
  report.json    机读
"""
import argparse
import glob
import json
import math
import os
import sys
import time
from collections import deque

try:
    from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageStat
except ImportError:
    sys.stderr.write("缺少 Pillow：python3 -m pip install pillow\n")
    sys.exit(2)

# ───────────────────────────── 常量 ─────────────────────────────
VERSION = "1.0.0"
SIZE = 320                 # 归一化边长（分析尺度）
TOL = 12                   # 单通道差异超此值算「超阈像素」（0-255）
SSIM_PASS = 0.995
SSIM_WARN = 0.970
OUT_PASS = 0.005           # 超阈像素占比
OUT_WARN = 0.030
CLOCK_TOL_SEC = 30         # 两图时刻容差（秒）

_SQ = [(i * i) // 255 for i in range(256)]


def die(msg, code=2):
    sys.stderr.write("\n[INVALID] %s\n" % msg)
    sys.exit(code)


# ─────────────────────────── ① 定位主体 ───────────────────────────
def border_colors(im, max_colors=12, step_max=64):
    """取四条边的采样色作为「背景候选」，支持渐变壁纸（多色聚类）。"""
    w, h = im.size
    px = im.load()
    pts = []
    sx = max(1, w // step_max)
    sy = max(1, h // step_max)
    for x in range(0, w, sx):
        pts.append(px[x, 0])
        pts.append(px[x, h - 1])
    for y in range(0, h, sy):
        pts.append(px[0, y])
        pts.append(px[w - 1, y])
    buckets = {}
    for p in pts:
        k = (p[0] // 24, p[1] // 24, p[2] // 24)
        b = buckets.setdefault(k, [0, 0, 0, 0])
        b[0] += p[0]
        b[1] += p[1]
        b[2] += p[2]
        b[3] += 1
    out = []
    for _, b in sorted(buckets.items(), key=lambda kv: -kv[1][3])[:max_colors]:
        n = b[3]
        out.append((b[0] / n, b[1] / n, b[2] / n))
    return out


def fg_mask(im, bgs, thr=30):
    """前景 = 与所有背景候选色的距离都 > thr 的像素。返回 L 图，255=前景。"""
    w, h = im.size
    px = im.load()
    out = Image.new("L", (w, h), 0)
    op = out.load()
    nb = len(bgs)
    thr2 = thr * thr
    for y in range(h):
        row = px[0, y]
        for x in range(w):
            # 逐行缓存像素对象访问（局部变量提速）
            p = px[x, y]
            r, g, b = p[0], p[1], p[2]
            far = True
            for i in range(nb):
                c = bgs[i]
                if (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2 <= thr2:
                    far = False
                    break
            if far:
                op[x, y] = 255
    return out


def span_from_coverage(mask, axis, min_frac=0.18):
    """按行列覆盖率求主体主区间（组件通常横跨多行/多列）。"""
    w, h = mask.size
    px = mask.load()
    vals = []
    if axis == "y":
        for y in range(h):
            c = 0
            for x in range(0, w, 2):
                if px[x, y]:
                    c += 1
            vals.append(c)
        limit = (w / 2.0) * min_frac
    else:
        for x in range(w):
            c = 0
            for y in range(0, h, 2):
                if px[x, y]:
                    c += 1
            vals.append(c)
        limit = (h / 2.0) * min_frac
    runs = []
    start = None
    for i, v in enumerate(vals):
        if v >= limit:
            if start is None:
                start = i
        else:
            if start is not None:
                runs.append((start, i - 1))
                start = None
    if start is not None:
        runs.append((start, len(vals) - 1))
    if not runs:
        return None
    return max(runs, key=lambda r: r[1] - r[0])


def _median(vals):
    s = sorted(vals)
    return s[len(s) // 2]


def _edge_uniformity(im):
    """四边采样色与全局中位色的平均色距。小 = 四边同色（已被裁成组件图）。"""
    w, h = im.size
    px = im.load()
    step = max(1, max(w, h) // 48)
    pts = []
    for x in range(0, w, step):
        pts.append(px[x, 0])
        pts.append(px[x, h - 1])
    for y in range(0, h, step):
        pts.append(px[0, y])
        pts.append(px[w - 1, y])
    mr = _median([p[0] for p in pts])
    mg = _median([p[1] for p in pts])
    mb = _median([p[2] for p in pts])
    tot = 0.0
    for p in pts:
        tot += math.sqrt((p[0] - mr) ** 2 + (p[1] - mg) ** 2 + (p[2] - mb) ** 2)
    return tot / max(1, len(pts))


def _corner_vs_center(im):
    """四角与中心的色距。大 = 四角不是组件本体（圆形表盘）。"""
    w, h = im.size
    px = im.load()
    k = max(2, min(w, h) // 16)

    def avg(x0, y0):
        r = g = b = n = 0
        for y in range(y0, min(y0 + k, h)):
            for x in range(x0, min(x0 + k, w)):
                p = px[x, y]
                r += p[0]
                g += p[1]
                b += p[2]
                n += 1
        n = n or 1
        return (r / n, g / n, b / n)

    corners = [avg(0, 0), avg(w - k, 0), avg(0, h - k), avg(w - k, h - k)]
    cx, cy = w // 2 - k // 2, h // 2 - k // 2
    center = avg(cx, cy)
    tot = 0.0
    for c in corners:
        tot += math.sqrt((c[0] - center[0]) ** 2 + (c[1] - center[1]) ** 2 +
                         (c[2] - center[2]) ** 2)
    return tot / len(corners)


def background_flood(im, tol=28):
    """从图像四条边界做泛洪（逐像素容差连通），能跨越渐变壁纸。
    返回 bytearray，1=背景。比「四边采样色比对」稳，因为渐变不会断裂。"""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            i = y * w + x
            if not seen[i]:
                seen[i] = 1
                dq.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if not seen[i]:
                seen[i] = 1
                dq.append((x, y))
    tol2 = tol * tol
    while dq:
        x, y = dq.popleft()
        p = px[x, y]
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not seen[i]:
                    q = px[nx, ny]
                    if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 +
                            (q[2] - p[2]) ** 2) <= tol2:
                        seen[i] = 1
                        dq.append((nx, ny))
    return seen


def fg_mask_from_flood(im, bg):
    """背景标记 → 前景 L 图（255=前景）。"""
    w, h = im.size
    out = Image.new("L", (w, h), 0)
    op = out.load()
    for y in range(h):
        base = y * w
        for x in range(w):
            if not bg[base + x]:
                op[x, y] = 255
    return out


def locate(im, crop=None, shape_hint="auto"):
    """返回 dict(bbox, shape, fill, fg_frac, how)。失败返回 None。"""
    w, h = im.size
    if crop:
        x0, y0, x1, y1 = crop
        x0, y0 = max(0, x0), max(0, y0)
        x1, y1 = min(w - 1, x1), min(h - 1, y1)
        if x1 - x0 < 16 or y1 - y0 < 16:
            return None
        return {"bbox": (x0, y0, x1, y1),
                "shape": "circle" if shape_hint == "circle" else "rect",
                "fill": 1.0, "fg_frac": 1.0, "how": "manual",
                "centroid": ((x0 + x1) / 2.0, (y0 + y1) / 2.0)}

    bgs = border_colors(im)
    bg = background_flood(im)
    mask = fg_mask_from_flood(im, bg)
    hist = mask.histogram()
    fg_total = hist[255] if len(hist) > 255 else sum(hist[1:])
    fg_frac = fg_total / float(w * h)
    if fg_frac < 0.02:
        # 前景几乎为零 → 整图同色（组件图已裁好、铺满整幅）
        return _full_frame(im, shape_hint, "full-frame(低前景)")

    # 主体包围盒用前景 bbox（而非行列覆盖率）：组件贴边时覆盖率会锁到内容散点上
    b = mask.getbbox()
    if b is None:
        return _full_frame(im, shape_hint, "full-frame(无前景)")
    x0, y0, x1, y1 = b[0], b[1], b[2] - 1, b[3] - 1
    if x1 - x0 < 16 or y1 - y0 < 16:
        return _full_frame(im, shape_hint, "full-frame(前景过窄)")

    # 前景质心 = 组件几何中心（圆形表盘的圆心常与图像中心不重合，必须用它）
    sx_sum = sy_sum = n_fg = 0
    for y in range(y0, y1 + 1):
        base = y * w
        for x in range(x0, x1 + 1):
            if not bg[base + x]:
                sx_sum += x
                sy_sum += y
                n_fg += 1
    cx = sx_sum / float(n_fg) if n_fg else (x0 + x1) / 2.0
    cy = sy_sum / float(n_fg) if n_fg else (y0 + y1) / 2.0

    inner = mask.crop((x0, y0, x1 + 1, y1 + 1))
    ih = inner.histogram()
    hit = ih[255] if len(ih) > 255 else sum(ih[1:])
    fill = hit / float(inner.width * inner.height)
    shape = _decide_shape(im, (x0, y0, x1, y1), fill, shape_hint)
    return {"bbox": (x0, y0, x1, y1), "shape": shape, "fill": fill,
            "fg_frac": fg_frac, "how": "auto", "centroid": (cx, cy)}


def _decide_shape(im, bbox, fill, shape_hint):
    if shape_hint in ("circle", "rect"):
        return shape_hint
    if fill >= 0.88:
        return "rect"
    if fill >= 0.66:
        return "circle"          # π/4 ≈ 0.785
    return "rect"                # 不规则按矩形（保守：不遮罩四角）


def radial_consistency(im, bgs=None):
    """从中心向 360° 找内容边界半径，返回 std/mean。越小越像圆形表盘。"""
    w, h = im.size
    px = im.load()
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    if bgs is None:
        bgs = border_colors(im)

    def is_content(p):
        for c in bgs:
            if (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 <= 40 * 40:
                return False
        return True

    rs = []
    rmax = min(w, h) / 2.0
    for a in range(0, 360, 4):
        rad = math.radians(a)
        ux, uy = math.sin(rad), -math.cos(rad)
        last = 0.0
        r = 0.0
        while r < rmax:
            x = int(round(cx + ux * r))
            y = int(round(cy + uy * r))
            if 0 <= x < w and 0 <= y < h and is_content(px[x, y]):
                last = r
            r += 1.0
        rs.append(last)
    mean = sum(rs) / len(rs)
    if mean < 5:
        return 9.99
    var = sum((v - mean) ** 2 for v in rs) / len(rs)
    return math.sqrt(var) / mean


def _full_frame(im, shape_hint, how):
    """整幅即组件：靠径向一致性判圆/方（四角色差会把并排布局误判成圆）。"""
    if shape_hint in ("circle", "rect"):
        shape = shape_hint
    else:
        rc = radial_consistency(im)
        shape = "circle" if rc < 0.08 else "rect"
        how = "%s rc=%.3f" % (how, rc)
    return {"bbox": (0, 0, im.width - 1, im.height - 1), "shape": shape,
            "fill": None, "fg_frac": 1.0, "how": how,
            "centroid": ((im.width - 1) / 2.0, (im.height - 1) / 2.0)}



def _sustained_edge(px, size, fix, axis, start, step, base, tol=40, sustain=22):
    """沿一条中线找「持续偏离 base 色」的第一个位置，避免把数字笔画误当边界。"""
    n = size
    i = start
    while 0 <= i < n:
        p = px[i, fix] if axis == "x" else px[fix, i]
        if (p[0] - base[0]) ** 2 + (p[1] - base[1]) ** 2 + (p[2] - base[2]) ** 2 > tol * tol:
            ok = True
            for k in range(1, sustain):
                j = i + k * step
                if not (0 <= j < n):
                    ok = False
                    break
                q = px[j, fix] if axis == "x" else px[fix, j]
                if (q[0] - base[0]) ** 2 + (q[1] - base[1]) ** 2 +                         (q[2] - base[2]) ** 2 <= tol * tol:
                    ok = False
                    break
            if ok:
                return i
        i += step
    return None


def find_dial_center(im):
    """求指针旋转中心。优先用「表盘本体」的中线边界（深卡片里的白圆盘），
    检测不可靠时退回图像几何中心。宁可退回也不乱猜。"""
    w, h = im.size
    px = im.load()
    cx0, cy0 = (w - 1) / 2.0, (h - 1) / 2.0
    y = h // 2
    x = w // 2
    lx = _sustained_edge(px, w, y, "x", 0, 1, px[0, y])
    rx = _sustained_edge(px, w, y, "x", w - 1, -1, px[w - 1, y])
    ty = _sustained_edge(px, h, x, "y", 0, 1, px[x, 0])
    by = _sustained_edge(px, h, x, "y", h - 1, -1, px[x, h - 1])

    cx, cy = cx0, cy0
    if lx is not None and rx is not None and 30 < (rx - lx) < 0.98 * w:
        cx = (lx + rx) / 2.0
    if ty is not None and by is not None and 30 < (by - ty) < 0.98 * h:
        cy = (ty + by) / 2.0
    return cx, cy


def normalize(im, loc, size=SIZE):
    """裁 bbox → 居中补边成正方形 → 缩放到 size。返回 (RGB, mask L, scale)"""
    x0, y0, x1, y1 = loc["bbox"]
    # 圆心优先用表盘本体中线边界（深卡片+白圆盘时 bbox 中心会偏 6-10px，
    # 而指针旋转中心要求精度 <3px）；检测不到才退回 bbox 中心。
    cx, cy = find_dial_center(im)
    if not (x0 <= cx <= x1 and y0 <= cy <= y1):
        cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    side = max(x1 - x0 + 1, y1 - y0 + 1)
    left = int(round(cx - side / 2.0))
    top = int(round(cy - side / 2.0))
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    sx0, sy0 = max(0, left), max(0, top)
    sx1, sy1 = min(im.width, left + side), min(im.height, top + side)
    if sx1 > sx0 and sy1 > sy0:
        canvas.paste(im.crop((sx0, sy0, sx1, sy1)), (sx0 - left, sy0 - top))
    scale = size / float(side)
    img = canvas.resize((size, size), Image.LANCZOS)

    if loc["shape"] == "circle":
        m = Image.new("L", (size, size), 0)
        d = ImageDraw.Draw(m)
        r = size // 2 - 1
        d.ellipse((size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r), fill=255)
        mask = m
    else:
        mask = Image.new("L", (size, size), 255)
    return img, mask, scale


# ─────────────────────────── ② 几何对齐 ───────────────────────────
def shift(im, dx, dy, fill=(255, 255, 255)):
    """平移（画布重贴，边界补底色；不用 ImageChops.offset 的环绕行为）。"""
    canvas = Image.new(im.mode, im.size, fill if im.mode == "RGB" else 255)
    canvas.paste(im, (int(round(dx)), int(round(dy))))
    return canvas


def _scaled_canvas(im, s, size):
    """按 s 缩放后居中贴回 size×size 画布，保证输出尺寸恒定。"""
    if abs(s - 1.0) < 1e-9:
        return im
    nw = max(8, int(round(im.width * s)))
    nh = max(8, int(round(im.height * s)))
    scaled = im.resize((nw, nh), Image.BILINEAR)
    canvas = Image.new(im.mode, (size, size), (255, 255, 255) if im.mode == "RGB" else 255)
    canvas.paste(scaled, ((size - nw) // 2, (size - nh) // 2))
    return canvas


def best_align(ref, mine, search=6, scales=(0.94, 0.96, 0.98, 1.0, 1.02, 1.04, 1.06),
               small=96):
    """在小尺度上做 缩放档 × 平移网格 搜索，返回 (dx, dy, s, mean_diff)。"""
    a0 = ref.convert("L").resize((small, small), Image.BOX)
    best = (0, 0, 1.0, 1e9)
    mg = mine.convert("L")
    for s in scales:
        b0 = _scaled_canvas(mg, s, mg.width).resize((small, small), Image.BOX)
        for dy in range(-search, search + 1):
            for dx in range(-search, search + 1):
                md = ImageStat.Stat(ImageChops.difference(a0, shift(b0, dx, dy))).mean[0]
                if md < best[3]:
                    best = (dx, dy, s, md)
    return best


def apply_align(im, dx, dy, s, small=96, size=SIZE):
    """把小尺度最优解换算到大尺度并应用（先缩放、后平移）。"""
    im2 = _scaled_canvas(im, s, size)
    k = size / float(small)
    return shift(im2, dx * k, dy * k)


# ─────────────────────────── ③ 时刻读数 ───────────────────────────
def _lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def _is_dark(p, th=140):
    return _lum(p) < th


def _is_light(p, th=165):
    return _lum(p) > th


def _is_red(p):
    r, g, b = p[0], p[1], p[2]
    return r > 150 and (r - g) > 45 and (r - b) > 45


def _pred(pick):
    if pick == "red":
        return _is_red
    if pick == "light":
        return _is_light
    return _is_dark


def ink_mode(img, mask, rmin_f=0.12, rmax_f=0.36):
    """判底色极性与墨迹方向。深底表盘（如 analog-dark）必须找亮针，否则只会找到背景。
    返回 "dark"（浅底暗针）或 "light"（深底亮针）。"""
    w = img.size[0]
    cx = cy = (w - 1) / 2.0
    px = img.load()
    mp = mask.load()
    dark = tot = 0
    for i in range(0, 360, 2):
        rad = math.radians(i)
        ux, uy = math.sin(rad), -math.cos(rad)
        r = rmin_f * w
        while r <= rmax_f * w:
            x = int(round(cx + ux * r))
            y = int(round(cy + uy * r))
            if 0 <= x < w and 0 <= y < w and mp[x, y]:
                tot += 1
                if _lum(px[x, y]) < 140:
                    dark += 1
            r += 2.0
    if tot == 0:
        return "dark"
    return "dark" if (dark / float(tot)) < 0.5 else "light"


def angular_peaks(img, mask, rmin_f, rmax_f, pick="dark", step=0.5):
    """沿角度累计命中数，返回 ([(angle, score)], max_hits)。角度 0=12点，顺时针。"""
    w, h = img.size
    cx = cy = (w - 1) / 2.0
    px = img.load()
    mp = mask.load()
    rmin = rmin_f * w
    rmax = rmax_f * w
    mh = int((rmax - rmin) / step) + 1
    pred = _pred(pick)

    n = int(round(360.0 / step))
    bins = [0] * n
    for i in range(n):
        rad = math.radians(i * step)
        ux, uy = math.sin(rad), -math.cos(rad)
        cnt = 0
        r = rmin
        while r <= rmax:
            x = int(round(cx + ux * r))
            y = int(round(cy + uy * r))
            if 0 <= x < w and 0 <= y < h and mp[x, y] and pred(px[x, y]):
                cnt += 1
            r += step
        bins[i] = cnt

    # 只保留局部极大
    cand = []
    for i in range(n):
        v = bins[i]
        if v < 3:
            continue
        if v >= bins[(i - 1) % n] and v >= bins[(i + 1) % n]:
            cand.append((_parabolic(bins, i, n) * step % 360.0, v))
    cand.sort(key=lambda t: -t[1])

    # 合并：粗针的上下边缘会形成两个峰（角差 8~14°），按得分加权合并成针中心线。
    # 直接丢弃会造成「保留边缘、丢掉中心」，后续测宽和测长全部偏。
    out = []
    for ang, sc in cand:
        hit = -1
        for i, (a2, s2) in enumerate(out):
            if min(abs(ang - a2), 360 - abs(ang - a2)) < 13.0:
                hit = i
                break
        if hit < 0:
            out.append((ang, sc))
        else:
            a2, s2 = out[hit]
            wsum = s2 + sc
            new_ang = ((a2 * s2 + ang * sc) / wsum) % 360.0 if wsum else a2
            out[hit] = (new_ang, max(s2, sc))
    out.sort(key=lambda t: -t[1])
    return out, mh


def _parabolic(bins, i, n):
    """三点抛物线插值，把峰值定位到亚步长（角度精度可达 ~0.1°）。"""
    y0, y1, y2 = bins[(i - 1) % n], bins[i], bins[(i + 1) % n]
    den = y0 - 2 * y1 + y2
    if den == 0:
        return float(i)
    off = 0.5 * (y0 - y2) / den
    off = max(-0.5, min(0.5, off))
    return i + off


def radial_extent(img, mask, angle, pick="dark", rmax_f=0.46, max_gap=2.5):
    """该方向的**连续**墨迹延伸半径（归一化 0-1）。
    断开超过 max_gap 即停 —— 避免把针尖之后的数字/刻度当成针身。"""
    w, h = img.size
    cx = cy = (w - 1) / 2.0
    px = img.load()
    mp = mask.load()
    pred = _pred(pick)
    rad = math.radians(angle)
    ux, uy = math.sin(rad), -math.cos(rad)
    last = None
    gap = 0.0
    r = 0.0
    while r <= rmax_f * w:
        x = int(round(cx + ux * r))
        y = int(round(cy + uy * r))
        hit = (0 <= x < w and 0 <= y < h and mp[x, y] and pred(px[x, y]))
        if hit:
            last = r
            gap = 0.0
        else:
            gap += 0.5
            if last is not None and gap > max_gap:
                break
        r += 0.5
    return None if last is None else last / float(w)


def _local_width(img, mask, angle, r, pick="dark", lim_frac=0.06):
    """在半径 r 处沿垂直方向测连续墨迹宽度（px）。断裂或超限返回 None。
    阈值取宽容版（暗底 175 / 亮针 120），以免细针被抗锯齿判成断裂。"""
    w, h = img.size
    cx = cy = (w - 1) / 2.0
    px = img.load()
    mp = mask.load()
    rad = math.radians(angle)
    ux, uy = math.sin(rad), -math.cos(rad)
    vx, vy = math.cos(rad), math.sin(rad)
    lim = int(lim_frac * w)

    if pick == "light":
        def is_ink(v):
            return _lum(v) > 120
    else:
        def is_ink(v):
            return _lum(v) < 175

    def dark(x, y):
        x = int(round(x))
        y = int(round(y))
        return 0 <= x < w and 0 <= y < h and mp[x, y] and is_ink(px[x, y])

    bx = cx + ux * r
    by = cy + uy * r
    if not dark(bx, by):
        return None
    half = 0
    t = 1
    while t <= lim and dark(bx - vx * t, by - vy * t):
        half = t
        t += 1
    t = 1
    while t <= lim and dark(bx + vx * t, by + vy * t):
        half = max(half, t)
        t += 1
    return half * 2 + 1


def stroke_width(img, mask, angle, ext, pick="dark", rmin_f=0.13, samples=17):
    """沿针身测宽度（区间按实际针长自适应，短针不会被判成断裂）。
    指针细而稳定；数字/色块会宽得多（实测 39px vs 指针 13px）。"""
    w = img.size[0]
    rmin = rmin_f * w
    rmax = ext * w * 0.88
    if rmax - rmin < 0.03 * w:
        return None
    ws = []
    for i in range(samples):
        r = rmin + (rmax - rmin) * i / float(samples - 1)
        wd = _local_width(img, mask, angle, r, pick)
        if wd is None:
            return None          # 径向断裂 → 不是实心针身
        ws.append(wd)
    ws.sort()
    med = ws[len(ws) // 2]
    mean = sum(ws) / float(len(ws))
    var = sum((v - mean) ** 2 for v in ws) / len(ws)
    cv = (math.sqrt(var) / mean) if mean else 9.9
    return {"median": med, "cv": round(cv, 3), "min": ws[0], "max": ws[-1]}


def read_clock(img, mask):
    """反推时刻。返回 dict；非指针表盘（或无把握）返回 None —— 宁可不出结论。"""
    w = img.size[0]
    mode = ink_mode(img, mask)          # 深底表盘要反过来找亮针
    dark, mh = angular_peaks(img, mask, 0.10, 0.36, mode)
    red, _ = angular_peaks(img, mask, 0.06, 0.40, "red")

    solid = []
    for ang, sc in dark:
        if sc < 0.35 * mh:
            continue
        ext = radial_extent(img, mask, ang, mode)
        if not ext or ext < 0.20:
            continue
        sw = stroke_width(img, mask, ang, ext, mode)
        if sw is None:
            continue
        # 指针形态：宽度不超过边长 6%（苹果分针实测 ~4%，数字色块 ~12%），且粗细稳定
        if sw["median"] > 0.06 * w or sw["cv"] > 0.55:
            continue
        solid.append({"angle": ang, "score": sc, "ext": ext, "w": sw["median"]})
    if len(solid) < 2:
        return None

    solid.sort(key=lambda d: -d["ext"])          # ext 降序 → 最长在前
    # 钟表常识：分针长于时针。最长的那根是分针，第二长的是时针。
    minute_ang = solid[0]["angle"]
    hour_ang = solid[1]["angle"]
    m_len, h_len = solid[0]["ext"], solid[1]["ext"]
    # 分针/时针长度比应在 1.15~2.4 之间，超出说明这两峰不是时/分针组合
    if h_len <= 0 or not (1.15 <= (m_len / h_len) <= 2.4):
        return None

    sec_ang = None
    for ang, sc in red:
        ext = radial_extent(img, mask, ang, "red")
        if not ext or ext < 0.25:
            continue
        sw = stroke_width(img, mask, ang, ext, "red", rmin_f=0.16)
        if sw is None or sw["median"] > 0.05 * w:
            continue
        sec_ang = ang
        break

    return {
        "hour_angle": round(hour_ang, 1), "minute_angle": round(minute_ang, 1),
        "second_angle": None if sec_ang is None else round(sec_ang, 1),
        "hour": (hour_ang / 30.0) % 12,
        "minute": (minute_ang / 6.0) % 60,
        "second": None if sec_ang is None else (sec_ang / 6.0) % 60,
        "minute_len": round(m_len, 3), "hour_len": round(h_len, 3),
        "minute_width_px": solid[0]["w"], "hour_width_px": solid[1]["w"],
        "len_ratio": round(m_len / h_len, 3), "ink_mode": mode,
        "n_dark_peaks": len(dark),
    }


def clock_gap_sec(c1, c2):
    """时刻差（秒）。只用分针+秒针推时间：时针角度含分钟小数，单独参与会把误差放大 12 倍。"""
    if c1 is None or c2 is None:
        return None
    a = c1["minute"] * 60.0 + (c1["second"] or 0.0)
    b = c2["minute"] * 60.0 + (c2["second"] or 0.0)
    d = abs(a - b)
    return min(d, 3600.0 - d)


# ─────────────────────────── ④ 差异量化 ───────────────────────────
def region_map(shape, size=SIZE):
    """P 模式区域索引图：0=不参与，1..N=有效区域。返回 (图, {idx: 名称})"""
    m = Image.new("P", (size, size), 0)
    d = ImageDraw.Draw(m)
    if shape == "circle":
        cx = cy = size / 2.0
        rs = [0.16, 0.40, 0.70, 1.0]
        for i in range(len(rs) - 1, -1, -1):
            r = rs[i] * (size / 2.0 - 1)
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=i + 1)
        names = {1: "中心r<16%", 2: "内环16-40%", 3: "中环40-70%", 4: "外环70-100%"}
    else:
        t = size // 3
        idx = 1
        for row in range(3):
            for col in range(3):
                d.rectangle((col * t, row * t, col * t + t - 1, row * t + t - 1), fill=idx)
                idx += 1
        names = {1: "左上", 2: "上中", 3: "右上", 4: "左中", 5: "中心",
                 6: "右中", 7: "左下", 8: "下中", 9: "右下"}
    return m, names


def compute_metrics(ref, mine, mask, shape):
    """一遍遍历同时算全局与分区。返回 (metrics dict, diff 图)"""
    a = ref.convert("L")
    b = mine.convert("L")
    win = 7
    f = ImageFilter.BoxBlur(win // 2)
    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2

    mu_a = a.filter(f)
    mu_b = b.filter(f)
    mu_a2 = mu_a.point(_SQ)
    mu_b2 = mu_b.point(_SQ)
    mu_ab = ImageChops.multiply(mu_a, mu_b)
    va = ImageChops.subtract(a.point(_SQ).filter(f), mu_a2)
    vb = ImageChops.subtract(b.point(_SQ).filter(f), mu_b2)
    cov = ImageChops.subtract(ImageChops.multiply(a, b).filter(f), mu_ab)

    diff = ImageChops.difference(a, b)
    rmap, rnames = region_map(shape, a.width)

    mabs = list(mu_ab.getdata())
    ma2 = list(mu_a2.getdata())
    mb2 = list(mu_b2.getdata())
    sas = list(va.getdata())
    sbs = list(vb.getdata())
    svs = list(cov.getdata())
    dds = list(diff.getdata())
    mpx = list(mask.getdata())
    rpx = list(rmap.getdata())
    n = a.width

    agg = {}
    g_ssim = g_abs = 0.0
    g_tol = 0
    g_cnt = 0
    for i in range(n * n):
        if not mpx[i]:
            continue
        mab = mabs[i]
        sa = sas[i]
        sb = sbs[i]
        num = (2 * mab + C1) * (2 * svs[i] + C2)
        den = (ma2[i] + mb2[i] + C1) * (sa + sb + C2)
        ss = num / den if den else 0.0
        dv = dds[i]
        e = agg.setdefault(rpx[i], [0.0, 0.0, 0, 0])
        e[0] += ss
        e[1] += dv
        if dv > TOL:
            e[2] += 1
            g_tol += 1
        e[3] += 1
        g_ssim += ss
        g_abs += dv
        g_cnt += 1

    def pack(e):
        cnt = e[3] or 1
        return {"ssim": round(e[0] / cnt, 5), "mae": round(e[1] / cnt, 2),
                "over_tol": round(e[2] / float(cnt), 5), "pixels": cnt}

    regions = {}
    for reg in sorted(agg):
        if reg == 0:
            continue
        d2 = pack(agg[reg])
        d2["name"] = rnames.get(reg, "R%d" % reg)
        regions[d2["name"]] = d2

    cnt = g_cnt or 1
    worst = min(regions.items(), key=lambda kv: kv[1]["ssim"]) if regions else None
    metrics = {
        "ssim": round(g_ssim / cnt, 5),
        "mae": round(g_abs / cnt, 2),
        "over_tol": round(g_tol / float(cnt), 5),
        "valid_pixels": g_cnt,
        "regions": regions,
    }
    if worst:
        metrics["worst_region"] = {"name": worst[0], "ssim": worst[1]["ssim"],
                                   "over_tol": worst[1]["over_tol"]}
    return metrics, diff


# ─────────────────────────── 渲染 ───────────────────────────
def _font(sz=16):
    for name in ("/System/Library/Fonts/Supplemental/Arial.ttf",
                 "/System/Library/Fonts/Helvetica.ttc"):
        if os.path.exists(name):
            try:
                return ImageFont.truetype(name, sz)
            except Exception:
                pass
    try:
        return ImageFont.load_default(size=sz)
    except Exception:
        return ImageFont.load_default()


def render_side(ref, mine, labels=("REF", "MINE")):
    gap = 10
    out = Image.new("RGB", (ref.width * 2 + gap, ref.height + 26), (250, 250, 252))
    out.paste(ref, (0, 26))
    out.paste(mine, (ref.width + gap, 26))
    d = ImageDraw.Draw(out)
    fo = _font(15)
    d.text((6, 5), labels[0], fill=(30, 30, 30), font=fo)
    d.text((ref.width + gap + 6, 5), labels[1], fill=(30, 30, 30), font=fo)
    d.rectangle((ref.width + gap // 2, 26, ref.width + gap // 2 + gap - 1, out.height),
                fill=(200, 200, 210))
    return out


def render_overlay(ref, mine, alpha=0.5):
    return Image.blend(ref, mine, alpha)


def render_diff(base, diff, boost=2.2):
    """白=无差异，越红差异越大；叠在淡化底图上便于定位。"""
    g = diff.point([max(0, 255 - int(i * boost)) for i in range(256)])
    heat = Image.merge("RGB", (Image.new("L", diff.size, 255), g, g))
    faded = base.convert("L").point([int(150 + i * 0.41) for i in range(256)]).convert("RGB")
    return Image.blend(faded, heat, 0.72)


def render_blink(ref, mine, size=320, ms=380, labels=("REF", "MINE")):
    """A/B 两帧，统一调色板避免播放时跳色。"""
    fo = _font(16)
    rgb = []
    for im, lb in ((ref, labels[0]), (mine, labels[1])):
        f = im.convert("RGB").resize((size, size), Image.LANCZOS)
        canvas = Image.new("RGB", (size, size + 24), (250, 250, 252))
        canvas.paste(f, (0, 24))
        ImageDraw.Draw(canvas).text((6, 3), lb, fill=(20, 20, 20), font=fo)
        rgb.append(canvas)
    p0 = rgb[0].quantize(colors=128, method=Image.MEDIANCUT)
    frames = [p0] + [im.quantize(palette=p0) for im in rgb[1:]]
    return frames, ms


# ─────────────────────────── 判定 ───────────────────────────
def verdict(m, gap, allow_gap):
    if m["ssim"] >= SSIM_PASS and m["over_tol"] <= OUT_PASS:
        v = "PASS"
    elif m["ssim"] >= SSIM_WARN and m["over_tol"] <= OUT_WARN:
        v = "WARN"
    else:
        v = "FAIL"
    if gap is not None and gap > CLOCK_TOL_SEC and not allow_gap and v == "PASS":
        v = "WARN"
    return v


# ─────────────────────────── 主流程 ───────────────────────────
def run_case(ref_p, mine_p, name, out_root, args):
    for p in (ref_p, mine_p):
        if not os.path.exists(p):
            die("输入不存在：%s" % p)
        if os.path.getsize(p) == 0:
            die("输入是 0 字节空文件：%s" % p)

    ref0 = Image.open(ref_p).convert("RGB")
    mine0 = Image.open(mine_p).convert("RGB")

    lr = locate(ref0, args.crop_ref, args.shape)
    lm = locate(mine0, args.crop_mine, args.shape)
    if lr is None:
        die("基准图自动定位失败（前景占比过低或主体不成块）。用 --crop-ref x0,y0,x1,y1 指定")
    if lm is None:
        die("我方图自动定位失败。用 --crop-mine x0,y0,x1,y1 指定")

    ar = (lr["bbox"][2] - lr["bbox"][0] + 1) / float(lr["bbox"][3] - lr["bbox"][1] + 1)
    am = (lm["bbox"][2] - lm["bbox"][0] + 1) / float(lm["bbox"][3] - lm["bbox"][1] + 1)
    shape_mismatch = abs(ar - am) / max(ar, am) > 0.15

    ref, rmask, rsc = normalize(ref0, lr)
    mine, mmask, msc = normalize(mine0, lm)

    if args.no_align:
        dx = dy = 0
        s = 1.0
        mine_a = mine
    else:
        dx, dy, s, _md = best_align(ref, mine, search=args.search)
        mine_a = apply_align(mine, dx, dy, s)

    mask = rmask if lr["shape"] == "circle" else Image.new("L", (SIZE, SIZE), 255)
    metrics, diff = compute_metrics(ref, mine_a, mask, lr["shape"])

    cr = cm = gap = auto_gap = None
    if args.type in ("auto", "analog"):
        cr = read_clock(ref, mask)
        cm = read_clock(mine_a, mask)
        auto_gap = clock_gap_sec(cr, cm)

    # 同刻判定的优先级：人工声明 > 自动识别。
    # 截图时刻是本方设定的（可用 ?debugTime= 或模拟器状态钉死），声明比从像素反推可靠；
    # 自动识别受圆心误差、抗锯齿、数字表盘干扰，只作辅助信息（auto_gap_sec）。
    declared = args.same_clock
    if declared:
        gap = 0.0
    else:
        gap = auto_gap
        if args.type == "analog" and (cr is None or cm is None):
            die("--type analog 但未能可靠读出指针；改用 --same-clock 声明同刻，或用 --crop 精确裁剪")

    v = verdict(metrics, gap, args.allow_clock_mismatch)

    od = os.path.join(out_root, "%s-%s" % (name, time.strftime("%Y%m%d-%H%M%S")))
    os.makedirs(od, exist_ok=True)
    render_side(ref, mine_a).save(os.path.join(od, "side.png"))
    render_overlay(ref, mine_a).save(os.path.join(od, "overlay.png"))
    render_diff(ref, diff).save(os.path.join(od, "diff.png"))
    frames, ms = render_blink(ref, mine_a, size=min(320, args.gif_size), ms=args.gif_ms)
    frames[0].save(os.path.join(od, "blink.gif"), save_all=True,
                   append_images=frames[1:], duration=ms, loop=0, optimize=True)

    rep = {
        "tool": "EVX", "version": VERSION, "name": name, "verdict": v,
        "ref": os.path.abspath(ref_p), "mine": os.path.abspath(mine_p),
        "locate": {
            "ref": {k: (list(x) if isinstance(x, tuple) else x) for k, x in lr.items()},
            "mine": {k: (list(x) if isinstance(x, tuple) else x) for k, x in lm.items()},
            "shape_mismatch": shape_mismatch,
            "ratio_ref": round(ar, 3), "ratio_mine": round(am, 3),
        },
        "align": {"dx": dx, "dy": dy, "scale": s,
                  "dx_px_r320": int(round(dx * SIZE / 96.0)),
                  "dy_px_r320": int(round(dy * SIZE / 96.0))},
        "metrics": metrics,
        "clock": {"ref": cr, "mine": cm, "declared": declared,
                  "auto_gap_sec": None if auto_gap is None else round(auto_gap, 1),
                  "gap_sec": None if gap is None else round(gap, 1),
                  "tol_sec": CLOCK_TOL_SEC},
        "artifacts": od,
        "normalized_scale": {"ref": round(rsc, 4), "mine": round(msc, 4)},
    }
    with open(os.path.join(od, "report.json"), "w") as f:
        json.dump(rep, f, ensure_ascii=False, indent=2)
    with open(os.path.join(od, "report.md"), "w") as f:
        f.write(to_md(rep))

    print(to_console(rep))
    return rep


def _clock_str(c):
    if c is None:
        return "—（未识别到指针）"
    h = int(c["hour"]) % 12
    mi = int(c["minute"])
    if c["second"] is not None:
        txt = "%02d:%02d:%04.1f" % (h, mi, c["second"])
    else:
        txt = "%02d:%02d" % (h, mi)
    return "%s（时针%.1f° 分针%.1f° 秒针%s）" % (
        txt, c["hour_angle"], c["minute_angle"],
        "—" if c["second_angle"] is None else "%.1f°" % c["second_angle"])


def to_console(r):
    L = []
    L.append("")
    L.append("╔══ EVX 精确复刻验证 · %s ══ 结论：%s" % (r["name"], r["verdict"]))
    m = r["metrics"]
    L.append("║ SSIM %.5f   MAE %5.2f   超阈 %.3f%%   有效像素 %d"
             % (m["ssim"], m["mae"], m["over_tol"] * 100, m["valid_pixels"]))
    a = r["align"]
    L.append("║ 对齐  平移(%+d,%+d)px@320  缩放 ×%.2f" % (a["dx_px_r320"], a["dy_px_r320"], a["scale"]))
    if r["locate"]["shape_mismatch"]:
        L.append("║ ⚠ 两图长宽比差>15%%（%.2f vs %.2f）——可能不是同一类组件"
                 % (r["locate"]["ratio_ref"], r["locate"]["ratio_mine"]))
    if r["clock"]["ref"] or r["clock"]["mine"]:
        L.append("║ 时刻  REF  %s" % _clock_str(r["clock"]["ref"]))
        L.append("║       MINE %s" % _clock_str(r["clock"]["mine"]))
        g = r["clock"]["gap_sec"]
        if g is not None:
            L.append("║       差 %.1f 秒 → %s"
                     % (g, "同刻 OK" if g <= CLOCK_TOL_SEC else "⚠ 不同刻，差异含角度贡献"))
    L.append("║ 分区（SSIM 越低越差）：")
    for nm, d in sorted(r["metrics"]["regions"].items(), key=lambda kv: kv[1]["ssim"]):
        L.append("║   %-12s SSIM %.4f  MAE %6.2f  超阈 %5.2f%%"
                 % (nm, d["ssim"], d["mae"], d["over_tol"] * 100))
    L.append("╚═ 产物 %s" % r["artifacts"])
    return "\n".join(L)


def to_md(r):
    m = r["metrics"]
    a = r["align"]
    L = ["# EVX 报告 · %s\n" % r["name"], "**结论：`%s`**\n" % r["verdict"],
         "| 指标 | 值 | 阈值 |", "|---|---|---|",
         "| SSIM | %.5f | PASS≥%.3f / WARN≥%.3f |" % (m["ssim"], SSIM_PASS, SSIM_WARN),
         "| MAE | %.2f | 越低越好 |" % m["mae"],
         "| 超阈像素占比 | %.3f%% | PASS≤%.1f%% / WARN≤%.1f%% |"
         % (m["over_tol"] * 100, OUT_PASS * 100, OUT_WARN * 100),
         "| 几何对齐 | 平移 (%+d, %+d) px @320 · 缩放 ×%.2f | — |"
         % (a["dx_px_r320"], a["dy_px_r320"], a["scale"]), ""]
    L.append("## 定位")
    for k in ("ref", "mine"):
        d = r["locate"][k]
        fl = d["fill"]
        L.append("- %s：bbox=%s shape=%s fill=%s 方式=%s"
                 % (k, d["bbox"], d["shape"],
                    "—" if fl is None else "%.3f" % fl, d["how"]))
    if r["locate"]["shape_mismatch"]:
        L.append("- ⚠ 长宽比相差 >15%%，可能不是同一类组件，结论仅供参考")
    L.append("")
    L.append("## 时刻")
    L.append("- REF：%s" % _clock_str(r["clock"]["ref"]))
    L.append("- MINE：%s" % _clock_str(r["clock"]["mine"]))
    ck = r["clock"]
    if ck.get("declared"):
        L.append("- **已声明同刻**：%s（以声明为准，自动读数为辅助）" % ck["declared"])
    if ck.get("auto_gap_sec") is not None and ck["auto_gap_sec"] != ck["gap_sec"]:
        L.append("- 自动识别差 %.1f 秒（仅供参考，未参与判定）" % ck["auto_gap_sec"])
    if ck["gap_sec"] is not None:
        L.append("- 差 **%.1f 秒**（容差 %d 秒）" % (ck["gap_sec"], CLOCK_TOL_SEC))
    L.append("")
    L.append("## 分区")
    L.append("| 区域 | SSIM | MAE | 超阈占比 | 像素数 |")
    L.append("|---|---|---|---|---|")
    for nm, d in sorted(m["regions"].items(), key=lambda kv: kv[1]["ssim"]):
        L.append("| %s | %.4f | %.2f | %.2f%% | %d |"
                 % (nm, d["ssim"], d["mae"], d["over_tol"] * 100, d["pixels"]))
    L.append("")
    L.append("## 产物")
    for f in ("side.png", "overlay.png", "diff.png", "blink.gif"):
        L.append("- `%s`" % f)
    return "\n".join(L) + "\n"


def self_test():
    """自比自：SSIM 必须 = 1.0；用于确认工具本身无系统性偏差。"""
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ref_dir = os.path.join(here, "docs", "reference", "apple-clock-widget")
    files = sorted(glob.glob(os.path.join(ref_dir, "*.png")))
    if not files:
        die("找不到自测素材：%s" % ref_dir)
    print("EVX 自测（同图自比自：SSIM 应=1.0，超阈应=0）\n")
    bad = 0
    for f in files:
        img = Image.open(f).convert("RGB")
        loc = locate(img)
        name = os.path.basename(f)
        if loc is None:
            print("  %-42s 定位失败（需 --crop）" % name)
            bad += 1
            continue
        n1, mask, _ = normalize(img, loc)
        m, _d = compute_metrics(n1, n1, mask, loc["shape"])
        ok = abs(m["ssim"] - 1.0) < 1e-4 and m["over_tol"] == 0.0
        print("  %-42s shape=%-6s fill=%.3f  SSIM=%.6f  %s"
              % (name, loc["shape"], loc["fill"], m["ssim"], "OK" if ok else "!! 异常"))
        if not ok:
            bad += 1
    print("\n%s" % ("自测通过：%d/%d" % (len(files) - bad, len(files)) if bad == 0
                    else "自测失败：%d/%d 项异常" % (bad, len(files))))
    return 0 if bad == 0 else 2


def main():
    ap = argparse.ArgumentParser(
        description="EVX 精确复刻验证工具（通用视觉对齐 + 差异量化）")
    ap.add_argument("--ref", help="基准图（苹果原版）")
    ap.add_argument("--mine", help="我方截图")
    ap.add_argument("--name", default=None, help="用例名（产物目录前缀）")
    ap.add_argument("--cases", help="批量 cases.json")
    ap.add_argument("--out", default=None, help="产物根目录（默认 build/verify）")
    ap.add_argument("--type", default="auto", choices=["auto", "analog", "digital"],
                    help="analog=强制读指针；digital=跳过时刻")
    ap.add_argument("--shape", default="auto", choices=["auto", "circle", "rect"])
    ap.add_argument("--crop-ref", help="手动裁剪基准图 x0,y0,x1,y1")
    ap.add_argument("--crop-mine", help="手动裁剪我方图 x0,y0,x1,y1")
    ap.add_argument("--search", type=int, default=6, help="平移搜索半径（96 尺度，默认 6）")
    ap.add_argument("--no-align", action="store_true", help="跳过几何对齐")
    ap.add_argument("--same-clock", metavar="说明", nargs="?", const="模拟器已锁定同一时刻",
                    default=None,
                    help="声明两图同刻（时刻由截图方设定，声明比像素反推可靠）；带值则记入报告")
    ap.add_argument("--allow-clock-mismatch", action="store_true",
                    help="不同刻也允许 PASS（默认不同刻降级 WARN）")
    ap.add_argument("--gif-size", type=int, default=320)
    ap.add_argument("--gif-ms", type=int, default=380)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        sys.exit(self_test())

    def parse_crop(s):
        if not s:
            return None
        try:
            parts = [int(float(x)) for x in s.replace("，", ",").split(",")]
        except ValueError:
            die("--crop 需要 4 个整数：x0,y0,x1,y1")
        if len(parts) != 4:
            die("--crop 需要 4 个整数：x0,y0,x1,y1")
        return tuple(parts)

    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_root = args.out or os.path.join(here, "build", "verify")

    cases = []
    if args.cases:
        try:
            with open(args.cases) as f:
                data = json.load(f)
        except Exception as e:
            die("读取 --cases 失败：%s" % e)
        for i, c in enumerate(data.get("cases", [])):
            cases.append({
                "name": c.get("name") or "case%02d" % (i + 1),
                "ref": c["ref"], "mine": c["mine"],
                "type": c.get("type", args.type),
                "crop_ref": parse_crop(c.get("crop_ref")),
                "crop_mine": parse_crop(c.get("crop_mine")),
                "shape": c.get("shape", args.shape),
                "same_clock": c.get("same_clock", args.same_clock),
            })
    elif args.ref and args.mine:
        cases.append({"name": args.name or os.path.splitext(os.path.basename(args.mine))[0],
                      "ref": args.ref, "mine": args.mine, "type": args.type,
                      "crop_ref": parse_crop(args.crop_ref),
                      "crop_mine": parse_crop(args.crop_mine),
                      "shape": args.shape, "same_clock": args.same_clock})
    else:
        ap.print_help()
        die("需要 --ref 与 --mine，或 --cases，或 --self-test")

    rank = {"PASS": 0, "WARN": 1, "FAIL": 2}
    worst = 0
    summary = []
    for c in cases:
        args.type = c["type"]
        args.shape = c["shape"]
        args.crop_ref = c["crop_ref"]
        args.crop_mine = c["crop_mine"]
        args.same_clock = c["same_clock"]
        rep = run_case(c["ref"], c["mine"], c["name"], out_root, args)
        summary.append(rep)
        worst = max(worst, rank[rep["verdict"]])

    if len(summary) > 1:
        print("\n=== 批量汇总 ===")
        for r in summary:
            print("  %-28s %-5s SSIM %.5f  超阈 %.2f%%"
                  % (r["name"], r["verdict"], r["metrics"]["ssim"],
                     r["metrics"]["over_tol"] * 100))
        print("  汇总结论：%s" % {0: "PASS", 1: "WARN", 2: "FAIL"}[worst])

    sys.exit(worst)


if __name__ == "__main__":
    main()
