import Phaser from 'phaser';
import { ECONOMY } from '../config/economy';
import { GEAR, tierName } from '../config/gear';
import { formatNumber, gearDps } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { InterstitialPolicy } from '../core/Interstitials';
import { formatDuration } from '../core/OfflineEarnings';
import { SaveManager } from '../core/SaveManager';
import { AdPlacement, AdService } from '../services/monetization/AdService';
import { audio } from '../services/AudioService';
import { THEME, tierColor } from '../ui/theme';

const L = THEME.layout;
const CARD_W = 60;
const CARD_H = 46;
const GAP = 2;

/** Level curve (display only, derived from lifetime kills — no save impact). */
function killsForLevel(level: number): number {
  return 5 * (level - 1) * (level - 1);
}
function levelFromKills(kills: number): number {
  return Math.floor(Math.sqrt(kills / 5)) + 1;
}

/**
 * The dense game chrome: currency header, Lv/EXP + stage HUD, sword-card
 * grid with DMG stats, auto toggles, buy card, and the bottom tab bar.
 */
export class UIScene extends Phaser.Scene {
  private gs!: GameState;
  private saveManager!: SaveManager;

  private goldText!: Phaser.GameObjects.BitmapText;
  private gemText!: Phaser.GameObjects.BitmapText;
  private soulsText!: Phaser.GameObjects.BitmapText;
  private dpsText!: Phaser.GameObjects.BitmapText;
  private levelText!: Phaser.GameObjects.BitmapText;
  private expBar!: Phaser.GameObjects.Rectangle;
  private stageText!: Phaser.GameObjects.BitmapText;
  private waveText!: Phaser.GameObjects.BitmapText;
  private buyLabel!: Phaser.GameObjects.BitmapText;
  private buyBg!: Phaser.GameObjects.Image;
  private upgradeBg!: Phaser.GameObjects.Image;
  private upgradeLabel!: Phaser.GameObjects.BitmapText;
  private itemLayer!: Phaser.GameObjects.Container;
  private cellCenters: { x: number; y: number }[] = [];
  private ads!: AdService;
  private autoMergeUntil = 0;
  private autoBuyUntil = 0;
  private adPending: string | null = null;
  private autoStates: { key: 'auto_merge' | 'auto_buy'; label: Phaser.GameObjects.BitmapText }[] = [];
  private lastHud = '';
  private raidLock!: Phaser.GameObjects.Text;
  private raidIcon!: Phaser.GameObjects.Image;
  private rebirthButton!: Phaser.GameObjects.Container;
  private confirmLayer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('UI');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.saveManager = this.registry.get('saveManager') as SaveManager;
    this.ads = this.registry.get('ads') as AdService;
    this.autoMergeUntil = this.prefTime('automerge_until');
    this.autoBuyUntil = this.prefTime('autobuy_until');

    this.createHeader();
    this.createHud();
    this.createPanel();
    this.createToggleRow();
    this.createTabBar();

    this.itemLayer = this.add.container(0, 0);
    this.rebuildItems();

    this.gs.on('gold:changed', () => this.refreshTexts());
    this.gs.on('gems:changed', () => this.refreshTexts());
    this.gs.on('grid:changed', () => {
      this.rebuildItems();
      this.refreshTexts();
    });
    this.gs.on('stage:changed', () => this.rebuildItems()); // slot unlocks re-badge cards
    this.refreshTexts();

    // Interstitial ad breaks between stages, paced by the core policy and
    // switched off entirely by the remove_ads purchase.
    const interstitials = new InterstitialPolicy();
    this.gs.on('stage:changed', () => {
      interstitials.onStageCleared();
      if (interstitials.shouldShow(this.gs.removeAds, !!this.gs.raid)) {
        interstitials.shown();
        this.showAdBreak();
      }
    });

