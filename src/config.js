// Central tuning knobs for the tech demo. Change values here, not in the scenes.

// Art is drawn at 32 px per tile: the ChatGPT art has that much native detail.
// Placeholder art is drawn at 16 px and scaled up automatically (ART_SCALE).
export const TILE = 32; // px per tile
export const ART_SCALE = TILE / 16;

// Internal (logical) resolution. The canvas is scaled up to fit the window.
// 640x360 = 20 x 11 tiles; scales to whole numbers on 720p (2x), 1080p (3x), 1440p (4x).
export const VIEW_W = 640;
export const VIEW_H = 360;

// World size in tiles (100x75 tiles, about 5x7 screens).
export const MAP_W = 100;
export const MAP_H = 75;

export const DEFAULT_SEED = 1337;

export const PLAYER = {
  frameW: TILE,
  frameH: TILE * 1.5,
  walkSpeed: 5 * TILE, // px / second (5 tiles/s)
  runSpeed: 8.5 * TILE,
  animFps: 8,
  // Top-down trick: the collision box covers only the FEET, not the whole sprite.
  // That lets the head overlap walls/trees above, which sells the 3/4 perspective.
  body: { w: 20, h: 10, offsetX: 6, offsetY: 36 }, // for a 32x48 frame
};

export const CAMERA = {
  lerp: 0.12, // 1 = locked to the player, lower = smoother/laggier
  zoomLevels: [1, 2, 0.5],
};

// Real art. Set `enabled: true` once the PNG is in public/assets/sprites/.
// While false, procedurally generated placeholder art is used instead.
export const ASSETS = {
  // Build both with: python3 scripts/build_assets.py
  tileset: { file: 'assets/sprites/tileset.png', enabled: true }, // 256x256, 8x8 tiles of 32x32
  player: { file: 'assets/sprites/player.png', enabled: true }, // 128x192, 4x4 frames of 32x48
};
