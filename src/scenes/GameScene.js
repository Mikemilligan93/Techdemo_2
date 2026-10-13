import * as Phaser from 'phaser';
import { TILE, MAP_W, MAP_H, CAMERA, ASSETS, DEFAULT_SEED, COMBAT, ENEMY } from '../config.js';
import { COLLIDING, T } from '../world/tiles.js';
import { generateMap } from '../world/mapGenerator.js';
import { Player } from '../entities/Player.js';
import { Slime } from '../entities/Slime.js';
import { Hud } from '../ui/hud.js';

// Render order (depth):
//   0 ground -> 1 obstacles -> 2.x player + slimes (y-sorted) -> 2.9 bolts -> 3 above
const DEPTH = { ground: 0, obstacles: 1, bolts: 2.9, above: 3, debug: 100 };

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    this.seed = Number.parseInt(params.get('seed'), 10) || DEFAULT_SEED;

    // --- World ---
    const world = generateMap(this.seed, MAP_W, MAP_H);
    this.world = world;
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
    this.spawnPoint = { x: world.spawn.x * TILE + TILE / 2, y: world.spawn.y * TILE + TILE / 2 };
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y);
    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.player, this.obstacleLayer);

    // --- Enemies ---
    Slime.createAnimations(this);
    this.slimes = this.physics.add.group();
    this.kills = 0;
    for (let i = 0; i < ENEMY.count; i++) this.spawnSlime();
    this.physics.add.collider(this.slimes, this.groundLayer); // water
    this.physics.add.collider(this.slimes, this.obstacleLayer);
    this.physics.add.collider(this.slimes, this.slimes);
    this.physics.add.overlap(this.player, this.slimes, (player, slime) => this.onPlayerTouched(slime));
    this.time.addEvent({
      delay: ENEMY.respawnMs,
      loop: true,
      callback: () => { if (this.slimes.countActive() < ENEMY.count) this.spawnSlime(true); },
    });

    // --- Projectiles ---
    this.bolts = this.physics.add.group({ maxSize: 20 });
    this.lastShot = -Infinity;
    // Bolts fly over water (ground layer) but stop at walls, trunks, rocks...
    this.physics.add.collider(this.bolts, this.obstacleLayer, (bolt) => this.killBolt(bolt));
    this.physics.add.overlap(this.bolts, this.slimes, (bolt, slime) => {
      if (!bolt.active || slime.dying) return;
      slime.hit(bolt.x - bolt.body.velocity.x, bolt.y - bolt.body.velocity.y, COMBAT.bolt.damage, this.time.now);
      this.killBolt(bolt);
    });

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

  // ---------- enemies ----------

  // Random free grass tile, far enough from the player (and off-screen when respawning)
  spawnSlime(offscreen = false) {
    const { ground, obstacles, above } = this.world;
    const view = this.cameras.main.worldView;
    for (let tries = 0; tries < 200; tries++) {
      const tx = Phaser.Math.Between(2, MAP_W - 3);
      const ty = Phaser.Math.Between(2, MAP_H - 3);
      const g = ground[ty][tx];
      if (obstacles[ty][tx] >= 0 || above[ty][tx] >= 0) continue;
      if (![T.GRASS, T.GRASS2, T.FLOWERS, T.DARKGRASS].includes(g)) continue;
      const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < ENEMY.minSpawnDist) continue;
      if (offscreen && view.contains(x, y)) continue;
      const slime = new Slime(this, x, y - 8);
      slime.on('died', () => { this.kills += 1; });
      this.slimes.add(slime);
      // adding to a physics group resets body defaults, so set these afterwards
      slime.body.setBounce(1, 1);
      slime.setCollideWorldBounds(true);
      return slime;
    }
    return null;
  }

  onPlayerTouched(slime) {
    if (slime.dying) return;
    const now = this.time.now;
    if (!this.player.hurt(slime.x, slime.y, now)) return;
    this.cameras.main.shake(120, 0.006);
    this.player.setTintFill(0xff4040);
    this.time.delayedCall(90, () => this.player.clearTint());
    if (this.player.isDead) this.onPlayerDied();
  }

  onPlayerDied() {
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(450, () => {
      this.player.revive(this.spawnPoint.x, this.spawnPoint.y, this.time.now);
      this.cameras.main.fadeIn(400, 0, 0, 0);
    });
  }

  // ---------- projectiles ----------

  tryShoot(time) {
    const p = this.player;
    if (p.isDead || time - this.lastShot < COMBAT.bolt.cooldownMs) return;
    const bolt = this.bolts.get(p.x + p.aim.x * 10, p.y + p.aim.y * 10 + 4, 'combat', 3);
    if (!bolt) return; // pool exhausted
    this.lastShot = time;
    bolt.setActive(true).setVisible(true).setDepth(DEPTH.bolts);
    bolt.body.enable = true;
    bolt.body.reset(bolt.x, bolt.y);
    // The sprite flies at hand height, but its hitbox is ~10 px lower, on the "ground plane"
    // where all other hitboxes (feet, trunks, walls) live. Same trick as the feet-only hitbox.
    const r = 7;
    bolt.body.setCircle(r, bolt.width / 2 - r, bolt.height / 2 - r + 10);
    bolt.setVelocity(p.aim.x * COMBAT.bolt.speed, p.aim.y * COMBAT.bolt.speed);
    bolt.setRotation(p.aim.angle());
    bolt.startX = bolt.x;
    bolt.startY = bolt.y;
  }

  killBolt(bolt) {
    if (!bolt.active) return;
    bolt.body.stop();
    bolt.body.enable = false;
    bolt.setActive(false).setVisible(false);
  }

  // ---------- debug ----------

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
    this.player.update(time);
    if (this.player.keys.fire.isDown) this.tryShoot(time);

    for (const s of this.slimes.getChildren()) s.think(time, this.player);

    // bolts fizzle after their range
    for (const b of this.bolts.getChildren()) {
      if (b.active && Phaser.Math.Distance.Between(b.startX, b.startY, b.x, b.y) > COMBAT.bolt.range) this.killBolt(b);
    }

    const feetY = this.player.body.bottom - 1;
    this.hud.update(time, {
      fps: Math.round(this.game.loop.actualFps),
      seed: this.seed,
      hp: this.player.hp,
      maxHp: COMBAT.playerHp,
      kills: this.kills,
      slimes: this.slimes.countActive(),
      tileX: Math.floor(this.player.body.center.x / TILE),
      tileY: Math.floor(feetY / TILE),
      speed: this.player.speed,
      running: this.player.running,
      facing: this.player.facing,
      zoom: this.cameras.main.zoom,
      debug: this.debugOn,
      overlay: this.aboveLayer.visible,
      art: `${ASSETS.tileset.enabled ? 'tileset.png' : 'placeholder tiles'} / ${ASSETS.player.enabled ? 'player.png' : 'placeholder hero'} / ${ASSETS.combat.enabled ? 'combat.png' : 'placeholder slime'}`,
    });
  }
}
