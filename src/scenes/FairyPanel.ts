import Phaser from 'phaser';
import { FAIRY } from '../config/fairy';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;

/** The fairy: one loyal helper, levelled with gold for passive bonuses. */
export class FairyPanel extends Phaser.Scene {
  private gs!: GameState;
  private body!: Phaser.GameObjects.Container;

  constructor() {
    super('Fairy');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;

    this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.72)
      .setInteractive();

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, 0x6fae4e);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'FAIRY', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    const close = this.add
      .bitmapText(PANEL_X + PANEL_W - 22, PANEL_Y + 12, 'pix', 'X', 16)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.scene.stop());

    this.body = this.add.container(0, 0);
    this.build();
    this.gs.on('fairy:changed', () => {
      if (this.scene.isActive()) this.build();
    });

    if (import.meta.env.DEV) {
      (window as unknown as { __fairyOpen?: boolean }).__fairyOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __fairyOpen?: boolean }).__fairyOpen = false;
      });
    }
  }

  private build(): void {
    this.body.removeAll(true);
    const cx = THEME.width / 2;
    const unlocked = this.gs.fairyUnlocked;
    const level = this.gs.fairyLevel;

    // The star of the show, hovering
    const sprite = this.add.sprite(cx, PANEL_Y + 120, 'fairy').play('fairy-idle').setScale(3);
    if (!unlocked) sprite.setTintFill(0x3a3048);
    this.body.add(sprite);
    if (unlocked) {
      this.tweens.add({
        targets: sprite,
        y: PANEL_Y + 112,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    if (!unlocked) {
      this.body.add(
        this.add
          .bitmapText(cx, PANEL_Y + 200, 'pix', `A FRIEND AWAITS AT STAGE ${FAIRY.unlockStage}`, 8)
          .setOrigin(0.5, 0)
          .setTint(0x8a5a2e),
      );
      return;
    }

    this.body.add(
      this.add
        .bitmapText(cx, PANEL_Y + 186, 'pix', level === 0 ? 'RECRUIT YOUR FAIRY' : `FAIRY LV ${level}`, 16)
        .setOrigin(0.5, 0)
        .setTint(0x2e7a1e),
    );
    this.body.add(
      this.add
        .bitmapText(
          cx,
          PANEL_Y + 214,
          'pix',
          'SHE BLESSES EVERY SWING AND EVERY COIN',
          8,
        )
        .setOrigin(0.5, 0)
        .setTint(0x8a5a2e),
    );

    // Current bonuses
    const rows: [string, string][] = [
      ['DAMAGE', `+${Math.round(level * FAIRY.dpsPerLevel * 100)}%`],
      ['GOLD', `+${Math.round(level * FAIRY.goldPerLevel * 100)}%`],
      ['NEXT LEVEL', `+${Math.round(FAIRY.dpsPerLevel * 100)}% DMG, +${Math.round(FAIRY.goldPerLevel * 100)}% GOLD`],
    ];
    rows.forEach(([k, v], i) => {
      const y = PANEL_Y + 252 + i * 34;
      this.body.add(
        this.add
          .rectangle(cx, y + 8, PANEL_W - 40, 28, THEME.cardBg)
          .setStrokeStyle(2, THEME.cardBorder),
      );
      this.body.add(this.add.bitmapText(PANEL_X + 32, y + 2, 'pix', k, 8).setTint(0x4a3520));
      this.body.add(
        this.add
          .bitmapText(PANEL_X + PANEL_W - 32, y + 2, 'pix', v, 8)
          .setOrigin(1, 0)
          .setTint(0x2e7a1e),
      );
    });

    // Upgrade button
    const cost = this.gs.fairyUpgradeCost;
    const afford = this.gs.canUpgradeFairy;
    const btn = this.add
      .image(cx, PANEL_Y + 400, 'btn-wide')
      .setTint(cost === null ? THEME.buttonBgDisabled : afford ? 0x2e7a1e : THEME.buttonBgDisabled);
    const lbl = this.add
      .bitmapText(
        cx,
        PANEL_Y + 400,
        'pix',
        cost === null
          ? 'MAX LEVEL'
          : `${level === 0 ? 'RECRUIT' : 'LEVEL UP'} - ${formatNumber(cost).toUpperCase()} GOLD`,
        8,
      )
      .setOrigin(0.5);
    if (afford) {
      btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.gs.upgradeFairy()) audio.merge();
      });
    }
    this.body.add([btn, lbl]);
    this.body.add(
      this.add
        .bitmapText(cx, PANEL_Y + 440, 'pix', `LEVEL CAP ${FAIRY.maxLevel}`, 8)
        .setOrigin(0.5, 0)
        .setTint(0x9a8d6e),
    );
  }
}
