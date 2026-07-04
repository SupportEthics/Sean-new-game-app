import Phaser from 'phaser';
import {
  FREE_CHEST,
  GEM_PACKS,
  PIGGY,
  REMOVE_ADS,
  STARTER_PACK,
} from '../config/monetization';
import { formatNumber } from '../core/EconomyMath';
import { formatDuration } from '../core/OfflineEarnings';
import { GameState } from '../core/GameState';
import { IapService } from '../services/monetization/MonetizationService';
import { AdService } from '../services/monetization/AdService';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;

/** The shop: gem packs, starter bundle, remove-ads, piggy bank, free chest. */
export class ShopPanel extends Phaser.Scene {
  private gs!: GameState;
  private iap!: IapService;
  private ads!: AdService;
  private rows!: Phaser.GameObjects.Container;
  private pendingSku: string | null = null;
  private adBusy = false;

  constructor() {
    super('Shop');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.iap = this.registry.get('iap') as IapService;
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
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'SHOP', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    const close = this.add
      .bitmapText(PANEL_X + PANEL_W - 22, PANEL_Y + 12, 'pix', 'X', 16)
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.scene.stop());

    this.rows = this.add.container(0, 0);
    this.build();
    this.gs.on('shop:changed', () => {
      if (this.scene.isActive()) this.build();
    });

