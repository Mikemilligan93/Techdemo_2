import { VIEW_W, NPC } from '../config.js';

// Speech bubble as a DOM element over the canvas: crisp text at any screen size.
// It follows a point in the game world and types its text out letter by letter.
export class SpeechBubble {
  constructor() {
    this.el = document.getElementById('bubble');
    this.nameEl = this.el.querySelector('.name');
    this.textEl = this.el.querySelector('.text');
    this.full = '';
    this.shown = 0;
    this.visible = false;
  }

  say(name, text) {
    this.nameEl.textContent = name;
    this.full = text;
    this.shown = 0;
    this.textEl.textContent = '';
    this.visible = true;
    this.el.classList.add('show');
  }

  hide() {
    this.visible = false;
    this.el.classList.remove('show');
  }

  // worldX/worldY: the point above the speaker's head
  update(delta, scene, worldX, worldY) {
    if (!this.visible) return;

    // typewriter
    if (this.shown < this.full.length) {
      this.shown = Math.min(this.full.length, this.shown + (delta / 1000) * NPC.typeSpeed);
      this.textEl.textContent = this.full.slice(0, Math.ceil(this.shown));
    }

    // world -> screen position
    const cam = scene.cameras.main;
    const rect = scene.game.canvas.getBoundingClientRect();
    const px = rect.width / VIEW_W; // CSS pixels per game pixel
    const x = rect.left + (worldX - cam.worldView.x) * cam.zoom * px;
    const y = rect.top + (worldY - cam.worldView.y) * cam.zoom * px;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.fontSize = `${Math.max(11, 6 * px)}px`;
  }
}
