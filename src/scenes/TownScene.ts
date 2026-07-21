import Phaser from 'phaser';
import { buildingById, TOWN } from '../config/town';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

/** A tappable building on the photo backdrop: id + centre + hit size. */
interface TownPlace {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// The reference-art town is a single hand-illustrated screen. It ships as one
// image with its own header + footer baked in. It's squarer than the phone,
// so we mount it full-width at the top (reusing its lovely header), crop its
// baked footer, and let a grassy approach fill below — one continuous village.
// Buildings are invisible tap zones over the art; the upgrade cards show the
// real live numbers. Positions are fractions of the photo's on-screen rect.
const PHOTO_W = THEME.width; // 390 — art mounted at full width
const PHOTO_SRC_W = 1320;
const PHOTO_SRC_H = 1854;
const PHOTO_H = Math.round((PHOTO_W * PHOTO_SRC_H) / PHOTO_SRC_W); // ~547
// Crop the baked footer bar off the bottom so ours sits at the true screen foot
const FOOTER_SRC = 96;
const PHOTO_VIS_H = Math.round((PHOTO_W * (PHOTO_SRC_H - FOOTER_SRC)) / PHOTO_SRC_W);

const PLACES_FRAC: { id: string; fx: number; fy: number; fw: number; fh: number }[] = [
  { id: 'keep', fx: 0.5, fy: 0.225, fw: 0.62, fh: 0.19 },
  { id: 'farm', fx: 0.2, fy: 0.42, fw: 0.34, fh: 0.15 },
  { id: 'blacksmith', fx: 0.78, fy: 0.42, fw: 0.34, fh: 0.15 },
  { id: 'soulforge', fx: 0.47, fy: 0.63, fw: 0.24, fh: 0.14 },
  { id: 'mine', fx: 0.17, fy: 0.83, fw: 0.3, fh: 0.15 },
  { id: 'jeweler', fx: 0.78, fy: 0.85, fw: 0.32, fh: 0.15 },
];

export class TownScene extends Phaser.Scene {
  private gs!: GameState;
  private goldLabel!: Phaser.GameObjects.BitmapText;
  private gemLabel!: Phaser.GameObjects.BitmapText;
  private vaultBubble!: Phaser.GameObjects.Container;
  private vaultText!: Phaser.GameObjects.BitmapText;
  private cardLayer: Phaser.GameObjects.Container | null = null;
  private places: TownPlace[] = [];

  constructor() {
    super('Town');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.cardLayer = null;

    // Grassy field behind everything (matches the photo's grass so the
    // approach below the art blends into one continuous meadow).
    this.add.rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x4e7f3c);
    this.buildForeground();

    // The illustrated town, mounted full-width at the top, baked footer cropped.
    this.add
      .image(THEME.width / 2, 0, 'town-photo')
      .setOrigin(0.5, 0)
      .setDisplaySize(PHOTO_W, PHOTO_H)
      .setCrop(0, 0, PHOTO_SRC_W, PHOTO_SRC_H - FOOTER_SRC)
      .setDepth(10);

