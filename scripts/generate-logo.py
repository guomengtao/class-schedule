from PIL import Image, ImageDraw

SIZE = 512
OUTPUT = "src/logo.png"

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

cx, cy = SIZE / 2, SIZE / 2
R = SIZE / 2 - 4

draw.ellipse([cx - R, cy - R, cx + R, cy + R], fill="#1a1a2e")

dash_count = 8
dash_ratio = 0.7
segment_angle = 360.0 / dash_count
dash_angle = segment_angle * dash_ratio
for i in range(dash_count):
    start_angle = i * segment_angle - dash_angle / 2
    end_angle = start_angle + dash_angle
    draw.arc([cx - R, cy - R, cx + R, cy + R],
             start=start_angle, end=end_angle,
             fill="#7ec8e3", width=12)

card_w = 1.20 * R
card_h = 1.23 * R
card_left = cx - card_w / 2
card_top = cy - card_h / 2
card_right = card_left + card_w
card_bottom = card_top + card_h
card_radius = 0.06 * R

draw.rounded_rectangle([card_left, card_top, card_right, card_bottom],
                       radius=card_radius, fill="#16213e",
                       outline="#2a2a5e", width=2)

header_h = 0.14 * R
draw.rounded_rectangle([card_left, card_top, card_right, card_top + header_h],
                       radius=card_radius, fill="#7ec8e3")

label_w = 0.14 * R
label_h = 0.04 * R
label_left = card_left + 0.06 * R
label_top = card_top + header_h / 2 - label_h / 2
draw.rounded_rectangle([label_left, label_top,
                        label_left + label_w, label_top + label_h],
                       radius=label_h / 2, fill="#1a1a2e")

label_left2 = label_left + label_w + 0.04 * R
draw.rounded_rectangle([label_left2, label_top,
                        label_left2 + label_w * 0.7, label_top + label_h],
                       radius=label_h / 2, fill="#1a1a2e")

row_count = 5
row_top = card_top + header_h + 0.04 * R
row_bottom = card_bottom - 0.04 * R
row_h = (row_bottom - row_top) / row_count
row_gap = 0.02 * R

row_colors = [
    (0.45, 0.55),
    (0.55, 0.45),
    (0.40, 0.60),
    (0.50, 0.50),
    (0.35, 0.65),
]

for i in range(row_count):
    y = row_top + i * (row_h + row_gap)
    block_h = row_h

    dot_r = 0.025 * R
    dot_x = card_left + 0.1 * R
    dot_y = y + block_h / 2
    draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r],
                 fill="#7ec8e3")

    block_left = dot_x + dot_r + 0.05 * R
    block_right = card_right - 0.06 * R
    part = row_colors[i]
    block1_w = (block_right - block_left) * part[0]
    block2_start = block_left + block1_w + 0.015 * R

    draw.rounded_rectangle([block_left, y, block_left + block1_w, y + block_h],
                           radius=0.02 * R, fill="#7ec8e3")

    draw.rounded_rectangle([block2_start, y, block_right, y + block_h],
                           radius=0.02 * R, fill="#0f3460")

img = img.resize((128, 128), Image.LANCZOS)
img.save(OUTPUT, "PNG")
print("Logo saved to " + OUTPUT)