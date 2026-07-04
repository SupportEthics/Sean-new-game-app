import Phaser from 'phaser';
import { THEME } from '../ui/theme';

/**
 * Generates the flat UI textures (cells, buttons, particles) procedurally.
 * Character/gear art is loaded from generated sprite sheets in PreloadScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeRects();
    this.makeParticles();
    this.scene.start('Preload');
  }

  private makeRects(): void {
    // Parchment sword card
    let g = this.add.graphics();
    g.fillStyle(THEME.cardBg);
    g.fillRoundedRect(0, 0, 86, 64, 6);
    g.generateTexture('card', 86, 64);
    g.destroy();

    // White rounded rects for tinted buttons of each size
    for (const [key, w, h, r] of [
      ['btn', 160, 52, 12],
      ['btn-sm', 90, 34, 8],
      ['btn-wide', 168, 34, 8],
    ] as const) {
      g = this.add.graphics();
      g.fillStyle(0xffffff);
      g.fillRoundedRect(0, 0, w, h, r);
      g.generateTexture(key, w, h);
      g.destroy();
    }

    g = this.add.graphics();
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(24, 8, 44, 14);
    g.generateTexture('shadow', 48, 16);
    g.destroy();
  }

  private makeParticles(): void {
    let g = this.add.graphics();
    g.fillStyle(THEME.gold);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffe9b0);
    g.fillCircle(4.5, 4.5, 2.5);
    g.generateTexture('coin', 12, 12);
    g.destroy();

    g = this.add.graphics();
    g.fillStyle(0xffffff);
    g.fillCircle(4, 4, 4);
    g.generateTexture('spark', 8, 8);
    g.destroy();
  }
}