    // Tappable building zones from the photo fractions
    this.places = PLACES_FRAC.map((p) => ({
      id: p.id,
      x: p.fx * PHOTO_W,
      y: p.fy * PHOTO_H,
      w: p.fw * PHOTO_W,
      h: p.fh * PHOTO_H,
    }));
    for (const place of this.places) {
      this.add
        .rectangle(place.x, place.y, place.w, place.h, 0xffffff, 0.001)
        .setDepth(20)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.cardLayer) return;
          audio.buy();
          this.openCard(place.id);
        });
    }

    this.buildHud();

    // Jeweler vault bubble floats over the shop when gems are waiting
    const jeweler = this.places.find((p) => p.id === 'jeweler')!;
    this.vaultText = this.add.bitmapText(0, 0, 'pix', '', 8).setOrigin(0.5).setTint(0x9af0ff);
    const bubble = this.add.rectangle(0, 0, 120, 18, 0x18341e).setStrokeStyle(1, 0x6ee3ff);
    this.vaultBubble = this.add
      .container(jeweler.x, jeweler.y - jeweler.h / 2 - 8, [bubble, this.vaultText])
      .setDepth(2500)
      .setVisible(false);
    this.tweens.add({ targets: this.vaultBubble, y: jeweler.y - jeweler.h / 2 - 14, duration: 800, yoyo: true, repeat: -1 });

    this.time.addEvent({ delay: 5000, loop: true, callback: () => this.refreshVault() });
    this.refreshVault();

    if (import.meta.env.DEV) {
      (window as unknown as { __townOpen?: boolean }).__townOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __townOpen?: boolean }).__townOpen = false;
      });
    }
  }

  override update(): void {
    this.goldLabel.setText(formatNumber(this.gs.gold).toUpperCase());
    this.gemLabel.setText(`${this.gs.gems}`);
  }

  // ---- grassy approach that fills below the (squarer) artwork ----

  private buildForeground(): void {
    const g = this.add.graphics().setDepth(1);
    // grass tufts
    for (let i = 0; i < 260; i++) {
      const x = (i * 97) % THEME.width;
      const y = PHOTO_VIS_H - 10 + ((i * 53) % (THEME.height - PHOTO_VIS_H + 10));
      g.fillStyle(i % 3 === 0 ? 0x437034 : i % 3 === 1 ? 0x5c9048 : 0x6aa456, 1);
      g.fillRect(x, y, 3, 3);
    }
    // central cobble path continuing down from the castle gate
    const px = THEME.width / 2;
    g.fillStyle(0xb6a06e);
    g.fillRect(px - 22, PHOTO_VIS_H - 16, 44, THEME.height - PHOTO_VIS_H + 16);
    g.fillStyle(0x9a835a);
    for (let y = PHOTO_VIS_H - 12; y < THEME.height; y += 8) g.fillRect(px - 22, y, 44, 2);
    for (let x = px - 20; x < px + 22; x += 8) g.fillStyle(0x8a744a), g.fillRect(x, PHOTO_VIS_H - 16, 1, THEME.height - PHOTO_VIS_H + 16);

    // trees + bushes lining the approach (drawn clear of the path)
    for (const [tx, ty, sc] of [
      [30, PHOTO_VIS_H + 30, 1.2], [116, PHOTO_VIS_H + 96, 1.0], [360, PHOTO_VIS_H + 34, 1.2],
      [278, PHOTO_VIS_H + 100, 1.0], [64, PHOTO_VIS_H + 150, 0.95], [330, PHOTO_VIS_H + 150, 0.95],
    ] as [number, number, number][]) {
      if (this.textures.exists('town-tree')) this.add.image(tx, ty, 'town-tree').setScale(sc).setDepth(ty);
    }

    // the player's knight, standing on the approach path
    const skin = this.gs.activeSkin;
    const tex = this.textures.exists(`hero-${skin}`) ? `hero-${skin}` : 'hero-squire';
    const knight = this.add.image(px, PHOTO_VIS_H + 78, tex, 0).setScale(0.7).setDepth(PHOTO_VIS_H + 90);
    void knight;
  }

  // ---- HUD: an opaque header over the photo's baked one, with live numbers ----

  private buildHud(): void {
    // Cover the photo's static header entirely so nothing double-shows.
    this.add.rectangle(THEME.width / 2, 34, THEME.width, 68, 0x14101c).setDepth(2000);
    this.add.rectangle(THEME.width / 2, 68, THEME.width, 2, 0x6e5a2e).setDepth(2000);
    this.add.bitmapText(12, 8, 'pix', 'THE TOWN', 16).setTint(THEME.gold).setDepth(2001);
    this.add.bitmapText(12, 30, 'pix', 'YOUR PEOPLE WORK WHILE YOU FIGHT', 8).setTint(0xb8935a).setDepth(2001);

    this.add.circle(20, 54, 6, 0xffd166).setDepth(2001);
    this.goldLabel = this.add.bitmapText(32, 49, 'pix', '0', 8).setTint(0xe6dec8).setDepth(2001);
    const gem = this.add.graphics().setDepth(2001);
    gem.fillStyle(0x6ee3ff);
    gem.fillPoints(
      [new Phaser.Geom.Point(136, 48), new Phaser.Geom.Point(142, 54), new Phaser.Geom.Point(136, 60), new Phaser.Geom.Point(130, 54)],
      true,
    );
    this.gemLabel = this.add.bitmapText(150, 49, 'pix', '0', 8).setTint(0xe6dec8).setDepth(2001);

    const leave = this.add
      .rectangle(THEME.width - 44, 40, 78, 30, 0x3a3244)
      .setStrokeStyle(2, 0x8a7d60)
      .setDepth(2001)
      .setInteractive({ useHandCursor: true });
    this.add.bitmapText(THEME.width - 44, 40, 'pix', 'LEAVE', 8).setOrigin(0.5).setDepth(2002);
    leave.on('pointerdown', () => this.scene.stop());

    // Footer prompt at the true screen foot
    this.add.rectangle(THEME.width / 2, THEME.height - 20, THEME.width, 28, 0x14101c, 0.86).setDepth(2000);
    this.add
      .bitmapText(THEME.width / 2, THEME.height - 20, 'pix', 'TAP A BUILDING TO UPGRADE', 8)
      .setOrigin(0.5)
      .setTint(0x9a8d6e)
      .setDepth(2001);
  }

  private refreshVault(): void {
    const vault = this.gs.jewelerVault();
    this.vaultBubble.setVisible(vault > 0);
    if (vault > 0) this.vaultText.setText(`VAULT +${vault} GEMS`);
  }

  // ---- the cards (unchanged rules; real live numbers) ----

  private effectLabel(id: string, level: number): string {
    const def = buildingById(id)!;
    const now = Math.round(level * def.perLevel * (id === 'jeweler' ? 1 : 100));
    if (id === 'jeweler') return `${now} GEMS/DAY`;
    return `+${now}% ${def.desc}`;
  }

  private openCard(id: string): void {
    this.closeCard();
    const layer = this.add.container(0, 0).setDepth(3000);
    this.cardLayer = layer;
    const dim = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.6)
      .setInteractive();
    dim.on('pointerdown', () => this.closeCard());
    layer.add(dim);

    const cy = THEME.height / 2 - 60;
    const card = this.add
      .rectangle(THEME.width / 2, cy, 320, 190, 0x1c1622)
      .setStrokeStyle(3, THEME.gold)
      .setInteractive();
    layer.add(card);

    const title = (t: string, tint: number = THEME.gold): void => {
      layer.add(this.add.bitmapText(THEME.width / 2, cy - 72, 'pix', t, 16).setOrigin(0.5, 0).setTint(tint));
    };
    const line = (dy: number, t: string, tint: number): void => {
      layer.add(this.add.bitmapText(THEME.width / 2, cy + dy, 'pix', t, 8).setOrigin(0.5, 0).setTint(tint));
    };
    const button = (dy: number, w: number, label: string, tint: number, onTap: (() => void) | null): void => {
      const btn = this.add
        .image(THEME.width / 2, cy + dy, 'btn-wide')
        .setDisplaySize(w, 36)
        .setTint(onTap ? tint : THEME.buttonBgDisabled);
      const lbl = this.add.bitmapText(THEME.width / 2, cy + dy, 'pix', label, 8).setOrigin(0.5);
      if (onTap) btn.setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
      layer.add([btn, lbl]);
    };

    if (id === 'soulforge') {
      title('THE SOULFORGE', 0xa882f0);
      line(-38, 'THE TOWNS HEART BURNS WITH SOULS', 0xe6dec8);
      line(-20, 'ITS POWER AWAITS IN THE FORGE OF POWER', 0x9a8d6e);
      line(2, '(MENU - REBIRTH - RELICS + ENCHANTS)', 0x8a5a2e);
      button(60, 160, 'CLOSE', 0x3a3244, () => this.closeCard());
      return;
    }

    const def = buildingById(id)!;
    const level = this.gs.buildingLevel(id);
    const cost = this.gs.buildingUpgradeCost(id);
    const afford = cost !== null && this.gs.gold >= cost;
    title(def.name);
    line(-40, level > 0 ? `LEVEL ${level} OF ${def.maxLevel}` : 'NOT YET BUILT', 0x9a8d6e);
    line(-20, this.effectLabel(id, level), 0x2e7a1e);
    line(0, cost === null ? 'FULLY UPGRADED' : `NEXT: ${this.effectLabel(id, level + 1)}`, 0x9a8d6e);
    if (id === 'keep') line(20, 'THE CASTLE GROWS GRANDER AT LV 10 + 30', 0x8a5a2e);
    if (id === 'jeweler') {
      const vault = this.gs.jewelerVault();
      line(
        20,
        this.gs.buildingLevel('jeweler') > 0
          ? vault > 0
            ? `VAULT: ${vault} GEMS READY`
            : `VAULT FILLS DAILY (CAP ${TOWN.jewelerCapDays} DAYS)`
          : 'BUILD IT TO EARN DAILY GEMS',
        vault > 0 ? 0x6ee3ff : 0x8a5a2e,
      );
      if (vault > 0) {
        button(48, 250, `COLLECT ${vault} GEMS`, 0x2884a8, () => {
          if (this.gs.collectJeweler() > 0) audio.coin();
          this.refreshVault();
          this.openCard(id);
        });
        button(84, 250, cost === null ? 'MAX LEVEL' : `UPGRADE - ${formatNumber(cost).toUpperCase()} GOLD`, 0x2e7a1e, afford ? () => this.buy(id) : null);
        return;
      }
    }
    button(
      id === 'jeweler' ? 56 : 44,
      250,
      cost === null ? 'MAX LEVEL' : `UPGRADE - ${formatNumber(cost).toUpperCase()} GOLD`,
      0x2e7a1e,
      afford ? () => this.buy(id) : null,
    );
  }

  private buy(id: string): void {
    if (!this.gs.buyBuilding(id)) return;
    audio.buy();
    this.refreshVault();
    this.openCard(id); // reopen with fresh numbers
  }

  private closeCard(): void {
    this.cardLayer?.destroy();
    this.cardLayer = null;
  }
}
