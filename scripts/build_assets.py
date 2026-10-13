#!/usr/bin/env python3
"""
Build the game sprite sheets from the raw ChatGPT images in art-source/.

    python3 scripts/build_assets.py            # 32 px tiles (default, matches src/config.js)
    python3 scripts/build_assets.py --tile 16  # 16 px tiles

Reads   art-source/player_raw.png  (4x4 walk-cycle grid)
        art-source/terrain_raw.png (4x4 tile grid)          -> tileset quadrant A
        art-source/nature_raw.png  (2 trees + 8 props)      -> tileset quadrant B
        art-source/village_raw.png (4x4 house pieces/props) -> tileset quadrant C
Writes  public/assets/sprites/tileset.png  (8x8 tiles)
        public/assets/sprites/player.png   (4x4 frames, each TILE x 1.5*TILE)

How it works: AI images paint "fake" pixels (uneven blocks, noise, soft edges). Every
output pixel takes a majority vote over the matching block of the source image, so the
noise disappears. The magenta background becomes transparent and the purple-on-magenta
shadows become a soft, semi-transparent dark shadow.

Unlike pixelate.py (a generic grid resampler), this script knows the layout of each
sheet: it trims every sprite to its real bounds and fits it into its cell. That handles
images where ChatGPT didn't stick exactly to the grid (e.g. trees taller than 2x2 cells).
If you regenerate an image with a different layout, adjust NATURE_BOXES below.

Requires: pip3 install pillow numpy
"""
import argparse
import os
from collections import Counter

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SHADOW_RGBA = (26, 28, 44, 90)

# Nature sheet: (name, (x0, y0, x1, y1) in 0..1 fractions of the source image, dest tile col,
# dest tile row, width in tiles, height in tiles). Boxes are generous; sprites get trimmed.
NATURE_BOXES = [
    ("oak", (0.00, 0.00, 0.535, 0.60), 4, 0, 2, 2),
    ("pine", (0.54, 0.00, 1.00, 0.60), 6, 0, 2, 2),
    ("bush", (0.00, 0.61, 0.245, 0.80), 4, 2, 1, 1),
    ("rock", (0.26, 0.61, 0.50, 0.80), 5, 2, 1, 1),
    ("stump", (0.51, 0.61, 0.74, 0.80), 6, 2, 1, 1),
    ("pebbles", (0.78, 0.61, 1.00, 0.80), 7, 2, 1, 1),
    ("fence", (0.00, 0.80, 0.27, 1.00), 4, 3, 1, 1),
    ("sign", (0.29, 0.80, 0.47, 1.00), 5, 3, 1, 1),
    ("log", (0.49, 0.80, 0.77, 1.00), 6, 3, 1, 1),
    ("mushrooms", (0.80, 0.80, 1.00, 1.00), 7, 3, 1, 1),
]


# Cells that must have no transparent pixels: all terrain except tall grass (row 0, col 3),
# and the village roof (row 1) and wall (row 2) pieces.
TERRAIN_SOLID = {(r, c) for r in range(4) for c in range(4)} - {(0, 3)}
VILLAGE_SOLID = {(1, 0), (1, 1), (2, 0), (2, 1), (2, 2), (2, 3)}


def load(path):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.int32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    bg = (r > 185) & (b > 185) & (g < 120)
    shadow = ~bg & (r > 50) & (b > 60) & (g < 70) & (np.abs(r - b) < 100) & (r + b > 150)
    labels = np.full(r.shape, 2, np.int8)  # 0 = background, 1 = shadow, 2 = colour
    labels[bg] = 0
    labels[shadow] = 1
    return rgb, labels


def trim(labels, box):
    """Tight bounds of non-background pixels inside box (x0, y0, x1, y1) in source px."""
    x0, y0, x1, y1 = (int(round(v)) for v in box)
    sub = labels[y0:y1, x0:x1] > 0
    # ignore specks: require a few pixels per row/column
    rows = np.where(sub.sum(1) > 2)[0]
    cols = np.where(sub.sum(0) > 2)[0]
    if len(rows) == 0:
        return None
    return (x0 + cols[0], y0 + rows[0], x0 + cols[-1] + 1, y0 + rows[-1] + 1)


