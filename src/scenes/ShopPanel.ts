import Phaser from 'phaser';
import { addBackdrop, addCloseButton, addDragScroll } from '../ui/panelInput';
import {
  BUNDLES,
  FREE_CHEST,
  GEM_PACKS,
  GOLD_PACKS,
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
const PANEL_Y = 108;
const PANEL_W = THEME.width - 24;
const PANEL_H = 640;
const LIST_TOP = PANEL_Y + 44;
const LIST_H = PANEL_H - 50;

/**
 * The shop, now a scrollable list: starter pack, remove-ads, piggy bank,
 * free chest, then GEMS / COINS / BUNDLES sections (coins + bundle grants
 * scale with the buyer's current gold income; big spender tiers included).
 */
export class ShopPanel extends Phaser.Scene {
  private gs!: GameState;
  private iap!: IapService;
  private ads!: AdService;
  private rows!: Phaser.GameObjects.Container;
  private pendingSku: string | null = null;
  private adBusy = false;
  private scrollY = 0;
  private maxScroll = 0;

  constructor() {
    super('Shop');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.iap = this.registry.get('iap') as IapService;
    this.ads = this.registry.get('ads') as AdService;
    this.scrollY = 0;

    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

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

    this.rows = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillRect(PANEL_X + 2, LIST_TOP, PANEL_W - 4, LIST_H);
    this.rows.setMask(maskShape.createGeometryMask());

    this.build();

    // After the rows so masked-but-interactive cards never cover the X
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    addDragScroll(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, LIST_TOP, PANEL_W, LIST_H),
      (delta) => this.setScroll(this.scrollY + delta),
    );
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) =>
        this.setScroll(this.scrollY + dy * 0.6),
    );

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

  private setScroll(v: number): void {
    this.scrollY = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.rows.setY(-this.scrollY);
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
    let y = LIST_TOP + 6;

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
        btn.setInteractive({ useHandCursor: true }).on(
          'pointerup',
          (ptr: Phaser.Input.Pointer) => {
            if (this.tapBlocked(ptr)) return;
            this.openChest();
          },
        );
      }
      this.rows.add([btn, lbl]);
      y += h + 8;
    }

    // GEMS — grid of packs, small to whale-sized
    y = this.sectionHeader(y, 'GEMS', 0x3a9ea8);
    y = this.packGrid(y, GEM_PACKS.map((p) => ({
      sku: p.sku,
      title: p.title,
      big: formatNumber(p.gems).toUpperCase(),
      bigTint: 0x3a9ea8,
      sub: 'GEMS',
      tag: p.tag,
    })));

    // COINS — gold that scales with the buyer's current income
    y = this.sectionHeader(y, 'COINS', 0xc9961e);
    y = this.packGrid(y, GOLD_PACKS.map((p) => ({
      sku: p.sku,
      title: p.title,
      big: `${p.goldHours}H`,
      bigTint: 0xc9961e,
      sub: 'OF GOLD INCOME',
      tag: p.tag,
    })));

    // BUNDLES — gems + coins together
    y = this.sectionHeader(y, 'BUNDLES - GEMS + COINS', 0x7a4ac8);
    for (const b of BUNDLES) {
      const h = 56;
      this.card(y, h, b.tag ? 0x7a4ac8 : THEME.cardBorder);
      this.text(24, y + 10, b.title, 0x7a4ac8);
      this.text(
        24,
        y + 26,
        `${formatNumber(b.gems).toUpperCase()} GEMS + ${b.goldHours}H OF GOLD`,
        0x4a3520,
      );
      if (b.tag) this.text(24, y + 42, b.tag, 0xc9961e);
      this.priceButton(y + h / 2, b.sku, () => this.gs.fulfillProduct(b.sku));
      y += h + 8;
    }

    this.maxScroll = Math.max(0, y + 6 - (LIST_TOP + LIST_H));
    this.rows.setY(-this.scrollY);
  }

  // ---- Small builders ----

  /** Scroll-drags and taps on rows masked out of the list must not buy. */
  private tapBlocked(ptr: Phaser.Input.Pointer): boolean {
    return (
      Math.abs(ptr.downY - ptr.upY) > 10 ||
      ptr.upY < LIST_TOP ||
      ptr.upY > LIST_TOP + LIST_H
    );
  }

  private sectionHeader(y: number, label: string, tint: number): number {
    const line = this.add.graphics();
    line.lineStyle(2, THEME.cardBorder, 0.7);
    line.lineBetween(PANEL_X + 10, y + 9, PANEL_X + PANEL_W - 10, y + 9);
    const bg = this.add
      .rectangle(THEME.width / 2, y + 9, label.length * 7 + 24, 16, THEME.panelBg);
    const text = this.add
      .bitmapText(THEME.width / 2, y + 9, 'pix', label, 8)
      .setOrigin(0.5)
      .setTint(tint);
    this.rows.add([line, bg, text]);
    return y + 24;
  }

  /** Two-column pack cards: big number, name, price button. */
  private packGrid(
    y: number,
    packs: { sku: string; title: string; big: string; bigTint: number; sub: string; tag?: string }[],
  ): number {
    const packW = (PANEL_W - 20 - 8) / 2;
    const packH = 92;
    packs.forEach((pack, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = PANEL_X + 10 + col * (packW + 8);
      const py = y + row * (packH + 8);
      const card = this.add
        .rectangle(px + packW / 2, py + packH / 2, packW, packH, THEME.cardBg)
        .setStrokeStyle(2, pack.tag ? pack.bigTint : THEME.cardBorder);
      const big = this.add
        .bitmapText(px + packW / 2, py + 8, 'pix', pack.big, 16)
        .setOrigin(0.5, 0)
        .setTint(pack.bigTint);
      const sub = this.add
        .bitmapText(px + packW / 2, py + 26, 'pix', pack.sub, 8)
        .setOrigin(0.5, 0)
        .setTint(0x8a5a2e);
      const title = this.add
        .bitmapText(px + packW / 2, py + 40, 'pix', pack.title, 8)
        .setOrigin(0.5, 0)
        .setTint(0x4a3520)
        .setMaxWidth(packW - 8);
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
        btn.setInteractive({ useHandCursor: true }).on(
          'pointerup',
          (ptr: Phaser.Input.Pointer) => {
            if (this.tapBlocked(ptr)) return;
            this.buy(pack.sku, () => this.gs.fulfillProduct(pack.sku));
          },
        );
      }
      this.rows.add([card, big, sub, title, btn, price]);
      if (pack.tag) {
        const tagW = pack.tag.length * 7 + 12;
        this.rows.add(
          this.add
            .rectangle(px + packW / 2, py, tagW, 14, pack.bigTint)
            .setStrokeStyle(1, 0x14101c),
        );
        this.rows.add(
          this.add
            .bitmapText(px + packW / 2, py, 'pix', pack.tag, 8)
            .setOrigin(0.5)
            .setTint(0xffffff),
        );
      }
    });
    return y + Math.ceil(packs.length / 2) * (packH + 8) + 4;
  }

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
      btn.setInteractive({ useHandCursor: true }).on(
        'pointerup',
        (ptr: Phaser.Input.Pointer) => {
          if (this.tapBlocked(ptr)) return;
          this.buy(sku, fulfill);
        },
      );
    }
    this.rows.add([btn, lbl]);
  }
}
