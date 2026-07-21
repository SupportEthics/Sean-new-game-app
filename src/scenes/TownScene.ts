import Phaser from 'phaser';
import { buildingById, TOWN } from '../config/town';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

/** A tappable building on the artwork: id + centre + hit size. */
interface TownPlace {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// The town is one full-screen illustration (Sean's art). It's phone-shaped,
// so it fills the screen edge-to-edge — no procedural grass. Buildings are
// invisible tap zones over the art; each opens its existing upgrade card
// with the real live numbers. Positions are fractions of the screen.
const PLACES_FRAC: { id: string; fx: number; fy: number; fw: number; fh: number }[] = [
  { id: 'keep', fx: 0.5, fy: 0.16, fw: 0.66, fh: 0.15 },
  { id: 'farm', fx: 0.2, fy: 0.3, fw: 0.36, fh: 0.14 },
  { id: 'blacksmith', fx: 0.78, fy: 0.3, fw: 0.36, fh: 0.14 },
  { id: 'soulforge', fx: 0.49, fy: 0.455, fw: 0.26, fh: 0.12 },
  { id: 'mine', fx: 0.18, fy: 0.575, fw: 0.32, fh: 0.14 },
  { id: 'jeweler', fx: 0.78, fy: 0.585, fw: 0.34, fh: 0.14 },
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

    // The full-screen illustrated town.
    this.add
      .image(THEME.width / 2, THEME.height / 2, 'town-photo')
      .setDisplaySize(THEME.width, THEME.height)
      .setDepth(0);

    // Tappable building zones over the art
    this.places = PLACES_FRAC.map((p) => ({
      id: p.id,
      x: p.fx * THEME.width,
      y: p.fy * THEME.height,
      w: p.fw * THEME.width,
      h: p.fh * THEME.height,
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

  // ---- HUD: an opaque header over the art's baked one, with live numbers ----

  private buildHud(): void {
    // Cover the art's static header so the currency + LEAVE are live.
    this.add.rectangle(THEME.width / 2, 30, THEME.width, 60, 0x14101c).setDepth(2000);
    this.add.rectangle(THEME.width / 2, 60, THEME.width, 2, 0x6e5a2e).setDepth(2000);
    this.add.bitmapText(12, 6, 'pix', 'THE TOWN', 16).setTint(THEME.gold).setDepth(2001);
    this.add.bitmapText(12, 27, 'pix', 'YOUR PEOPLE. YOUR LEGEND.', 8).setTint(0xb8935a).setDepth(2001);

    this.add.circle(20, 48, 6, 0xffd166).setDepth(2001);
    this.goldLabel = this.add.bitmapText(32, 43, 'pix', '0', 8).setTint(0xe6dec8).setDepth(2001);
    const gem = this.add.graphics().setDepth(2001);
    gem.fillStyle(0x6ee3ff);
    gem.fillPoints(
      [new Phaser.Geom.Point(136, 42), new Phaser.Geom.Point(142, 48), new Phaser.Geom.Point(136, 54), new Phaser.Geom.Point(130, 48)],
      true,
    );
    this.gemLabel = this.add.bitmapText(150, 43, 'pix', '0', 8).setTint(0xe6dec8).setDepth(2001);

    const leave = this.add
      .rectangle(THEME.width - 44, 34, 78, 30, 0x3a3244)
      .setStrokeStyle(2, 0x8a7d60)
      .setDepth(2001)
      .setInteractive({ useHandCursor: true });
    this.add.bitmapText(THEME.width - 44, 34, 'pix', 'LEAVE', 8).setOrigin(0.5).setDepth(2002);
    leave.on('pointerdown', () => this.scene.stop());
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
