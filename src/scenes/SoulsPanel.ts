import Phaser from 'phaser';
import { addBackdrop, addCloseButton } from '../ui/panelInput';
import { SOUL_UPGRADES } from '../config/soulsTree';
import { ENCHANTS } from '../config/enchants';
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

/** Permanent power, two currencies: Soul Relics (rebirth Souls) and Forge
 * Enchantments (gems). One panel, two tabs. */
export class SoulsPanel extends Phaser.Scene {
  private gs!: GameState;
  private rows!: Phaser.GameObjects.Container;
  private tabButtons!: Phaser.GameObjects.Container;
  private balance!: Phaser.GameObjects.BitmapText;
  private tab: 'relics' | 'enchants' = 'relics';

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
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'THE FORGE OF POWER', 16)
      .setTint(0xc9a4ff)
      .setOrigin(0.5, 0);
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    this.tabButtons = this.add.container(0, 0);
    this.balance = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 84, 'pix', '', 8)
      .setTint(0x6a2a8a)
      .setOrigin(0.5, 0);

    this.rows = this.add.container(0, 0);
    this.buildTabs();
    this.buildRows();

    if (import.meta.env.DEV) {
      (window as unknown as { __soulsOpen?: boolean }).__soulsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __soulsOpen?: boolean }).__soulsOpen = false;
      });
    }
  }

  private buildTabs(): void {
    this.tabButtons.removeAll(true);
    const tabs: { key: 'relics' | 'enchants'; label: string; tint: number }[] = [
      { key: 'relics', label: 'SOUL RELICS', tint: 0x6a2a8a },
      { key: 'enchants', label: 'ENCHANTS', tint: 0x2884a8 },
    ];
    tabs.forEach((t, i) => {
      const x = PANEL_X + 96 + i * 174;
      const y = PANEL_Y + 58;
      const active = this.tab === t.key;
      const bg = this.add
        .rectangle(x, y, 168, 26, active ? t.tint : THEME.cardBg)
        .setStrokeStyle(2, active ? 0xc9a4ff : THEME.cardBorder)
        .setInteractive({ useHandCursor: true });
      const lbl = this.add
        .bitmapText(x, y, 'pix', t.label, 8)
        .setOrigin(0.5)
        .setTint(active ? 0xf5e3b8 : 0x8a5a2e);
      bg.on('pointerdown', () => {
        if (this.tab === t.key) return;
        this.tab = t.key;
        audio.buy();
        this.buildTabs();
        this.buildRows();
      });
      this.tabButtons.add([bg, lbl]);
    });
  }

  private buildRows(): void {
    this.rows.removeAll(true);
    if (this.tab === 'relics') {
      this.balance.setText(
        this.gs.prestigeCount === 0
          ? 'EARN SOULS BY REBIRTHING AT STAGE 40'
          : `${formatNumber(this.gs.souls).toUpperCase()} SOULS AVAILABLE`,
      );
      this.buildRelicRows();
    } else {
      this.balance.setText(
        `${formatNumber(this.gs.gems).toUpperCase()} GEMS - ENCHANTS SURVIVE REBIRTH`,
      );
      this.buildEnchantRows();
    }
  }

  private buildRelicRows(): void {
    SOUL_UPGRADES.forEach((def, i) => {
      const y = PANEL_Y + 108 + i * ROW_PITCH + ROW_H / 2;
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

  private buildEnchantRows(): void {
    ENCHANTS.forEach((def, i) => {
      const y = PANEL_Y + 108 + i * ROW_PITCH + ROW_H / 2;
      const level = this.gs.enchantLevel(def.id);
      const price = this.gs.enchantPrice(def.id);
      const affordable = price !== null && this.gs.gems >= price;

      const row = this.add.container(0, 0);
      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, THEME.cardBg)
        .setStrokeStyle(2, level > 0 ? 0x2884a8 : THEME.cardBorder);
      const name = this.add
        .bitmapText(PANEL_X + 16, y - 26, 'pix', def.name, 8)
        .setTint(0x2884a8);
      const desc = this.add
        .bitmapText(PANEL_X + 16, y - 8, 'pix', def.desc, 8)
        .setTint(0x4a3520);
      const lvl = this.add
        .bitmapText(PANEL_X + 16, y + 12, 'pix', `LV ${level}/${def.maxLevel}`, 8)
        .setTint(0x8a5a2e);

      const btn = this.add
        .image(PANEL_X + PANEL_W - 62, y, 'btn-sm')
        .setTint(price === null ? THEME.buttonBgDisabled : affordable ? 0x2884a8 : THEME.buttonBgDisabled);
      const btnLbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 62, y, 'pix', price === null ? 'MAX' : `${price} GEMS`, 8)
        .setOrigin(0.5);
      if (price !== null) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.gs.buyEnchant(def.id)) {
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