    if (import.meta.env.DEV) {
      (window as unknown as { __shopOpen?: boolean }).__shopOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __shopOpen?: boolean }).__shopOpen = false;
      });
    }
  }

  private buy(sku: string, fulfill: () => void): void {
    if (this.pendingSku) return;
    this.pendingSku = sku;
    this.build();
    void this.iap.purchase(sku).then((result) => {
      this.pendingSku = null;
      if (result.success) {
        fulfill();
        audio.coin();
      }
      if (this.scene.isActive()) this.build();
    });
  }

  private openChest(): void {
    if (this.adBusy || !this.gs.freeChestReady()) return;
    this.adBusy = true;
    this.build();
    void this.ads.showRewarded('free_chest').then((result) => {
      this.adBusy = false;
      if (result.rewarded) {
        this.gs.trackQuest('ads');
        this.gs.openFreeChest();
        audio.coin();
      }
      if (this.scene.isActive()) this.build();
    });
  }

  /** One pass, top to bottom, with a moving y cursor. */
  private build(): void {
    this.rows.removeAll(true);
    let y = PANEL_Y + 48;

    // Starter pack — the one-time hero offer, hidden once bought
    if (!this.gs.starterPackOwned) {
      const h = 62;
      this.card(y, h, 0xc9961e);
      this.text(24, y + 10, 'STARTER PACK', 0xc9961e);
      this.text(24, y + 26, `${STARTER_PACK.gems} GEMS + 30 MIN OF GOLD`, 0x4a3520);
      this.text(24, y + 42, 'ONE TIME ONLY', 0x8a5a2e);
      this.priceButton(y + h / 2, STARTER_PACK.sku, () =>
        this.gs.fulfillProduct(STARTER_PACK.sku),
      );
      y += h + 8;
    }

    // Remove ads
    {
      const h = 48;
      this.card(y, h, this.gs.removeAds ? 0x6fae4e : THEME.cardBorder);
      this.text(24, y + 10, 'REMOVE ADS', 0x4a3520);
      this.text(24, y + 26, 'NO MORE AD BREAKS', 0x8a5a2e);
      if (this.gs.removeAds) {
        this.rows.add(
          this.add
            .bitmapText(PANEL_X + PANEL_W - 24, y + h / 2, 'pix', 'OWNED', 8)
            .setOrigin(1, 0.5)
            .setTint(0x2e7a1e),
        );
      } else {
        this.priceButton(y + h / 2, REMOVE_ADS.sku, () =>
          this.gs.fulfillProduct(REMOVE_ADS.sku),
        );
      }
      y += h + 8;
    }

    // Piggy bank
    {
      const h = 56;
      const ready = this.gs.canCrackPiggy;
      this.card(y, h, ready ? 0xd06a8a : THEME.cardBorder);
      this.text(24, y + 10, 'PIGGY BANK', 0xd06a8a);
      this.text(24, y + 26, `${this.gs.piggyGems}/${PIGGY.cap} GEMS INSIDE`, 0x4a3520);
      this.text(24, y + 42, ready ? 'CRACK IT OPEN!' : `FILLS AS BOSSES FALL`, 0x8a5a2e);
      if (ready) {
        this.priceButton(y + h / 2, PIGGY.product.sku, () =>
          this.gs.fulfillProduct(PIGGY.product.sku),
        );
      } else {
        this.rows.add(
          this.add
            .bitmapText(PANEL_X + PANEL_W - 24, y + h / 2, 'pix', `MIN ${PIGGY.minToCrack}`, 8)
            .setOrigin(1, 0.5)
            .setTint(0x9a8d6e),
        );
      }
      y += h + 8;
    }

    // Free chest — rewarded ad on a cooldown
    {
      const h = 48;
      const ready = this.gs.freeChestReady() && !this.adBusy;
      this.card(y, h, ready ? 0x6fae4e : THEME.cardBorder);
      this.text(24, y + 10, 'FREE CHEST', 0x2e7a1e);
      this.text(
        24,
        y + 26,
        ready
          ? `${FREE_CHEST.gems} GEMS FOR AN AD`
          : this.adBusy
            ? 'AD PLAYING...'
            : `BACK IN ${formatDuration((this.gs.freeChestReadyAt - Date.now()) / 1000)}`,
        0x8a5a2e,
      );
      const btn = this.add
        .image(PANEL_X + PANEL_W - 52, y + h / 2, 'btn-sm')
        .setTint(ready ? 0x2e7a1e : THEME.buttonBgDisabled);
      const lbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 52, y + h / 2, 'pix', 'WATCH AD', 8)
        .setOrigin(0.5);
      if (ready) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openChest());
      }
      this.rows.add([btn, lbl]);
      y += h + 8;
    }

    // Gem packs — 2x2 grid
    const packW = (PANEL_W - 20 - 8) / 2;
    const packH = 82;
    GEM_PACKS.forEach((pack, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = PANEL_X + 10 + col * (packW + 8);
      const py = y + row * (packH + 8);
      const card = this.add
        .rectangle(px + packW / 2, py + packH / 2, packW, packH, THEME.cardBg)
        .setStrokeStyle(2, pack.tag ? 0x3a9ea8 : THEME.cardBorder);
      const gems = this.add
        .bitmapText(px + packW / 2, py + 8, 'pix', formatNumber(pack.gems).toUpperCase(), 16)
        .setOrigin(0.5, 0)
        .setTint(0x3a9ea8);
      const title = this.add
        .bitmapText(px + packW / 2, py + 30, 'pix', pack.title, 8)
        .setOrigin(0.5, 0)
        .setTint(0x4a3520);
      const pending = this.pendingSku === pack.sku;
      const btn = this.add
        .image(px + packW / 2, py + packH - 20, 'btn-sm')
        .setTint(pending ? THEME.buttonBgDisabled : 0x2e7a1e);
      const price = this.add
        .bitmapText(
          px + packW / 2,
          py + packH - 20,
          'pix',
          pending ? '...' : this.iap.getPriceLabel(pack.sku),
          8,
        )
        .setOrigin(0.5);
      if (!pending) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () =>
          this.buy(pack.sku, () => this.gs.fulfillProduct(pack.sku)),
        );
      }
      this.rows.add([card, gems, title, btn, price]);
      if (pack.tag) {
        const tagW = pack.tag.length * 12 + 12;
        this.rows.add(
          this.add.rectangle(px + packW / 2, py, tagW, 14, 0x3a9ea8).setStrokeStyle(1, 0x14101c),
        );
        this.rows.add(
          this.add
            .bitmapText(px + packW / 2, py, 'pix', pack.tag, 8)
            .setOrigin(0.5)
            .setTint(0xffffff),
        );
      }
    });
  }

  // ---- Small builders ----

  private card(y: number, h: number, stroke: number): void {
    this.rows.add(
      this.add
        .rectangle(THEME.width / 2, y + h / 2, PANEL_W - 20, h, THEME.cardBg)
        .setStrokeStyle(2, stroke),
    );
  }

  private text(x: number, y: number, s: string, tint: number): void {
    this.rows.add(this.add.bitmapText(PANEL_X + x, y, 'pix', s, 8).setTint(tint));
  }

  private priceButton(cy: number, sku: string, fulfill: () => void): void {
    const pending = this.pendingSku === sku;
    const btn = this.add
      .image(PANEL_X + PANEL_W - 52, cy, 'btn-sm')
      .setTint(pending ? THEME.buttonBgDisabled : 0x2e7a1e);
    const lbl = this.add
      .bitmapText(
        PANEL_X + PANEL_W - 52,
        cy,
        'pix',
        pending ? '...' : this.iap.getPriceLabel(sku),
        8,
      )
      .setOrigin(0.5);
    if (!pending) {
      btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.buy(sku, fulfill));
    }
    this.rows.add([btn, lbl]);
  }
}
