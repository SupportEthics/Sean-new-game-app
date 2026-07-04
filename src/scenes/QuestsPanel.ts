import Phaser from 'phaser';
import {
  QUESTS,
  QuestPeriod,
  STREAK_BONUS_CAP,
  STREAK_BONUS_PER_DAY,
} from '../config/quests';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;
const ROW_H = 62;
const ROW_PITCH = 70;
const PERIODS: { key: QuestPeriod; label: string }[] = [
  { key: 'daily', label: 'DAILY' },
  { key: 'weekly', label: 'WEEKLY' },
  { key: 'monthly', label: 'MONTHLY' },
];

/** Quest sheets — daily, weekly, monthly — paying gems, plus a daily streak. */
export class QuestsPanel extends Phaser.Scene {
  private gs!: GameState;
  private rows!: Phaser.GameObjects.Container;
  private tabs!: Phaser.GameObjects.Container;
  private footer!: Phaser.GameObjects.BitmapText;
  private period: QuestPeriod = 'daily';

  constructor() {
    super('Quests');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.gs.rollDaily();
    this.period = 'daily';

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
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'QUESTS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    const close = this.add
      .bitmapText(PANEL_X + PANEL_W - 22, PANEL_Y + 12, 'pix', 'X', 16)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.scene.stop());

    this.footer = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 24, 'pix', '', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);

    this.tabs = this.add.container(0, 0);
    this.rows = this.add.container(0, 0);
    this.buildTabs();
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

  private buildTabs(): void {
    this.tabs.removeAll(true);
    const w = (PANEL_W - 20 - 12) / 3;
    PERIODS.forEach((p, i) => {
      const cx = PANEL_X + 10 + w / 2 + i * (w + 6);
      const active = this.period === p.key;
      const bg = this.add
        .rectangle(cx, PANEL_Y + 62, w, 26, active ? THEME.headerBg : THEME.cardBg)
        .setStrokeStyle(2, active ? THEME.gold : THEME.cardBorder)
        .setInteractive({ useHandCursor: true });
      const lbl = this.add
        .bitmapText(cx, PANEL_Y + 62, 'pix', p.label, 8)
        .setOrigin(0.5)
        .setTint(active ? 0xffd166 : 0x8a5a2e);
      bg.on('pointerdown', () => {
        if (this.period === p.key) return;
        this.period = p.key;
        audio.buy();
        this.buildTabs();
        this.buildRows();
      });
      this.tabs.add([bg, lbl]);
    });
  }

  private buildRows(): void {
    this.rows.removeAll(true);
    this.footer.setText(
      this.period === 'daily'
        ? `STREAK ${this.gs.daily.streak} - FULL CLEAR PAYS +${Math.min(
            (this.gs.daily.streak + 1) * STREAK_BONUS_PER_DAY,
            STREAK_BONUS_CAP,
          )} BONUS GEMS`
        : this.period === 'weekly'
          ? 'RESETS EVERY MONDAY'
          : 'RESETS ON THE 1ST OF THE MONTH',
    );

    QUESTS[this.period].forEach((quest, i) => {
      const y = PANEL_Y + 88 + i * ROW_PITCH + ROW_H / 2;
      const progress = this.gs.questProgress(quest.id, this.period);
      const claimed = this.gs.questClaimed(quest.id, this.period);
      const ready = this.gs.canClaimQuest(quest.id, this.period);

      const row = this.add.container(0, 0);
      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, claimed ? 0xd8e4c4 : THEME.cardBg)
        .setStrokeStyle(2, ready ? THEME.gold : claimed ? 0x6fae4e : THEME.cardBorder);
      const name = this.add
        .bitmapText(PANEL_X + 16, y - 18, 'pix', quest.name, 8)
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
          if (this.gs.claimQuest(quest.id, Date.now(), this.period)) audio.coin();
        });
      }
      row.add([bg, name, barBg, bar, count, btn, btnLbl]);
      this.rows.add(row);
    });
  }
}
