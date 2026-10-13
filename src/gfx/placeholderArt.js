// Procedural placeholder art, drawn pixel by pixel on a 2D canvas.
// It uses EXACTLY the same sheet layout as the real art will (see docs/ART_PROMPTS.md),
// so swapping in the ChatGPT-made PNGs needs no code change.
// Pure canvas code: no Phaser dependency, so it can also be previewed standalone.

import { P } from './palette.js';
import { T } from '../world/tiles.js';
import { mulberry32 } from '../world/rng.js';

export const TILESET_SIZE = { w: 128, h: 128 };
export const PLAYER_SHEET = { w: 64, h: 96, frameW: 16, frameH: 24 };

// ---------- drawing helpers ----------
const rect = (c, col, x, y, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const disc = (c, col, cx, cy, rx, ry = rx) => {
  c.fillStyle = col;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) c.fillRect(x, y, 1, 1);
};
const speckle = (c, rng, cols, n, w = 1, h = 1) => {
  for (let k = 0; k < n; k++) rect(c, cols[k % cols.length], Math.floor(rng() * 16), Math.floor(rng() * 16), w, h);
};
const tri = (c, col, cx, top, height, halfW) => {
  for (let y = 0; y < height; y++) {
    const w = Math.max(1, Math.round((halfW * (y + 1)) / height));
    rect(c, col, cx - w, top + y, w * 2, 1);
  }
};

// ---------- tiles ----------
function grass(c, rng, extra = false) {
  rect(c, P.g3, 0, 0, 16, 16);
  speckle(c, rng, [P.g2], 14, 1, 2);
  speckle(c, rng, [P.g4], 9, 1, 2);
  if (extra) speckle(c, rng, [P.g5], 4);
}
function dirtBase(c, rng, base, dots) {
  rect(c, base, 0, 0, 16, 16);
  speckle(c, rng, dots, 22);
}
function water(c, rng, base = P.w3, hi = P.w4, lo = P.w2) {
  rect(c, base, 0, 0, 16, 16);
  for (let k = 0; k < 5; k++) rect(c, hi, Math.floor(rng() * 13), Math.floor(rng() * 16), 3, 1);
  speckle(c, rng, [lo], 6, 2, 1);
}
function wallBase(c) {
  rect(c, P.cream, 0, 0, 16, 16);
  rect(c, P.b2, 0, 0, 16, 1);
  rect(c, P.b2, 0, 0, 1, 16);
  rect(c, P.sand, 1, 14, 15, 2);
}
function roofBase(c) {
  rect(c, P.r2, 0, 0, 16, 16);
  for (let y = 3; y < 16; y += 4) {
    rect(c, P.r1, 0, y, 16, 1);
    const off = (y / 4) % 2 ? 0 : 4;
    for (let x = off; x < 16; x += 8) rect(c, P.r1, x, y - 3, 1, 3);
  }
}

