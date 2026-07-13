import Phaser from 'phaser';
import { BoardRow, buildBoard } from '../config/leaderboard';
import { buildGlobalBoard, rollCallSign } from '../config/globalBoard';
import { GameState } from '../core/GameState';
import { globalBoard } from '../services/GlobalBoard';
import { audio } from '../services/AudioService';
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

/** Hall of Legends. With the global board configured (config/globalBoard)
 * this is a live worldwide ranking: real players' call signs mixed with
 * the seeded rivals while the community grows. First visit asks the
 * player to roll a call sign — curated words only, nothing typed. */
export class LeaderboardPanel extends Phaser.Scene {
  private gs!: GameState;
  private rows!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private footer!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Ranks');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;

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

    this.footer = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 24, 'pix', '', 8)
      .setOrigin(0.5, 0)
      .setTint(0x9a8d6e);

    // Local board immediately; the live one replaces it when it arrives
    this.renderBoard(buildBoard(this.gs.highestStage, this.gs.prestigeCount, this.gs.activeSkin));
    this.footer.setText(
      globalBoard.isConfigured ? 'CONNECTING TO THE LEGENDS...' : 'LOCAL RANKINGS - RIVALS OF THE REALM',
    );

    if (globalBoard.isConfigured) {
      if (this.gs.boardName) {
        void this.syncGlobal();
      } else {
        this.showNamePicker();
      }
    }

    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    if (import.meta.env.DEV) {
      (window as unknown as { __ranksOpen?: boolean }).__ranksOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __ranksOpen?: boolean }).__ranksOpen = false;
      });
    }
  }

  /** Submit our best, then fetch and show the live board. */
  private async syncGlobal(): Promise<void> {
    if (this.gs.boardName) {
      void globalBoard.submit(
        this.gs.deviceId,
        this.gs.boardName,
        this.gs.highestStage,
        this.gs.prestigeCount,
        this.gs.activeSkin,
      );
    }
    const real = await globalBoard.fetchTop(50);
    if (!this.scene.isActive()) return;
    if (real === null) {
      this.footer.setText('OFFLINE - SHOWING LOCAL RANKINGS');
      return;
    }
    this.renderBoard(
      buildGlobalBoard(
        real,
        this.gs.deviceId,
        this.gs.boardName,
        this.gs.highestStage,
        this.gs.prestigeCount,
        this.gs.activeSkin,
      ),
    );
    this.footer.setText('GLOBAL RANKINGS - LIVE');
  }

  /** First visit: roll a call sign to join the global board. */
  private showNamePicker(): void {
    let name = rollCallSign();
    const cy = PANEL_Y + PANEL_H / 2;
    const layer = this.add.container(0, 0).setDepth(50);
    const cover = this.add
      .rectangle(THEME.width / 2, cy, PANEL_W, PANEL_H, 0x14101c, 0.75)
      .setInteractive(); // swallow taps under the modal
    const card = this.add
      .rectangle(THEME.width / 2, cy, PANEL_W - 48, 220, THEME.panelBg)
      .setStrokeStyle(3, THEME.gold);
    const title = this.add
      .bitmapText(THEME.width / 2, cy - 88, 'pix', 'JOIN THE LEGENDS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    const hint = this.add
      .bitmapText(THEME.width / 2, cy - 62, 'pix', 'YOUR CALL SIGN ON THE WORLD BOARD', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);
    const nameLbl = this.add
      .bitmapText(THEME.width / 2, cy - 30, 'pix', name, 16)
      .setTint(0xf5e3b8)
      .setOrigin(0.5, 0);

    const mkButton = (x: number, label: string, tint: number, onTap: () => void) => {
      const bg = this.add
        .rectangle(x, cy + 46, 140, 40, THEME.cardBg)
        .setStrokeStyle(2, tint)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.bitmapText(x, cy + 46, 'pix', label, 8).setTint(tint).setOrigin(0.5);
      bg.on('pointerdown', () => {
        this.tweens.add({ targets: [bg, txt], scale: 0.94, duration: 60, yoyo: true });
        onTap();
      });
      return [bg, txt];
    };

    const reroll = mkButton(THEME.width / 2 - 78, 'REROLL', 0x2884a8, () => {
      name = rollCallSign();
      nameLbl.setText(name);
      audio.buy();
    });
    const join = mkButton(THEME.width / 2 + 78, 'JOIN', 0x2e7a1e, () => {
      this.gs.boardName = name;
      audio.merge();
      layer.destroy();
      void this.syncGlobal();
    });
    const later = this.add
      .bitmapText(THEME.width / 2, cy + 82, 'pix', 'MAYBE LATER', 8)
      .setTint(0x9a8d6e)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    later.on('pointerdown', () => {
      layer.destroy();
      this.footer.setText('LOCAL RANKINGS - TAP RANKS AGAIN TO JOIN');
    });

    layer.add([cover, card, title, hint, nameLbl, ...reroll, ...join, later]);
  }

  private renderBoard(board: BoardRow[]): void {
    this.rows.removeAll(true);
    this.maxScroll = Math.max(0, board.length * ROW_PITCH + 12 - LIST_H);
    board.forEach((row, i) => this.boardRow(row, LIST_TOP + 8 + i * ROW_PITCH + ROW_H / 2));
    const me = board.findIndex((r) => r.isPlayer);
    this.setScroll(me * ROW_PITCH - LIST_H / 2 + ROW_H);
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
      .bitmapText(PANEL_X + 92, y - 16, 'pix', row.isPlayer && this.gs.boardName ? `${this.gs.boardName} (YOU)` : row.name, 8)
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
