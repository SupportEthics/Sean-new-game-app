import Phaser from 'phaser';
import { BUILDINGS, TOWN } from '../config/town';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { addBackdrop, addCloseButton } from '../ui/panelInput';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;
const ROW_H = 80;
const ROW_PITCH = 88;

/** The town: buy and upgrade buildings for permanent gold, DPS, offline
 * earnings and a daily gem trickle. Unlocked after the second rebirth. */
export class TownPanel extends Phaser.Scene {
  private gs!: GameState;
  private rows!: Phaser.GameObjects.Container;

  constructor() {
    super('Town');
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
    g.lineStyle(3, 0x8a5a2e);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'TOWN', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 48, 'pix', 'YOUR PEOPLE WORK WHILE YOU FIGHT', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);

    this.rows = this.add.container(0, 0);
    this.build();
    this.gs.on('town:changed', () => {
      if (this.scene.isActive()) this.build();
    });
    // The jeweler's vault fills in real time
    this.time.addEvent({ delay: 5000, loop: true, callback: () => this.build() });

    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    if (import.meta.env.DEV) {
      (window as unknown as { __townOpen?: boolean }).__townOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __townOpen?: boolean }).__townOpen = false;
      });
    }
  }

  /** Tiny pixel vignette per building, drawn with primitives. */
  private buildingIcon(id: string, x: number, y: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    if (id === 'farm') {
      g.fillStyle(0x6fae4e);
      g.fillRect(x - 14, y + 2, 28, 10); // field
      g.fillStyle(0xb03a2e);
      g.fillRect(x - 8, y - 10, 16, 12); // barn
      g.fillStyle(0x7a2418);
      g.fillTriangle(x - 11, y - 10, x + 11, y - 10, x, y - 18);
    } else if (id === 'blacksmith') {
      g.fillStyle(0x565b63);
      g.fillRect(x - 12, y + 4, 24, 6); // anvil base
      g.fillRect(x - 8, y - 4, 20, 8); // anvil body
      g.fillStyle(0xff9a3c);
      g.fillRect(x - 14, y - 14, 6, 8); // forge glow
    } else if (id === 'mine') {
      g.fillStyle(0x6a5d4e);
      g.fillRect(x - 14, y - 12, 28, 24); // rockface
      g.fillStyle(0x14101c);
      g.fillRect(x - 7, y - 4, 14, 16); // tunnel
      g.fillStyle(0x8a7a5e);
      g.fillRect(x - 9, y - 6, 18, 3); // beam
    } else {
      g.fillStyle(0x3a9ea8);
      g.fillTriangle(x, y - 12, x - 10, y + 2, x + 10, y + 2); // gem top
      g.fillTriangle(x - 10, y + 2, x + 10, y + 2, x, y + 12);
      g.fillStyle(0xa8e8ff);
      g.fillTriangle(x - 3, y - 8, x - 7, y, x + 1, y);
    }
    return g;
  }

  private effectLabel(id: string, level: number): string {
    const def = BUILDINGS.find((b) => b.id === id)!;
    const now = Math.round(level * def.perLevel * (id === 'jeweler' ? 1 : 100));
    if (id === 'jeweler') return `${now} GEMS/DAY`;
    return `+${now}% ${def.desc}`;
  }

  private build(): void {
    this.rows.removeAll(true);

    BUILDINGS.forEach((def, i) => {
      const y = PANEL_Y + 66 + i * ROW_PITCH + ROW_H / 2;
      const level = this.gs.buildingLevel(def.id);
      const cost = this.gs.buildingUpgradeCost(def.id);
      const afford = cost !== null && this.gs.gold >= cost;

      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, THEME.cardBg)
        .setStrokeStyle(2, level > 0 ? 0x8a5a2e : THEME.cardBorder);
      const icon = this.buildingIcon(def.id, PANEL_X + 36, y - 8);
      const lvlLbl = this.add
        .bitmapText(PANEL_X + 36, y + 18, 'pix', level > 0 ? `LV ${level}` : '-', 8)
        .setOrigin(0.5, 0)
        .setTint(0x8a5a2e);
      const name = this.add
        .bitmapText(PANEL_X + 66, y - 28, 'pix', def.name, 8)
        .setTint(0x4a3520);
      const effect = this.add
        .bitmapText(PANEL_X + 66, y - 10, 'pix', this.effectLabel(def.id, level), 8)
        .setTint(0x2e7a1e);
      const next = this.add
        .bitmapText(
          PANEL_X + 66,
          y + 8,
          'pix',
          cost === null
            ? 'FULLY UPGRADED'
            : `NEXT: ${this.effectLabel(def.id, level + 1)}`,
          8,
        )
        .setTint(0x9a8d6e);

      const btn = this.add
        .image(PANEL_X + PANEL_W - 58, y, 'btn-sm')
        .setTint(cost === null ? THEME.buttonBgDisabled : afford ? 0x2e7a1e : THEME.buttonBgDisabled);
      const btnLbl = this.add
        .bitmapText(
          PANEL_X + PANEL_W - 58,
          y,
          'pix',
          cost === null ? 'MAX' : `${formatNumber(cost).toUpperCase()}G`,
          8,
        )
        .setOrigin(0.5);
      if (afford) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.gs.buyBuilding(def.id)) audio.buy();
        });
      }
      this.rows.add([bg, icon, lvlLbl, name, effect, next, btn, btnLbl]);
    });

    // Jeweler vault bar
    const vy = PANEL_Y + 66 + BUILDINGS.length * ROW_PITCH + 18;
    const vault = this.gs.jewelerVault();
    const hasJeweler = this.gs.buildingLevel('jeweler') > 0;
    const bar = this.add
      .rectangle(THEME.width / 2, vy, PANEL_W - 20, 40, THEME.cardBg)
      .setStrokeStyle(2, vault > 0 ? 0x3a9ea8 : THEME.cardBorder);
    const label = this.add
      .bitmapText(
        PANEL_X + 16,
        vy,
        'pix',
        !hasJeweler
          ? 'BUILD THE JEWELER TO EARN DAILY GEMS'
          : vault > 0
            ? `VAULT: ${vault} GEMS READY`
            : `VAULT FILLS DAILY (CAP ${TOWN.jewelerCapDays} DAYS)`,
        8,
      )
      .setOrigin(0, 0.5)
      .setTint(vault > 0 ? 0x2884a8 : 0x8a5a2e);
    this.rows.add([bar, label]);
    if (vault > 0) {
      const btn = this.add.image(PANEL_X + PANEL_W - 58, vy, 'btn-sm').setTint(0x2884a8);
      const lbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 58, vy, 'pix', 'COLLECT', 8)
        .setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.gs.collectJeweler() > 0) audio.coin();
      });
      this.rows.add([btn, lbl]);
    }
  }
}
