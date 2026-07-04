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
    let g = this.add.graphics();
    g.fillStyle(THEME.panelCell);
    g.fillRoundedRect(0, 0, 62, 62, 10);
    g.lineStyle(2, THEME.panelCellBorder);
    g.strokeRoundedRect(1, 1, 60, 60, 10);
    g.generateTexture('cell', 62, 62);
    g.destroy();

    g = this.add.graphics();
    g.fillStyle(0xffffff);
    g.fillRoundedRect(0, 0, 160, 52, 14);
    g.generateTexture('btn', 160, 52);
    g.destroy();

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