const TILE_DRAWERS = {
  [T.GRASS]: (c, r) => grass(c, r),
  [T.GRASS2]: (c, r) => grass(c, r, true),
  [T.FLOWERS]: (c, r) => {
    grass(c, r);
    for (let k = 0; k < 4; k++) {
      const x = 2 + Math.floor(r() * 12), y = 2 + Math.floor(r() * 12);
      const petal = [P.white, P.r3, P.w5][k % 3];
      rect(c, petal, x - 1, y); rect(c, petal, x + 1, y); rect(c, petal, x, y - 1); rect(c, petal, x, y + 1);
      rect(c, P.yellow, x, y);
    }
  },
  [T.TALLGRASS]: (c, r) => {
    // transparent top: it is drawn OVER the player and only hides the feet
    for (let x = 0; x < 16; x += 2) {
      const h = 5 + Math.floor(r() * 5);
      rect(c, P.g2, x, 16 - h, 1, h);
      rect(c, P.g4, x, 16 - h, 1, 2);
      rect(c, P.g1, x + 1, 16 - h + 3, 1, h - 3);
    }
  },
  [T.PATH]: (c, r) => dirtBase(c, r, P.b5, [P.b4, P.sand]),
  [T.PATH2]: (c, r) => { dirtBase(c, r, P.b5, [P.b4, P.sand]); speckle(c, r, [P.s3, P.s4], 5, 2, 1); },
  [T.SAND]: (c, r) => dirtBase(c, r, P.sand, [P.b5, P.cream]),
  [T.BRIDGE]: (c) => {
    rect(c, P.b3, 0, 0, 16, 16);
    for (let y = 3; y < 16; y += 4) rect(c, P.b1, 0, y, 16, 1);
    rect(c, P.b4, 2, 1, 3, 1); rect(c, P.b4, 9, 5, 4, 1); rect(c, P.b4, 4, 9, 3, 1);
    rect(c, P.b2, 0, 0, 2, 16); rect(c, P.b2, 14, 0, 2, 16);
  },
  [T.WATER]: (c, r) => water(c, r),
  [T.WATER2]: (c, r) => water(c, r),
  [T.SHALLOW]: (c, r) => { water(c, r, P.w4, P.w5, P.w3); speckle(c, r, [P.sand], 3); },
  [T.COBBLE]: (c) => {
    rect(c, P.s2, 0, 0, 16, 16);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 2 : 0;
      for (let x = -2 + off; x < 16; x += 4) {
        rect(c, P.s3, x, row * 4, 3, 3);
        rect(c, P.s4, x, row * 4, 2, 1);
      }
    }
  },
  [T.DARKGRASS]: (c, r) => dirtBase(c, r, P.g2, [P.g1, P.g3]),
  [T.MUD]: (c, r) => dirtBase(c, r, P.b2, [P.b1, P.b3]),
  [T.GRAVEL]: (c, r) => dirtBase(c, r, P.s3, [P.s2, P.s4, P.s4]),
  [T.DIRT]: (c, r) => { dirtBase(c, r, P.b3, [P.b2, P.b4]); rect(c, P.b2, 0, 7, 16, 2); },

  [T.BUSH]: (c, r) => {
    disc(c, P.shadow, 8, 13.5, 7, 2.5);
    disc(c, P.g1, 8, 8.5, 7, 6);
    disc(c, P.g2, 7.5, 8, 6, 5);
    disc(c, P.g3, 6.5, 6.5, 3.5, 3);
    rect(c, P.g4, 5, 5, 2, 1);
    rect(c, P.r2, 10, 9); rect(c, P.r2, 5, 10); rect(c, P.r2, 9, 5);
  },
  [T.ROCK]: (c) => {
    disc(c, P.shadow, 8, 13.5, 7, 2.5);
    disc(c, P.s1, 8, 10, 7, 5);
    disc(c, P.s2, 7.5, 9.5, 6, 4);
    disc(c, P.s3, 7, 8.5, 4.5, 3);
    rect(c, P.s4, 5, 7, 3, 1);
  },
  [T.STUMP]: (c) => {
    disc(c, P.shadow, 8, 13.5, 7, 2.5);
    rect(c, P.b2, 3, 8, 10, 5);
    rect(c, P.b1, 11, 8, 2, 5);
    disc(c, P.b4, 8, 8, 5, 2.5);
    disc(c, P.b3, 8, 8, 3, 1.5);
    rect(c, P.b2, 7, 8, 2, 1);
  },
  [T.PEBBLES]: (c) => {
    [[3, 4], [10, 6], [6, 11], [12, 12]].forEach(([x, y]) => { rect(c, P.s2, x, y + 1, 2, 1); rect(c, P.s4, x, y, 2, 1); });
  },
  [T.FENCE]: (c) => {
    rect(c, P.b1, 0, 5, 16, 3); rect(c, P.b4, 0, 5, 16, 1);
    rect(c, P.b1, 0, 10, 16, 3); rect(c, P.b4, 0, 10, 16, 1);
    for (const x of [2, 11]) { rect(c, P.b1, x, 2, 3, 13); rect(c, P.b3, x, 2, 2, 12); rect(c, P.b4, x, 2, 2, 1); }
  },
  [T.SIGN]: (c) => {
    disc(c, P.shadow, 8, 14.5, 4, 1.5);
    rect(c, P.b1, 7, 8, 2, 7);
    rect(c, P.b1, 1, 1, 14, 8);
    rect(c, P.b4, 2, 2, 12, 6);
    rect(c, P.b2, 4, 4, 8, 1); rect(c, P.b2, 4, 6, 6, 1);
  },
  [T.LOG]: (c) => {
    disc(c, P.shadow, 8, 13.5, 8, 2);
    rect(c, P.b1, 1, 6, 13, 7);
    rect(c, P.b3, 1, 7, 12, 5);
    rect(c, P.b4, 1, 7, 12, 1);
    disc(c, P.b5, 13, 9.5, 2.5, 3.5);
    rect(c, P.b3, 13, 9, 1, 1);
  },
  [T.MUSHROOMS]: (c) => {
    for (const [x, y] of [[4, 8], [10, 11]]) {
      rect(c, P.cream, x, y, 2, 3);
      disc(c, P.r2, x + 1, y, 3, 2);
      rect(c, P.white, x - 1, y - 1); rect(c, P.white, x + 2, y);
    }
  },

  [T.ROOF_TOP]: (c) => { roofBase(c); c.clearRect(0, 0, 16, 6); rect(c, P.r1, 0, 6, 16, 2); rect(c, P.r3, 0, 6, 16, 1); },
  [T.ROOF_TOP_CHIMNEY]: (c) => {
    TILE_DRAWERS[T.ROOF_TOP](c);
    rect(c, P.s1, 9, 0, 5, 9); rect(c, P.s3, 9, 0, 4, 8); rect(c, P.s4, 9, 0, 4, 1); rect(c, P.s2, 9, 4, 4, 1);
  },
  [T.ROOF_TOP_L]: (c) => { TILE_DRAWERS[T.ROOF_TOP](c); c.clearRect(0, 0, 2, 16); rect(c, P.r1, 2, 6, 1, 10); },
  [T.ROOF_TOP_R]: (c) => { TILE_DRAWERS[T.ROOF_TOP](c); c.clearRect(14, 0, 2, 16); rect(c, P.r1, 13, 6, 1, 10); },
  [T.ROOF]: (c) => { roofBase(c); rect(c, P.r1, 0, 15, 16, 1); },
  [T.ROOF_DORMER]: (c) => {
    roofBase(c);
    rect(c, P.r1, 3, 2, 10, 11); rect(c, P.cream, 4, 4, 8, 8);
    rect(c, P.b1, 5, 5, 6, 6); rect(c, P.w4, 6, 6, 4, 4); rect(c, P.w5, 6, 6, 2, 1);
    rect(c, P.r1, 0, 15, 16, 1);
  },
  [T.ROOF_L]: (c) => { roofBase(c); c.clearRect(0, 0, 2, 16); rect(c, P.r1, 2, 0, 1, 16); rect(c, P.r1, 0, 15, 16, 1); },
  [T.ROOF_R]: (c) => { roofBase(c); c.clearRect(14, 0, 2, 16); rect(c, P.r1, 13, 0, 1, 16); rect(c, P.r1, 0, 15, 16, 1); },
  [T.WALL]: (c) => wallBase(c),
  [T.WALL_WINDOW]: (c) => {
    wallBase(c);
    rect(c, P.b1, 3, 3, 10, 9); rect(c, P.w3, 4, 4, 8, 7); rect(c, P.w5, 4, 4, 3, 2);
    rect(c, P.b1, 8, 4, 1, 7); rect(c, P.b1, 4, 7, 8, 1);
    rect(c, P.b4, 2, 12, 12, 1);
  },
  [T.DOOR]: (c) => {
    wallBase(c);
    rect(c, P.b1, 3, 2, 10, 14); rect(c, P.b2, 4, 3, 8, 13);
    rect(c, P.b1, 6, 3, 1, 13); rect(c, P.b1, 9, 3, 1, 13);
    rect(c, P.yellow, 10, 9);
  },
  [T.WALL_BEAM]: (c) => {
    wallBase(c);
    for (let i = 0; i < 13; i++) rect(c, P.b2, 2 + i, 1 + i, 2, 1);
  },
  [T.CRATE]: (c) => {
    disc(c, P.shadow, 8, 14.5, 7, 1.5);
    rect(c, P.b1, 2, 3, 12, 12); rect(c, P.b4, 3, 4, 10, 10);
    rect(c, P.b2, 3, 4, 10, 1); rect(c, P.b2, 3, 13, 10, 1);
    for (let i = 0; i < 10; i++) rect(c, P.b2, 3 + i, 4 + i);
  },
  [T.BARREL]: (c) => {
    disc(c, P.shadow, 8, 14.5, 6, 1.5);
    rect(c, P.b1, 3, 4, 10, 11); rect(c, P.b3, 4, 4, 8, 10); rect(c, P.b4, 5, 5, 2, 8);
    rect(c, P.s1, 3, 6, 10, 1); rect(c, P.s1, 3, 11, 10, 1);
    disc(c, P.b4, 8, 4, 5, 2); disc(c, P.b2, 8, 4, 3, 1);
  },
  [T.WELL]: (c) => {
    disc(c, P.shadow, 8, 13.5, 8, 2.5);
    disc(c, P.s1, 8, 9, 7.5, 6);
    disc(c, P.s3, 8, 8.5, 7, 5.5);
    disc(c, P.s1, 8, 8, 4.5, 3.5);
    disc(c, P.w1, 8, 8, 3.5, 2.5);
    rect(c, P.s4, 3, 5, 3, 1); rect(c, P.s4, 11, 11, 2, 1);
  },
  [T.HAY]: (c) => {
    disc(c, P.shadow, 8, 13.5, 7, 2.5);
    disc(c, P.b4, 8, 8.5, 7, 6);
    disc(c, P.yellow, 7.5, 8, 6, 5);
    rect(c, P.b5, 2, 7, 12, 1); rect(c, P.b5, 3, 10, 10, 1); rect(c, P.white, 5, 4, 2, 1);
  },
};

