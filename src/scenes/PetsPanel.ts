import Phaser from 'phaser';
import { PET_MAX_LEVEL, PETS } from '../config/pets';
import { formatNumber } from '../core/EconomyMath';
import { EggKind, GameState } from '../core/GameState';
import { AdService } from '../services/monetization/AdService';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;
const EGG_W = 110;
const EGG_H = 86;
const ROW_H = 58;
const ROW_PITCH = 64;
const RARITY_TINT: Record<string, number> = {
  common: 0x8a7a5e,
  rare: 0x3a6ea8,
  epic: 0x8a3aa8,
};

/** Pet den: hatch eggs, level companions, see their DPS bonuses. */
export class PetsPanel extends Phaser.Scene {
  private gs!: GameState;
  private ads!: AdService;
  private rows!: Phaser.GameObjects.Container;
  private eggs!: Phaser.GameObjects.Container;
  private reveal!: Phaser.GameObjects.BitmapText;
  private adBusy = false;

  constructor() {
    super('Pets');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.ads = this.registry.get('ads') as AdService;

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
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'PETS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    const close = this.add
      .bitmapText(PANEL_X + PANEL_W - 22, PANEL_Y + 12, 'pix', 'X', 16)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.scene.stop());

    this.reveal = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 148, 'pix', 'HATCH EGGS TO RECRUIT COMPANIONS', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);

    this.eggs = this.add.container(0, 0);
    this.rows = this.add.container(0, 0);
    this.buildEggs();
    this.buildRows();
    this.gs.on('pets:changed', () => {
      if (this.scene.isActive()) {
        this.buildEggs();
        this.buildRows();
      }
    });

    if (import.meta.env.DEV) {
      (window as unknown as { __petsOpen?: boolean }).__petsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __petsOpen?: boolean }).__petsOpen = false;
      });
    }
  }

  private hatch(kind: EggKind): void {
    const result = this.gs.hatchEgg(kind);
    if (!result) return;
    audio.merge();
    this.reveal.setText(
      result.wasMaxed
        ? `${result.pet.name} IS MAXED: +3 GEMS`
        : `HATCHED ${result.pet.name} - LV ${result.level}!`,
    );
    this.reveal.setTint(RARITY_TINT[result.pet.rarity]);
  }

  private watchAdEgg(): void {
    if (this.adBusy || !this.gs.freeEggAvailable()) return;
    this.adBusy = true;
    this.reveal.setText('AD PLAYING...').setTint(0x8a5a2e);
    void this.ads.showRewarded('pet_egg').then((result) => {
      this.adBusy = false;
      if (!result.rewarded) {
        this.reveal.setText('AD SKIPPED - NO EGG').setTint(0x8a5a2e);
        return;
      }
      this.gs.trackQuest('ads');
      if (this.scene.isActive()) this.hatch('free');
      else this.gs.hatchEgg('free');
    });
  }

  private buildEggs(): void {
    this.eggs.removeAll(true);
    const defs: { kind: EggKind; title: string; price: string; tint: number; enabled: boolean }[] = [
      {
        kind: 'gold',
        title: 'GOLD EGG',
        price: `${formatNumber(this.gs.goldEggCost).toUpperCase()} GOLD`,
        tint: 0xc9961e,
        enabled: this.gs.canHatchEgg('gold'),
      },
      {
        kind: 'gem',
        title: 'GEM EGG',
        price: `${this.gs.gemEggCost} GEMS`,
        tint: 0x3a9ea8,
        enabled: this.gs.canHatchEgg('gem'),
      },
      {
        kind: 'free',
        title: 'FREE EGG',
        price: this.gs.freeEggAvailable() ? 'WATCH AD' : 'TOMORROW',
        tint: 0x6fae4e,
        enabled: this.gs.freeEggAvailable(),
      },
    ];

    defs.forEach((def, i) => {
      const cx = PANEL_X + 14 + EGG_W / 2 + i * (EGG_W + 8);
      const cy = PANEL_Y + 54 + EGG_H / 2;
      const card = this.add
        .rectangle(cx, cy, EGG_W, EGG_H, THEME.cardBg)
        .setStrokeStyle(2, def.enabled ? def.tint : THEME.cardBorder);
      // Simple pixel egg: two stacked ellipses, rarity-tinted
      const egg = this.add.graphics();
      egg.fillStyle(0x14101c);
      egg.fillEllipse(cx, cy - 8, 26, 32);
      egg.fillStyle(def.enabled ? def.tint : 0x5a4a3a);
      egg.fillEllipse(cx, cy - 8, 22, 28);
      egg.fillStyle(0xffffff, 0.35);
      egg.fillEllipse(cx - 4, cy - 14, 7, 9);
      const title = this.add
        .bitmapText(cx, cy + 14, 'pix', def.title, 8)
        .setOrigin(0.5, 0)
        .setTint(0x4a3520);
      const price = this.add
        .bitmapText(cx, cy + 28, 'pix', def.price, 8)
        .setOrigin(0.5, 0)
        .setTint(def.enabled ? 0x2e7a1e : 0x8a5a2e);
      if (def.enabled) {
        card.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (def.kind === 'free') this.watchAdEgg();
          else this.hatch(def.kind);
        });
      }
      this.eggs.add([card, egg, title, price]);
    });
  }

  private buildRows(): void {
    this.rows.removeAll(true);

    PETS.forEach((pet, i) => {
      const y = PANEL_Y + 172 + i * ROW_PITCH + ROW_H / 2;
      const level = this.gs.petLevel(pet.id);
      const owned = level > 0;
      const active = this.gs.activePets.includes(pet.id);

      const row = this.add.container(0, 0);
      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, THEME.cardBg)
        .setStrokeStyle(2, active ? THEME.gold : owned ? RARITY_TINT[pet.rarity] : THEME.cardBorder);
      const sprite = this.add.sprite(PANEL_X + 34, y, `pet-${pet.id}`, 0).setScale(1.25);
      if (!owned) sprite.setTintFill(0x3a3048);
      const name = this.add
        .bitmapText(PANEL_X + 62, y - 20, 'pix', owned ? pet.name : '???', 8)
        .setTint(RARITY_TINT[pet.rarity]);
      const desc = this.add
        .bitmapText(PANEL_X + 62, y - 4, 'pix', pet.desc, 8)
        .setTint(0x4a3520);
      const bonus = this.add
        .bitmapText(
          PANEL_X + 62,
          y + 12,
          'pix',
          owned
            ? `+${Math.round(level * pet.dpsPerLevel * 100)}% DPS`
            : `+${Math.round(pet.dpsPerLevel * 100)}% DPS PER LV`,
          8,
        )
        .setTint(0x2e7a1e);
      const lvl = this.add
        .bitmapText(
          PANEL_X + PANEL_W - 16,
          y,
          'pix',
          owned ? `LV ${level}/${PET_MAX_LEVEL}` : 'LOCKED',
          8,
        )
        .setOrigin(1, 0.5)
        .setTint(owned ? 0x8a5a2e : 0x9a8d6e);
      row.add([bg, sprite, name, desc, bonus, lvl]);
      if (active) {
        row.add(
          this.add
            .bitmapText(PANEL_X + PANEL_W - 16, y - 20, 'pix', 'IN ARENA', 8)
            .setOrigin(1, 0.5)
            .setTint(0xc9961e),
        );
      }
      this.rows.add(row);
    });
  }
}
