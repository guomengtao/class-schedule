#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按 ev/class-schedule 既有图标规格生成 icon_week / icon_gear 两套 PNG。

规格（对齐现有 10 个图标）：32x32, 8-bit RGBA, 透明底, 单色, 4x 超采样抗锯齿。
dark 套前景色 rgb(200,200,200)；light 套 rgb(60,60,60)。
"""
import zlib, struct, os, math

SIZE = 32
SS = 4  # 超采样倍数


def write_png(path, rgba_rows):
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes(row) for row in rgba_rows)
    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)


def render(color, inside):
    """inside(x, y) -> bool，坐标系 32x32 浮点；4x4 超采样得 alpha。"""
    r, g, b = color
    rows = []
    for py in range(SIZE):
        row = []
        for px in range(SIZE):
            hit = 0
            for sy in range(SS):
                for sx in range(SS):
                    x = px + (sx + 0.5) / SS
                    y = py + (sy + 0.5) / SS
                    if inside(x, y):
                        hit += 1
            a = int(round(hit * 255.0 / (SS * SS)))
            row += [r, g, b, a]
        rows.append(row)
    return rows


# ---------- icon_week：3x3 网格，表示「总课程 / 周视图」 ----------
CELL = 6.5      # 每格边长
GAP = 2.0       # 格间距
START = (SIZE - (CELL * 3 + GAP * 2)) / 2.0  # = 5.5


def week_inside(x, y):
    for i in range(3):
        ox = START + i * (CELL + GAP)
        for j in range(3):
            oy = START + j * (CELL + GAP)
            if ox <= x < ox + CELL and oy <= y < oy + CELL:
                return True
    return False


# ---------- icon_gear：8 齿齿轮，表示「设置」 ----------
CX = CY = SIZE / 2.0
R_HOLE = 4.2    # 内孔半径
R_RING = 8.4    # 环外半径
R_TOOTH = 13.0  # 齿顶半径
TEETH = 8
TOOTH_HALF_ANGLE = math.radians(10.5)


def gear_inside(x, y):
    dx, dy = x - CX, y - CY
    r = math.hypot(dx, dy)
    if r < R_HOLE or r > R_TOOTH:
        return False
    if r <= R_RING:
        return True
    ang = math.atan2(dy, dx)
    step = 2 * math.pi / TEETH
    # 归到最近的齿中心
    k = round(ang / step)
    d = abs(ang - k * step)
    if d > math.pi:
        d = 2 * math.pi - d
    return d <= TOOTH_HALF_ANGLE


OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "common", "icons")
for theme, color in (("dark", (200, 200, 200)), ("light", (60, 60, 60))):
    write_png(f"{OUT}/{theme}/icon_week.png", render(color, week_inside))
    write_png(f"{OUT}/{theme}/icon_gear.png", render(color, gear_inside))
    print(f"{theme}: icon_week.png / icon_gear.png ok")
