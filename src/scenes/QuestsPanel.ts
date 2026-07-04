import Phaser from 'phaser';
import { DAILY_QUESTS, STREAK_BONUS_CAP, STREAK_BONUS_PER_DAY } from '../config/quests';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;
const ROW_H = 66;
const ROW_PITCH = 74;

/** Daily quest sheet: earn gems, keep the streak alive. */
export class QuestsPanel extends Phaser.Scene {
  private gs!: GameState;
  private rows!: Phaser.GameObjects.Container;
  private streakText!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Quests');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.gs.rollDaily();

    this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.72)
      .setInteractive();

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, THEME.cardBorder);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'DAILY QUESTS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    const close = this.add
      .bitmapText(PANEL_X + PANEL_W - 22, PANEL_Y + 12, 'pix', 'X', 16)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.scene.stop());

    this.streakText = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 24, 'pix', '', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);

    this.rows = this.add.container(0, 0);
    this.buildRows();
    this.gs.on('quests:changed', () => {
      if (this.scene.isActive()) this.buildRows();
    });

    if (import.meta.env.DEV) {
      (window as unknown as { __questsOpen?: boolean }).__questsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __questsOpen?: boolean }).__questsOpen = false;
      });
    }
  }

  private buildRows(): void {
    this.rows.removeAll(true);
    this.streakText.setText(
      `STREAK ${this.gs.daily.streak} - FULL CLEAR PAYS +${Math.min(
        (this.gs.daily.streak + 1) * STREAK_BONUS_PER_DAY,
        STREAK_BONUS_CAP,
      )} BONUS GEMS`,
    );

    DAILY_QUESTS.forEach((quest, i) => {
      const y = PANEL_Y + 58 + i * ROW_PITCH + ROW_H / 2;
      const progress = this.gs.questProgress(quest.id);
      const claimed = this.gs.daily.claimed.includes(quest.id);
      const ready = this.gs.canClaimQuest(quest.id);

      const row = this.add.container(0, 0);
      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, claimed ? 0xd8e4c4 : THEME.cardBg)
        .setStrokeStyle(2, ready ? THEME.gold : claimed ? 0x6fae4e : THEME.cardBorder);
      const name = this.add
        .bitmapText(PANEL_X + 16, y - 20, 'pix', quest.name, 8)
        .setTint(0x4a3520);
      // Progress bar
      const barW = 150;
      const barBg = this.add
        .rectangle(PANEL_X + 16, y + 8, barW, 10, 0x2a1c10, 0.35)
        .setOrigin(0, 0.5);
      const bar = this.add
        .rectangle(PANEL_X + 18, y + 8, (barW - 4) * Math.min(progress / quest.target, 1), 6, THEME.expBar)
        .setOrigin(0, 0.5);
      const count = this.add
        .bitmapText(PANEL_X + 16 + barW + 8, y + 8, 'pix', `${progress}/${quest.target}`, 8)
        .setOrigin(0, 0.5)
        .setTint(0x8a5a2e);

      const btn = this.add
        .image(PANEL_X + PANEL_W - 58, y, 'btn-sm')
        .setTint(ready ? THEME.buttonBg : THEME.buttonBgDisabled);
      const btnLbl = this.add
        .bitmapText(
          PANEL_X + PANEL_W - 58,
          y,
          'pix',
          claimed ? 'DONE' : `+${quest.gems} GEMS`,
          8,
        )
        .setOrigin(0.5);
      if (ready) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.gs.claimQuest(quest.id)) audio.coin();
        });
      }
      row.add([bg, name, barBg, bar, count, btn, btnLbl]);
      this.rows.add(row);
    });
  }
}
