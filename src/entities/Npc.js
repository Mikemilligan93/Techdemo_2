import * as Phaser from 'phaser';
import { NPC } from '../config.js';

const FRAME = { down: 0, left: 1, right: 2, up: 3 };

// A villager who stands still, turns towards the player and talks when they come close.
export class Npc extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, { name, lines }) {
    super(scene, x, y, 'npc', FRAME.down);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const b = NPC.body;
    this.body.setSize(b.w, b.h, false);
    this.body.setOffset(b.offsetX, b.offsetY);
    this.body.setImmovable(true); // the player bumps into him, can't push him
    this.body.pushable = false;
    this.setDepth(2 + this.body.bottom / 100000);

    this.name = name;
    this.lines = Phaser.Utils.Array.Shuffle([...lines]);
    this.lineIndex = 0;
    this.talking = false;
  }

  nextLine() {
    const line = this.lines[this.lineIndex % this.lines.length];
    this.lineIndex += 1;
    return line;
  }

  face(target) {
    const dx = target.x - this.x, dy = target.body.bottom - this.body.bottom;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    this.setFrame(FRAME[dir]);
  }

  // Returns 'start' when the player just arrived, 'end' when they left, null otherwise.
  update(player) {
    const d = Phaser.Math.Distance.Between(this.body.center.x, this.body.center.y, player.body.center.x, player.body.center.y);
    if (!this.talking && d < NPC.talkRange && !player.isDead) {
      this.talking = true;
      this.face(player);
      return 'start';
    }
    if (this.talking) {
      this.face(player);
      if (d > NPC.leaveRange || player.isDead) {
        this.talking = false;
        this.setFrame(FRAME.down);
        return 'end';
      }
    }
    return null;
  }
}
