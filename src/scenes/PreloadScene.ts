import Phaser from 'phaser';
import { SKINS } from '../config/skins';
import { ENEMY_SPECIES } from '../config/stages';
import { THEME } from '../ui/theme';

/** Character order must match the glyph sheet written by generate-assets.mjs. */
const FONT_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ .,:/+-%!';

/** Loads the generated sprite sheets and builds the shared animations. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const barBg = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, 220, 18, THEME.panelBgDark)
      .setStrokeStyle(2, THEME.cardBorder);
    const bar = this.add
      .rectangle(THEME.width / 2 - 108, THEME.height / 2, 0, 10, THEME.gold)
      .setOrigin(0, 0.5);
    this.load.on('progress', (v: number) => (bar.width = 216 * v));
    this.load.on('complete', () => {
      bar.destroy();
      barBg.destroy();
    });

    // One sheet per skin: idle0, idle1, attack at native resolution
    SKINS.forEach((skin) =>
      this.load.spritesheet(`hero-${skin.id}`, `assets/hero-${skin.id}.png`, {
        frameWidth: 52,
        frameHeight: 68,
      }),
    );
    ENEMY_SPECIES.forEach((s) =>
      this.load.spritesheet(`enemy-${s.key}`, `assets/enemy-${s.key}.png`, {
        frameWidth: 48,
        frameHeight: 48,
      }),
    );
    this.load.spritesheet('gear', 'assets/gear.png', { frameWidth: 56, frameHeight: 64 });
    this.load.spritesheet('deco', 'assets/deco.png', { frameWidth: 28, frameHeight: 28 });
    this.load.spritesheet('torch', 'assets/torch.png', { frameWidth: 20, frameHeight: 34 });
    this.load.spritesheet('tiles', 'assets/tiles.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('icons', 'assets/icons.png', { frameWidth: 24, frameHeight: 24 });
    this.load.image('pixfont', 'assets/pixfont.png');
  }

  create(): void {
    // Keep the pixels crisp when scaled
    const keys = [
      'gear',
      'deco',
      'torch',
      'tiles',
      'icons',
      'pixfont',
      ...SKINS.map((s) => `hero-${s.id}`),
      ...ENEMY_SPECIES.map((s) => `enemy-${s.key}`),
    ];
    keys.forEach((k) => this.textures.get(k).setFilter(Phaser.Textures.FilterMode.NEAREST));

    // Bitmap pixel font: glyphs are 12x16 (authored 6x8 at 2x), so sizes 8 and
    // 16 are both pixel-perfect.
    this.cache.bitmapFont.add(
      'pix',
      Phaser.GameObjects.RetroFont.Parse(this, {
        image: 'pixfont',
        width: 12,
        height: 16,
        chars: FONT_CHARS,
        charsPerRow: FONT_CHARS.length,
        'offset.x': 0,
        'offset.y': 0,
        'spacing.x': 0,
        'spacing.y': 0,
        lineSpacing: 0,
      }),
    );

    SKINS.forEach((skin) =>
      this.anims.create({
        key: `hero-${skin.id}-idle`,
        frames: this.anims.generateFrameNumbers(`hero-${skin.id}`, { frames: [0, 1] }),
        frameRate: 3,
        repeat: -1,
      }),
    );
    this.anims.create({
      key: 'torch-flame',
      frames: this.anims.generateFrameNumbers('torch', { frames: [0, 1] }),
      frameRate: 5,
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
