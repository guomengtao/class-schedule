// [DEPRECATED] 已废弃：禁止使用。
// 本项目统一从 Lucide 官方源获取图标，不允许自己绘制图形（自绘 path 曾抄错导致图标变形）。
// 请改用：python3 _gen_lucide_icons.py
console.error("本脚本已废弃，改用 _gen_lucide_icons.py（图标一律取自 Lucide 官方源）");
process.exit(1);

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const base = "/Users/Banner/Documents/guomengtao/tom/class/class/src/common/icons";
const resultFile = "/Users/Banner/Documents/guomengtao/tom/class/class/_icon_gen_result.txt";

const colors = {
  dark: "200,200,200,255",
  light: "60,60,60,255",
};

const SIZE = 32;

function drawSolidTriangle(direction) {
  const margin = 4;
  if (direction === "left") {
    return `${SIZE - margin},${margin} ${margin},${Math.floor(SIZE / 2)} ${SIZE - margin},${SIZE - margin}`;
  }
  return `${margin},${margin} ${SIZE - margin},${Math.floor(SIZE / 2)} ${margin},${SIZE - margin}`;
}

const results = [];

for (const [theme, color] of Object.entries(colors)) {
  const themeDir = path.join(base, theme);
  fs.mkdirSync(themeDir, { recursive: true });

  for (const direction of ["left", "right"]) {
    const points = drawSolidTriangle(direction);
    const filename = `icon_arrow_${direction}.png`;
    const filepath = path.join(themeDir, filename);

    // Use ImageMagick if available, otherwise use Python PIL
    const cmd = `python3 -c "
from PIL import Image, ImageDraw
img = Image.new('RGBA', (${SIZE}, ${SIZE}), (0,0,0,0))
d = ImageDraw.Draw(img)
d.polygon([(${points.replace(/ /g, '), (')})], fill=(${color}))
img.save('${filepath}', 'PNG')
print('OK: ${theme}/${filename}')
"`;
    try {
      const out = execSync(cmd, { encoding: "utf-8", timeout: 10000 });
      results.push(out.trim());
    } catch (e) {
      results.push(`FAIL: ${theme}/${filename} - ${e.message}`);
    }
  }
}

results.push("DONE");
fs.writeFileSync(resultFile, results.join("\n"), "utf-8");
console.log("See result file: " + resultFile);