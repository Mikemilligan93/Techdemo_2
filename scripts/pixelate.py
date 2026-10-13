#!/usr/bin/env python3
"""
Turn a ChatGPT "pixel art" image into real, game-ready pixel art.

AI image models paint *fake* pixels: blocks of uneven size, soft edges and colour
noise. This script resamples the image onto an exact grid (taking the most common
colour in each block), removes the magenta background and snaps every pixel to the
project palette.

Requires Pillow:  pip3 install pillow

Examples
--------
# Player sheet (1024x1536 from ChatGPT  ->  64x96, 4x4 frames of 16x24)
python3 scripts/pixelate.py art-source/player_raw.png public/assets/sprites/player.png --size 64x96

# One tileset quadrant (1024x1024  ->  64x64) pasted into the 128x128 tileset
python3 scripts/pixelate.py art-source/terrain_raw.png public/assets/sprites/tileset.png \
        --size 64x64 --into 128x128 --at 0,0      # A: terrain   (top-left)
#       --at 64,0   B: nature    (top-right)
#       --at 0,64   C: village   (bottom-left)
"""
import argparse
import os
from collections import Counter

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PALETTE = os.path.join(HERE, "..", "docs", "palette.hex")


def parse_pair(s, sep):
    a, b = s.lower().split(sep)
    return int(a), int(b)


def load_palette(path):
    if not path or not os.path.exists(path):
        return None
    cols = []
    with open(path) as f:
        for line in f:
            line = line.strip().lstrip("#")
            if len(line) == 6:
                cols.append(tuple(int(line[i:i + 2], 16) for i in (0, 2, 4)))
    return cols or None


def nearest(c, palette):
    return min(palette, key=lambda p: (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--size", required=True, help="target size in real pixels, e.g. 64x96")
    ap.add_argument("--key", default="ff00ff", help="background colour to make transparent (hex)")
    ap.add_argument("--tolerance", type=int, default=90, help="how close to --key counts as background (0-441)")
    ap.add_argument("--palette", default=DEFAULT_PALETTE, help="palette .hex file; pass '' to disable")
    ap.add_argument("--into", help="paste into an existing/new sheet of this size, e.g. 128x128")
    ap.add_argument("--at", default="0,0", help="paste position in px inside --into, e.g. 64,0")
    args = ap.parse_args()

    tw, th = parse_pair(args.size, "x")
    key = tuple(int(args.key[i:i + 2], 16) for i in (0, 2, 4))
    palette = load_palette(args.palette)

    src = Image.open(args.input).convert("RGBA")
    sw, sh = src.size
    px = src.load()
    bx, by = sw / tw, sh / th
    if abs(bx / by - 1) > 0.05:
        print(f"warning: source {sw}x{sh} is not proportional to {tw}x{th}; pixels will be stretched")

    out = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    opx = out.load()
    tol2 = args.tolerance ** 2

    for y in range(th):
        for x in range(tw):
            # sample the inner 60% of the block to avoid the blurry block edges
            x0, x1 = int((x + 0.2) * bx), max(int((x + 0.8) * bx), int((x + 0.2) * bx) + 1)
            y0, y1 = int((y + 0.2) * by), max(int((y + 0.8) * by), int((y + 0.2) * by) + 1)
            votes = Counter()
            for sy in range(y0, min(y1, sh)):
                for sx in range(x0, min(x1, sw)):
                    r, g, b, a = px[sx, sy]
                    if a < 128 or (r - key[0]) ** 2 + (g - key[1]) ** 2 + (b - key[2]) ** 2 < tol2:
                        votes[None] += 1
                    else:
                        # coarse bucketing so near-identical noisy colours vote together
                        votes[(r // 8 * 8, g // 8 * 8, b // 8 * 8)] += 1
            col = votes.most_common(1)[0][0] if votes else None
            if col is None:
                continue
            if palette:
                col = nearest(col, palette)
            opx[x, y] = (*col, 255)

    if args.into:
        iw, ih = parse_pair(args.into, "x")
        ax, ay = parse_pair(args.at, ",")
        sheet = Image.open(args.output).convert("RGBA") if os.path.exists(args.output) else Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
        if sheet.size != (iw, ih):
            raise SystemExit(f"{args.output} is {sheet.size}, expected {iw}x{ih}")
        sheet.paste(out, (ax, ay))
        out = sheet

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    out.save(args.output)
    print(f"saved {args.output} ({out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    main()
