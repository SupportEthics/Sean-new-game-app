import Phaser from 'phaser';
import { ENEMY_SPECIES } from '../config/stages';
import { THEME } from '../ui/theme';

/** Loads the generated sprite sheets and builds the shared animations. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const barBg = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, 220, 18, THEME.panelCell)
      .setStrokeStyle(2, THEME.panelCellBorder);
    const bar = this.add
      .rectangle(THEME.width / 2 - 108, THEME.height / 2, 0, 10, THEME.gold)
      .setOrigin(0, 0.5);
    this.load.on('progress', (v: number) => (bar.width = 216 * v));
    this.load.on('complete', () => {
      bar.destroy();
      barBg.destroy();
    });

    this.load.spritesheet('hero', 'assets/hero.png', { frameWidth: 80, frameHeight: 80 });
    ENEMY_SPECIES.forEach((s) =>
      this.load.spritesheet(`enemy-${s.key}`, `assets/enemy-${s.key}.png`, {
        frameWidth: 64,
        frameHeight: 64,
      }),
    );
    this.load.spritesheet('gear', 'assets/gear.png', { frameWidth: 56, frameHeight: 56 });
    this.load.spritesheet('deco', 'assets/deco.png', { frameWidth: 40, frameHeight: 40 });
  }

  create(): void {
    // Keep the chunky pixels crisp when scaled
    const keys = ['hero', 'gear', 'deco', ...ENEMY_SPECIES.map((s) => `enemy-${s.key}`)];
    keys.forEach((k) => this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST));

    this.anims.create({
      key: 'hero-idle',
      frames: this.anims.generateFrameNumbers('hero', { frames: [0, 1] }),
      frameRate: 3,
      repeat: -1,
    });
    ENEMY_SPECIES.forEach((s) =>
      this.anims.create({
        key: `enemy-${s.key}-idle`,
        frames: this.anims.generateFrameNumbers(`enemy-${s.key}`, { frames: [0, 1] }),
        frameRate: 4,
        repeat: -1,
      }),
    );

    this.scene.start('Battle');
    this.scene.launch('UI');
  }
}