// Composite 2x2 trees (32x32), drawn across four tile slots.
function drawOak(c) {
  disc(c, P.shadow, 16, 28.5, 11, 3);
  rect(c, P.b2, 13, 18, 6, 11); rect(c, P.b1, 17, 18, 2, 11); rect(c, P.b3, 14, 19, 1, 8);
  disc(c, P.g1, 16, 11.5, 15, 11.5);
  disc(c, P.g2, 15.5, 11, 13.5, 10);
  disc(c, P.g3, 13, 9, 9, 7);
  disc(c, P.g4, 11, 7, 4.5, 3.5);
  rect(c, P.g5, 9, 5, 3, 1);
  rect(c, P.g1, 20, 14, 3, 1); rect(c, P.g1, 8, 16, 3, 1);
}
function drawPine(c) {
  disc(c, P.shadow, 16, 28.5, 10, 3);
  rect(c, P.b1, 14, 23, 4, 7); rect(c, P.b2, 14, 23, 2, 6);
  tri(c, P.g1, 16, 1, 10, 7); tri(c, P.g1, 16, 7, 10, 10); tri(c, P.g1, 16, 13, 12, 13);
  tri(c, P.g2, 15, 2, 8, 5); tri(c, P.g2, 15, 8, 8, 8); tri(c, P.g2, 15, 14, 10, 11);
  rect(c, P.g3, 12, 6, 2, 1); rect(c, P.g3, 10, 13, 3, 1); rect(c, P.g3, 7, 20, 4, 1);
}

