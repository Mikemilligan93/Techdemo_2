import * as Phaser from 'phaser';
import './style.css';
import { VIEW_W, VIEW_H } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#0d0e14',
  pixelArt: true, // nearest-neighbour scaling, no blur
  roundPixels: true, // avoid sub-pixel shimmer while the camera scrolls
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene],
});

// Handy in the browser console while testing: window.game.scene.getScene('Game')
window.game = game;
