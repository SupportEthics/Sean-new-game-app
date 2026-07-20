import Phaser from 'phaser';
import { addBackdrop, addCloseButton, addDragScroll } from '../ui/panelInput';
import { GEAR, TIER_NAMES, weaponFrame } from '../config/gear';
import { RARITY_COLORS, SKINS, SkinDef } from '../config/skins';
import {
  PREMIUM_SWORDS,
  premiumSkinKey,
  tierSkinKey,
} from '../config/swordSkins';
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
const TAB_H = 26;
const LIST_TOP = PANEL_Y + 50 + TAB_H;
const LIST_H = PANEL_H - 56 - TAB_H;

/** A card on the SWORDS tab: 'auto', a tier's art, or a premium weapon. */
interface SwordEntry {
  key: string;
  name: string;
  frame: number;
  state: 'equipped' | 'unlocked' | 'locked' | 'iap';
  stateText: string;
  stateTint: number;
  sku?: string;
  premiumId?: string;
  desc?: string;
  /** Worn-bonus badge, e.g. '+7.5%' or '+15% +15%G'. */
  badge?: string;
}

/**
 * Modal skin collection with two tabs: KNIGHT (the 25 hero skins) and
 * SWORDS (blade art — any tier design you've reached, plus the premium
 * real-money weapons). Drag-scrollable card grid.
 */
export class SkinsPanel extends Phaser.Scene {
  private gs!: GameState;
  private iap!: IapService;
  private cards!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private pendingSku: string | null = null;
  private tab: 'KNIGHT' | 'SWORDS' = 'KNIGHT';
  private tabLabels: Phaser.GameObjects.BitmapText[] = [];
  private tabBgs: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('Skins');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.iap = this.registry.get('iap') as IapService;
    this.scrollY = 0;

    // Dim + input-block the game behind; tapping outside the panel closes
    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

