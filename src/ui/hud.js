// Plain DOM overlay: stays crisp at any scale, unlike text drawn on the low-res canvas.
export class Hud {
  constructor() {
    this.el = document.getElementById('hud');
    this.next = 0;
  }

  update(time, s) {
    if (!this.el || time < this.next) return;
    this.next = time + 200; // 5x per second is plenty
    this.el.textContent =
      `HP     ${'♥'.repeat(Math.max(0, s.hp))}${'♡'.repeat(Math.max(0, s.maxHp - s.hp))}\n` +
      `kills  ${s.kills}   slimes ${s.slimes}\n` +
      `FPS    ${s.fps}\n` +
      `seed   ${s.seed}\n` +
      `tile   ${s.tileX}, ${s.tileY}\n` +
      `speed  ${s.speed} px/s ${s.running ? '(run)' : ''}\n` +
      `facing ${s.facing}\n` +
      `zoom   ${s.zoom}x\n` +
      `debug  ${s.debug ? 'ON' : 'off'}   overlay ${s.overlay ? 'on' : 'HIDDEN'}\n` +
      `art    ${s.art}`;
  }
}
