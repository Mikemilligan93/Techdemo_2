// Builds a seeded test world: forest border, crossroads, a village, a fenced field,
// a lake with a bridge, scattered forest and props.
//
// Three layers are produced (2D arrays of tile indices, -1 = empty):
//   ground    - always drawn first, under everything (water collides here)
//   obstacles - drawn under the player; most of these collide (tree trunks, walls)
//   above     - drawn OVER the player (tree crowns, roof ridge, tall grass)
//
// The obstacles/above split is the heart of the top-down 3/4 look: walk north of a
// tree and its crown hides your feet, walk south of it and you are drawn in front.

import { T, WATERY } from './tiles.js';
import { mulberry32 } from './rng.js';

export function generateMap(seed, W, H) {
  const rng = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const grid = (v) => Array.from({ length: H }, () => new Array(W).fill(v));

  const ground = grid(T.GRASS);
  const obstacles = grid(-1);
  const above = grid(-1);
  const reserved = grid(false); // cells that random scatter must not touch

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const reserve = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) if (inBounds(x, y)) reserved[y][x] = true;
  };
  const setObs = (x, y, t) => { if (inBounds(x, y)) { obstacles[y][x] = t; reserved[y][x] = true; } };

  // 1) Base grass with variation
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const r = rng();
      ground[y][x] = r < 0.04 ? T.FLOWERS : r < 0.2 ? T.GRASS2 : T.GRASS;
    }

  // 2) 2x2 trees: crown on the "above" layer, trunk on the collision layer
  const placeTree = (x, y, pine) => {
    if (!inBounds(x + 1, y + 1)) return;
    above[y][x] = pine ? T.PINE_TL : T.TREE_TL;
    above[y][x + 1] = pine ? T.PINE_TR : T.TREE_TR;
    obstacles[y + 1][x] = pine ? T.PINE_BL : T.TREE_BL;
    obstacles[y + 1][x + 1] = pine ? T.PINE_BR : T.TREE_BR;
    reserve(x, y, 2, 2);
  };

  // Forest border
  for (let x = 0; x < W - 1; x += 2) {
    placeTree(x, 0, rng() < 0.4);
    placeTree(x, H - 2, rng() < 0.4);
  }
  for (let y = 2; y < H - 3; y += 2) {
    placeTree(0, y, rng() < 0.4);
    placeTree(W - 2, y, rng() < 0.4);
  }

  // 3) Lake: deep water (collides) > shallow ring (walkable) > sand beach
  const lake = { cx: Math.floor(W * 0.7), cy: Math.floor(H * 0.72), rx: 14, ry: 8 };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = ((x - lake.cx) / lake.rx) ** 2 + ((y - lake.cy) / lake.ry) ** 2;
      if (d < 0.8) ground[y][x] = rng() < 0.3 ? T.WATER2 : T.WATER;
      else if (d < 1) ground[y][x] = T.SHALLOW;
      else if (d < 1.3) ground[y][x] = T.SAND;
      if (d < 1.3) reserved[y][x] = true;
    }

  // 4) Crossroads. Where the path meets water it becomes a bridge.
  const pathY = Math.floor(H / 2);
  const pathX = lake.cx;
  const setPath = (x, y) => {
    if (!inBounds(x, y)) return;
    ground[y][x] = WATERY.includes(ground[y][x]) ? T.BRIDGE : rng() < 0.15 ? T.PATH2 : T.PATH;
    reserved[y][x] = true;
  };
  for (let x = 0; x < W; x++) { setPath(x, pathY); setPath(x, pathY + 1); }
  for (let y = 0; y < H; y++) { setPath(pathX, y); setPath(pathX + 1, y); }
  setObs(pathX - 1, pathY - 1, T.SIGN);

  // 5) Village north of the road: cobbled plaza + three 5x4 houses
  const vx = Math.floor(W * 0.28);
  const plaza = { x: vx - 12, y: pathY - 6, w: 22, h: 6 };
  for (let y = plaza.y; y < plaza.y + plaza.h; y++)
    for (let x = plaza.x; x < plaza.x + plaza.w; x++) ground[y][x] = T.COBBLE;
  reserve(plaza.x, plaza.y, plaza.w, plaza.h);

  const houseTop = pathY - 10;
  for (const hx of [vx - 11, vx - 4, vx + 3]) {
    const y = houseTop;
    // Row 0 - roof ridge: ABOVE layer, no collision -> you can walk "behind" it
    above[y][hx] = T.ROOF_TOP_L;
    above[y][hx + 1] = T.ROOF_TOP;
    above[y][hx + 2] = T.ROOF_TOP_CHIMNEY;
    above[y][hx + 3] = T.ROOF_TOP;
    above[y][hx + 4] = T.ROOF_TOP_R;
    // Row 1 - roof, Rows 2-3 - walls (collide)
    const rows = [
      [T.ROOF_L, T.ROOF, T.ROOF_DORMER, T.ROOF, T.ROOF_R],
      [T.WALL, T.WALL_WINDOW, T.WALL_BEAM, T.WALL_WINDOW, T.WALL],
      [T.WALL, T.WALL, T.DOOR, T.WALL, T.WALL],
    ];
    rows.forEach((row, i) => row.forEach((t, j) => setObs(hx + j, y + 1 + i, t)));
    reserve(hx - 1, y - 1, 7, 6);
  }
  setObs(vx - 6, pathY - 4, T.WELL);
  setObs(plaza.x + plaza.w - 1, plaza.y, T.BARREL);
  setObs(plaza.x + plaza.w - 1, plaza.y + 1, T.BARREL);
  setObs(plaza.x, plaza.y, T.CRATE);
  setObs(plaza.x + 1, plaza.y, T.CRATE);

  // 6) Fenced field south of the road (gap in the top fence = entrance)
  const field = { x: vx - 10, y: pathY + 4, w: 17, h: 7 };
  for (let y = field.y; y < field.y + field.h; y++)
    for (let x = field.x; x < field.x + field.w; x++) {
      const edge = x === field.x || x === field.x + field.w - 1 || y === field.y || y === field.y + field.h - 1;
      const gate = y === field.y && (x === vx - 2 || x === vx - 1);
      if (edge && !gate) setObs(x, y, T.FENCE);
      else if (!edge) ground[y][x] = (y - field.y) % 2 ? T.MUD : T.DIRT;
    }
  reserve(field.x - 1, field.y - 1, field.w + 2, field.h + 2);
  setObs(field.x + 3, field.y + 2, T.HAY);
  setObs(field.x + 12, field.y + 4, T.HAY);

  // 7) Spawn point, kept clear
  const spawn = { x: pathX - 6, y: pathY + 3 };
  reserve(spawn.x - 3, spawn.y - 3, 7, 7);

  // 8) Forest: clustered around a few centres, plus some loners
  const free = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) if (!inBounds(x, y) || reserved[y][x]) return false;
    return true;
  };
  const centres = Array.from({ length: 8 }, () => ({ x: 6 + rng() * (W - 12), y: 6 + rng() * (H - 12) }));
  let placed = 0;
  for (let i = 0; i < 2500 && placed < 260; i++) {
    let x, y;
    if (rng() < 0.7) {
      const c = pick(centres);
      x = Math.round(c.x + (rng() + rng() - 1) * 12);
      y = Math.round(c.y + (rng() + rng() - 1) * 9);
    } else {
      x = 2 + Math.floor(rng() * (W - 5));
      y = 2 + Math.floor(rng() * (H - 5));
    }
    // 1-tile margin keeps a walkable gap between trees
    if (!free(x - 1, y - 1, 4, 4)) continue;
    placeTree(x, y, rng() < 0.35);
    placed++;
  }

  // 9) Single-tile props
  const props = [T.BUSH, T.BUSH, T.BUSH, T.ROCK, T.ROCK, T.STUMP, T.LOG, T.PEBBLES, T.MUSHROOMS];
  for (let i = 0, n = 0; i < 1500 && n < 180; i++) {
    const x = 1 + Math.floor(rng() * (W - 2));
    const y = 1 + Math.floor(rng() * (H - 2));
    if (!free(x, y, 1, 1)) continue;
    setObs(x, y, pick(props));
    n++;
  }

  // 10) Tall grass patches on the ABOVE layer: they cover the player's feet
  for (let i = 0; i < 45; i++) {
    const cx = 2 + Math.floor(rng() * (W - 4));
    const cy = 2 + Math.floor(rng() * (H - 4));
    const r = 1 + Math.floor(rng() * 2);
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if (inBounds(x, y) && !reserved[y][x] && rng() < 0.8) {
          above[y][x] = T.TALLGRASS;
          reserved[y][x] = true;
        }
  }

  return { ground, obstacles, above, spawn };
}
