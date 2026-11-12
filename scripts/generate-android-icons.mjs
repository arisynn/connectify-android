#!/usr/bin/env node
/**
 * Generates Android adaptive launcher icons, legacy mipmap icons,
 * and Android 12+ splash screen assets from Connectify's brand mark.
 * Owned by @android-eng.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  join(root, 'public/art/brand/mark.webp'),
  join(root, 'public/art/premium/brand/mark.webp'),
  resolve(root, '../connectify-new/public/art/premium/brand/mark.webp'),
];

const sourceIcon = candidates.find((p) => existsSync(p));
if (!sourceIcon) {
  console.error('Could not find mark.webp in public/art/brand/ or connectify-new.');
  process.exit(1);
}

const androidResDir = join(root, 'android/app/src/main/res');

const pythonScript = `
import os
import sys
from PIL import Image, ImageDraw

src_path = sys.argv[1]
res_dir = sys.argv[2]

BG_COLOR = (255, 250, 245, 255)      # #FFFAF5 Connectify Warm Paper
GLOW_COLOR = (255, 232, 224, 255)    # Soft warm peach tint
BORDER_COLOR = (23, 35, 55, 255)     # #172337 Deep Club Ink

mark = Image.open(src_path).convert("RGBA")

# Crop transparent padding so safe-zone scaling is optically exact
bbox = mark.getbbox()
if bbox:
    mark = mark.crop(bbox)

def make_square_fit(img, target_px, fill_ratio):
    canvas = Image.new("RGBA", (target_px, target_px), (0, 0, 0, 0))
    inner = int(round(target_px * fill_ratio))
    w, h = img.size
    scale = min(inner / w, inner / h)
    nw, nh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    ox = (target_px - nw) // 2
    oy = (target_px - nh) // 2
    canvas.paste(resized, (ox, oy), resized)
    return canvas

def make_legacy_icon(img, target_px, rounded_rect=True):
    canvas = Image.new("RGBA", (target_px, target_px), (0, 0, 0, 0))
    bg = Image.new("RGBA", (target_px, target_px), BG_COLOR)
    mask = Image.new("L", (target_px, target_px), 0)
    draw = ImageDraw.Draw(mask)
    if rounded_rect:
        radius = int(round(target_px * 0.22))
        draw.rounded_rectangle([0, 0, target_px - 1, target_px - 1], radius=radius, fill=255)
    else:
        draw.ellipse([0, 0, target_px - 1, target_px - 1], fill=255)
    canvas.paste(bg, (0, 0), mask)
    fg = make_square_fit(img, target_px, 0.72)
    canvas.alpha_composite(fg)
    return canvas

adaptive_sizes = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

legacy_sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in adaptive_sizes.items():
    out_dir = os.path.join(res_dir, folder)
    os.makedirs(out_dir, exist_ok=True)
    # 62% fits comfortably inside Android's 66dp/108dp adaptive icon safe circle
    fg = make_square_fit(mark, size, 0.62)
    fg.save(os.path.join(out_dir, "ic_launcher_foreground.png"), "PNG")

for folder, size in legacy_sizes.items():
    out_dir = os.path.join(res_dir, folder)
    os.makedirs(out_dir, exist_ok=True)
    make_legacy_icon(mark, size, rounded_rect=True).save(os.path.join(out_dir, "ic_launcher.png"), "PNG")
    make_legacy_icon(mark, size, rounded_rect=False).save(os.path.join(out_dir, "ic_launcher_round.png"), "PNG")

# Android 12+ Splash icon (288x288 canvas with 192px safe inner mark)
nodpi_dir = os.path.join(res_dir, "drawable-nodpi")
os.makedirs(nodpi_dir, exist_ok=True)
splash_icon = make_square_fit(mark, 288, 0.64)
splash_icon.save(os.path.join(nodpi_dir, "splash_icon.png"), "PNG")

# Adaptive icon XMLs
anydpi_dir = os.path.join(res_dir, "mipmap-anydpi-v26")
os.makedirs(anydpi_dir, exist_ok=True)
adaptive_xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"""
for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
    with open(os.path.join(anydpi_dir, name), "w", encoding="utf-8") as f:
        f.write(adaptive_xml)

# Color resources
values_dir = os.path.join(res_dir, "values")
os.makedirs(values_dir, exist_ok=True)
bg_colors_xml = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFAF5</color>
    <color name="splash_background">#FFFAF5</color>
</resources>
"""
with open(os.path.join(values_dir, "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write(bg_colors_xml)

# Splash drawable for pre-Android 12
drawable_dir = os.path.join(res_dir, "drawable")
os.makedirs(drawable_dir, exist_ok=True)
splash_xml = """<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background" />
    <item
        android:width="160dp"
        android:height="160dp"
        android:drawable="@drawable/splash_icon"
        android:gravity="center" />
</layer-list>
"""
with open(os.path.join(drawable_dir, "splash.xml"), "w", encoding="utf-8") as f:
    f.write(splash_xml)

print("Generated Connectify adaptive icons, legacy icons, and splash assets successfully.")
`;

const result = spawnSync('python3', ['-c', pythonScript, sourceIcon, androidResDir], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
