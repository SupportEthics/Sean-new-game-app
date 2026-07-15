import Phaser from 'phaser';
import { DUNGEON } from '../config/dungeon';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { addBackdrop, addCloseButton } from '../ui/panelInput';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 452;
const BTN_W = 168;
const BTN_H = 84;
const COL_L = PANEL_X + 12 + BTN_W / 2;
const COL_R = PANEL_X + PANEL_W - 12 - BTN_W / 2;
const ROW_TOP = PANEL_Y + 60 + BTN_H / 2;
const ROW_PITCH = 96;

interface MenuEntry {
  label: string;
  scene: string;
  col: 0 | 1;
  row: number;
  /** null = open; otherwise the toast explaining the lock. */
  locked: () => string | null;
  badge?: () => number;
  icon: (g: Phaser.GameObjects.Graphics, x: number, y: number) => void;
}

/** The MENU modal: every occasional destination on one clean grid, so the
 * arena never wears a wall of buttons (Sean's call). */
export class MenuPanel extends Phaser.Scene {
  private gs!: GameState;

  constructor() {
    super('Menu');
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
    g.lineStyle(3, THEME.headerTrim);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'MENU', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    const entries: MenuEntry[] = [
      {
        label: 'RAID',
        scene: 'Raids',
        col: 0,
        row: 0,
        locked: () => (this.gs.raidsUnlocked ? null : 'UNLOCKS AFTER FIRST REBIRTH'),
        icon: (gr, x, y) => {
          // Crossed blades
          gr.lineStyle(4, 0xd8d4e4);
          gr.lineBetween(x - 10, y + 10, x + 10, y - 10);
          gr.lineBetween(x - 10, y - 10, x + 10, y + 10);
          gr.fillStyle(0xb03a2e);
          gr.fillRect(x - 12, y + 8, 6, 6);
          gr.fillRect(x + 6, y + 8, 6, 6);
        },
      },
      {
        label: 'QUESTS',
        scene: 'Quests',
        col: 1,
        row: 0,
        locked: () => null,
        badge: () => this.gs.claimableQuests,
        icon: (gr, x, y) => {
          // Scroll
          gr.fillStyle(0xf5e3b8);
          gr.fillRoundedRect(x - 9, y - 12, 18, 24, 3);
          gr.lineStyle(2, 0x8a5a2e);
          for (let i = 0; i < 3; i++) gr.lineBetween(x - 5, y - 6 + i * 6, x + 5, y - 6 + i * 6);
        },
      },
      {
        label: 'DUNGEON',
        scene: 'Dungeon',
        col: 0,
        row: 1,
        locked: () =>
          this.gs.dungeonUnlocked
            ? this.gs.raid
              ? 'FINISH THE CURRENT FIGHT FIRST'
              : null
            : `UNLOCKS AT STAGE ${DUNGEON.unlockStage}`,
        badge: () =>
          this.gs.dungeonUnlocked && !this.gs.dungeonClearedToday() && !this.gs.raid ? 1 : 0,
        icon: (gr, x, y) => {
          // Arched doorway
          gr.fillStyle(0x2884a8);
          gr.fillRoundedRect(x - 11, y - 12, 22, 24, { tl: 11, tr: 11, bl: 0, br: 0 });
          gr.fillStyle(0x14101c);
          gr.fillRoundedRect(x - 6, y - 5, 12, 17, { tl: 6, tr: 6, bl: 0, br: 0 });
        },
      },
      {
        label: 'CODEX',
        scene: 'Codex',
        col: 1,
        row: 1,
        locked: () => null,
        badge: () => this.gs.codexClaimable,
        icon: (gr, x, y) => {
          // Open book
          gr.fillStyle(0xf5e3b8);
          gr.fillRect(x - 13, y - 8, 12, 18);
          gr.fillRect(x + 1, y - 8, 12, 18);
          gr.lineStyle(2, 0x8a5a2e);
          gr.strokeRect(x - 13, y - 8, 26, 18);
          gr.lineBetween(x, y - 8, x, y + 10);
        },
      },
      {
        label: 'TOWN',
        scene: 'Town',
        col: 0,
        row: 2,
        locked: () => (this.gs.townUnlocked ? null : 'UNLOCKS AFTER YOUR 2ND REBIRTH'),
        icon: (gr, x, y) => {
          // House
          gr.fillStyle(0xd8e4c4);
          gr.fillRect(x - 9, y - 2, 18, 12);
          gr.fillStyle(0xb03a2e);
          gr.fillTriangle(x - 12, y - 2, x + 12, y - 2, x, y - 13);
        },
      },
      {
        label: 'CLOUD',
        scene: 'Cloud',
        col: 1,
        row: 2,
        locked: () => null,
        icon: (gr, x, y) => {
          gr.fillStyle(0xbfd4e8);
          gr.fillCircle(x - 8, y + 1, 6);
          gr.fillCircle(x + 1, y - 3, 7);
          gr.fillCircle(x + 9, y + 2, 5);
          gr.fillRoundedRect(x - 13, y + 1, 26, 7, 3);
        },
      },
    ];

    for (const e of entries) this.menuButton(e);

    // REBIRTH: the panel's grand full-width foot
    const ry = PANEL_Y + PANEL_H - 44;
    const can = this.gs.canPrestige;
    const rg = this.add.graphics();
    rg.fillStyle(can ? 0x4a1e60 : 0x3a3244, 0.95);
    rg.fillRoundedRect(PANEL_X + 12, ry - 24, PANEL_W - 24, 48, 8);
    rg.lineStyle(2, can ? 0x9b7ede : THEME.cardBorder);
    rg.strokeRoundedRect(PANEL_X + 12, ry - 24, PANEL_W - 24, 48, 8);
    const star = this.add.image(PANEL_X + 38, ry, 'icons', 3).setScale(0.9);
    if (!can) star.setAlpha(0.4);
    this.add
      .bitmapText(
        THEME.width / 2 + 12,
        ry,
        'pix',
        can ? `REBIRTH - EARN ${this.gs.prestigeReward} SOULS` : 'REBIRTH AT STAGE 40',
        8,
      )
      .setOrigin(0.5)
      .setTint(can ? 0xd8b4ff : 0x8a7d60);
    this.add
      .rectangle(THEME.width / 2, ry, PANEL_W - 24, 48, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (!this.gs.canPrestige) {
          audio.buy();
          return;
        }
        this.scene.stop();
        (this.scene.get('UI') as unknown as { confirmPrestige(): void }).confirmPrestige();
      });

