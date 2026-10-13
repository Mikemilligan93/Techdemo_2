import * as Phaser from 'phaser';
import { ENEMY } from '../config.js';

// A simple enemy: wanders around, chases the player when close, dies after a few hits.
export class Slime extends Phaser.Physics.Arcade.Sprite {
  static createAnimations(scene) {
    if (scene.anims.exists('slime-hop')) return;
    scene.anims.create({
      key: 'slime-hop',
      frames: [0, 1, 2, 1].map((frame) => ({ key: 'combat', frame })),
      frameRate: 6,
      repeat: -1,
    });
  }

  constructor(scene, x, y) {
    super(scene, x, y, 'combat', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const b = ENEMY.body;
    this.body.setSize(b.w, b.h, false);
    this.body.setOffset(b.offsetX, b.offsetY);
    this.setCollideWorldBounds(true);
    this.body.setBounce(1, 1); // bounce off walls while wandering

    this.hp = ENEMY.hp;
    this.state = 'wander';
    this.nextThink = 0;
    this.stunUntil = 0;
    this.anims.play({ key: 'slime-hop', startFrame: Phaser.Math.Between(0, 3) });
  }

  // Feet position, used for distance checks and depth sorting
  get feetY() {
    return this.body.bottom;
  }

  think(time, player) {
    if (!this.active || this.dying) return;
    this.setDepth(2 + this.feetY / 100000); // y-sort against the player

    if (time < this.stunUntil) return; // being knocked back

    const dist = Phaser.Math.Distance.Between(this.body.center.x, this.body.center.y, player.body.center.x, player.body.center.y);
    if (this.state === 'wander' && dist < ENEMY.aggroRange && !player.isDead) this.state = 'chase';
    else if (this.state === 'chase' && (dist > ENEMY.loseRange || player.isDead)) this.state = 'wander';

    if (this.state === 'chase') {
      // aim our feet at the player's feet
      const dx = this.body.center.x - this.x, dy = this.body.center.y - this.y;
      this.scene.physics.moveTo(this, player.body.center.x - dx, player.body.center.y - dy, ENEMY.chaseSpeed);
      this.anims.timeScale = 1.6;
    } else if (time > this.nextThink) {
      // pick a new random direction (or rest) every 1-2.5 s
      this.nextThink = time + Phaser.Math.Between(1000, 2500);
      if (Math.random() < 0.3) this.setVelocity(0, 0);
      else this.scene.physics.velocityFromAngle(Phaser.Math.Between(0, 359), ENEMY.wanderSpeed, this.body.velocity);
      this.anims.timeScale = 1;
    }
    if (this.body.velocity.x !== 0) this.setFlipX(this.body.velocity.x < 0);
  }

  hit(fromX, fromY, damage, time) {
    if (this.dying) return;
    this.hp -= damage;
    this.state = 'chase'; // getting shot makes it angry

    // knockback away from the hit + white flash
    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.x, this.y);
    this.scene.physics.velocityFromRotation(angle, ENEMY.chaseSpeed * 2.5, this.body.velocity);
    this.stunUntil = time + 160;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.active && this.clearTint());

    if (this.hp <= 0) this.die();
  }

  die() {
    this.dying = true;
    this.body.enable = false;
    this.anims.stop();
    this.setFrame(1);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.6,
      scaleY: 0.3,
      alpha: 0,
      duration: 250,
      onComplete: () => this.destroy(),
    });
    this.emit('died', this);
  }
}
