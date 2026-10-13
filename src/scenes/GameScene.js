import * as Phaser from 'phaser';
import { TILE, MAP_W, MAP_H, CAMERA, ASSETS, DEFAULT_SEED } from '../config.js';
import { COLLIDING } from '../world/tiles.js';
import { generateMap } from '../world/mapGenerator.js';
import { Player } from '../entities/Player.js';
import { Hud } from '../ui/hud.js';

// Render order (depth):
//   0 ground  ->  1 obstacles  ->  2 player  ->  3 above (crowns, roof ridge, tall grass)
const DEPTH = { ground: 0, obstacles: 1, player: 2, above: 3, debug: 100 };

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    this.seed = Number.parseInt(params.get('seed'), 10) || DEFAULT_SEED;

    // --- World ---
    const world = generateMap(this.seed, MAP_W, MAP_H);
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: MAP_W, height: MAP_H });
    const tileset = map.addTilesetImage('tiles', 'tileset', TILE, TILE, 0, 0);

    this.groundLayer = this.buildLayer(map, 'ground', tileset, world.ground, DEPTH.ground);
    this.obstacleLayer = this.buildLayer(map, 'obstacles', tileset, world.obstacles, DEPTH.obstacles);
    this.aboveLayer = this.buildLayer(map, 'above', tileset, world.above, DEPTH.above);

    this.groundLayer.setCollision(COLLIDING);
    this.obstacleLayer.setCollision(COLLIDING);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // --- Player ---
    Player.createAnimations(this);
    this.player = new Player(this, world.spawn.x * TILE + TILE / 2, world.spawn.y * TILE + TILE / 2);
    this.player.setDepth(DEPTH.player);
    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.player, this.obstacleLayer);

    // --- Camera ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, CAMERA.lerp, CAMERA.lerp);
    this.zoomIndex = 0;

    // --- Debug overlay (collision tiles + physics bodies) ---
    this.debugOn = false;
    this.debugGfx = this.add.graphics().setDepth(DEPTH.debug).setVisible(false);
    const style = {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(255, 60, 60, 90),
      faceColor: new Phaser.Display.Color(255, 220, 0, 255),
    };
    this.groundLayer.renderDebug(this.debugGfx, style);
    this.obstacleLayer.renderDebug(this.debugGfx, style);

    // --- Input: demo toggles ---
    const kb = this.input.keyboard;
    kb.on('keydown-G', () => this.toggleDebug());
    kb.on('keydown-H', () => this.aboveLayer.setVisible(!this.aboveLayer.visible));
    kb.on('keydown-Z', () => {
      this.zoomIndex = (this.zoomIndex + 1) % CAMERA.zoomLevels.length;
      cam.setZoom(CAMERA.zoomLevels[this.zoomIndex]);
    });
    kb.on('keydown-R', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('seed', String(Math.floor(Math.random() * 1e6)));
      window.location.href = url.toString();
    });

    this.hud = new Hud();
  }

  buildLayer(map, name, tileset, data, depth) {
    const layer = map.createBlankLayer(name, tileset);
    for (let y = 0; y < data.length; y++)
      for (let x = 0; x < data[y].length; x++)
        if (data[y][x] >= 0) layer.putTileAt(data[y][x], x, y);
    return layer.setDepth(depth);
  }

  toggleDebug() {
    this.debugOn = !this.debugOn;
    this.debugGfx.setVisible(this.debugOn);
    const w = this.physics.world;
    if (!w.debugGraphic) w.createDebugGraphic();
    w.drawDebug = this.debugOn;
    w.debugGraphic.clear();
    w.debugGraphic.setDepth(DEPTH.debug + 1).setVisible(this.debugOn);
  }

  update(time) {
    this.player.update();

    const feetY = this.player.body.bottom - 1;
    this.hud.update(time, {
      fps: Math.round(this.game.loop.actualFps),
      seed: this.seed,
      tileX: Math.floor(this.player.body.center.x / TILE),
      tileY: Math.floor(feetY / TILE),
      speed: this.player.speed,
      running: this.player.running,
      facing: this.player.facing,
      zoom: this.cameras.main.zoom,
      debug: this.debugOn,
      overlay: this.aboveLayer.visible,
      art: `${ASSETS.tileset.enabled ? 'tileset.png' : 'placeholder tiles'} / ${ASSETS.player.enabled ? 'player.png' : 'placeholder hero'}`,
    });
  }
}
