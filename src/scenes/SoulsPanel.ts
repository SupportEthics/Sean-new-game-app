import Phaser from 'phaser';
import { addBackdrop, addCloseButton } from '../ui/panelInput';
import { SOUL_UPGRADES } from '../config/soulsTree';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;
const ROW_H = 78;
const ROW_PITCH = 86;

/** Soul Relics: permanent upgrades bought with prestige Souls. */
export class SoulsPanel extends Phaser.Scene {
  private gs!: GameState;
  private rows!: Phaser.GameObjects.Container;
  private balance!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Souls');
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
    g.lineStyle(3, 0x9b7ede);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'SOUL RELICS', 16)
      .setTint(0xc9a4ff)
      .setOrigin(0.5, 0);
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    this.balance = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 52, 'pix', '', 8)
      .setTint(0x6a2a8a)
      .setOrigin(0.5, 0);

    this.rows = this.add.container(0, 0);
    this.buildRows();

    if (import.meta.env.DEV) {
      (window as unknown as { __soulsOpen?: boolean }).__soulsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __soulsOpen?: boolean }).__soulsOpen = false;
      });
    }
  }

  private buildRows(): void {
    this.rows.removeAll(true);
    this.balance.setText(
      this.gs.prestigeCount === 0
        ? 'EARN SOULS BY REBIRTHING AT STAGE 40'
        : `${formatNumber(this.gs.souls).toUpperCase()} SOULS AVAILABLE`,
    );

    SOUL_UPGRADES.forEach((def, i) => {
      const y = PANEL_Y + 76 + i * ROW_PITCH + ROW_H / 2;
      const level = this.gs.soulLevel(def.id);
      const price = this.gs.soulUpgradePrice(def.id);
      const affordable = price !== null && this.gs.souls >= price;

      const row = this.add.container(0, 0);
      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, THEME.cardBg)
        .setStrokeStyle(2, level > 0 ? 0x9b7ede : THEME.cardBorder);
      const name = this.add
        .bitmapText(PANEL_X + 16, y - 26, 'pix', def.name.toUpperCase(), 8)
        .setTint(0x6a2a8a);
      const desc = this.add
        .bitmapText(PANEL_X + 16, y - 8, 'pix', def.desc, 8)
        .setTint(0x4a3520);
      const lvl = this.add
        .bitmapText(PANEL_X + 16, y + 12, 'pix', `LV ${level}/${def.maxLevel}`, 8)
        .setTint(0x8a5a2e);

      const btn = this.add
        .image(PANEL_X + PANEL_W - 62, y, 'btn-sm')
        .setTint(price === null ? THEME.buttonBgDisabled : affordable ? 0x6a2a8a : THEME.buttonBgDisabled);
      const btnLbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 62, y, 'pix', price === null ? 'MAX' : `${price} SOULS`, 8)
        .setOrigin(0.5);
      if (price !== null) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.gs.buySoulUpgrade(def.id)) {
            audio.merge();
            this.buildRows();
          }
        });
      }
      row.add([bg, name, desc, lvl, btn, btnLbl]);
      this.rows.add(row);
    });
  }
}
