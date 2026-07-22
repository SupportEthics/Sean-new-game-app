import Phaser from 'phaser';
import { addBackdrop, addCloseButton, addDragScroll } from '../ui/panelInput';
import {
  BUNDLES,
  FREE_CHEST,
  FREE_GEMS_AD,
  GEM_PACKS,
  GOLD_PACKS,
  MEMBERSHIP,
  PIGGY,
  GOLDEN_KNIGHT,
  REMOVE_ADS,
  STARTER_PACK,
} from '../config/monetization';
import { SKINS } from '../config/skins';
import { PREMIUM_SWORDS, premiumSkinKey } from '../config/swordSkins';
import { formatNumber } from '../core/EconomyMath';
import { formatDuration } from '../core/OfflineEarnings';
import { GameState } from '../core/GameState';
import { IapService } from '../services/monetization/MonetizationService';
import { Capacitor } from '@capacitor/core';
import { AdService } from '../services/monetization/AdService';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 108;
const PANEL_W = THEME.width - 24;
const PANEL_H = 640;
const TAB_H = 26;
const LIST_TOP = PANEL_Y + 48 + TAB_H;
const LIST_H = PANEL_H - 54 - TAB_H;

const TABS = ['DEALS', 'GEMS', 'COINS', 'BUNDLES', 'SKINS'] as const;
type ShopTab = (typeof TABS)[number];

/**
 * The shop, split into sub-tabs (Sean: the single list was squished):
 * DEALS (starter pack, remove-ads, piggy, free chest), GEMS, COINS,
 * BUNDLES, and SKINS (the real-money hero skins + premium swords).
 * Coins and bundle gold scale with the buyer's current income.
 */