    // Auto actions tick — one buy + one merge per beat, while the rewarded-ad
    // window is active
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        const now = Date.now();
        if (now < this.autoBuyUntil && this.gs.canBuy) this.gs.buyGear();
        if (now < this.autoMergeUntil) this.gs.autoMergeOnce();
      },
    });
    // Countdown labels on the automation buttons
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.refreshAutoLabels(),
    });

    this.createSideButtons();
    this.maybeShowOffline();

    if (import.meta.env.DEV) {
      (window as unknown as { __uiReady?: boolean }).__uiReady = true;
    }

    this.time.addEvent({ delay: 10_000, loop: true, callback: () => this.persist() });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.persist();
    });
  }

  override update(): void {
    // Poll HUD values that change every sim tick
    const b = this.gs.battle;
    const kills = this.gs.totalKills;
    const level = levelFromKills(kills);
    const cur = killsForLevel(level);
    const next = killsForLevel(level + 1);
    const frac = Phaser.Math.Clamp((kills - cur) / Math.max(next - cur, 1), 0, 1);

    const key = `${b.stage}|${b.wave}|${level}|${Math.round(frac * 60)}`;
    if (key === this.lastHud) return;
    this.lastHud = key;

    this.raidLock.setVisible(!this.gs.raidsUnlocked);
    this.raidIcon.setAlpha(this.gs.raidsUnlocked ? 1 : 0.35);
    this.rebirthButton.setVisible(this.gs.canPrestige);

    this.stageText.setText(`STAGE ${b.stage}`);
    this.waveText.setText(
      b.wave === 10
        ? 'BOSS FIGHT!'
        : `WAVE ${b.wave}/10 - ${formatNumber(this.gs.heroDps).toUpperCase()}/S`,
    );
    this.levelText.setText(`LV ${level}`);
    this.expBar.width = 96 * frac;
  }

  private prefTime(key: string): number {
    try {
      return Number(localStorage.getItem(`pawsblades_${key}`) ?? 0) || 0;
    } catch {
      return 0;
    }
  }

  private setPrefTime(key: string, v: number): void {
    try {
      localStorage.setItem(`pawsblades_${key}`, String(v));
    } catch {
      /* storage unavailable */
    }
  }

  private persist(): void {
    this.saveManager.save(this.gs);
  }

  // ---- Header: ornate wood strip with currencies ----

  private createHeader(): void {
    const g = this.add.graphics();
    g.fillStyle(THEME.headerBg);
    g.fillRect(0, 0, THEME.width, L.headerH);
    g.fillStyle(THEME.headerTrim);
    g.fillRect(0, L.headerH - 4, THEME.width, 2);

    this.add.image(24, 32, 'coin').setScale(1.3);
    this.goldText = this.add
      .bitmapText(36, 25, 'pix', '0', 16)
      .setTint(THEME.gold);

    const gem = this.add.graphics();
    gem.fillStyle(THEME.gem);
    gem.fillTriangle(140, 26, 133, 33, 147, 33);
    gem.fillTriangle(133, 33, 147, 33, 140, 41);
    this.gemText = this.add.bitmapText(153, 25, 'pix', '0', 16).setTint(0xa8e8ff);

    // Souls counter appears once the player has rebirthed
    this.soulsText = this.add
      .bitmapText(226, 25, 'pix', '', 16)
      .setTint(0xc9a4ff)
      .setVisible(false);

    this.dpsText = this.add
      .bitmapText(THEME.width - 44, 25, 'pix', '', 16)
      .setOrigin(1, 0);

    const mute = this.add
      .text(THEME.width - 20, 32, audio.isMuted ? '🔇' : '🔊', { fontSize: '15px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => mute.setText(audio.toggleMute() ? '🔇' : '🔊'));
  }

  // ---- HUD row: Lv/EXP bar + stage box ----

  private createHud(): void {
    const y = L.headerH;
    const g = this.add.graphics();
    g.fillStyle(THEME.panelBgDark);
    g.fillRect(0, y, THEME.width, L.hudH);

    // Lv + EXP bar (left) — bar starts clear of a 3-digit level number
    this.levelText = this.add.bitmapText(12, y + 15, 'pix', 'LV 1', 16);
    this.add
      .rectangle(102, y + 22, 100, 14, 0x2a1c10)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, THEME.headerTrim);
    this.expBar = this.add
      .rectangle(104, y + 22, 0, 8, THEME.expBar)
      .setOrigin(0, 0.5);

    // Stage box (right)
    const box = this.add.graphics();
    box.fillStyle(THEME.cardBg);
    box.fillRoundedRect(THEME.width - 168, y + 2, 156, L.hudH - 4, 8);
    box.lineStyle(2, THEME.cardBorder);
    box.strokeRoundedRect(THEME.width - 168, y + 2, 156, L.hudH - 4, 8);
    this.stageText = this.add
      .bitmapText(THEME.width - 90, y + 6, 'pix', 'STAGE 1', 16)
      .setTint(0xb03a2e)
      .setOrigin(0.5, 0);
    this.waveText = this.add
      .bitmapText(THEME.width - 90, y + 31, 'pix', '', 8)
      .setTint(0x4a3520)
      .setOrigin(0.5, 0);
  }

  // ---- Side buttons (arena left edge) ----

  private sideButton(
    y: number,
    label: string,
    onTap: () => void,
  ): { lock: Phaser.GameObjects.Text; icon: (img: Phaser.GameObjects.Image) => void } {
    const x = 30;
    const g = this.add.graphics();
    g.fillStyle(THEME.headerBg, 0.9);
    g.fillRoundedRect(x - 24, y - 24, 48, 48, 8);
    g.lineStyle(2, THEME.headerTrim);
    g.strokeRoundedRect(x - 24, y - 24, 48, 48, 8);
    this.add
      .bitmapText(x, y + 14, 'pix', label, 8)
      .setTint(0xffd166)
      .setOrigin(0.5, 0);
    const lock = this.add
      .text(x, y - 5, '🔒', { fontSize: '15px' })
      .setOrigin(0.5)
      .setVisible(false);
    this.add
      .rectangle(x, y, 48, 48, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onTap);
    return {
      lock,
      icon: (img) => img.setPosition(x, y - 5),
    };
  }

  private createSideButtons(): void {
    const skins = this.sideButton(L.arenaTop + 74, 'SKINS', () => {
      if (!this.scene.isActive('Skins')) {
        audio.buy();
        this.scene.launch('Skins');
      }
    });
    skins.icon(this.add.image(0, 0, `hero-${this.gs.activeSkin}`, 0).setScale(0.5));

    const raid = this.sideButton(L.arenaTop + 132, 'RAID', () => {
      if (!this.gs.raidsUnlocked) {
        this.toast('UNLOCKS AFTER FIRST REBIRTH');
        return;
      }
      if (!this.scene.isActive('Raids') && !this.gs.raid) {
        audio.buy();
        this.scene.launch('Raids');
      }
    });
    const raidIcon = this.add.image(0, 0, 'icons', 0).setScale(0.9);
    raid.icon(raidIcon);
    this.raidLock = raid.lock;
    this.raidIcon = raidIcon;

    const quests = this.sideButton(L.arenaTop + 190, 'QUESTS', () => {
      if (!this.scene.isActive('Quests')) {
        audio.buy();
        this.scene.launch('Quests');
      }
    });
    quests.icon(this.add.image(0, 0, 'icons', 1).setScale(0.9));

    // Rebirth appears once the run reaches the prestige stage
    this.rebirthButton = this.add.container(0, 0).setVisible(false);
    const x = 30;
    const y = L.arenaTop + 248;
    const g = this.add.graphics();
    g.fillStyle(0x4a1e60, 0.95);
    g.fillRoundedRect(x - 24, y - 24, 48, 48, 8);
    g.lineStyle(2, 0x9b7ede);
    g.strokeRoundedRect(x - 24, y - 24, 48, 48, 8);
    const star = this.add.image(x, y - 5, 'icons', 3).setScale(0.9);
    const lbl = this.add
      .bitmapText(x, y + 14, 'pix', 'REBIRTH', 8)
      .setTint(0xd8b4ff)
      .setOrigin(0.5, 0);
    const hit = this.add
      .rectangle(x, y, 48, 48, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.confirmPrestige());
    this.rebirthButton.add([g, star, lbl, hit]);
  }

  /** Small self-dismissing message above the toggles row. */
  /** Full-screen mock ad break; the real AdMob interstitial replaces the
   * overlay at M5 (the service call stays identical). */
  private showAdBreak(): void {
    const veil = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.92)
      .setDepth(2000)
      .setInteractive();
    const label = this.add
      .bitmapText(THEME.width / 2, THEME.height / 2 - 30, 'pix', 'AD BREAK', 16)
      .setOrigin(0.5)
      .setDepth(2001)
      .setTint(0xffd166);
    const hint = this.add
      .bitmapText(
        THEME.width / 2,
        THEME.height / 2 + 10,
        'pix',
        'REMOVE ADS FOREVER IN THE SHOP',
        8,
      )
      .setOrigin(0.5)
      .setDepth(2001)
      .setTint(0x9a8d6e);
    void this.ads.showInterstitial().then(() => {
      veil.destroy();
      label.destroy();
      hint.destroy();
    });
  }

  private toast(msg: string): void {
    const t = this.add
      .bitmapText(THEME.width / 2, L.panelTop - 24, 'pix', msg, 8)
      .setTint(0xffd166)
      .setDropShadow(1, 1, 0x14101c, 1)
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({
      targets: t,
      y: t.y - 16,
      alpha: 0,
      delay: 900,
      duration: 500,
      onComplete: () => t.destroy(),
    });
  }

  /** Welcome-back popup: collect offline gold, or double it with an ad. */
  maybeShowOffline(): void {
    const offline = this.registry.get('offline') as { gold: number; seconds: number } | null;
    if (!offline || offline.gold <= 0 || this.confirmLayer) return;
    this.registry.set('offline', null); // consume

    const layer = this.add.container(0, 0).setDepth(60);
    this.confirmLayer = layer;
    const dim = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.7)
      .setInteractive();
    const g = this.add.graphics();
    g.fillStyle(THEME.cardBg);
    g.fillRoundedRect(45, 300, 300, 230, 12);
    g.lineStyle(3, THEME.gold);
    g.strokeRoundedRect(45, 300, 300, 230, 12);
    const title = this.add
      .bitmapText(THEME.width / 2, 318, 'pix', 'WHILE YOU WERE AWAY', 16)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);
    const body = this.add
      .bitmapText(
        THEME.width / 2,
        352,
        'pix',
        `YOUR KNIGHT FOUGHT FOR ${formatDuration(offline.seconds)}`,
        8,
      )
      .setTint(0x4a3520)
      .setOrigin(0.5, 0);
    const coin = this.add.image(THEME.width / 2 - 60, 396, 'coin').setScale(2);
    const amount = this.add
      .bitmapText(THEME.width / 2 - 40, 388, 'pix', formatNumber(offline.gold).toUpperCase(), 16)
      .setTint(0xc9961e)
      .setOrigin(0, 0);

    const collect = this.add
      .image(THEME.width / 2, 445, 'btn-wide')
      .setTint(THEME.buttonBgDisabled)
      .setInteractive({ useHandCursor: true });
    const collectLbl = this.add
      .bitmapText(THEME.width / 2, 445, 'pix', 'COLLECT', 8)
      .setOrigin(0.5);
    const double = this.add
      .image(THEME.width / 2, 492, 'btn-wide')
      .setTint(0x2884a8)
      .setInteractive({ useHandCursor: true });
    const doubleLbl = this.add
      .bitmapText(THEME.width / 2, 492, 'pix', 'WATCH AD - COLLECT 2X', 8)
      .setOrigin(0.5);
    layer.add([dim, g, title, body, coin, amount, collect, collectLbl, double, doubleLbl]);

    const close = (mult: number) => {
      this.gs.addGold(offline.gold * mult);
      audio.coin();
      layer.destroy();
      this.confirmLayer = null;
    };
    collect.on('pointerdown', () => close(1));
    double.on('pointerdown', () => {
      if (!this.ads.isReady('offline_double')) return close(1);
      doubleLbl.setText('AD PLAYING...');
      void this.ads.showRewarded('offline_double').then((r) => {
        if (r.rewarded) this.gs.trackQuest('ads');
        close(r.rewarded ? 2 : 1);
      });
    });
  }

  private confirmPrestige(): void {
    if (!this.gs.canPrestige || this.confirmLayer) return;
    audio.bossWarn();
    const layer = this.add.container(0, 0).setDepth(60);
    this.confirmLayer = layer;
    const dim = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.7)
      .setInteractive();
    const g = this.add.graphics();
    g.fillStyle(THEME.cardBg);
    g.fillRoundedRect(45, 330, 300, 190, 12);
    g.lineStyle(3, 0x9b7ede);
    g.strokeRoundedRect(45, 330, 300, 190, 12);
    const title = this.add
      .bitmapText(THEME.width / 2, 348, 'pix', 'REBIRTH?', 16)
      .setTint(0x6a2a8a)
      .setOrigin(0.5, 0);
    const body = this.add
      .bitmapText(
        THEME.width / 2,
        378,
        'pix',
        `RESETS GOLD, SWORDS AND STAGE.\nKEEPS SKINS, GEMS AND BOARD.\n\nEARN ${this.gs.prestigeReward} SOULS`,
        8,
      )
      .setTint(0x4a3520)
      .setCenterAlign()
      .setOrigin(0.5, 0);
    const yes = this.add.image(140, 488, 'btn-sm').setTint(0x6a2a8a).setInteractive({ useHandCursor: true });
    const yesLbl = this.add.bitmapText(140, 488, 'pix', 'REBIRTH', 8).setOrigin(0.5);
    const no = this.add.image(250, 488, 'btn-sm').setTint(THEME.buttonBgDisabled).setInteractive({ useHandCursor: true });
    const noLbl = this.add.bitmapText(250, 488, 'pix', 'CANCEL', 8).setOrigin(0.5);
    layer.add([dim, g, title, body, yes, yesLbl, no, noLbl]);

    const closeConfirm = () => {
      layer.destroy();
      this.confirmLayer = null;
    };
    yes.on('pointerdown', () => {
      if (this.gs.prestige()) audio.stageUp();
      closeConfirm();
    });
    no.on('pointerdown', closeConfirm);
  }

  // ---- Sword card panel ----

  private createPanel(): void {
    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRect(0, L.panelTop, THEME.width, THEME.height - L.panelTop);
    g.fillStyle(THEME.headerTrim);
    g.fillRect(0, L.panelTop, THEME.width, 3);

    const gridW = GEAR.gridCols * (CARD_W + GAP) - GAP;
    const left = (THEME.width - gridW) / 2 + CARD_W / 2;
    for (let row = 0; row < GEAR.gridRows; row++) {
      for (let col = 0; col < GEAR.gridCols; col++) {
        const x = left + col * (CARD_W + GAP);
        const y = L.panelTop + 8 + CARD_H / 2 + row * (CARD_H + GAP);
        // Empty slot: recessed rectangle
        this.add
          .rectangle(x, y, CARD_W, CARD_H, THEME.panelBgDark, 0.25)
          .setStrokeStyle(1, THEME.cardBorder, 0.5);
        this.cellCenters.push({ x, y });
      }
    }
  }

  // ---- Toggle row: Auto Merge / Auto Buy / Buy sword ----

  /** Ad-gated automation button: an ad enables it for a limited window. */
  private autoCard(x: number, label: string, key: 'auto_merge' | 'auto_buy'): void {
    const y = L.togglesTop + 19;
    const bg = this.add
      .image(x, y, 'btn-sm')
      .setTint(THEME.cardBg)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y - 8, label, {
        fontFamily: THEME.fontFamily,
        fontSize: '10px',
        fontStyle: 'bold',
        color: THEME.textDark,
      })
      .setOrigin(0.5);
    const state = this.add.bitmapText(x, y + 7, 'pix', '', 8).setOrigin(0.5);
    this.autoStates.push({ key, label: state });

    bg.on('pointerdown', () => {
      this.tweens.add({ targets: bg, scale: 0.94, duration: 60, yoyo: true });
      this.onAutoTap(key);
    });
  }

  private autoWindow(key: 'auto_merge' | 'auto_buy'): number {
    return key === 'auto_merge' ? this.autoMergeUntil : this.autoBuyUntil;
  }

  private setAutoWindow(key: 'auto_merge' | 'auto_buy', until: number): void {
    if (key === 'auto_merge') this.autoMergeUntil = until;
    else this.autoBuyUntil = until;
    this.setPrefTime(key === 'auto_merge' ? 'automerge_until' : 'autobuy_until', until);
  }

  private onAutoTap(key: 'auto_merge' | 'auto_buy'): void {
    const now = Date.now();
    if (now < this.autoWindow(key)) {
      // Active → switch it off (forfeits the remaining window)
      this.setAutoWindow(key, 0);
      this.refreshAutoLabels();
      return;
    }
    if (this.adPending || !this.ads.isReady(key as AdPlacement)) return;
    this.adPending = key;
    this.refreshAutoLabels();
    void this.ads.showRewarded(key as AdPlacement).then((result) => {
      this.adPending = null;
      if (result.rewarded) {
        this.gs.trackQuest('ads');
        this.setAutoWindow(key, Date.now() + ECONOMY.automationAdMinutes * 60_000);
        audio.coin();
        // Instant gratification on activation
        if (key === 'auto_merge') this.gs.autoMergeOnce();
        else if (this.gs.canBuy) this.gs.buyGear();
      }
      this.refreshAutoLabels();
    });
  }

  private refreshAutoLabels(): void {
    const now = Date.now();
    for (const { key, label } of this.autoStates) {
      if (this.adPending === key) {
        label.setText('AD...').setTint(0x8a5a2e);
        continue;
      }
      const left = this.autoWindow(key) - now;
      if (left > 0) {
        const m = Math.floor(left / 60000);
        const sec = Math.floor((left % 60000) / 1000);
        label.setText(`ON ${m}:${String(sec).padStart(2, '0')}`).setTint(0x2e7a1e);
      } else {
        label.setText('WATCH AD').setTint(0x2884a8);
      }
    }
  }

  private createToggleRow(): void {
    this.autoCard(58, 'Auto Merge', 'auto_merge');
    this.autoCard(144, 'Auto Buy', 'auto_buy');
    this.refreshAutoLabels();

    const y = L.togglesTop + 19;
    this.buyBg = this.add
      .image(247, y, 'btn-wide')
      .setDisplaySize(116, 34)
      .setTint(THEME.buttonBg)
      .setInteractive({ useHandCursor: true });
    this.buyLabel = this.add.bitmapText(247, y, 'pix', '', 8).setOrigin(0.5);
    this.buyBg.on('pointerdown', () => {
      if (this.gs.buyGear()) {
        audio.buy();
        this.tweens.add({
          targets: this.buyBg,
          scaleX: 0.65,
          scaleY: 0.62,
          duration: 60,
          yoyo: true,
        });
      }
    });

    // Shop tier upgrade: spend gold to raise what the shop sells
    this.upgradeBg = this.add
      .image(339, y, 'btn-sm')
      .setDisplaySize(64, 34)
      .setTint(THEME.buttonBgAlt)
      .setInteractive({ useHandCursor: true });
    this.add.bitmapText(339, y - 8, 'pix', 'TIER UP', 8).setOrigin(0.5).setDepth(1);
    this.upgradeLabel = this.add.bitmapText(339, y + 7, 'pix', '', 8).setOrigin(0.5);
    this.upgradeBg.on('pointerdown', () => {
      if (this.gs.upgradeBuyTier()) {
        audio.merge();
        this.tweens.add({
          targets: this.upgradeBg,
          scaleX: 0.66,
          scaleY: 0.9,
          duration: 60,
          yoyo: true,
        });
        this.toast(`SHOP NOW SELLS TIER ${this.gs.buyTier}`);
      }
    });
  }

  // ---- Bottom tab bar ----

  private createTabBar(): void {
    const y = L.tabBarTop;
    const g = this.add.graphics();
    g.fillStyle(THEME.headerBg);
    g.fillRect(0, y, THEME.width, THEME.height - y);
    g.fillStyle(THEME.headerTrim);
    g.fillRect(0, y, THEME.width, 2);

    const tabs = [
      { label: 'SWORDS', frame: 0, active: true, panel: null },
      { label: 'SKILLS', frame: 1, active: true, panel: 'Skills' },
      { label: 'PET', frame: 2, active: true, panel: 'Pets' },
      { label: 'FAIRY', frame: 3, active: true, panel: 'Fairy' },
      { label: 'RELICS', frame: 4, active: true, panel: 'Souls' },
      { label: 'SHOP', frame: 5, active: true, panel: 'Shop' },
    ];
    const w = THEME.width / tabs.length;
    tabs.forEach((tab, i) => {
      const cx = w / 2 + i * w;
      if (tab.active && !tab.panel) {
        const hl = this.add.graphics();
        hl.fillStyle(THEME.cardBg, 0.18);
        hl.fillRect(i * w + 2, y + 2, w - 4, THEME.height - y - 4);
        hl.fillStyle(THEME.gold);
        hl.fillRect(i * w + 6, y + 2, w - 12, 3);
      }
      const icon = this.add.image(cx, y + 24, 'icons', tab.frame).setScale(0.75);
      if (!tab.active) icon.setAlpha(0.4).setTint(0x9a8d6e);
      this.add
        .bitmapText(cx, y + 48, 'pix', tab.label, 8)
        .setTint(tab.active ? 0xffd166 : 0x9a8d6e)
        .setOrigin(0.5);
      if (tab.panel) {
        this.add
          .rectangle(cx, y + 32, w - 4, 60, 0xffffff, 0.001)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            if (!this.scene.isActive(tab.panel as string)) {
              audio.buy();
              this.scene.launch(tab.panel as string);
            }
          });
      }
    });
  }

  // ---- Sword cards ----

  private rebuildItems(): void {
    this.itemLayer.removeAll(true);
    this.renderLockedCells();

    const equipped = new Set(this.gs.equippedIndices);
    this.gs.grid.forEach((tier, index) => {
      if (tier === null) return;
      const { x, y } = this.cellCenters[index];
      const item = this.add.container(x, y);
      const isEquipped = equipped.has(index);

      const face = this.add.image(0, 0, 'card-sm');
      const border = this.add
        .rectangle(0, 0, CARD_W, CARD_H)
        .setStrokeStyle(isEquipped ? 3 : 2, isEquipped ? 0xffd166 : tierColor(tier));
      const icon = this.add.image(-14, 1, 'gear', (tier - 1) % 12).setScale(0.5);
      const dmg = this.add
        .bitmapText(
          CARD_W / 2 - 3,
          -CARD_H / 2 + 3,
          'pix',
          formatNumber(gearDps(tier)).toUpperCase(),
          8,
        )
        .setTint(0xb03a2e)
        .setOrigin(1, 0);
      const lvl = this.add
        .bitmapText(CARD_W / 2 - 3, CARD_H / 2 - 2, 'pix', `${tier}`, 16)
        .setTint(0x2e7a1e)
        .setOrigin(1, 1);

      if (isEquipped) {
        const badge = this.add
          .bitmapText(-CARD_W / 2 + 3, -CARD_H / 2 + 3, 'pix', 'EQ', 8)
          .setTint(0xc9961e);
        item.add([face, border, icon, dmg, lvl, badge]);
      } else {
        item.add([face, border, icon, dmg, lvl]);
      }
      item.setSize(CARD_W, CARD_H);
      item.setData('index', index);
      item.setData('tier', tier);
      item.setInteractive({ useHandCursor: true, draggable: true });
      this.itemLayer.add(item);
    });

    this.input.off('dragstart').off('drag').off('dragend');
    this.input.on(
      'dragstart',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
        this.itemLayer.bringToTop(obj);
        obj.setScale(1.12);
      },
    );
    this.input.on(
      'drag',
      (
        _p: Phaser.Input.Pointer,
        obj: Phaser.GameObjects.Container,
        dragX: number,
        dragY: number,
      ) => {
        obj.setPosition(dragX, dragY);
      },
    );
    this.input.on(
      'dragend',
      (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container) => {
        obj.setScale(1);
        this.handleDrop(obj);
      },
    );
  }

  /** Locked board cells: the next one is purchasable, the rest show a lock. */
  private renderLockedCells(): void {
    const unlocked = this.gs.unlockedCells;
    for (let index = unlocked; index < this.cellCenters.length; index++) {
      const { x, y } = this.cellCenters[index];
      const cover = this.add
        .rectangle(x, y, CARD_W, CARD_H, 0x2a1c10, 0.55)
        .setStrokeStyle(1, THEME.cardBorder, 0.6);
      this.itemLayer.add(cover);

      if (index === unlocked && this.gs.cellCost !== null) {
        const price = this.add
          .bitmapText(x, y - 8, 'pix', formatNumber(this.gs.cellCost).toUpperCase(), 8)
          .setTint(0xffd166)
          .setOrigin(0.5, 0);
        const plus = this.add
          .bitmapText(x, y - 20, 'pix', '+', 16)
          .setTint(0xffd166)
          .setOrigin(0.5, 0);
        const coin = this.add.image(x, y + 12, 'coin').setScale(0.9);
        cover.setInteractive({ useHandCursor: true });
        cover.on('pointerdown', () => {
          if (this.gs.buyCell()) {
            audio.buy();
          }
        });
        this.itemLayer.add(plus);
        this.itemLayer.add(price);
        this.itemLayer.add(coin);
      } else {
        const lock = this.add
          .text(x, y, '🔒', { fontSize: '13px' })
          .setOrigin(0.5)
          .setAlpha(0.45);
        this.itemLayer.add(lock);
      }
    }
  }

  private handleDrop(obj: Phaser.GameObjects.Container): void {
    const from = obj.getData('index') as number;
    const target = this.nearestCell(obj.x, obj.y);

    if (target !== -1 && target !== from) {
      const merged = this.gs.mergeAt(from, target);
      if (merged !== null) {
        audio.merge();
        this.celebrateMerge(target, merged);
        return;
      }
      if (this.gs.moveAt(from, target)) return;
    }
    const home = this.cellCenters[from];
    this.tweens.add({ targets: obj, x: home.x, y: home.y, duration: 120, ease: 'Quad.out' });
  }

  private nearestCell(x: number, y: number): number {
    let best = -1;
    let bestDist = 32;
    this.cellCenters.forEach((c, i) => {
      const d = Phaser.Math.Distance.Between(x, y, c.x, c.y);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    });
    return best;
  }

  private celebrateMerge(index: number, tier: number): void {
    const { x, y } = this.cellCenters[index];
    const burst = this.add.particles(x, y, 'spark', {
      speed: { min: 40, max: 120 },
      lifespan: 350,
      scale: { start: 0.9, end: 0 },
      quantity: 10,
      tint: tierColor(tier),
      emitting: false,
    });
    burst.explode(10);
    this.time.delayedCall(500, () => burst.destroy());

    const toast = this.add
      .text(x, y - 38, tierName(tier), {
        fontFamily: THEME.fontFamily,
        fontSize: '13px',
        fontStyle: 'bold',
        color: THEME.textGold,
        stroke: '#2a1c10',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: toast,
      y: toast.y - 22,
      alpha: 0,
      duration: 800,
      onComplete: () => toast.destroy(),
    });
  }

  // ---- Text refresh ----

  private refreshTexts(): void {
    this.goldText.setText(formatNumber(this.gs.gold).toUpperCase());
    this.gemText.setText(formatNumber(this.gs.gems).toUpperCase());
    this.soulsText
      .setVisible(this.gs.prestigeCount > 0)
      .setText(`${formatNumber(this.gs.souls).toUpperCase()}S`);
    this.dpsText.setText(`${formatNumber(this.gs.heroDps).toUpperCase()} DPS`);

    this.buyLabel.setText(
      `BUY T${this.gs.buyTier} - ${formatNumber(this.gs.buyCost).toUpperCase()}G`,
    );
    this.buyBg.setTint(this.gs.canBuy ? THEME.buttonBg : THEME.buttonBgDisabled);

    const upCost = this.gs.buyTierUpgradeCost;
    this.upgradeLabel.setText(
      upCost === null ? 'MAX' : `${formatNumber(upCost).toUpperCase()}G`,
    );
    this.upgradeBg.setTint(
      this.gs.canUpgradeBuyTier ? THEME.buttonBgAlt : THEME.buttonBgDisabled,
    );
  }
}
