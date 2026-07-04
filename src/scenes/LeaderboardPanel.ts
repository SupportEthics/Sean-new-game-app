import Phaser from 'phaser';
import { BoardRow, buildBoard } from '../config/leaderboard';
import { GameState } from '../core/GameState';
import { LeaderboardService } from '../services/LeaderboardService';
import { addBackdrop, addCloseButton, addDragScroll } from '../ui/panelInput';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 116;
const PANEL_W = THEME.width - 24;
const PANEL_H = 600;
const ROW_H = 50;
const ROW_PITCH = 56;
const LIST_TOP = PANEL_Y + 74;
const LIST_H = PANEL_H - 74 - 34;

/** Hall of Legends: the player ranked among seeded rival knights. The real
 * Game Center / Play Games board takes over via LeaderboardService at
 * store setup. */
export class LeaderboardPanel extends Phaser.Scene {
  private gs!: GameState;
  private leaderboard!: LeaderboardService;
  private rows!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;

  constructor() {
    super('Ranks');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.leaderboard = this.registry.get('leaderboard') as LeaderboardService;

    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, 0xc99a2e);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'HALL OF LEGENDS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 48, 'pix', 'CLIMB THE RANKS - BEAT YOUR NEXT RIVAL', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);

    this.rows = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillRect(PANEL_X + 2, LIST_TOP, PANEL_W - 4, LIST_H);
    this.rows.setMask(maskShape.createGeometryMask());

    addDragScroll(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, LIST_TOP, PANEL_W, LIST_H),
      (delta) => this.setScroll(this.scrollY + delta),
    );

    const board = buildBoard(this.gs.highestStage, this.gs.prestigeCount, this.gs.activeSkin);
    this.maxScroll = Math.max(0, board.length * ROW_PITCH + 12 - LIST_H);
    board.forEach((row, i) => this.boardRow(row, LIST_TOP + 8 + i * ROW_PITCH + ROW_H / 2));

    // Open centred on the player's own row
    const me = board.findIndex((r) => r.isPlayer);
    this.setScroll(me * ROW_PITCH - LIST_H / 2 + ROW_H);

    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    // Footer: honest label locally; the platform board once it's live
    if (this.leaderboard.isAvailable) {
      const btn = this.add
        .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 24, 'pix', 'VIEW GLOBAL RANKINGS', 8)
        .setOrigin(0.5, 0)
        .setTint(0x2884a8)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => void this.leaderboard.showNativeBoard());
    } else {
      this.add
        .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 24, 'pix', 'LOCAL RANKINGS - RIVALS OF THE REALM', 8)
        .setOrigin(0.5, 0)
        .setTint(0x9a8d6e);
    }

    if (import.meta.env.DEV) {
      (window as unknown as { __ranksOpen?: boolean }).__ranksOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __ranksOpen?: boolean }).__ranksOpen = false;
      });
    }
  }

  private setScroll(v: number): void {
    this.scrollY = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.rows.setY(-this.scrollY);
  }

  private boardRow(row: BoardRow, y: number): void {
    const bg = this.add
      .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, row.isPlayer ? 0xf5e3b8 : THEME.cardBg)
      .setStrokeStyle(2, row.isPlayer ? THEME.gold : THEME.cardBorder);
    const medal =
      row.rank === 1 ? 0xffd166 : row.rank === 2 ? 0xc9ced4 : row.rank === 3 ? 0xcd7f32 : 0x8a5a2e;
    const rank = this.add
      .bitmapText(PANEL_X + 16, y, 'pix', `${row.rank}`, 16)
      .setOrigin(0, 0.5)
      .setTint(medal);
    const portrait = this.add
      .image(PANEL_X + 66, y, `hero-${row.skin}`, 0)
      .setScale(0.55);
    const name = this.add
      .bitmapText(PANEL_X + 92, y - 16, 'pix', row.name, 8)
      .setTint(row.isPlayer ? 0xc9961e : 0x4a3520);
    const score = this.add
      .bitmapText(
        PANEL_X + 92,
        y + 2,
        'pix',
        `STAGE ${row.stage}${row.prestiges > 0 ? ` - ${row.prestiges} REBIRTH${row.prestiges === 1 ? '' : 'S'}` : ''}`,
        8,
      )
      .setTint(0x8a5a2e);
    this.rows.add([bg, rank, portrait, name, score]);
  }
}
