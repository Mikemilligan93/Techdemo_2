import * as Phaser from 'phaser';
import { ASSETS, PLAYER, ART_SCALE } from '../config.js';
import { drawTileset, drawPlayerSheet, TILESET_SIZE, PLAYER_SHEET } from '../gfx/placeholderArt.js';

// Loads the real art when it is enabled in config.js, otherwise builds placeholders.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    if (ASSETS.tileset.enabled) this.load.image('tileset', ASSETS.tileset.file);
    if (ASSETS.player.enabled) {
      this.load.spritesheet('player', ASSETS.player.file, {
        frameWidth: PLAYER.frameW,
        frameHeight: PLAYER.frameH,
      });
    }
    this.load.on('loaderror', (file) => console.warn(`[Boot] could not load ${file.src}, using placeholder`));
  }

  create() {
    if (!this.textures.exists('tileset')) {
      this.placeholderTexture('tileset', TILESET_SIZE.w, TILESET_SIZE.h, drawTileset);
    }

    if (!this.textures.exists('player')) {
      const { w, h, frameW, frameH } = PLAYER_SHEET;
      const tex = this.placeholderTexture('player', w, h, drawPlayerSheet);
      // Register the 16 frames the same way a loaded spritesheet would (0..15)
      const fw = frameW * ART_SCALE, fh = frameH * ART_SCALE, cols = w / frameW;
      for (let i = 0; i < cols * (h / frameH); i++) {
        tex.add(i, 0, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh);
      }
      tex.refresh();
    }

    this.scene.start('Game');
  }

  // Placeholder art is drawn at 16 px/tile, then scaled up (nearest neighbour) to TILE.
  placeholderTexture(key, w, h, draw) {
    const src = document.createElement('canvas');
    src.width = w;
    src.height = h;
    draw(src.getContext('2d'));
    const tex = this.textures.createCanvas(key, w * ART_SCALE, h * ART_SCALE);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, w * ART_SCALE, h * ART_SCALE);
    tex.refresh();
    return tex;
  }
}