    if (import.meta.env.DEV) {
      (window as unknown as { __menuOpen?: boolean }).__menuOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __menuOpen?: boolean }).__menuOpen = false;
      });
    }
  }

  private menuButton(e: MenuEntry): void {
    const x = e.col === 0 ? COL_L : COL_R;
    const y = ROW_TOP + e.row * ROW_PITCH;
    const lockReason = e.locked();
    const bg = this.add
      .rectangle(x, y, BTN_W, BTN_H, THEME.cardBg)
      .setStrokeStyle(2, lockReason ? THEME.cardBorder : THEME.gold)
      .setInteractive({ useHandCursor: true });
    if (lockReason) bg.setFillStyle(0xb8ab8e, 0.55);

    const icon = this.add.graphics();
    e.icon(icon, x, y - 16);
    if (lockReason) icon.setAlpha(0.45);

    this.add
      .bitmapText(x, y + 14, 'pix', e.label, 8)
      .setOrigin(0.5, 0)
      .setTint(lockReason ? 0x8a7d60 : 0x4a3520);
    if (lockReason) {
      this.add.text(x + BTN_W / 2 - 18, y - 24, '🔒', { fontSize: '14px' }).setOrigin(0.5);
    }

    const badgeN = e.badge?.() ?? 0;
    if (badgeN > 0) {
      this.add.circle(x + BTN_W / 2 - 10, y - BTN_H / 2 + 10, 9, 0xb03a2e).setStrokeStyle(1, 0x14101c);
      this.add
        .bitmapText(x + BTN_W / 2 - 10, y - BTN_H / 2 + 10, 'pix', String(Math.min(badgeN, 9)), 8)
        .setOrigin(0.5)
        .setTint(0xffffff);
    }

    bg.on('pointerdown', () => {
      const reason = e.locked();
      if (reason) {
        this.toast(reason);
        return;
      }
      audio.buy();
      this.scene.stop();
      if (!this.scene.isActive(e.scene)) this.scene.launch(e.scene);
    });
  }

  /** Small self-owned toast so lock hints render above the modal. */
  private toast(msg: string): void {
    const t = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H + 16, 'pix', msg, 8)
      .setOrigin(0.5)
      .setTint(0xffd166)
      .setDropShadow(1, 1, 0x14101c, 1)
      .setDepth(70);
    this.tweens.add({
      targets: t,
      y: t.y - 14,
      alpha: 0,
      delay: 1100,
      duration: 400,
      onComplete: () => t.destroy(),
    });
  }
}