def resample(img, box, out_w, out_h):
    """Majority-vote downsample of source box -> (out_h, out_w, 4) RGBA array."""
    rgb, labels = img
    x0, y0, x1, y1 = box
    bx, by = (x1 - x0) / out_w, (y1 - y0) / out_h
    out = np.zeros((out_h, out_w, 4), np.uint8)
    for oy in range(out_h):
        sy0 = int(y0 + (oy + 0.15) * by)
        sy1 = max(int(y0 + (oy + 0.85) * by), sy0 + 1)
        for ox in range(out_w):
            sx0 = int(x0 + (ox + 0.15) * bx)
            sx1 = max(int(x0 + (ox + 0.85) * bx), sx0 + 1)
            lab = labels[sy0:sy1, sx0:sx1].ravel()
            col = rgb[sy0:sy1, sx0:sx1].reshape(-1, 3)
            votes = Counter()
            keys = []
            for l, c in zip(lab, col):
                k = "bg" if l == 0 else "sh" if l == 1 else (c[0] // 12, c[1] // 12, c[2] // 12)
                keys.append(k)
                votes[k] += 1
            if not votes:
                continue
            win = votes.most_common(1)[0][0]
            if win == "bg":
                continue
            if win == "sh":
                out[oy, ox] = SHADOW_RGBA
                continue
            sel = np.array([k == win for k in keys])
            out[oy, ox, :3] = col[sel].mean(0).round().astype(np.uint8)
            out[oy, ox, 3] = 255
    return out


def paste(sheet, sprite, x, y):
    h, w = sprite.shape[:2]
    H, W = sheet.shape[:2]
    sx0, sy0 = max(0, -x), max(0, -y)
    dx0, dy0 = max(0, x), max(0, y)
    w2, h2 = min(w - sx0, W - dx0), min(h - sy0, H - dy0)
    if w2 <= 0 or h2 <= 0:
        return
    src = sprite[sy0:sy0 + h2, sx0:sx0 + w2]
    dst = sheet[dy0:dy0 + h2, dx0:dx0 + w2]
    mask = src[..., 3] > 0
    dst[mask] = src[mask]


def fill_gaps(tile):
    """Solid tiles only: replace transparent pixels with the nearest opaque one in the
    same row, so cell-edge bleed from the AI image doesn't leave see-through seams."""
    for y in range(tile.shape[0]):
        solid = np.where(tile[y, :, 3] == 255)[0]
        if len(solid) == 0:
            continue
        for x in np.where(tile[y, :, 3] < 255)[0]:
            tile[y, x] = tile[y, solid[np.abs(solid - x).argmin()]]
    return tile


def grid_quadrant(sheet, path, T, col0, row0, solid=(), rows=4, cols=4):
    """solid: set of (row, col) cells that must be fully opaque (ground, roof, walls)."""
    img = load(path)
    H, W = img[1].shape
    for r in range(rows):
        for c in range(cols):
            box = (c * W / cols, r * H / rows, (c + 1) * W / cols, (r + 1) * H / rows)
            tile = resample(img, box, T, T)
            if (r, c) in solid:
                fill_gaps(tile)
            paste(sheet, tile, (col0 + c) * T, (row0 + r) * T)


def nature_quadrant(sheet, path, T):
    img = load(path)
    H, W = img[1].shape
    density = (W / 4) / T  # source px per output px for a plain grid cell
    for name, (fx0, fy0, fx1, fy1), tc, tr, tw, th in NATURE_BOXES:
        b = trim(img[1], (fx0 * W, fy0 * H, fx1 * W, fy1 * H))
        if not b:
            print(f"  nature: '{name}' not found, skipped")
            continue
        bw, bh = b[2] - b[0], b[3] - b[1]
        dw, dh = tw * T, th * T
        s = max(density, bw / dw, bh / dh)
        ow, oh = max(1, round(bw / s)), max(1, round(bh / s))
        if name == "fence":
            ow = dw  # stretch so neighbouring fence tiles connect
        sprite = resample(img, b, ow, oh)
        x = tc * T + (dw - ow) // 2
        y = tr * T + dh - oh  # sit on the bottom of the cell
        paste(sheet, sprite, x, y)


def player_sheet(path, T):
    fw, fh = T, T * 3 // 2
    img = load(path)
    H, W = img[1].shape
    cw, ch = W / 4, H / 4
    boxes = [[trim(img[1], (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for c in range(4)] for r in range(4)]
    max_h = max(b[3] - b[1] for row in boxes for b in row if b)
    max_w = max(b[2] - b[0] for row in boxes for b in row if b)
    s = max(max_h / (fh - 1), max_w / (fw - 1))  # one scale for all frames: consistent size
    sheet = np.zeros((fh * 4, fw * 4, 4), np.uint8)
    for r, row in enumerate(boxes):
        ground = max(b[3] for b in row if b)  # shared ground line per row: no vertical jitter
        for c, b in enumerate(row):
            if not b:
                continue
            ow, oh = max(1, round((b[2] - b[0]) / s)), max(1, round((b[3] - b[1]) / s))
            sprite = resample(img, b, ow, oh)
            cell_cx = (c + 0.5) * cw
            x = c * fw + round(fw / 2 + (b[0] - cell_cx) / s)
            y = r * fh + fh - round((ground - b[1]) / s)
            tile = np.zeros((fh, fw, 4), np.uint8)
            paste(tile, sprite, x - c * fw, y - r * fh)
            paste(sheet, tile, c * fw, r * fh)
    return sheet


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tile", type=int, default=32, choices=[16, 32])
    ap.add_argument("--src", default=os.path.join(ROOT, "art-source"))
    ap.add_argument("--out", default=os.path.join(ROOT, "public", "assets", "sprites"))
    a = ap.parse_args()
    T = a.tile
    os.makedirs(a.out, exist_ok=True)
    src = lambda n: os.path.join(a.src, n)

    if os.path.exists(src("player_raw.png")):
        Image.fromarray(player_sheet(src("player_raw.png"), T)).save(os.path.join(a.out, "player.png"))
        print(f"player.png  {4 * T}x{6 * T}")

    sheet = np.zeros((8 * T, 8 * T, 4), np.uint8)
    for name, fn in [
        ("terrain_raw.png", lambda p: grid_quadrant(sheet, p, T, 0, 0, TERRAIN_SOLID)),
        ("nature_raw.png", lambda p: nature_quadrant(sheet, p, T)),
        ("village_raw.png", lambda p: grid_quadrant(sheet, p, T, 0, 4, VILLAGE_SOLID)),
    ]:
        if os.path.exists(src(name)):
            fn(src(name))
            print(f"  + {name}")
        else:
            print(f"  - {name} missing, quadrant left empty")
    Image.fromarray(sheet).save(os.path.join(a.out, "tileset.png"))
    print(f"tileset.png {8 * T}x{8 * T}")


if __name__ == "__main__":
    main()