    // Panel chrome
    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, THEME.cardBorder);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'SKINS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);

    this.buildTabs();

    // Scrollable card grid, masked to the panel body below the tabs
    this.cards = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillRect(PANEL_X + 2, LIST_TOP, PANEL_W - 4, LIST_H);
    this.cards.setMask(maskShape.createGeometryMask());

    this.buildCards();

    // Added after the cards so scrolled-away (masked but interactive) cards
    // can never sit on top of the close target
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    // Drag scrolling anywhere over the card grid (works on touch even when
    // the finger lands on a card), plus wheel for desktop
    addDragScroll(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, LIST_TOP, PANEL_W, LIST_H),
      (delta) => this.setScroll(this.scrollY + delta),
    );
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) => this.setScroll(this.scrollY + dy * 0.6),
    );

    this.gs.on('skins:changed', () => this.buildCards());
    this.gs.on('skin:changed', () => this.buildCards());
    this.gs.on('swordskin:changed', () => this.buildCards());
    this.gs.on('swordskins:changed', () => this.buildCards());

    if (import.meta.env.DEV) {
      (window as unknown as { __skinsOpen?: boolean }).__skinsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __skinsOpen?: boolean }).__skinsOpen = false;
      });
    }
  }

  private buildTabs(): void {
    const tabs: ('KNIGHT' | 'SWORDS')[] = ['KNIGHT', 'SWORDS'];
    const w = (PANEL_W - 20 - 6) / 2;
    tabs.forEach((name, i) => {
      const x = PANEL_X + 10 + i * (w + 6) + w / 2;
      const y = PANEL_Y + 48 + TAB_H / 2;
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
        this.buildCards();
      });
      this.tabBgs.push(bg);
      this.tabLabels.push(label);
    });
    this.refreshTabs();
  }

  private refreshTabs(): void {
    (['KNIGHT', 'SWORDS'] as const).forEach((name, i) => {
      const active = this.tab === name;
      this.tabBgs[i].setFillStyle(active ? 0xf5e3b8 : THEME.cardBg);
      this.tabBgs[i].setStrokeStyle(2, active ? THEME.gold : THEME.cardBorder);
      this.tabLabels[i].setTint(active ? 0xc9961e : 0x8a5a2e);
    });
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
      case 'special':
        return { text: def.unlock.label, tint: 0x9b7ede };
    }
  }

  private buildCards(): void {
    this.cards.removeAll(true);
    if (this.tab === 'KNIGHT') this.buildHeroCards();
    else this.buildSwordCards();
    this.cards.setY(-this.scrollY);
  }

  private buildHeroCards(): void {
    const left = PANEL_X + 8 + CARD_W / 2;
    const top = LIST_TOP + 8 + CARD_H / 2;
    const rows = Math.ceil(SKINS.length / COLS);
    this.maxScroll = Math.max(0, rows * PITCH_Y + 20 - LIST_H);

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
      const preview = this.add.image(0, -28, `hero-${def.id}`, 0);
      if (!owned) preview.setTint(0x9a9a9a); // dimmed but colors still sell it

      const name = this.add
        .bitmapText(0, 26, 'pix', def.name.toUpperCase(), 8)
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
        .bitmapText(0, 50, 'pix', stateText, 8)
        .setTint(stateTint)
        .setOrigin(0.5, 0);

      // Bonus badges: damage top-left, gold top-right
      const dmgBadge = this.add
        .bitmapText(-CARD_W / 2 + 5, -CARD_H / 2 + 5, 'pix', def.dpsBonus ? `+${Math.round(def.dpsBonus * 100)}%` : '', 8)
        .setTint(0xb03a2e);
      const goldBadge = this.add
        .bitmapText(CARD_W / 2 - 5, -CARD_H / 2 + 5, 'pix', def.goldBonus ? `+${Math.round(def.goldBonus * 100)}%G` : '', 8)
        .setTint(0xc9961e)
        .setOrigin(1, 0);

      card.add([bg, preview, name, state, dmgBadge, goldBadge]);
      card.setSize(CARD_W, CARD_H);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.downY - ptr.upY) > 10) return; // was a scroll drag
        if (ptr.upY < LIST_TOP) return; // masked out under the header
        this.onHeroCardTap(def, owned);
      });
      this.cards.add(card);
    });
  }

  // ---- SWORDS tab ----

  private swordEntries(): SwordEntry[] {
    const cur = this.gs.swordSkin;
    const entries: SwordEntry[] = [];

    const autoPct = Math.min(this.gs.grid[0] ?? 1, GEAR.weaponArtCount) * 0.5;
    entries.push({
      key: 'auto',
      name: 'TIER ART',
      frame: weaponFrame(this.gs.bestTier),
      state: cur === 'auto' ? 'equipped' : 'unlocked',
      stateText: cur === 'auto' ? 'EQUIPPED' : 'TAP TO EQUIP',
      stateTint: cur === 'auto' ? 0x2e7a1e : 0x8a5a2e,
      desc: 'EACH SWORD ITS OWN',
      badge: `+${autoPct % 1 === 0 ? autoPct : autoPct.toFixed(1)}%`,
    });

    for (const sword of PREMIUM_SWORDS) {
      const owned = this.gs.ownedPremiumSwords.includes(sword.id);
      // Bundle-exclusive blades (Founder's Blade) never appear in the shop —
      // only once earned via their pack do they show as an equippable card.
      if (sword.founderOnly && !owned) continue;
      const key = premiumSkinKey(sword.id);
      const equipped = cur === key;
      entries.push({
        key,
        name: sword.name.toUpperCase(),
        frame: sword.frame,
        state: equipped ? 'equipped' : owned ? 'unlocked' : 'iap',
        stateText: equipped
          ? 'EQUIPPED'
          : owned
            ? 'TAP TO EQUIP'
            : this.pendingSku === sword.sku
              ? '...'
              : this.iap.getPriceLabel(sword.sku),
        stateTint: equipped ? 0x2e7a1e : owned ? 0x8a5a2e : 0x2e7a1e,
        sku: sword.sku,
        premiumId: sword.id,
        desc: sword.desc,
        badge: `+${Math.round(sword.dpsBonus * 100)}% +${Math.round(sword.goldBonus * 100)}%G`,
      });
    }

    for (let n = 1; n <= GEAR.weaponArtCount; n++) {
      const key = tierSkinKey(n);
      const unlocked = this.gs.bestTier >= n;
      const equipped = cur === key;
      const pct = n * 0.5;
      entries.push({
        key,
        name: TIER_NAMES[n - 1].toUpperCase(),
        frame: n - 1,
        state: equipped ? 'equipped' : unlocked ? 'unlocked' : 'locked',
        stateText: equipped ? 'EQUIPPED' : unlocked ? 'TAP TO EQUIP' : `REACH TIER ${n}`,
        stateTint: equipped ? 0x2e7a1e : unlocked ? 0x8a5a2e : 0x8a7d60,
        badge: `+${pct % 1 === 0 ? pct : pct.toFixed(1)}%`,
      });
    }
    return entries;
  }

  private buildSwordCards(): void {
    const entries = this.swordEntries();
    const left = PANEL_X + 8 + CARD_W / 2;
    const top = LIST_TOP + 8 + CARD_H / 2;
    const rows = Math.ceil(entries.length / COLS);
    this.maxScroll = Math.max(0, rows * PITCH_Y + 20 - LIST_H);

    entries.forEach((e, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = left + col * PITCH_X;
      const y = top + row * PITCH_Y;
      const premium = e.premiumId !== undefined;

      const card = this.add.container(x, y);
      const bg = this.add
        .rectangle(0, 0, CARD_W, CARD_H, premium ? 0xf5e6bc : THEME.cardBg)
        .setStrokeStyle(
          e.state === 'equipped' ? 3 : 2,
          e.state === 'equipped' ? 0x2e7a1e : premium ? 0xffd166 : THEME.cardBorder,
        );
      const preview = this.add.image(0, -28, 'gear', e.frame);
      if (e.state === 'locked') preview.setTint(0x8a8a8a);

      const name = this.add
        .bitmapText(0, 26, 'pix', e.name, 8)
        .setTint(0x4a3520)
        .setOrigin(0.5, 0)
        .setMaxWidth(CARD_W - 8);
      const state = this.add
        .bitmapText(0, 50, 'pix', e.stateText, 8)
        .setTint(e.stateTint)
        .setOrigin(0.5, 0);
      const tag = this.add
        .bitmapText(-CARD_W / 2 + 5, -CARD_H / 2 + 5, 'pix', e.badge ?? '', 8)
        .setTint(premium ? 0xc9961e : 0xb03a2e)
        .setMaxWidth(CARD_W - 8);

      card.add([bg, preview, name, state, tag]);
      card.setSize(CARD_W, CARD_H);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.downY - ptr.upY) > 10) return;
        if (ptr.upY < LIST_TOP) return;
        this.onSwordCardTap(e);
      });
      this.cards.add(card);
    });
  }

  private onHeroCardTap(def: SkinDef, owned: boolean): void {
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

  private onSwordCardTap(e: SwordEntry): void {
    if (e.state === 'equipped' || e.state === 'locked') return;
    if (e.state === 'unlocked') {
      if (this.gs.setSwordSkin(e.key)) audio.buy();
      return;
    }
    // Premium purchase, mirroring the legendary hero skin flow
    if (this.pendingSku || !e.sku || !e.premiumId) return;
    this.pendingSku = e.sku;
    this.buildCards();
    void this.iap.purchase(e.sku).then((result) => {
      this.pendingSku = null;
      if (result.success) {
        this.gs.grantPremiumSword(e.premiumId!);
        this.gs.setSwordSkin(e.key);
        audio.stageUp();
      }
      if (this.scene.isActive()) this.buildCards();
    });
  }
}
