import Phaser from 'phaser';
import { GEAR, tierName } from '../config/gear';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { THEME, tierColor } from '../ui/theme';

const CELL = 62;
const GAP = 8;

/** Overlay scene: currency bar on top, merge grid + buttons at the bottom. */
export class UIScene extends Phaser.Scene {
  private gs!: GameState;
  private saveManager!: SaveManager;

  private goldText!: Phaser.GameObjects.Text;
  private gemText!: Phaser.GameObjects.Text;
  private dpsText!: Phaser.GameObjects.Text;
  private buyLabel!: Phaser.GameObjects.Text;
  private buyBg!: Phaser.GameObjects.Image;
  private mergeBg!: Phaser.GameObjects.Image;
  private itemLayer!: Phaser.GameObjects.Container;
  private cellCenters: { x: number; y: number }[] = [];
  private gridTop = 0;

  constructor() {
    super('UI');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.saveManager = this.registry.get('saveManager') as SaveManager;

    this.createTopBar();
    this.createMergePanel();
    this.itemLayer = this.add.container(0, 0);
    this.rebuildItems();

    this.gs.on('gold:changed', () => this.refreshTexts());
    this.gs.on('gems:changed', () => this.refreshTexts());
    this.gs.on('grid:changed', () => {
      this.rebuildItems();
      this.refreshTexts();
    });
    this.refreshTexts();

    // Autosave: every 10s and whenever the tab/app goes to background.
    this.time.addEvent({ delay: 10_000, loop: true, callback: () => this.persist() });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.persist();
    });
  }

  private persist(): void {
    this.saveManager.save(this.gs);
  }

  // ---- Top currency bar ----

  private createTopBar(): void {
    const bar = this.add.graphics();
    bar.fillStyle(THEME.panelBg, 0.92);
    bar.fillRoundedRect(8, 8, THEME.width - 16, 44, 12);

    this.add.image(30, 30, 'coin').setScale(1.4);
    this.goldText = this.add.text(42, 21, '0', {
      fontFamily: THEME.fontFamily,
      fontSize: '17px',
      fontStyle: 'bold',
      color: THEME.textGold,
    });

    const gem = this.add.graphics();
    gem.fillStyle(THEME.gem);
    gem.fillTriangle(160, 24, 152, 32, 168, 32);
    gem.fillTriangle(152, 32, 168, 32, 160, 42);
    this.gemText = this.add.text(174, 21, '0', {
      fontFamily: THEME.fontFamily,
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#bdf1ff',
    });

    this.dpsText = this.add
      .text(THEME.width - 20, 21, '', {
        fontFamily: THEME.fontFamily,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(1, 0);
  }

  // ---- Merge panel ----

  private createMergePanel(): void {
    const panelTop = THEME.battleHeight;
    const panel = this.add.graphics();
    panel.fillStyle(THEME.panelBg);
    panel.fillRect(0, panelTop, THEME.width, THEME.height - panelTop);
    panel.fillStyle(0x241b3a);
    panel.fillRect(0, panelTop, THEME.width, 6);

    // Buttons row
    const btnY = panelTop + 40;
    this.buyBg = this.makeButton(THEME.width / 2 - 92, btnY, () => {
      if (this.gs.buyGear()) this.pulse(this.buyBg);
    });
    this.buyLabel = this.add
      .text(this.buyBg.x, btnY, '', {
        fontFamily: THEME.fontFamily,
        fontSize: '15px',
        fontStyle: 'bold',
        color: THEME.buttonText,
        align: 'center',
      })
      .setOrigin(0.5);

    this.mergeBg = this.makeButton(THEME.width / 2 + 92, btnY, () => {
      if (this.gs.autoMergeOnce() !== null) this.pulse(this.mergeBg);
    });
    this.add
      .text(this.mergeBg.x, btnY, 'Merge ⚡', {
        fontFamily: THEME.fontFamily,
        fontSize: '16px',
        fontStyle: 'bold',
        color: THEME.buttonText,
      })
      .setOrigin(0.5);

    // Grid cells
    this.gridTop = btnY + 44;
    const gridWidth = GEAR.gridCols * (CELL + GAP) - GAP;
    const left = (THEME.width - gridWidth) / 2 + CELL / 2;
    for (let row = 0; row < GEAR.gridRows; row++) {
      for (let col = 0; col < GEAR.gridCols; col++) {
        const x = left + col * (CELL + GAP);
        const y = this.gridTop + CELL / 2 + row * (CELL + GAP);
        this.add.image(x, y, 'cell');
        this.cellCenters.push({ x, y });
      }
    }
  }

  private makeButton(x: number, y: number, onTap: () => void): Phaser.GameObjects.Image {
    const img = this.add
      .image(x, y, 'btn')
      .setTint(THEME.buttonBg)
      .setInteractive({ useHandCursor: true });
    img.on('pointerdown', () => {
      this.tweens.add({ targets: img, scale: 0.94, duration: 60, yoyo: true });
      onTap();
    });
    return img;
  }

  private pulse(target: Phaser.GameObjects.Image): void {
    this.tweens.add({ targets: target, scale: { from: 1.04, to: 1 }, duration: 120 });
  }

  // ---- Grid items ----

  private rebuildItems(): void {
    this.itemLayer.removeAll(true);

    this.gs.grid.forEach((tier, index) => {
      if (tier === null) return;
      const { x, y } = this.cellCenters[index];
      const item = this.add.container(x, y);
      const icon = this.add.image(0, -2, 'sword').setScale(0.85).setTint(tierColor(tier));
      const label = this.add
        .text(0, 22, `${tier}`, {
          fontFamily: THEME.fontFamily,
          fontSize: '13px',
          fontStyle: 'bold',
          color: THEME.textLight,
          stroke: '#2e2348',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      item.add([icon, label]);
      item.setSize(CELL, CELL);
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
        obj.setScale(1.15);
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
        this.celebrateMerge(target, merged);
        return; // grid:changed already rebuilt the items
      }
      if (this.gs.moveAt(from, target)) return;
    }
    // Snap back
    const home = this.cellCenters[from];
    this.tweens.add({ targets: obj, x: home.x, y: home.y, duration: 120, ease: 'Quad.out' });
  }

  private nearestCell(x: number, y: number): number {
    let best = -1;
    let bestDist = 44; // must drop reasonably close to a cell
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
      .text(x, y - 40, tierName(tier), {
        fontFamily: THEME.fontFamily,
        fontSize: '14px',
        fontStyle: 'bold',
        color: THEME.textGold,
        stroke: '#2e2348',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: toast,
      y: toast.y - 24,
      alpha: 0,
      duration: 800,
      onComplete: () => toast.destroy(),
    });
  }

  // ---- Text refresh ----

  private refreshTexts(): void {
    this.goldText.setText(formatNumber(this.gs.gold));
    this.gemText.setText(formatNumber(this.gs.gems));
    this.dpsText.setText(`⚔ ${formatNumber(this.gs.heroDps)} DPS`);

    const affordable = this.gs.canBuy;
    this.buyLabel.setText(
      `Buy T${this.gs.buyTier} · ${formatNumber(this.gs.buyCost)}g`,
    );
    this.buyBg.setTint(affordable ? THEME.buttonBg : THEME.buttonBgDisabled);
  }
}
