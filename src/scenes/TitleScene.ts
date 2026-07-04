import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

/** Welcome screen: shown once on boot, tap anywhere to enter the dungeon. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const gs = this.registry.get('gs') as GameState;
    const cx = THEME.width / 2;

    // Dungeon backdrop: brick wall with torches
    this.add
      .tileSprite(0, 0, THEME.width, THEME.height, 'tiles', 3)
      .setOrigin(0, 0)
      .setTint(0x6e5c72);
    this.add
      .rectangle(cx, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.45);
    for (const x of [60, THEME.width - 60]) {
      this.add.sprite(x, 240, 'torch').play('torch-flame').setScale(1.6);
    }

    // Title
    this.add
      .bitmapText(cx, 148, 'pix', 'SOULFORGE', 32)
      .setTint(0xe8d9b0)
      .setDropShadow(2, 2, 0x14101c, 1)
      .setOrigin(0.5, 0);
    this.add
      .bitmapText(cx, 186, 'pix', 'KNIGHT', 48)
      .setTint(THEME.gold)
      .setDropShadow(3, 3, 0x14101c, 1)
      .setOrigin(0.5, 0);

    // The knight, larger than life
    this.add.image(cx, 400, 'shadow').setScale(2.4).setAlpha(0.6);
    const hero = this.add
      .sprite(cx, 350, `hero-${gs.activeSkin}`)
      .play(`hero-${gs.activeSkin}-idle`)
      .setScale(2);
    this.tweens.add({
      targets: hero,
      y: 344,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Continue vs new game hint
    const returning = gs.totalKills > 0;
    this.add
      .bitmapText(cx, 470, 'pix', returning ? `WELCOME BACK - STAGE ${gs.battle.stage}` : 'A DARK IDLE RPG', 8)
      .setTint(0x9a8d6e)
      .setOrigin(0.5, 0);

    const prompt = this.add
      .bitmapText(cx, 540, 'pix', 'TAP TO PLAY', 16)
      .setTint(0xffffff)
      .setDropShadow(2, 2, 0x14101c, 1)
      .setOrigin(0.5, 0);
    this.tweens.add({
      targets: prompt,
      alpha: 0.25,
      duration: 650,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .bitmapText(cx, THEME.height - 40, 'pix', 'V0.1 - EARLY BUILD', 8)
      .setTint(0x6a5d4e)
      .setOrigin(0.5, 0);

    if (import.meta.env.DEV) {
      (window as unknown as { __titleReady?: boolean }).__titleReady = true;
    }

    this.input.once('pointerdown', () => {
      audio.stageUp();
      audio.startMusic(); // first user gesture satisfies autoplay rules
      this.cameras.main.fadeOut(250, 20, 16, 28);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Battle');
        this.scene.launch('UI');
      });
    });
  }
}
