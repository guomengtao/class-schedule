#!/usr/bin/env python3
"""Generate EvEmuBuddy app icon."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/tmp/evemubuddy_icon.png"
SIZE = 1024

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

def draw_rounded_rect(draw, xy, r, fill):
    x1, y1, x2, y2 = xy
    draw.rectangle([x1 + r, y1, x2 - r, y2], fill=fill)
    draw.rectangle([x1, y1 + r, x2, y2 - r], fill=fill)
    draw.pieslice([x1, y1, x1 + 2 * r, y1 + 2 * r], 180, 270, fill=fill)
    draw.pieslice([x2 - 2 * r, y1, x2, y1 + 2 * r], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - 2 * r, x1 + 2 * r, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - 2 * r, y2 - 2 * r, x2, y2], 0, 90, fill=fill)

r = 160
margin = 60
draw_rounded_rect(draw, [margin, margin, SIZE - margin, SIZE - margin], r, (30, 35, 50, 255))

inner_margin = 100
draw_rounded_rect(draw, [inner_margin, inner_margin, SIZE - inner_margin, SIZE - inner_margin], r - 20, (60, 70, 110, 255))

# Phone/screen shape
phone_margin = 200
phone_w = SIZE - 2 * phone_margin
phone_h = int(phone_w * 1.6)
phone_x = phone_margin
phone_y = phone_margin + 40
phone_r = 60
draw_rounded_rect(draw, [phone_x, phone_y, phone_x + phone_w, phone_y + phone_h], phone_r, (25, 30, 45, 255))

# Screen
screen_margin = 30
screen_x = phone_x + screen_margin
screen_y = phone_y + screen_margin
screen_w = phone_w - 2 * screen_margin
screen_h = phone_h - 2 * screen_margin
screen_r = 40
draw_rounded_rect(draw, [screen_x, screen_y, screen_x + screen_w, screen_y + screen_h], screen_r, (45, 130, 200, 255))

# Code lines
code_y = screen_y + 60
for i, (w_pct, color) in enumerate([
    (0.5, (180, 215, 255, 255)),
    (0.35, (140, 190, 255, 255)),
    (0.45, (160, 205, 255, 255)),
]):
    bw = int(screen_w * w_pct)
    bx = screen_x + (screen_w - bw) // 2
    by = code_y + i * 80
    bh = 30
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=15, fill=color)

# "Ev" text
try:
    font = ImageFont.truetype("/System/Library/Fonts/SFCompactRounded.ttf", 180)
except Exception:
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 160)
    except Exception:
        font = ImageFont.load_default()

text = "Ev"
bbox = draw.textbbox((0, 0), text, font=font)
tw = bbox[2] - bbox[0]
tx = SIZE // 2 - tw // 2
ty = phone_y + phone_h + 20
draw.text((tx, ty), text, fill=(255, 255, 255, 240), font=font)

img.save(OUT, "PNG")
print(f"OK: {OUT} ({os.path.getsize(OUT)} bytes)")

# Smaller versions for icns
for s in [512, 256, 128, 64, 32, 16]:
    sm = img.resize((s, s), Image.LANCZOS)
    sm.save(f"/tmp/evemubuddy_icon_{s}.png", "PNG")
    print(f"  {s}x{s} OK")