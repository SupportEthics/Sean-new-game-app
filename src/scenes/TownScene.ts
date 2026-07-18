import Phaser from 'phaser';
import { buildingById, TOWN } from '../config/town';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import {
  findTownPath,
  isCobble,
  isField,
  spotAt,
  TOWN_COLS,
  TOWN_ENTRY,
  TOWN_ROWS,
  TOWN_SPOTS,
  TOWN_TILE as TILE,
  TownSpot,
} from '../core/TownWalk';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const HUD_H = 88;
const FOOT_H = 116;
const WORLD_W = TOWN_COLS * TILE;
const WORLD_H = TOWN_ROWS * TILE;
const MS_PER_TILE = 150;

/** The Town, walkable: enter through the gate, stroll the lane past the
 * farm, smithy, mine and jeweler to the castle at the top. Tap a building
 * and the knight walks over; its upgrade card opens at the door. Numbers
 * are the same as ever (config/town.ts + GameState) — this scene is the
 * town's face, not its rules. */
export class TownScene extends Phaser.Scene {
  private gs!: GameState;
  private knight!: Phaser.GameObjects.Sprite;
  private signs = new Map<string, Phaser.GameObjects.BitmapText>();
  private goldLabel!: Phaser.GameObjects.BitmapText;
  private gemLabel!: Phaser.GameObjects.BitmapText;
  private vaultBubble!: Phaser.GameObjects.Container;
  private vaultText!: Phaser.GameObjects.BitmapText;
  private cardLayer: Phaser.GameObjects.Container | null = null;
  private castle!: Phaser.GameObjects.Sprite;
  private walking = false;

  constructor() {
    super('Town');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.walking = false;
    this.cardLayer = null;
    this.signs.clear();

    this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x141c12)
      .setScrollFactor(0)
      .setInteractive(); // swallow taps outside the world

    this.buildGround();
    this.buildStructures();
    this.buildHud();

    const skin = this.gs.activeSkin;
    const tex = this.textures.exists(`hero-${skin}`) ? `hero-${skin}` : 'hero-squire';
    const start = this.tileXY(TOWN_ENTRY.x, TOWN_ENTRY.y);
    this.knight = this.add.sprite(start.x, start.y - 8, tex).setScale(0.5).setDepth(start.y);
    try {
      this.knight.play(`hero-${skin}-idle`);
    } catch {
      /* static frame is fine */
    }

