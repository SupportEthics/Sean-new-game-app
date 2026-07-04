import Phaser from 'phaser';
import { ENEMY_SPECIES } from '../config/stages';
import { THEME } from '../ui/theme';

/**
 * Generates every texture procedurally at boot — no image files needed yet.
 * M2 replaces these with the generated sprite-sheet pipeline.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.makeHero();
    this.makeSwordIcon();
    ENEMY_SPECIES.forEach((s) => this.makeEnemy(s.key, s.color));
    this.makeRects();
    this.makeParticles();

    this.scene.start('Battle');
    this.scene.launch('UI');
  }

  private makeHero(): void {
    const g = this.add.graphics();

    // Spikes fan (hedgehog back)
    g.fillStyle(0x7a4a26);
    const cx = 24;
    const cy = 27;
    for (let a = 110; a <= 320; a += 26) {
      const rad = Phaser.Math.DegToRad(a);
      const tipX = cx + Math.cos(rad) * 22;
      const tipY = cy + Math.sin(rad) * 22;
      const l = Phaser.Math.DegToRad(a - 11);
      const r = Phaser.Math.DegToRad(a + 11);
      g.fillTriangle(
        tipX,
        tipY,
        cx + Math.cos(l) * 10,
        cy + Math.sin(l) * 10,
        cx + Math.cos(r) * 10,
        cy + Math.sin(r) * 10,
      );
    }

    // Body
    g.fillStyle(0xf2c894);
    g.fillCircle(26, 29, 15);

    // Feet
    g.fillStyle(0xd9a86c);
    g.fillEllipse(20, 43, 8, 5);
    g.fillEllipse(33, 43, 8, 5);

    // Blush
    g.fillStyle(0xf99a9a, 0.6);
    g.fillCircle(19, 32, 3);
    g.fillCircle(34, 32, 3);

    // Eyes (big dark dots + specular highlight = instant cute)
    g.fillStyle(0x2e2348);
    g.fillCircle(21, 26, 3);
    g.fillCircle(32, 26, 3);
    g.fillStyle(0xffffff);
    g.fillCircle(22, 25, 1.2);
    g.fillCircle(33, 25, 1.2);

    // Nose
    g.fillStyle(0xe86a92);
    g.fillEllipse(26.5, 32, 5, 4);

    g.generateTexture('hero', 48, 48);
    g.destroy();
  }

  private makeSwordIcon(): void {
    const g = this.add.graphics();
    // Drawn in white so it can be tinted per tier
    g.fillStyle(0xffffff);
    // Blade
    g.fillTriangle(24, 2, 18, 10, 30, 10);
    g.fillRect(18, 10, 12, 22);
    // Guard
    g.fillRect(10, 32, 28, 5);
    // Grip
    g.fillStyle(0xdddddd);
    g.fillRect(21, 37, 6, 8);
    // Pommel
    g.fillCircle(24, 46, 3);
    g.generateTexture('sword', 48, 50);
    g.destroy();
  }

  private makeEnemy(key: string, color: number): void {
    const g = this.add.graphics();
    const dark = Phaser.Display.Color.IntegerToColor(color).darken(25).color;

    // Outline blob
    g.fillStyle(dark);
    g.fillEllipse(22, 27, 36, 32);
    // Body
    g.fillStyle(color);
    g.fillEllipse(22, 26, 32, 28);
    // Eyes
    g.fillStyle(0x2e2348);
    g.fillCircle(16, 24, 2.6);
    g.fillCircle(28, 24, 2.6);
    g.fillStyle(0xffffff);
    g.fillCircle(17, 23, 1);
    g.fillCircle(29, 23, 1);
    // Grumpy mouth
    g.lineStyle(2, 0x2e2348);
    g.beginPath();
    g.arc(22, 33, 4, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    g.strokePath();

    g.generateTexture(`enemy-${key}`, 44, 46);
    g.destroy();
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
