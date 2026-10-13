import * as Phaser from 'phaser';
import { PLAYER } from '../config.js';

// Sheet rows: 0 down, 1 left, 2 right, 3 up. 4 walk frames per row, frame 0 = idle.
const ROW = { down: 0, left: 1, right: 2, up: 3 };

export class Player extends Phaser.Physics.Arcade.Sprite {
  static createAnimations(scene) {
    for (const [dir, row] of Object.entries(ROW)) {
      const key = `walk-${dir}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: [0, 1, 2, 3].map((f) => ({ key: 'player', frame: row * 4 + f })),
        frameRate: PLAYER.animFps,
        repeat: -1,
      });
    }
  }

  constructor(scene, x, y) {
    super(scene, x, y, 'player', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const b = PLAYER.body;
    this.body.setSize(b.w, b.h, false);
    this.body.setOffset(b.offsetX, b.offsetY);
    this.setCollideWorldBounds(true);

    this.facing = 'down';
    this.running = false;
    this.speed = 0;

    this.keys = scene.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT',
      run: 'SHIFT',
    });
  }

  update() {
    const k = this.keys;
    const ix = (k.right.isDown || k.right2.isDown ? 1 : 0) - (k.left.isDown || k.left2.isDown ? 1 : 0);
    const iy = (k.down.isDown || k.down2.isDown ? 1 : 0) - (k.up.isDown || k.up2.isDown ? 1 : 0);

    this.running = k.run.isDown;
    const max = this.running ? PLAYER.runSpeed : PLAYER.walkSpeed;

    // 8-way movement, normalised so diagonals are not ~41% faster
    const v = new Phaser.Math.Vector2(ix, iy).normalize().scale(max);
    this.setVelocity(v.x, v.y);
    this.speed = Math.round(this.body.velocity.length());

    // 4-way facing. On diagonals keep the current facing if it still matches one axis,
    // so the sprite doesn't flicker between rows.
    if (ix !== 0 || iy !== 0) {
      const h = ix < 0 ? 'left' : ix > 0 ? 'right' : null;
      const vt = iy < 0 ? 'up' : iy > 0 ? 'down' : null;
      if (!(h && vt && (this.facing === h || this.facing === vt))) this.facing = h || vt;

      this.anims.play(`walk-${this.facing}`, true);
      this.anims.timeScale = this.running ? 1.6 : 1;
    } else {
      this.anims.stop();
      this.setFrame(ROW[this.facing] * 4);
    }
  }
}
