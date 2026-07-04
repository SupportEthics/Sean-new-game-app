import Phaser from 'phaser';
import { RARITY_COLORS, SKINS, SkinDef } from '../config/skins';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { IapService } from '../services/monetization/MonetizationService';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 96;
const PANEL_W = THEME.width - 24;
const PANEL_H = 660;
const COLS = 3;
const CARD_W = 112;
const CARD_H = 128;
const PITCH_X = 118;
const PITCH_Y = 134;

/**
 * Modal skin collection: 25 cards in a drag-scrollable grid.
 * Buy with gold/gems, unlock by stage, or purchase the legendary five.
 */
export class SkinsPanel extends Phaser.Scene {
  private gs!: GameState;
  private iap!: IapService;
  private cards!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private dragging = false;
  private pendingSku: string | null = null;

  constructor() {
    super('Skins');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.iap = this.registry.get('iap') as IapService;
    this.scrollY = 0;

    // Dim + input-block the game behind
    const blocker = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.72)
      .setInteractive();
    blocker.on('pointerdown', () => {
      /* swallow */
    });

    // Panel chrome
    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, THEME.cardBorder);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'HERO SKINS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);

    const close = this.add
      .bitmapText(PANEL_X + PANEL_W - 22, PANEL_Y + 12, 'pix', 'X', 16)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.scene.stop());

    // Scrollable card grid, masked to the panel body
    this.cards = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillRect(PANEL_X + 2, PANEL_Y + 44, PANEL_W - 4, PANEL_H - 50);
    this.cards.setMask(maskShape.createGeometryMask());

    this.buildCards();

    const rows = Math.ceil(SKINS.length / COLS);
    this.maxScroll = Math.max(0, rows * PITCH_Y + 20 - (PANEL_H - 50));

    // Drag + wheel scrolling
    blocker.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown) return;
      if (!this.dragging) {
        this.dragging = true;
        this.dragStartY = ptr.y;
        this.dragStartScroll = this.scrollY;
      }
      this.setScroll(this.dragStartScroll + (this.dragStartY - ptr.y));
    });
    blocker.on('pointerup', () => (this.dragging = false));
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setScroll(this.scrollY + dy * 0.6),
    );

    this.gs.on('skins:changed', () => this.buildCards());
    this.gs.on('skin:changed', () => this.buildCards());

    if (import.meta.env.DEV) {
      (window as unknown as { __skinsOpen?: boolean }).__skinsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __skinsOpen?: boolean }).__skinsOpen = false;
      });
    }
  }

  private setScroll(v: number): void {
    this.scrollY = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.cards.setY(-this.scrollY);
  }

  private unlockLabel(def: SkinDef): { text: string; tint: number } {
    switch (def.unlock.type) {
      case 'free':
        return { text: 'FREE', tint: 0x2e7a1e };
      case 'gold':
        return { text: `${formatNumber(def.unlock.amount).toUpperCase()} GOLD`, tint: 0xc9961e };
      case 'gems':
        return { text: `${def.unlock.amount} GEMS`, tint: 0x2884a8 };
      case 'stage':
        return { text: `STAGE ${def.unlock.stage}`, tint: 0x7a4ac8 };
      case 'iap':
        return { text: this.iap.getPriceLabel(def.unlock.sku), tint: 0x2e7a1e };
    }
  }

  private buildCards(): void {
    this.cards.removeAll(true);
    const left = PANEL_X + 8 + CARD_W / 2;
    const top = PANEL_Y + 52 + CARD_H / 2;

    SKINS.forEach((def, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = left + col * PITCH_X;
      const y = top + row * PITCH_Y;
      const owned = this.gs.ownedSkins.includes(def.id);
      const equipped = this.gs.activeSkin === def.id;
      const legendary = def.rarity === 'legendary';

      const card = this.add.container(x, y);
      const bg = this.add
        .rectangle(0, 0, CARD_W, CARD_H, legendary ? 0xf5e6bc : THEME.cardBg)
        .setStrokeStyle(equipped ? 3 : 2, equipped ? 0x2e7a1e : RARITY_COLORS[def.rarity]);
      const preview = this.add.image(0, -22, `hero-${def.id}`, 0);
      if (!owned) preview.setTint(0x9a9a9a); // dimmed but colors still sell it

      const name = this.add
        .bitmapText(0, 34, 'pix', def.name.toUpperCase(), 8)
        .setTint(0x4a3520)
        .setOrigin(0.5, 0)
        .setMaxWidth(CARD_W - 8);

      let stateText: string;
      let stateTint: number;
      if (equipped) {
        stateText = 'EQUIPPED';
        stateTint = 0x2e7a1e;
      } else if (owned) {
        stateText = 'TAP TO EQUIP';
        stateTint = 0x8a5a2e;
      } else if (this.pendingSku && def.unlock.type === 'iap' && def.unlock.sku === this.pendingSku) {
        stateText = '...';
        stateTint = 0x8a5a2e;
      } else {
        const label = this.unlockLabel(def);
        stateText = label.text;
        stateTint = label.tint;
      }
      const state = this.add
        .bitmapText(0, 56, 'pix', stateText, 8)
        .setTint(stateTint)
        .setOrigin(0.5, 0);

      // +X% DPS badge
      const bonus = this.add
        .bitmapText(-CARD_W / 2 + 5, -CARD_H / 2 + 5, 'pix', def.dpsBonus ? `+${Math.round(def.dpsBonus * 100)}%` : '', 8)
        .setTint(0xb03a2e);

      card.add([bg, preview, name, state, bonus]);
      card.setSize(CARD_W, CARD_H);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.downY - ptr.upY) > 10) return; // was a scroll drag
        this.onCardTap(def, owned);
      });
      this.cards.add(card);
    });
    this.cards.setY(-this.scrollY);
  }

  private onCardTap(def: SkinDef, owned: boolean): void {
    if (owned) {
      if (this.gs.equipSkin(def.id)) audio.buy();
      return;
    }
    if (def.unlock.type === 'iap') {
      if (this.pendingSku) return;
      const sku = def.unlock.sku;
      this.pendingSku = sku;
      this.buildCards();
      void this.iap.purchase(sku).then((result) => {
        this.pendingSku = null;
        if (result.success) {
          this.gs.grantSkin(def.id);
          this.gs.equipSkin(def.id);
          audio.stageUp();
        }
        if (this.scene.isActive()) this.buildCards();
      });
      return;
    }
    if (this.gs.unlockSkin(def.id)) {
      this.gs.equipSkin(def.id);
      audio.merge();
    }
  }
}