export function drawTileset(ctx) {
  ctx.clearRect(0, 0, TILESET_SIZE.w, TILESET_SIZE.h);
  for (const [idx, fn] of Object.entries(TILE_DRAWERS)) {
    const i = Number(idx);
    ctx.save();
    ctx.translate((i % 8) * 16, Math.floor(i / 8) * 16);
    ctx.beginPath(); ctx.rect(0, 0, 16, 16); ctx.clip();
    fn(ctx, mulberry32(i * 7919 + 13));
    ctx.restore();
  }
  for (const [tl, fn] of [[T.TREE_TL, drawOak], [T.PINE_TL, drawPine]]) {
    ctx.save();
    ctx.translate((tl % 8) * 16, Math.floor(tl / 8) * 16);
    fn(ctx);
    ctx.restore();
  }
}

// ---------- player ----------
// Rows: 0 = down, 1 = left, 2 = right, 3 = up. Columns: walk frames 0-3 (0 = idle).
export const DIRS = ['down', 'left', 'right', 'up'];

function drawHero(c, dir, f) {
  const side = dir === 'left' || dir === 'right';
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const bob = f === 1 || f === 3 ? 1 : 0;

  disc(c, P.shadow, 8, 22.5, 5, 1.5);

  // legs + boots
  if (side) {
    const a = 7 + step * 2, b = 7 - step * 2;
    rect(c, P.ink, Math.min(a, b) - 1, 17, Math.abs(a - b) + 4, 7);
    rect(c, P.b2, a, 18, 2, 4); rect(c, P.b1, a, 21, 2, 2);
    rect(c, P.b2, b, 18, 2, 4); rect(c, P.b1, b, 21, 2, 2);
  } else {
    rect(c, P.ink, 4, 17, 8, 7);
    rect(c, P.b2, 5, 18, 2, 4 + (step > 0 ? 0 : -1)); rect(c, P.b1, 5, 21 + (step > 0 ? 0 : -1), 2, 2);
    rect(c, P.b2, 9, 18, 2, 4 + (step < 0 ? 0 : -1)); rect(c, P.b1, 9, 21 + (step < 0 ? 0 : -1), 2, 2);
  }

  const y0 = -bob + 1; // body/head vertical offset

  // body (tunic)
  rect(c, P.ink, 3, 10 + y0, 10, 9);
  rect(c, P.g3, 4, 11 + y0, 8, 7);
  rect(c, P.g2, 4, 11 + y0, 1, 7); rect(c, P.g2, 11, 11 + y0, 1, 7);
  rect(c, P.b2, 4, 15 + y0, 8, 1);
  if (dir === 'down') rect(c, P.yellow, 7, 15 + y0, 2, 1);

  // arms
  if (!side) {
    rect(c, P.ink, 2, 11 + y0 + step, 2, 5); rect(c, P.skin, 2, 14 + y0 + step, 1, 1); rect(c, P.g2, 2, 11 + y0 + step, 1, 3);
    rect(c, P.ink, 12, 11 + y0 - step, 2, 5); rect(c, P.skin, 13, 14 + y0 - step, 1, 1); rect(c, P.g2, 13, 11 + y0 - step, 1, 3);
  } else {
    const ax = dir === 'left' ? 6 + step : 8 - step;
    rect(c, P.g2, ax, 12 + y0, 2, 3); rect(c, P.skin, ax, 15 + y0, 2, 1);
  }

  // head
  rect(c, P.ink, 3, 1 + y0, 10, 10);
  rect(c, P.skin, 4, 2 + y0, 8, 8);
  rect(c, P.b2, 4, 2 + y0, 8, 3); // hair
  rect(c, P.b3, 5, 2 + y0, 4, 1);
  if (dir === 'down') {
    rect(c, P.b2, 4, 5 + y0, 1, 2); rect(c, P.b2, 11, 5 + y0, 1, 2);
    rect(c, P.ink, 6, 6 + y0, 1, 2); rect(c, P.ink, 9, 6 + y0, 1, 2);
    rect(c, P.r3, 7, 9 + y0, 2, 1);
  } else if (dir === 'up') {
    rect(c, P.b2, 4, 2 + y0, 8, 8); rect(c, P.b3, 5, 3 + y0, 2, 4);
  } else if (dir === 'left') {
    rect(c, P.b2, 8, 5 + y0, 4, 4);
    rect(c, P.ink, 5, 6 + y0, 1, 2); rect(c, P.skin, 3, 7 + y0, 1, 1);
  } else {
    rect(c, P.b2, 4, 5 + y0, 4, 4);
    rect(c, P.ink, 10, 6 + y0, 1, 2); rect(c, P.skin, 12, 7 + y0, 1, 1);
  }
}

export function drawPlayerSheet(ctx) {
  ctx.clearRect(0, 0, PLAYER_SHEET.w, PLAYER_SHEET.h);
  DIRS.forEach((dir, row) => {
    for (let f = 0; f < 4; f++) {
      ctx.save();
      ctx.translate(f * 16, row * 24);
      ctx.beginPath(); ctx.rect(0, 0, 16, 24); ctx.clip();
      drawHero(ctx, dir, f);
      ctx.restore();
    }
  });
}
