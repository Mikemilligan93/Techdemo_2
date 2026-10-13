import * as Phaser from 'phaser';
import { ASSETS, PLAYER, ENEMY, ART_SCALE } from '../config.js';
import {
  drawTileset, drawPlayerSheet, drawCombatSheet, drawNpcSheet,
  TILESET_SIZE, PLAYER_SHEET, COMBAT_SHEET, NPC_SHEET,
} from '../gfx/placeholderArt.js';

// Loads the real art when it is enabled in config.js, otherwise builds placeholders.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    if (ASSETS.tileset.enabled) this.load.image('tileset', ASSETS.tileset.file);
    if (ASSETS.player.enabled) {
      this.load.spritesheet('player', ASSETS.player.file, { frameWidth: PLAYER.frameW, frameHeight: PLAYER.frameH });
    }
    if (ASSETS.combat.enabled) {
      this.load.spritesheet('combat', ASSETS.combat.file, { frameWidth: ENEMY.frame, frameHeight: ENEMY.frame });
    }
    if (ASSETS.npc.enabled) {
      this.load.spritesheet('npc', ASSETS.npc.file, { frameWidth: PLAYER.frameW, frameHeight: PLAYER.frameH });
    }
    this.load.on('loaderror', (file) => console.warn(`[Boot] could not load ${file.src}, using placeholder`));
  }

  create() {
    if (!this.textures.exists('tileset')) {
      this.placeholderTexture('tileset', TILESET_SIZE, drawTileset);
    }
    if (!this.textures.exists('player')) {
      this.placeholderTexture('player', PLAYER_SHEET, drawPlayerSheet, true);
    }
    if (!this.textures.exists('combat')) {
      this.placeholderTexture('combat', COMBAT_SHEET, drawCombatSheet, true);
    }
    if (!this.textures.exists('npc')) {
      this.placeholderTexture('npc', NPC_SHEET, drawNpcSheet, true);
    }
    this.scene.start('Game');
  }

  // Placeholder art is drawn at 16 px/tile, then scaled up (nearest neighbour) to TILE.
  // With `frames`, the sheet is also cut into numbered frames like a loaded spritesheet.
  placeholderTexture(key, size, draw, frames = false) {
    const { w, h } = size;
    const src = document.createElement('canvas');
    src.width = w;
    src.height = h;
    draw(src.getContext('2d'));
    const tex = this.textures.createCanvas(key, w * ART_SCALE, h * ART_SCALE);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, w * ART_SCALE, h * ART_SCALE);
    if (frames) {
      const fw = size.frameW * ART_SCALE, fh = size.frameH * ART_SCALE, cols = w / size.frameW;
      for (let i = 0; i < cols * (h / size.frameH); i++) {
        tex.add(i, 0, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh);
      }
    }
    tex.refresh();
    return tex;
  }
}
