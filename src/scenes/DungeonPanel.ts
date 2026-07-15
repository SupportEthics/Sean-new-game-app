import Phaser from 'phaser';
import {
  DUNGEON,
  dungeonDuration,
  dungeonGems,
  dungeonModifier,
  dungeonQuota,
} from '../config/dungeon';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { addBackdrop, addCloseButton } from '../ui/panelInput';
import { THEME } from '../ui/theme';

const PANEL_X = 24;
const PANEL_Y = 210;
const PANEL_W = THEME.width - 48;
const PANEL_H = 400;

/** The Daily Dungeon door: today's modifier, the quota, the prize, and one
 * big button. Free retries until it's cleared; the reward pays once a day. */
export class DungeonPanel extends Phaser.Scene {
  private gs!: GameState;

  constructor() {
    super('Dungeon');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    const now = this.gs.clock();
    const mod = dungeonModifier(now);
    const cleared = this.gs.dungeonClearedToday(now);
    const cx = THEME.width / 2;

    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, 0x2884a8);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(cx, PANEL_Y + 12, 'pix', 'DAILY DUNGEON', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    // Today's twist
    this.add
      .bitmapText(cx, PANEL_Y + 64, 'pix', mod.name, 16)
      .setTint(0x2884a8)
      .setOrigin(0.5, 0);
    this.add
      .bitmapText(cx, PANEL_Y + 90, 'pix', mod.desc, 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);

    // The deal
    const quota = dungeonQuota(mod);
    const secs = dungeonDuration(mod);
    this.add
      .bitmapText(cx, PANEL_Y + 130, 'pix', `KILL ${quota} IN ${secs} SECONDS`, 8)
      .setTint(0xb03a2e)
      .setOrigin(0.5, 0);

    // The prize
    const gems = dungeonGems(this.gs.highestStage);
    const gold = formatNumber(this.gs.goldForHours(DUNGEON.goldHours)).toUpperCase();
    const card = this.add
      .rectangle(cx, PANEL_Y + 196, PANEL_W - 48, 64, THEME.cardBg)
      .setStrokeStyle(2, THEME.gold);
    this.add
      .bitmapText(cx, PANEL_Y + 176, 'pix', 'FIRST CLEAR TODAY', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);
    this.add
      .bitmapText(cx, PANEL_Y + 196, 'pix', `${gems} GEMS + ${gold} GOLD`, 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    card.setDepth(-1);

    // The button (or the come-back-tomorrow state)
    if (cleared) {
      this.add
        .bitmapText(cx, PANEL_Y + 300, 'pix', 'CLEARED! NEW DUNGEON TOMORROW', 8)
        .setTint(0x2e7a1e)
        .setOrigin(0.5, 0);
    } else {
      const btn = this.add
        .image(cx, PANEL_Y + 310, 'btn-wide')
        .setTint(0x2884a8)
        .setInteractive({ useHandCursor: true });
      this.add.bitmapText(cx, PANEL_Y + 310, 'pix', 'ENTER THE DUNGEON', 8).setOrigin(0.5);
      btn.on('pointerdown', () => {
        if (this.gs.startDungeon()) {
          audio.bossWarn();
          this.scene.stop();
        }
      });
      this.add
        .bitmapText(cx, PANEL_Y + 344, 'pix', 'FREE RETRIES UNTIL YOU CLEAR IT', 8)
        .setTint(0x9a8d6e)
        .setOrigin(0.5, 0);
    }

    if (import.meta.env.DEV) {
      (window as unknown as { __dungeonOpen?: boolean }).__dungeonOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __dungeonOpen?: boolean }).__dungeonOpen = false;
      });
    }
  }
}