export class ShopPanel extends Phaser.Scene {
  private gs!: GameState;
  private iap!: IapService;
  private ads!: AdService;
  private rows!: Phaser.GameObjects.Container;
  private pendingSku: string | null = null;
  private adBusy = false;
  private restoring = false;
  private restoreMsg: string | null = null;
  private scrollY = 0;
  private maxScroll = 0;
  private tab: ShopTab = 'DEALS';
  private tabBgs: Phaser.GameObjects.Rectangle[] = [];
  private tabLabels: Phaser.GameObjects.BitmapText[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.iap = this.registry.get('iap') as IapService;
    this.ads = this.registry.get('ads') as AdService;
    this.scrollY = 0;
    this.tab = 'DEALS';

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

    this.buildTabs();

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

    const rebuild = (): void => {
      if (this.scene.isActive()) this.build();
    };
    this.gs.on('shop:changed', rebuild);
    this.gs.on('skins:changed', rebuild);
    this.gs.on('swordskins:changed', rebuild);

    if (import.meta.env.DEV) {
      (window as unknown as { __shopOpen?: boolean }).__shopOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __shopOpen?: boolean }).__shopOpen = false;
      });
    }
  }

  // ---- Tabs ----

  private buildTabs(): void {
    const w = (PANEL_W - 20 - (TABS.length - 1) * 4) / TABS.length;
    TABS.forEach((name, i) => {
      const x = PANEL_X + 10 + i * (w + 4) + w / 2;
      const y = PANEL_Y + 44 + TAB_H / 2;
      const bg = this.add
        .rectangle(x, y, w, TAB_H, THEME.cardBg)
        .setStrokeStyle(2, THEME.cardBorder)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .bitmapText(x, y, 'pix', name, 8)
        .setOrigin(0.5)
        .setTint(0x8a5a2e);
      bg.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.downY - ptr.upY) > 10) return;
        if (this.tab === name) return;
        this.tab = name;
        this.scrollY = 0;
        audio.buy();
        this.refreshTabs();
        this.build();
      });
      this.tabBgs.push(bg);
      this.tabLabels.push(label);
    });
    this.refreshTabs();
  }

  private refreshTabs(): void {
    TABS.forEach((name, i) => {
      const active = this.tab === name;
      this.tabBgs[i].setFillStyle(active ? 0xf5e3b8 : THEME.cardBg);
      this.tabBgs[i].setStrokeStyle(2, active ? THEME.gold : THEME.cardBorder);
      this.tabLabels[i].setTint(active ? 0xc9961e : 0x8a5a2e);
    });
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

  private watchGemAd(): void {
    if (this.adBusy || this.gs.gemAdsLeft() <= 0) return;
    this.adBusy = true;
    this.build();
    void this.ads.showRewarded('free_gems').then((result) => {
      this.adBusy = false;
      if (result.rewarded) {
        this.gs.trackQuest('ads');
        this.gs.grantGemAd();
        audio.coin();
      }
      if (this.scene.isActive()) this.build();
    });
  }

  /** Code entry as an HTML overlay so the device keyboard works (Phaser has
   * no text input). Works in the browser and in the Capacitor WKWebView. */
  private promptCode(): void {
    if (document.getElementById('promo-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'promo-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);z-index:99999;font-family:monospace;';
    const box = document.createElement('div');
    box.style.cssText =
      'background:#1c1622;border:2px solid #c9961e;border-radius:12px;padding:20px;width:280px;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.5);';
    const title = document.createElement('div');
    title.textContent = 'REDEEM CODE';
    title.style.cssText = 'color:#ffd166;font-size:18px;letter-spacing:2px;margin-bottom:12px;';
    const input = document.createElement('input');
    input.type = 'text';
    input.autocapitalize = 'characters';
    input.spellcheck = false;
    input.placeholder = 'ENTER CODE';
    input.style.cssText =
      'width:100%;box-sizing:border-box;padding:11px;font-size:16px;letter-spacing:1px;text-transform:uppercase;text-align:center;border-radius:8px;border:1px solid #8a7d60;background:#2a2434;color:#fff;';
    const msg = document.createElement('div');
    msg.style.cssText = 'color:#9a8d6e;font-size:12px;margin-top:8px;min-height:16px;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;margin-top:14px;';
    const redeemBtn = document.createElement('button');
    redeemBtn.textContent = 'REDEEM';
    redeemBtn.style.cssText =
      'flex:1;padding:11px;border:0;border-radius:8px;background:#2e7a1e;color:#fff;font-size:14px;cursor:pointer;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'CLOSE';
    closeBtn.style.cssText =
      'flex:1;padding:11px;border:0;border-radius:8px;background:#3a3244;color:#fff;font-size:14px;cursor:pointer;';
    const close = (): void => overlay.remove();
    closeBtn.onclick = close;
    redeemBtn.onclick = (): void => {
      const res = this.gs.redeemCode(input.value);
      msg.textContent = res.message;
      msg.style.color = res.ok ? '#6fdc6f' : '#e8884a';
      if (res.ok) {
        audio.coin();
        if (this.scene.isActive()) this.build();
        setTimeout(close, 1300);
      }
    };
    input.onkeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Enter') redeemBtn.click();
    };
    row.append(redeemBtn, closeBtn);
    box.append(title, input, msg, row);
    overlay.append(box);
    document.body.append(overlay);
    input.focus();
  }

  // ---- Content ----

  private build(): void {
    this.rows.removeAll(true);
    let bottom: number;
    switch (this.tab) {
      case 'DEALS':
        bottom = this.buildDeals();
        break;
      case 'GEMS':
        bottom = this.packGrid(GEM_PACKS.map((p) => ({
          sku: p.sku,
          title: p.title,
          big: formatNumber(p.gems).toUpperCase(),
          bigTint: 0x3a9ea8,
          sub: 'GEMS',
          tag: p.tag,
        })));
        break;
      case 'COINS':
        bottom = this.packGrid(GOLD_PACKS.map((p) => ({
          sku: p.sku,
          title: p.title,
          big: `${p.goldHours} HOURS`,
          bigTint: 0xc9961e,
          sub: 'OF GOLD INCOME',
          tag: p.tag,
        })));
        break;
      case 'BUNDLES':
        bottom = this.buildBundles();
        break;
      case 'SKINS':
        bottom = this.buildSkins();
        break;
    }
    this.maxScroll = Math.max(0, bottom + 6 - (LIST_TOP + LIST_H));
    this.rows.setY(-this.scrollY);
  }

  private buildDeals(): number {
    let y = LIST_TOP + 8;

    // Today's rotating bargain — a fresh reason to open the shop daily
    {
      const h = 66;
      const { deal, cost, affordable } = this.gs.dealTerms();
      const claimed = this.gs.dealClaimedToday();
      this.card(y, h, claimed ? 0x6fae4e : 0xb03a2e);
      this.text(24, y + 12, `TODAY ONLY: ${deal.title}`, 0xb03a2e);
      this.text(24, y + 28, deal.desc, 0x4a3520);
      this.text(24, y + 44, claimed ? 'CLAIMED - NEW DEAL TOMORROW' : `PAY ${cost}`, 0x8a5a2e);
      if (!claimed) {
        const bx = PANEL_X + PANEL_W - 58;
        const btn = this.add
          .image(bx, y + h / 2, 'btn-sm')
          .setTint(affordable ? 0xb03a2e : THEME.buttonBgDisabled)
          .setInteractive({ useHandCursor: true });
        const lbl = this.add.bitmapText(bx, y + h / 2, 'pix', 'GRAB IT', 8).setOrigin(0.5);
        btn.on('pointerup', (ptr: Phaser.Input.Pointer) => {
          if (Math.abs(ptr.downY - ptr.upY) > 10) return;
          // claimDailyDeal emits shop:changed, which rebuilds this list
          if (this.gs.claimDailyDeal()) audio.coin();
        });
        this.rows.add([btn, lbl]);
      }
      y += h + 10;
    }

    // Knight's Membership — the monthly subscription (recurring revenue and a
    // daily reason to open the app). Apple 3.1.2(c): the card must state the
    // title, length and price of the auto-renewing sub AND carry functional
    // Terms of Use + privacy policy links inside the app.
    {
      const active = this.gs.membershipActive();
      const h = active ? 80 : 96;
      this.card(y, h, active ? 0x6fae4e : 0x9b7ede);
      this.text(24, y + 10, "KNIGHT'S MEMBERSHIP", active ? 0x2e7a1e : 0x9b7ede);
      this.text(24, y + 28, `2X OFFLINE - ${MEMBERSHIP.dailyGems} GEMS EVERY DAY`, 0x4a3520);
      this.text(24, y + 44, '+25% GOLD - NO AD BREAKS', 0x8a5a2e);
      if (!active) {
        this.text(
          24,
          y + 62,
          `${this.iap.getPriceLabel(MEMBERSHIP.sku)}/MONTH AUTO-RENEWS - CANCEL ANYTIME`,
          0x9a8d6e,
        );
        const terms = this.add
          .bitmapText(PANEL_X + 24, y + 78, 'pix', 'TERMS OF USE', 8)
          .setTint(0x2884a8)
          .setInteractive({ useHandCursor: true });
        terms.on('pointerup', (ptr: Phaser.Input.Pointer) => {
          if (this.tapBlocked(ptr)) return;
          window.open('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/', '_blank');
        });
        const priv = this.add
          .bitmapText(PANEL_X + 130, y + 78, 'pix', 'PRIVACY POLICY', 8)
          .setTint(0x2884a8)
          .setInteractive({ useHandCursor: true });
        priv.on('pointerup', (ptr: Phaser.Input.Pointer) => {
          if (this.tapBlocked(ptr)) return;
          window.open('https://soulforge-knight.netlify.app/privacy.html', '_blank');
        });
        this.rows.add([terms, priv]);
        this.priceButton(y + h / 2 - 8, MEMBERSHIP.sku, () => this.gs.fulfillProduct(MEMBERSHIP.sku));
      } else {
        const days = Math.max(1, Math.ceil((this.gs.membershipUntil - this.gs.clock()) / 86_400_000));
        this.text(24, y + 62, `MEMBER - ${days}D LEFT`, 0x2e7a1e);
        if (this.gs.membershipStipendReady()) {
          const bx = PANEL_X + PANEL_W - 58;
          const btn = this.add
            .image(bx, y + h / 2, 'btn-sm')
            .setTint(0x2884a8)
            .setInteractive({ useHandCursor: true });
          const lbl = this.add.bitmapText(bx, y + h / 2, 'pix', `+${MEMBERSHIP.dailyGems}`, 8).setOrigin(0.5);
          btn.on('pointerup', (ptr: Phaser.Input.Pointer) => {
            if (this.tapBlocked(ptr)) return;
            if (this.gs.claimMembershipStipend() > 0) audio.coin();
          });
          this.rows.add([btn, lbl]);
        } else {
          this.rows.add(
            this.add
              .bitmapText(PANEL_X + PANEL_W - 24, y + h / 2, 'pix', 'GEMS CLAIMED', 8)
              .setOrigin(1, 0.5)
              .setTint(0x9a8d6e),
          );
        }
      }
      y += h + 10;
    }

    if (!this.gs.starterPackOwned) {
      const h = 66;
      this.card(y, h, 0xc9961e);
      this.text(24, y + 12, 'STARTER PACK', 0xc9961e);
      this.text(24, y + 28, `${STARTER_PACK.gems} GEMS + 30 MIN OF GOLD`, 0x4a3520);
      this.text(24, y + 44, 'ONE TIME ONLY', 0x8a5a2e);
      this.priceButton(y + h / 2, STARTER_PACK.sku, () =>
        this.gs.fulfillProduct(STARTER_PACK.sku),
      );
      y += h + 10;
    }

    {
      const h = 54;
      this.card(y, h, this.gs.removeAds ? 0x6fae4e : THEME.cardBorder);
      this.text(24, y + 12, 'REMOVE ADS', 0x4a3520);
      this.text(24, y + 30, 'NO MORE AD BREAKS', 0x8a5a2e);
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
      y += h + 10;
    }

    // Golden Knight VIP — hidden until the store product goes on sale
    // (owners always see their card)
    if (GOLDEN_KNIGHT.onSale || this.gs.goldenKnight) {
      const h = 66;
      this.card(y, h, this.gs.goldenKnight ? 0x6fae4e : 0xc9961e);
      this.text(24, y + 12, 'GOLDEN KNIGHT', 0xc9961e);
      this.text(24, y + 28, 'EVERY AD REWARD, INSTANTLY', 0x4a3520);
      this.text(
        24,
        y + 44,
        this.gs.goldenKnight ? 'YOURS FOREVER' : 'RAID RESETS, LOOT + MORE',
        0x8a5a2e,
      );
      if (this.gs.goldenKnight) {
        this.rows.add(
          this.add
            .bitmapText(PANEL_X + PANEL_W - 24, y + h / 2, 'pix', 'OWNED', 8)
            .setOrigin(1, 0.5)
            .setTint(0x2e7a1e),
        );
      } else {
        this.priceButton(y + h / 2, GOLDEN_KNIGHT.sku, () =>
          this.gs.fulfillProduct(GOLDEN_KNIGHT.sku),
        );
      }
      y += h + 10;
    }

    {
      const h = 62;
      const ready = this.gs.canCrackPiggy;
      this.card(y, h, ready ? 0xd06a8a : THEME.cardBorder);
      this.text(24, y + 12, 'PIGGY BANK', 0xd06a8a);
      this.text(24, y + 28, `${this.gs.piggyGems}/${PIGGY.cap} GEMS INSIDE`, 0x4a3520);
      this.text(24, y + 44, ready ? 'CRACK IT OPEN!' : 'FILLS AS BOSSES FALL', 0x8a5a2e);
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
      y += h + 10;
    }

    {
      const h = 54;
      const ready = this.gs.freeChestReady() && !this.adBusy;
      this.card(y, h, ready ? 0x6fae4e : THEME.cardBorder);
      this.text(24, y + 12, 'FREE CHEST', 0x2e7a1e);
      this.text(
        24,
        y + 30,
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
      y += h + 10;
    }

    // Free gems for a rewarded ad — a few times a day (ad revenue from the
    // players who never buy, and a gem drip that pulls them deeper)
    {
      const h = 54;
      const left = this.gs.gemAdsLeft();
      const ready = left > 0 && !this.adBusy;
      this.card(y, h, ready ? 0x6fae4e : THEME.cardBorder);
      this.text(24, y + 12, 'FREE GEMS', 0x2884a8);
      this.text(
        24,
        y + 30,
        this.adBusy
          ? 'AD PLAYING...'
          : left > 0
            ? `${FREE_GEMS_AD.gems} GEMS FOR AN AD - ${left} LEFT TODAY`
            : 'ALL WATCHED - BACK TOMORROW',
        0x8a5a2e,
      );
      const btn = this.add
        .image(PANEL_X + PANEL_W - 52, y + h / 2, 'btn-sm')
        .setTint(ready ? 0x2884a8 : THEME.buttonBgDisabled);
      const lbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 52, y + h / 2, 'pix', 'WATCH AD', 8)
        .setOrigin(0.5);
      if (ready) {
        btn.setInteractive({ useHandCursor: true }).on('pointerup', (ptr: Phaser.Input.Pointer) => {
          if (this.tapBlocked(ptr)) return;
          this.watchGemAd();
        });
      }
      this.rows.add([btn, lbl]);
      y += h + 10;
    }

    // Redeem a promo code (owner/tester master key, future public codes).
    // NOT on iOS: App Review rejected custom codes under guideline 3.1.1
    // (unlocking paid content outside IAP), so the card only exists on
    // web + Android — the same split gacha games use for gift codes.
    if (Capacitor.getPlatform() !== 'ios') {
      const h = 54;
      this.card(y, h, 0x9b7ede);
      this.text(24, y + 12, 'REDEEM CODE', 0x9b7ede);
      this.text(24, y + 30, 'GOT A CODE? UNLOCK YOUR REWARD', 0x8a5a2e);
      const btn = this.add.image(PANEL_X + PANEL_W - 52, y + h / 2, 'btn-sm').setTint(0x7a4ac8);
      const lbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 52, y + h / 2, 'pix', 'ENTER', 8)
        .setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true }).on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (this.tapBlocked(ptr)) return;
        this.promptCode();
      });
      this.rows.add([btn, lbl]);
      y += h + 10;
    }

    // Apple 3.1.1: restoring non-consumables must be reachable in the UI,
    // not just the silent check on boot.
    {
      const h = 54;
      this.card(y, h, THEME.cardBorder);
      this.text(24, y + 12, 'RESTORE PURCHASES', 0x4a3520);
      this.text(
        24,
        y + 30,
        this.restoring
          ? 'CHECKING WITH THE STORE...'
          : (this.restoreMsg ?? 'BOUGHT BEFORE? GET IT BACK HERE'),
        0x8a5a2e,
      );
      const btn = this.add
        .image(PANEL_X + PANEL_W - 52, y + h / 2, 'btn-sm')
        .setTint(this.restoring ? THEME.buttonBgDisabled : 0x2884a8);
      const lbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 52, y + h / 2, 'pix', 'RESTORE', 8)
        .setOrigin(0.5);
      if (!this.restoring) {
        btn.setInteractive({ useHandCursor: true }).on(
          'pointerup',
          (ptr: Phaser.Input.Pointer) => {
            if (this.tapBlocked(ptr)) return;
            this.restore();
          },
        );
      }
      this.rows.add([btn, lbl]);
      y += h + 10;
    }

    return y;
  }

  private restore(): void {
    if (this.restoring) return;
    this.restoring = true;
    this.restoreMsg = null;
    this.build();
    void this.iap.restore().then((skus) => {
      const n = this.gs.applyRestoredSkus(skus);
      this.restoring = false;
      this.restoreMsg =
        n > 0 ? `RESTORED ${n} PURCHASE${n === 1 ? '' : 'S'}` : 'NO PAST PURCHASES FOUND';
      if (n > 0) audio.coin();
      if (this.scene.isActive()) this.build();
    });
  }

  private buildBundles(): number {
    let y = LIST_TOP + 8;
    this.rows.add(
      this.add
        .bitmapText(THEME.width / 2, y, 'pix', 'GEMS + COINS TOGETHER - BETTER VALUE', 8)
        .setOrigin(0.5, 0)
        .setTint(0x8a5a2e),
    );
    y += 20;
    for (const b of BUNDLES) {
      const h = 72;
      this.card(y, h, b.tag ? 0x7a4ac8 : THEME.cardBorder);
      this.text(24, y + 12, b.title, 0x7a4ac8);
      this.text(24, y + 30, `${formatNumber(b.gems).toUpperCase()} GEMS`, 0x3a9ea8);
      this.text(24, y + 46, `+ ${b.goldHours}H OF GOLD INCOME`, 0xc9961e);
      if (b.tag) {
        this.rows.add(
          this.add
            .bitmapText(PANEL_X + PANEL_W - 24, y + 12, 'pix', b.tag, 8)
            .setOrigin(1, 0)
            .setTint(0xc9961e),
        );
      }
      this.priceButton(y + h / 2 + 8, b.sku, () => this.gs.fulfillProduct(b.sku));
      y += h + 10;
    }
    return y;
  }

  /** Real-money cosmetics: 5 legendary hero skins + 3 premium swords. */
  private buildSkins(): number {
    let y = LIST_TOP + 8;

    y = this.header(y, 'PREMIUM SWORDS', 0xc9961e);
    for (const sword of PREMIUM_SWORDS) {
      const h = 60;
      const owned = this.gs.ownedPremiumSwords.includes(sword.id);
      const equipped = this.gs.swordSkin === premiumSkinKey(sword.id);
      this.card(y, h, owned ? 0x6fae4e : 0xc9961e);
      this.rows.add(this.add.image(PANEL_X + 40, y + h / 2, 'gear', sword.frame).setScale(0.7));
      this.text(70, y + 14, sword.name.toUpperCase(), 0x4a3520);
      this.text(
        70,
        y + 32,
        `+${Math.round(sword.dpsBonus * 100)}% DMG +${Math.round(sword.goldBonus * 100)}% GOLD`,
        0xc9961e,
      );
      if (owned) {
        const lbl = equipped ? 'EQUIPPED' : 'TAP TO WEAR';
        const btn = this.add
          .bitmapText(PANEL_X + PANEL_W - 24, y + h / 2, 'pix', lbl, 8)
          .setOrigin(1, 0.5)
          .setTint(equipped ? 0x2e7a1e : 0x8a5a2e);
        if (!equipped) {
          btn.setInteractive({ useHandCursor: true }).on(
            'pointerup',
            (ptr: Phaser.Input.Pointer) => {
              if (this.tapBlocked(ptr)) return;
              if (this.gs.setSwordSkin(premiumSkinKey(sword.id))) audio.buy();
            },
          );
        }
        this.rows.add(btn);
      } else {
        this.priceButton(y + h / 2, sword.sku, () => {
          this.gs.grantPremiumSword(sword.id);
          this.gs.setSwordSkin(premiumSkinKey(sword.id));
        });
      }
      y += h + 10;
    }

    y = this.header(y + 2, 'LEGENDARY HERO SKINS', 0x7a4ac8);
    for (const skin of SKINS.filter((s) => s.unlock.type === 'iap')) {
      const h = 60;
      const owned = this.gs.ownedSkins.includes(skin.id);
      const equipped = this.gs.activeSkin === skin.id;
      this.card(y, h, owned ? 0x6fae4e : 0x7a4ac8);
      this.rows.add(
        this.add.image(PANEL_X + 40, y + h / 2, `hero-${skin.id}`, 0).setScale(0.65),
      );
      this.text(70, y + 14, skin.name.toUpperCase(), 0x4a3520);
      this.text(
        70,
        y + 32,
        `+${Math.round(skin.dpsBonus * 100)}% DMG +${Math.round(skin.goldBonus * 100)}% GOLD`,
        0xb03a2e,
      );
      if (owned) {
        const lbl = equipped ? 'EQUIPPED' : 'TAP TO WEAR';
        const btn = this.add
          .bitmapText(PANEL_X + PANEL_W - 24, y + h / 2, 'pix', lbl, 8)
          .setOrigin(1, 0.5)
          .setTint(equipped ? 0x2e7a1e : 0x8a5a2e);
        if (!equipped) {
          btn.setInteractive({ useHandCursor: true }).on(
            'pointerup',
            (ptr: Phaser.Input.Pointer) => {
              if (this.tapBlocked(ptr)) return;
              if (this.gs.equipSkin(skin.id)) audio.buy();
            },
          );
        }
        this.rows.add(btn);
      } else {
        const sku = (skin.unlock as { sku: string }).sku;
        this.priceButton(y + h / 2, sku, () => {
          this.gs.grantSkin(skin.id);
          this.gs.equipSkin(skin.id);
        });
      }
      y += h + 10;
    }

    // Everything else (gold/gem/stage skins + tier blade art) lives in the
    // full wardrobe — point players there
    {
      const h = 44;
      this.card(y, h, THEME.cardBorder);
      this.text(24, y + 18, 'ALL SKINS AND BLADE ART', 0x4a3520);
      const btn = this.add
        .image(PANEL_X + PANEL_W - 52, y + h / 2, 'btn-sm')
        .setTint(0x2884a8)
        .setInteractive({ useHandCursor: true });
      const lbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 52, y + h / 2, 'pix', 'OPEN', 8)
        .setOrigin(0.5);
      btn.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (this.tapBlocked(ptr)) return;
        this.scene.stop();
        this.scene.launch('Skins');
      });
      this.rows.add([btn, lbl]);
      y += h + 10;
    }

    return y;
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

  private header(y: number, label: string, tint: number): number {
    this.rows.add(
      this.add
        .bitmapText(THEME.width / 2, y, 'pix', label, 8)
        .setOrigin(0.5, 0)
        .setTint(tint),
    );
    return y + 18;
  }

  /** Two-column pack cards with room to breathe: number, label, name, price. */
  private packGrid(
    packs: { sku: string; title: string; big: string; bigTint: number; sub: string; tag?: string }[],
  ): number {
    const top = LIST_TOP + 14; // leaves headroom for the floating tags
    const packW = (PANEL_W - 20 - 8) / 2;
    const packH = 108;
    const pitch = packH + 16;
    packs.forEach((pack, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = PANEL_X + 10 + col * (packW + 8);
      const py = top + row * pitch;
      const card = this.add
        .rectangle(px + packW / 2, py + packH / 2, packW, packH, THEME.cardBg)
        .setStrokeStyle(2, pack.tag ? pack.bigTint : THEME.cardBorder);
      const big = this.add
        .bitmapText(px + packW / 2, py + 14, 'pix', pack.big, 16)
        .setOrigin(0.5, 0)
        .setTint(pack.bigTint);
      const sub = this.add
        .bitmapText(px + packW / 2, py + 36, 'pix', pack.sub, 8)
        .setOrigin(0.5, 0)
        .setTint(0x8a5a2e);
      const title = this.add
        .bitmapText(px + packW / 2, py + 54, 'pix', pack.title, 8)
        .setOrigin(0.5, 0)
        .setTint(0x4a3520)
        .setMaxWidth(packW - 8);
      const pending = this.pendingSku === pack.sku;
      const btn = this.add
        .image(px + packW / 2, py + packH - 22, 'btn-sm')
        .setTint(pending ? THEME.buttonBgDisabled : 0x2e7a1e);
      const price = this.add
        .bitmapText(
          px + packW / 2,
          py + packH - 22,
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
    return top + Math.ceil(packs.length / 2) * pitch;
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
