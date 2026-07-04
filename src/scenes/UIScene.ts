import Phaser from 'phaser';
import { GEAR, tierName } from '../config/gear';
import { formatNumber, gearDps } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { audio } from '../services/AudioService';
import { THEME, tierColor } from '../ui/theme';

const L = THEME.layout;
const CARD_W = 86;
const CARD_H = 64;
const GAP = 4;

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
  private dpsText!: Phaser.GameObjects.BitmapText;
  private levelText!: Phaser.GameObjects.BitmapText;
  private expBar!: Phaser.GameObjects.Rectangle;
  private stageText!: Phaser.GameObjects.BitmapText;
  private waveText!: Phaser.GameObjects.BitmapText;
  private buyLabel!: Phaser.GameObjects.BitmapText;
  private buyBg!: Phaser.GameObjects.Image;
  private itemLayer!: Phaser.GameObjects.Container;
  private cellCenters: { x: number; y: number }[] = [];
  private autoMerge = false;
  private autoBuy = false;
  private lastHud = '';

  constructor() {
    super('UI');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.saveManager = this.registry.get('saveManager') as SaveManager;
    this.autoMerge = this.pref('automerge');
    this.autoBuy = this.pref('autobuy');

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
    this.refreshTexts();

    // Auto actions tick — one buy + one merge per beat feels game-paced
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (this.autoBuy && this.gs.canBuy) this.gs.buyGear();
        if (this.autoMerge) this.gs.autoMergeOnce();
      },
    });

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

    this.stageText.setText(`STAGE ${b.stage}`);
    this.waveText.setText(
      b.wave === 10
        ? 'BOSS FIGHT!'
        : `WAVE ${b.wave}/10 - ${formatNumber(this.gs.heroDps).toUpperCase()}/S`,
    );
    this.levelText.setText(`LV ${level}`);
    this.expBar.width = 130 * frac;
  }

  private pref(key: string): boolean {
    try {
      return localStorage.getItem(`pawsblades_${key}`) === '1';
    } catch {
      return false;
    }
  }

  private setPref(key: string, v: boolean): void {
    try {
      localStorage.setItem(`pawsblades_${key}`, v ? '1' : '0');
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

    // Lv + EXP bar (left)
    this.levelText = this.add.bitmapText(12, y + 15, 'pix', 'LV 1', 16);
    this.add
      .rectangle(66, y + 22, 134, 14, 0x2a1c10)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, THEME.headerTrim);
    this.expBar = this.add
      .rectangle(68, y + 22, 0, 8, THEME.expBar)
      .setOrigin(0, 0.5);

    // Stage box (right)
    const box = this.add.graphics();
    box.fillStyle(THEME.cardBg);
    box.fillRoundedRect(THEME.width - 168, y + 5, 156, L.hudH - 10, 8);
    box.lineStyle(2, THEME.cardBorder);
    box.strokeRoundedRect(THEME.width - 168, y + 5, 156, L.hudH - 10, 8);
    this.stageText = this.add
      .bitmapText(THEME.width - 90, y + 9, 'pix', 'STAGE 1', 16)
      .setTint(0xb03a2e)
      .setOrigin(0.5, 0);
    this.waveText = this.add
      .bitmapText(THEME.width - 90, y + 32, 'pix', '', 8)
      .setTint(0x4a3520)
      .setOrigin(0.5, 0.5);
  }

  // ---- Sword card panel ----

  private createPanel(): void {
    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRect(0, L.panelTop, THEME.width, THEME.height - L.panelTop);
    g.fillStyle(THEME.headerTrim);
    g.fillRect(0, L.panelTop, THEME.width, 3);

    const gridW = 4 * (CARD_W + GAP) - GAP;
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

  private toggleCard(
    x: number,
    label: string,
    initial: boolean,
    onFlip: (v: boolean) => void,
  ): void {
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
    const state = this.add
      .text(x, y + 7, initial ? 'ON' : 'OFF', {
        fontFamily: THEME.fontFamily,
        fontSize: '12px',
        fontStyle: 'bold',
        color: initial ? '#2e7a1e' : '#8a5a2e',
      })
      .setOrigin(0.5);
    let value = initial;
    bg.on('pointerdown', () => {
      value = !value;
      state.setText(value ? 'ON' : 'OFF');
      state.setColor(value ? '#2e7a1e' : '#8a5a2e');
      this.tweens.add({ targets: bg, scale: 0.94, duration: 60, yoyo: true });
      onFlip(value);
    });
  }

  private createToggleRow(): void {
    this.toggleCard(62, 'Auto Merge', this.autoMerge, (v) => {
      this.autoMerge = v;
      this.setPref('automerge', v);
      if (v && this.gs.autoMergeOnce() !== null) audio.merge();
    });
    this.toggleCard(156, 'Auto Buy', this.autoBuy, (v) => {
      this.autoBuy = v;
      this.setPref('autobuy', v);
    });

    const y = L.togglesTop + 19;
    this.buyBg = this.add
      .image(289, y, 'btn-wide')
      .setTint(THEME.buttonBg)
      .setInteractive({ useHandCursor: true });
    this.buyLabel = this.add.bitmapText(289, y, 'pix', '', 8).setOrigin(0.5);
    this.buyBg.on('pointerdown', () => {
      if (this.gs.buyGear()) {
        audio.buy();
        this.tweens.add({ targets: this.buyBg, scale: 0.94, duration: 60, yoyo: true });
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
      { label: 'SWORDS', frame: 0, active: true },
      { label: 'SKILLS', frame: 1, active: false },
      { label: 'PET', frame: 2, active: false },
      { label: 'FAIRY', frame: 3, active: false },
      { label: 'RELICS', frame: 4, active: false },
      { label: 'SHOP', frame: 5, active: false },
    ];
    const w = THEME.width / tabs.length;
    tabs.forEach((tab, i) => {
      const cx = w / 2 + i * w;
      if (tab.active) {
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
    });
  }

  // ---- Sword cards ----

  private rebuildItems(): void {
    this.itemLayer.removeAll(true);

    this.gs.grid.forEach((tier, index) => {
      if (tier === null) return;
      const { x, y } = this.cellCenters[index];
      const item = this.add.container(x, y);

      const face = this.add.image(0, 0, 'card');
      const border = this.add
        .rectangle(0, 0, CARD_W, CARD_H)
        .setStrokeStyle(2, tierColor(tier));
      const icon = this.add.image(-24, 4, 'gear', (tier - 1) % 12).setScale(0.72);
      const dmg = this.add
        .bitmapText(
          CARD_W / 2 - 5,
          -CARD_H / 2 + 5,
          'pix',
          `${formatNumber(gearDps(tier)).toUpperCase()} DMG`,
          8,
        )
        .setTint(0xb03a2e)
        .setOrigin(1, 0);
      const name = this.add
        .text(8, 2, tierName(tier).replace(/ \+\d+$/, ''), {
          fontFamily: THEME.fontFamily,
          fontSize: '9px',
          color: THEME.textDark,
          wordWrap: { width: 40 },
        })
        .setOrigin(0, 0.5);
      const lvl = this.add
        .bitmapText(CARD_W / 2 - 5, CARD_H / 2 - 4, 'pix', `${tier}`, 16)
        .setTint(0x2e7a1e)
        .setOrigin(1, 1);

      item.add([face, border, icon, dmg, name, lvl]);
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
    let bestDist = 48;
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
    this.dpsText.setText(`${formatNumber(this.gs.heroDps).toUpperCase()} DPS`);

    this.buyLabel.setText(
      `BUY SWORD T${this.gs.buyTier} - ${formatNumber(this.gs.buyCost).toUpperCase()}G`,
    );
    this.buyBg.setTint(this.gs.canBuy ? THEME.buttonBg : THEME.buttonBgDisabled);
  }
}
