from PIL import Image, ImageDraw

def make_arrow(color, path):
    img = Image.new('RGBA', (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(18, 24), (34, 14), (34, 18), (26, 24), (34, 30), (34, 34)], fill=color)
    d.rectangle([14, 21, 23, 27], fill=color)
    img.save(path)
    print("OK", path)

make_arrow('#cccccc', 'src/common/icons/dark/icon_back.png')
make_arrow('#333333', 'src/common/icons/light/icon_back.png')