    // Pad the camera range so the castle clears the pinned HUD at the top
    // and the gate clears the footer at the bottom
    this.cameras.main.setBounds(0, -HUD_H, WORLD_W, WORLD_H + HUD_H + 56);
    this.cameras.main.startFollow(this.knight, true, 0.15, 0.15);
    this.cameras.main.centerOn(start.x, start.y);

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.onTap(ptr));

    // The jeweler's vault fills in real time
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

  // ---- construction ----

  private buildGround(): void {
    const g = this.add.graphics().setDepth(0);
    for (let y = 0; y < TOWN_ROWS; y++) {
      for (let x = 0; x < TOWN_COLS; x++) {
        const px = x * TILE;
        const py = y * TILE;
        if (isCobble(x, y)) {
          g.fillStyle((x + y) % 2 === 0 ? 0x5e564c : 0x564e46);
          g.fillRect(px, py, TILE, TILE);
          // stone joints
          g.fillStyle(0x4a423c);
          g.fillRect(px, py + TILE - 2, TILE, 2);
          g.fillRect(px + ((x * 13 + y * 7) % 3) * 9, py, 2, TILE);
          continue;
        }
        if (isField(x, y)) {
          g.fillStyle(y % 2 === 0 ? 0xb8a052 : 0xa89048);
          g.fillRect(px, py, TILE, TILE);
          g.fillStyle(0xd0b866);
          for (let i = 0; i < 3; i++) g.fillRect(px + 3 + i * 10, py + 4, 2, TILE - 8);
          continue;
        }
        g.fillStyle((x * 7 + y * 13) % 3 ? 0x2c4a28 : 0x304e2c);
        g.fillRect(px, py, TILE, TILE);
        // tufts + the odd wildflower
        const h = (x * 31 + y * 17) % 11;
        if (h < 3) {
          g.fillStyle(0x3c5e34);
          g.fillRect(px + 6 + h * 7, py + 8 + h * 5, 3, 3);
        }
        if ((x * 13 + y * 29) % 23 === 0) {
          g.fillStyle([0xe8d278, 0xd682a0, 0xc8c8e6][(x + y) % 3]);
          g.fillRect(px + 14, py + 14, 3, 3);
        }
      }
    }
    // bottom fence with a gate gap on the lane
    const fy = (TOWN_ROWS - 1) * TILE;
    g.fillStyle(0x5c3a1c);
    for (let x = 0; x < WORLD_W; x += 14) {
      if (x > 172 && x < 218) continue;
      g.fillRect(x, fy + 2, 4, 24);
    }
    g.fillStyle(0x8a5a2e);
    g.fillRect(0, fy + 6, 174, 4);
    g.fillRect(216, fy + 6, WORLD_W - 216, 4);
    g.fillRect(0, fy + 16, 174, 4);
    g.fillRect(216, fy + 16, WORLD_W - 216, 4);
  }

  private buildStructures(): void {
    // buildings from their spots
    const tex: Record<string, string> = {
      keep: 'town-castle',
      farm: 'town-barn',
      blacksmith: 'town-smith',
      soulforge: 'town-statue',
      mine: 'town-mine',
      jeweler: 'town-jeweler',
    };
    for (const spot of TOWN_SPOTS) {
      const img = this.add
        .sprite(spot.anchor.x, spot.anchor.y, tex[spot.id], 0)
        .setDepth(spot.anchor.y);
      if (spot.id === 'keep') {
        this.castle = img;
        img.setFrame(this.keepStage());
      }
      if (spot.id === 'blacksmith' || spot.id === 'soulforge') {
        this.time.addEvent({
          delay: spot.id === 'blacksmith' ? 620 : 460,
          loop: true,
          callback: () => img.setFrame(img.frame.name === '0' ? 1 : 0),
        });
      }
      this.addSign(spot);
    }
    // trees + lamps, placed clear of every sign
    for (const [tx, ty] of [
      [20, 210], [370, 210], [92, 408], [305, 408], [30, 580], [360, 580],
      [105, 790], [285, 790],
    ]) {
      this.add.image(tx, ty, 'town-tree').setDepth(ty + 16);
    }
    for (const [lx, ly] of [[163, 380], [227, 530], [163, 745]]) {
      const lamp = this.add.image(lx, ly, 'town-lamp').setDepth(ly + 14);
      const glow = this.add
        .image(lx, ly - 12, 'spark')
        .setScale(1.6)
        .setAlpha(0.18)
        .setTint(0xffd166)
        .setDepth(ly + 15);
      this.tweens.add({
        targets: glow,
        alpha: 0.3,
        duration: 900 + (lx % 300),
        yoyo: true,
        repeat: -1,
      });
      void lamp;
    }
  }

  private signLabel(spot: TownSpot): string {
    if (spot.id === 'soulforge') return 'THE SOULFORGE';
    const def = buildingById(spot.id)!;
    const level = this.gs.buildingLevel(spot.id);
    return level > 0 ? `${def.name} LV ${level}/${def.maxLevel}` : `${def.name} - BUILD ME`;
  }

  private addSign(spot: TownSpot): void {
    const y = spot.anchor.y + (spot.id === 'keep' ? 62 : spot.id === 'soulforge' ? 34 : 42);
    const txt = this.add
      .bitmapText(spot.anchor.x, y, 'pix', this.signLabel(spot), 8)
      .setOrigin(0.5)
      .setDepth(spot.anchor.y + 50);
    // keep wide signs inside the world edges
    const x = Phaser.Math.Clamp(spot.anchor.x, txt.width / 2 + 6, WORLD_W - txt.width / 2 - 6);
    txt.setX(x);
    const pad = 5;
    const bg = this.add
      .rectangle(x, y, txt.width + pad * 2, 15, 0x1c1622)
      .setStrokeStyle(1, 0x8a7d60)
      .setDepth(spot.anchor.y + 49);
    txt.setTint(0xe6dec8);
    this.signs.set(spot.id, txt);
    this.signs.set(`${spot.id}:bg`, bg as unknown as Phaser.GameObjects.BitmapText);
  }

  private refreshSign(spot: TownSpot): void {
    const txt = this.signs.get(spot.id);
    const bg = this.signs.get(`${spot.id}:bg`) as unknown as Phaser.GameObjects.Rectangle;
    if (!txt || !bg) return;
    txt.setText(this.signLabel(spot));
    bg.width = txt.width + 10;
  }

  private buildHud(): void {
    this.add.rectangle(THEME.width / 2, HUD_H / 2, THEME.width, HUD_H, 0x1c1622).setDepth(2000).setScrollFactor(0);
    this.add.rectangle(THEME.width / 2, HUD_H - 1, THEME.width, 2, 0x3c3048).setDepth(2000).setScrollFactor(0);
    this.add
      .bitmapText(14, 12, 'pix', 'THE TOWN', 16)
      .setTint(THEME.gold)
      .setDepth(2001)
      .setScrollFactor(0);
    this.add
      .bitmapText(14, 40, 'pix', 'YOUR PEOPLE WORK WHILE YOU FIGHT', 8)
      .setTint(0x8a5a2e)
      .setDepth(2001)
      .setScrollFactor(0);
    this.add.circle(20, 68, 6, 0xffd166).setDepth(2001).setScrollFactor(0);
    this.goldLabel = this.add.bitmapText(32, 63, 'pix', '0', 8).setTint(0xe6dec8).setDepth(2001).setScrollFactor(0);
    const gem = this.add.graphics().setDepth(2001).setScrollFactor(0);
    gem.fillStyle(0x6ee3ff);
    gem.fillPoints(
      [new Phaser.Geom.Point(140, 62), new Phaser.Geom.Point(146, 68), new Phaser.Geom.Point(140, 74), new Phaser.Geom.Point(134, 68)],
      true,
    );
    this.gemLabel = this.add.bitmapText(154, 63, 'pix', '0', 8).setTint(0xe6dec8).setDepth(2001).setScrollFactor(0);
    const leave = this.add
      .rectangle(THEME.width - 46, 66, 76, 26, 0x3a3244)
      .setStrokeStyle(2, 0x8a7d60)
      .setDepth(2001)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.add.bitmapText(THEME.width - 46, 66, 'pix', 'LEAVE', 8).setOrigin(0.5).setDepth(2002).setScrollFactor(0);
    leave.on('pointerdown', () => this.scene.stop());

    this.add
      .rectangle(THEME.width / 2, THEME.height - 100, THEME.width, 32, 0x1c1622)
      .setDepth(2000)
      .setScrollFactor(0);
    this.add
      .bitmapText(THEME.width / 2, THEME.height - 100, 'pix', 'TAP A BUILDING TO WALK OVER', 8)
      .setOrigin(0.5)
      .setTint(0x9a8d6e)
      .setDepth(2001)
      .setScrollFactor(0);

    // The jeweler's vault bubble floats over the shop when gems wait
    const spot = TOWN_SPOTS.find((s) => s.id === 'jeweler')!;
    this.vaultText = this.add.bitmapText(0, 0, 'pix', '', 8).setOrigin(0.5).setTint(0x9af0ff);
    const bubble = this.add.rectangle(0, 0, 120, 18, 0x18341e).setStrokeStyle(1, 0x6ee3ff);
    this.vaultBubble = this.add
      .container(spot.anchor.x, spot.anchor.y - 52, [bubble, this.vaultText])
      .setDepth(spot.anchor.y + 80)
      .setVisible(false);
    this.tweens.add({ targets: this.vaultBubble, y: spot.anchor.y - 58, duration: 800, yoyo: true, repeat: -1 });
  }

  private refreshVault(): void {
    const vault = this.gs.jewelerVault();
    this.vaultBubble.setVisible(vault > 0);
    if (vault > 0) this.vaultText.setText(`VAULT +${vault} GEMS`);
  }

  // ---- input + movement ----

  private tileXY(x: number, y: number): { x: number; y: number } {
    return { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
  }

  private onTap(ptr: Phaser.Input.Pointer): void {
    if (this.walking || this.cardLayer) return;
    if (ptr.y < HUD_H || ptr.y > THEME.height - FOOT_H) return;
    const tx = Math.floor(ptr.worldX / TILE);
    const ty = Math.floor(ptr.worldY / TILE);
    if (tx < 0 || ty < 0 || tx >= TOWN_COLS || ty >= TOWN_ROWS) return;
    const from = {
      x: Math.floor(this.knight.x / TILE),
      y: Math.floor((this.knight.y + 8) / TILE),
    };
    const spot = spotAt(tx, ty);
    const target = spot ? spot.door : { x: tx, y: ty };
    const path = findTownPath(from, target);
    if (!path) return;
    audio.buy();
    this.walkPath(path, spot);
  }

  private walkPath(path: { x: number; y: number }[], spot: TownSpot | null): void {
    if (path.length === 0) {
      this.walking = false;
      if (spot) this.openCard(spot);
      return;
    }
    this.walking = true;
    const step = path.shift()!;
    const { x: px, y: py } = this.tileXY(step.x, step.y);
    this.knight.setFlipX(px < this.knight.x);
    this.tweens.add({
      targets: this.knight,
      x: px,
      y: py - 8,
      duration: MS_PER_TILE,
      onComplete: () => {
        this.knight.setDepth(this.knight.y + 8);
        this.walkPath(path, spot);
      },
    });
  }

  // ---- the cards ----

  private effectLabel(id: string, level: number): string {
    const def = buildingById(id)!;
    const now = Math.round(level * def.perLevel * (id === 'jeweler' ? 1 : 100));
    if (id === 'jeweler') return `${now} GEMS/DAY`;
    return `+${now}% ${def.desc}`;
  }

  private openCard(spot: TownSpot): void {
    this.closeCard();
    const layer = this.add.container(0, 0).setDepth(3000);
    this.cardLayer = layer;
    const dim = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x14101c, 0.6)
      .setScrollFactor(0)
      .setInteractive();
    dim.on('pointerdown', () => this.closeCard());
    layer.add(dim);

    const cy = THEME.height / 2 - 60;
    const card = this.add
      .rectangle(THEME.width / 2, cy, 320, 190, 0x1c1622)
      .setStrokeStyle(3, THEME.gold)
      .setScrollFactor(0)
      .setInteractive(); // keep taps on the card from closing it
    layer.add(card);

    const title = (t: string, tint: number = THEME.gold): void => {
      layer.add(
        this.add.bitmapText(THEME.width / 2, cy - 72, 'pix', t, 16).setOrigin(0.5, 0).setTint(tint).setScrollFactor(0),
      );
    };
    const line = (dy: number, t: string, tint: number): void => {
      layer.add(
        this.add.bitmapText(THEME.width / 2, cy + dy, 'pix', t, 8).setOrigin(0.5, 0).setTint(tint).setScrollFactor(0),
      );
    };
    const button = (dy: number, w: number, label: string, tint: number, onTap: (() => void) | null): void => {
      const btn = this.add
        .image(THEME.width / 2, cy + dy, 'btn-wide')
        .setDisplaySize(w, 36)
        .setTint(onTap ? tint : THEME.buttonBgDisabled)
        .setScrollFactor(0);
      const lbl = this.add
        .bitmapText(THEME.width / 2, cy + dy, 'pix', label, 8)
        .setOrigin(0.5)
        .setScrollFactor(0);
      if (onTap) btn.setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
      layer.add([btn, lbl]);
    };

    if (spot.id === 'soulforge') {
      title('THE SOULFORGE', 0xa882f0);
      line(-38, 'THE TOWNS HEART BURNS WITH SOULS', 0xe6dec8);
      line(-20, 'ITS POWER AWAITS IN THE FORGE OF POWER', 0x9a8d6e);
      line(2, '(MENU - REBIRTH - RELICS + ENCHANTS)', 0x8a5a2e);
      button(60, 160, 'CLOSE', 0x3a3244, () => this.closeCard());
      return;
    }

    const def = buildingById(spot.id)!;
    const level = this.gs.buildingLevel(spot.id);
    const cost = this.gs.buildingUpgradeCost(spot.id);
    const afford = cost !== null && this.gs.gold >= cost;
    title(def.name);
    line(-40, level > 0 ? `LEVEL ${level} OF ${def.maxLevel}` : 'NOT YET BUILT', 0x9a8d6e);
    line(-20, this.effectLabel(spot.id, level), 0x2e7a1e);
    line(0, cost === null ? 'FULLY UPGRADED' : `NEXT: ${this.effectLabel(spot.id, level + 1)}`, 0x9a8d6e);
    if (spot.id === 'keep') {
      line(20, 'THE CASTLE GROWS GRANDER AT LV 10 + 30', 0x8a5a2e);
    }
    if (spot.id === 'jeweler') {
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
          this.openCard(spot);
        });
        button(84, 250, cost === null ? 'MAX LEVEL' : `UPGRADE - ${formatNumber(cost).toUpperCase()} GOLD`, 0x2e7a1e, afford ? () => this.buy(spot) : null);
        return;
      }
    }
    button(
      spot.id === 'jeweler' ? 56 : 44,
      250,
      cost === null ? 'MAX LEVEL' : `UPGRADE - ${formatNumber(cost).toUpperCase()} GOLD`,
      0x2e7a1e,
      afford ? () => this.buy(spot) : null,
    );
  }

  private buy(spot: TownSpot): void {
    if (!this.gs.buyBuilding(spot.id)) return;
    audio.buy();
    this.refreshSign(spot);
    this.refreshVault();
    if (spot.id === 'keep') this.castle.setFrame(this.keepStage());
    this.openCard(spot); // reopen with fresh numbers
  }

  /** Castle art tier: modest, grand at LV 10, majestic at LV 30. */
  private keepStage(): number {
    const level = this.gs.buildingLevel('keep');
    return level >= 30 ? 2 : level >= 10 ? 1 : 0;
  }

  private closeCard(): void {
    this.cardLayer?.destroy();
    this.cardLayer = null;
  }
}
