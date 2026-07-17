import Phaser from 'phaser';
import { MINE } from '../config/mine';
import { GameState } from '../core/GameState';
import { AdService } from '../services/monetization/AdService';
import { audio } from '../services/AudioService';
import { addBackdrop, addCloseButton } from '../ui/panelInput';
import { THEME } from '../ui/theme';

const PANEL_X = 24;
const PANEL_Y = 210;
const PANEL_W = THEME.width - 48;
const PANEL_H = 400;

/** The Labyrinth's door: today's descents, the best-depth record, and one
 * big button. Free once a day; an ad opens a second descent. */
export class MinePanel extends Phaser.Scene {
  private gs!: GameState;
  private ads!: AdService;
  private adBusy = false;

  constructor() {
    super('Mine');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.ads = this.registry.get('ads') as AdService;
    const cx = THEME.width / 2;

    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, 0xc9961e);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(cx, PANEL_Y + 12, 'pix', 'THE LABYRINTH', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    // The pitch
    this.add
      .bitmapText(cx, PANEL_Y + 62, 'pix', 'MINE THE CAVE BY TORCHLIGHT', 8)
      .setTint(0xc9961e)
      .setOrigin(0.5, 0);
    this.add
      .bitmapText(
        cx,
        PANEL_Y + 84,
        'pix',
        'A TREASURE CHEST HIDES IN THE DARK -\nOPEN IT AND BRAVE THE MAZE BEHIND IT.\nEVERY FLOOR IS DARKER - AND RICHER.',
        8,
      )
      .setCenterAlign()
      .setOrigin(0.5, 0)
      .setTint(0x8a5a2e);

    // Props row: vein / crystal / fuel / chest / hoard, a visual legend
    const icons = [0, 1, 2, 6, 7];
    icons.forEach((f, i) => {
      this.add.image(cx - 88 + i * 44, PANEL_Y + 148, 'mine', f).setScale(1.4);
    });

    // Best depth
    this.add
      .bitmapText(
        cx,
        PANEL_Y + 186,
        'pix',
        this.gs.mineBestDepth > 0 ? `BEST DEPTH: FLOOR ${this.gs.mineBestDepth}` : 'THE DEPTHS AWAIT',
        8,
      )
      .setOrigin(0.5, 0)
      .setTint(0x2884a8);

    const runs = this.gs.mineRunsToday();
    if (runs === 0) {
      this.button(PANEL_Y + 260, 0xc9961e, 'DESCEND (FREE TODAY)', () => this.enter());
    } else if (runs === 1) {
      this.add
        .bitmapText(cx, PANEL_Y + 232, 'pix', "TODAY'S FREE DESCENT IS SPENT", 8)
        .setOrigin(0.5, 0)
        .setTint(0x9a8d6e);
      this.button(PANEL_Y + 280, 0x2884a8, this.adBusy ? 'AD PLAYING...' : 'WATCH AD - DESCEND AGAIN', () => {
        if (this.adBusy) return;
        this.adBusy = true;
        void this.ads.showRewarded('mine').then((result) => {
          this.adBusy = false;
          if (!result.rewarded) return;
          this.gs.trackQuest('ads');
          this.enter();
        });
      });
    } else {
      this.add
        .bitmapText(cx, PANEL_Y + 280, 'pix', 'THE MINE REOPENS TOMORROW', 8)
        .setOrigin(0.5, 0)
        .setTint(0x2e7a1e);
    }

    this.add
      .bitmapText(cx, PANEL_Y + 344, 'pix', `UNLOCKED AT STAGE ${MINE.unlockStage} - GEMS CAP ${MINE.gemCapPerRun}/RUN`, 8)
      .setOrigin(0.5, 0)
      .setTint(0x9a8d6e);

    if (import.meta.env.DEV) {
      (window as unknown as { __mineOpen?: boolean }).__mineOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __mineOpen?: boolean }).__mineOpen = false;
      });
    }
  }

  private button(y: number, tint: number, label: string, onTap: () => void): void {
    const cx = THEME.width / 2;
    const btn = this.add
      .image(cx, y, 'btn-wide')
      .setDisplaySize(250, 40)
      .setTint(tint)
      .setInteractive({ useHandCursor: true });
    this.add.bitmapText(cx, y, 'pix', label, 8).setOrigin(0.5);
    btn.on('pointerdown', onTap);
  }

  private enter(): void {
    if (!this.gs.enterMine()) return;
    audio.bossWarn();
    this.scene.stop();
    this.scene.launch('MineRun');
  }
}
