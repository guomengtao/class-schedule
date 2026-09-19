#!/usr/bin/env python3
"""Generate solid triangle arrow icons to replace line-arrow icons."""
from PIL import Image, ImageDraw
import os

BASE = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR = os.path.join(BASE, "src", "common", "icons")

# Color: (R, G, B, A)
# Dark theme icons: light gray for visibility on dark backgrounds
# Light theme icons: dark gray for visibility on light backgrounds
COLORS = {
    "dark": (200, 200, 200, 255),
    "light": (60, 60, 60, 255),
}

SIZE = 32
MARGIN = 4

def draw_triangle(draw, direction, color):
    """Draw a solid filled triangle."""
    if direction == "left":
        points = [
            (SIZE - MARGIN, MARGIN),
            (MARGIN, SIZE // 2),
            (SIZE - MARGIN, SIZE - MARGIN),
        ]
    else:  # right
        points = [
            (MARGIN, MARGIN),
            (SIZE - MARGIN, SIZE // 2),
            (MARGIN, SIZE - MARGIN),
        ]
    draw.polygon(points, fill=color)

for theme in ["dark", "light"]:
    theme_dir = os.path.join(ICONS_DIR, theme)
    os.makedirs(theme_dir, exist_ok=True)
    color = COLORS[theme]
    for direction in ["left", "right"]:
        img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw_triangle(draw, direction, color)
        filepath = os.path.join(theme_dir, f"icon_arrow_{direction}.png")
        img.save(filepath, "PNG")
        print(f"OK: {theme}/icon_arrow_{direction}.png")

print("Done! Solid triangle icons generated.")