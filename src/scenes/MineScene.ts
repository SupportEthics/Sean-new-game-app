import Phaser from 'phaser';
import { MINE } from '../config/mine';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import {
  Cell,
  descend,
  findPath,
  lightRadius,
  lootTreasure,
  mineHit,
  MineState,
  newMine,
  openChest,
  stepTo,
  tickFuel,
} from '../core/MineSim';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const TILE = 30;
const GRID_X = 0;
const GRID_Y = 0;
const HUD_H = 88;
const FOOT_H = 116;

/** What a walk ends in: swing at ore, open the chest, loot the hoard,
 * or take the ladder down. */
type Goal = { kind: 'mine' | 'chest' | 'treasure' | 'ladder'; x: number; y: number } | null;

/** The Labyrinth run: mine the torchlit cave, find the treasure chest,
 * and brave the true maze behind it — the hoard at its heart uncovers
 * the ladder down. All rules live in core/MineSim; this scene renders
 * the state and feeds it taps and time. */
export class MineScene extends Phaser.Scene {
  private gs!: GameState;
  private state!: MineState;
  private tiles: Phaser.GameObjects.Rectangle[][] = [];
  private props = new Map<string, Phaser.GameObjects.Image>();
  private knight!: Phaser.GameObjects.Sprite;
  private pickaxe!: Phaser.GameObjects.Image;
  private torchGlow!: Phaser.GameObjects.Image;
  private fuelBar!: Phaser.GameObjects.Rectangle;
  private fuelLabel!: Phaser.GameObjects.BitmapText;
  private depthLabel!: Phaser.GameObjects.BitmapText;
  private hintLabel!: Phaser.GameObjects.BitmapText;
  private goldLabel!: Phaser.GameObjects.BitmapText;
  private gemLabel!: Phaser.GameObjects.BitmapText;
  private walking = false;
  private swingTimer: Phaser.Time.TimerEvent | null = null;
  private ending = false;
  private lastBand = 0;

  constructor() {
    super('MineRun');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.state = newMine(Math.random);
    this.walking = false;
    this.ending = false;
    this.swingTimer = null;
    this.props.clear();

    // Opaque cave backdrop, pinned to the screen (the world scrolls past)
    this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x0c0910)
      .setScrollFactor(0)
      .setInteractive(); // swallow taps outside the grid

    this.buildHud();
    this.buildFloor();

    const skin = this.gs.activeSkin;
    const tex = this.textures.exists(`hero-${skin}`) ? `hero-${skin}` : 'hero-squire';
    const start = this.tileXY(this.state.knight.x, this.state.knight.y);
    this.torchGlow = this.add
      .image(start.x, start.y, 'spark')
      .setScale(3.2)
      .setAlpha(0.22)
      .setTint(0xffb35c)
      .setDepth(19);
    this.knight = this.add.sprite(start.x, start.y - 6, tex).setScale(0.5).setDepth(20);
    try {
      this.knight.play(`hero-${skin}-idle`);
    } catch {
      /* static frame is fine */
    }
    this.pickaxe = this.add
      .image(start.x + 8, start.y - 4, 'mine', 5)
      .setScale(0.9)
      .setOrigin(0.3, 0.85)
      .setDepth(21);

    this.applyLight();

    // The camera lives on the knight: he stays centred, the cave moves
    this.cameras.main.startFollow(this.knight, true, 0.15, 0.15);

    // Tap to walk/mine
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => this.onTap(ptr));

    if (import.meta.env.DEV) {
      (window as unknown as { __mineRun?: boolean; __mineState?: MineState }).__mineRun = true;
      (window as unknown as { __mineState?: MineState }).__mineState = this.state;
      this.events.once('shutdown', () => {
        (window as unknown as { __mineRun?: boolean }).__mineRun = false;
      });
    }
  }

  override update(_t: number, dt: number): void {
    if (this.ending) return;
    tickFuel(this.state, dt);
    const secs = this.state.fuelMs / 1000;
    this.fuelBar.width = Math.max(2, 150 * Math.min(1, secs / MINE.torchSeconds));
    this.fuelBar.setFillStyle(secs <= 10 ? 0xb03a2e : 0xff9a3c);
    this.fuelLabel.setText(
      `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`,
    );
    // Light bands shift as fuel dwindles
    const band = lightRadius(this.state);
    if (band !== this.lastBand) {
      this.lastBand = band;
      this.applyLight();
    }
    // Torch flicker follows the knight
    this.torchGlow.setPosition(this.knight.x, this.knight.y + 4);
    this.torchGlow.setAlpha(0.16 + 0.06 * Math.sin(_t / 90) + (secs <= 10 ? -0.06 : 0));
    if (this.state.over) this.endRun('THE DARK CLOSES IN...');
  }

  // ---- construction ----

  private buildHud(): void {
    this.add.rectangle(THEME.width / 2, HUD_H / 2, THEME.width, HUD_H, 0x1c1622).setDepth(30).setScrollFactor(0);
    this.add.rectangle(THEME.width / 2, HUD_H - 1, THEME.width, 2, 0x3c3048).setDepth(30).setScrollFactor(0);
    this.add
      .bitmapText(14, 12, 'pix', 'THE LABYRINTH', 16)
      .setTint(THEME.gold)
      .setDepth(31).setScrollFactor(0);
    this.depthLabel = this.add
      .bitmapText(THEME.width - 14, 14, 'pix', 'DEPTH 1', 8)
      .setOrigin(1, 0)
      .setTint(0x6ee3ff)
      .setDepth(31).setScrollFactor(0);
    this.add.bitmapText(14, 40, 'pix', 'TORCH', 8).setTint(0xff9a3c).setDepth(31).setScrollFactor(0);
    this.add.rectangle(66 + 76, 44, 154, 12, 0x14101c).setDepth(31).setScrollFactor(0).setStrokeStyle(1, 0x5a4a6e);
    this.fuelBar = this.add
      .rectangle(68, 39, 150, 8, 0xff9a3c)
      .setOrigin(0, 0)
      .setDepth(32).setScrollFactor(0);
    this.fuelLabel = this.add
      .bitmapText(232, 40, 'pix', '1:00', 8)
      .setTint(0xff9a3c)
      .setDepth(31).setScrollFactor(0);
    // Loot
    this.add.circle(20, 68, 6, 0xffd166).setDepth(31).setScrollFactor(0);
    this.goldLabel = this.add.bitmapText(32, 63, 'pix', '0', 8).setTint(0xe6dec8).setDepth(31).setScrollFactor(0);
    const gem = this.add.graphics().setDepth(31).setScrollFactor(0);
    gem.fillStyle(0x6ee3ff);
    gem.fillPoints(
      [new Phaser.Geom.Point(120, 62), new Phaser.Geom.Point(126, 68), new Phaser.Geom.Point(120, 74), new Phaser.Geom.Point(114, 68)],
      true,
    );
    this.gemLabel = this.add.bitmapText(134, 63, 'pix', '0', 8).setTint(0xe6dec8).setDepth(31).setScrollFactor(0);
    // LEAVE
    const leave = this.add
      .rectangle(THEME.width - 46, 66, 76, 26, 0x3a3244)
      .setStrokeStyle(2, 0x8a7d60)
      .setDepth(31).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.add.bitmapText(THEME.width - 46, 66, 'pix', 'LEAVE', 8).setOrigin(0.5).setDepth(32).setScrollFactor(0);
    leave.on('pointerdown', () => this.endRun('YOU CLIMB BACK TO THE LIGHT'));

    // Footer hint (phase-aware: the cave hunts the chest, the maze the hoard)
    this.add
      .rectangle(THEME.width / 2, THEME.height - 100, THEME.width, 32, 0x1c1622)
      .setDepth(30).setScrollFactor(0);
    this.hintLabel = this.add
      .bitmapText(THEME.width / 2, THEME.height - 100, 'pix', '', 8)
      .setOrigin(0.5)
      .setTint(0x9a8d6e)
      .setDepth(31).setScrollFactor(0);
    this.refreshHint();
  }

  private refreshHint(): void {
    this.hintLabel.setText(
      this.state.phase === 'cave'
        ? 'MINE THE VEINS - FIND THE CHEST'
        : 'THE HOARD WAITS AT THE HEART',
    );
    this.hintLabel.setTint(this.state.phase === 'cave' ? 0x9a8d6e : 0x6ee3ff);
  }

  private buildFloor(): void {
    this.tiles.forEach((row) => row.forEach((t) => t.destroy()));
    this.props.forEach((p) => p.destroy());
    this.props.clear();
    this.tiles = [];
    const { grid } = this.state.floor;
    // The labyrinth's walls are worked stone, not raw rock: brighter and
    // bricked so the corridors read clearly through the torchlight
    const maze = this.state.phase === 'maze';
    for (let y = 0; y < grid.length; y++) {
      const row: Phaser.GameObjects.Rectangle[] = [];
      for (let x = 0; x < grid[y].length; x++) {
        const { x: px, y: py } = this.tileXY(x, y);
        const border =
          x === 0 || y === 0 || x === grid[y].length - 1 || y === grid.length - 1;
        const rock = grid[y][x] === Cell.Rock || grid[y][x] === Cell.Vein || grid[y][x] === Cell.Crystal;
        const shade = border
          ? 0x181220
          : rock
            ? maze
              ? (x * 7 + y * 13) % 3 ? 0x564a6a : 0x4c4060
              : (x * 7 + y * 13) % 3 ? 0x423a4e : 0x3a3044
            : maze
              ? (x + y) % 2 === 0 ? 0x1e1826 : 0x221c2c
              : (x + y) % 2 === 0 ? 0x262030 : 0x2a2434;
        const tile = this.add
          .rectangle(px, py, TILE, TILE, shade)
          .setStrokeStyle(border ? 2 : 1, border ? 0x5a4a6e : maze && rock ? 0x6a5a7e : 0x1e1826)
          .setDepth(5);
        row.push(tile);
        const frame = this.propFrame(grid[y][x]);
        if (frame >= 0) {
          this.props.set(`${x},${y}`, this.add.image(px, py, 'mine', frame).setDepth(10));
        }
      }
      this.tiles.push(row);
    }
  }

  private propFrame(cell: Cell): number {
    switch (cell) {
      case Cell.Vein: return 0;
      case Cell.Crystal: return 1;
      case Cell.Fuel: return 2;
      case Cell.Ladder: return 3;
      case Cell.Chest: return 6;
      case Cell.Treasure: return 7;
      default: return -1;
    }
  }

  private tileXY(x: number, y: number): { x: number; y: number } {
    return { x: GRID_X + x * TILE + TILE / 2, y: GRID_Y + y * TILE + TILE / 2 };
  }

  /** Distance-band dimming from the knight's tile — the mockup's look. */
  private applyLight(): void {
    const radius = lightRadius(this.state);
    const { x: kx, y: ky } = this.state.knight;
    for (let y = 0; y < this.tiles.length; y++) {
      for (let x = 0; x < this.tiles[y].length; x++) {
        const dist = Math.hypot(x - kx, y - ky);
        let f = dist <= radius * 0.55 ? 1 : dist <= radius ? 0.62 : dist <= radius * 1.35 ? 0.25 : 0.08;
        // The bedrock rim stays faintly visible however dark it gets, so
        // the cave's edge always reads (Sean: clear boundaries)
        const border =
          x === 0 || y === 0 || x === this.tiles[y].length - 1 || y === this.tiles.length - 1;
        if (border) f = Math.max(f, 0.5);
        this.tiles[y][x].setAlpha(f);
        const prop = this.props.get(`${x},${y}`);
        if (prop) prop.setAlpha(Math.max(f, 0.12));
      }
    }
  }

  // ---- input + movement ----

  private onTap(ptr: Phaser.Input.Pointer): void {
    if (this.ending || this.walking) return;
    // Taps on the pinned HUD/footer never walk the knight
    if (ptr.y < HUD_H || ptr.y > THEME.height - FOOT_H) return;
    const tx = Math.floor((ptr.worldX - GRID_X) / TILE);
    const ty = Math.floor((ptr.worldY - GRID_Y) / TILE);
    const { grid } = this.state.floor;
    if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return;
    this.stopSwinging();
    const path = findPath(this.state, tx, ty);
    if (!path) return;
    const target = grid[ty][tx];
    let goal: Goal = null;
    if (target === Cell.Vein || target === Cell.Crystal) goal = { kind: 'mine', x: tx, y: ty };
    else if (target === Cell.Chest) goal = { kind: 'chest', x: tx, y: ty };
    else if (target === Cell.Treasure) goal = { kind: 'treasure', x: tx, y: ty };
    else if (target === Cell.Ladder) goal = { kind: 'ladder', x: tx, y: ty };
    audio.buy();
    this.walkPath(path, goal);
  }

  private walkPath(path: { x: number; y: number }[], goal: Goal): void {
    if (path.length === 0) {
      this.arrived(goal);
      return;
    }
    this.walking = true;
    const step = path.shift()!;
    const { x: px, y: py } = this.tileXY(step.x, step.y);
    this.knight.setFlipX(px < this.knight.x);
    this.tweens.add({
      targets: [this.knight],
      x: px,
      y: py - 6,
      duration: MINE.msPerTile,
      onUpdate: () => {
        this.pickaxe.setPosition(this.knight.x + (this.knight.flipX ? -8 : 8), this.knight.y + 2);
      },
      onComplete: () => {
        const gained = stepTo(this.state, step.x, step.y);
        if (gained > 0) {
          audio.coin();
          const prop = this.props.get(`${step.x},${step.y}`);
          prop?.destroy();
          this.props.delete(`${step.x},${step.y}`);
          this.pop(this.knight.x, this.knight.y - 26, `+${MINE.fuelSeconds}S LIGHT`, 0xff9a3c);
        }
        this.applyLight();
        this.walkPath(path, goal);
      },
    });
  }

  private arrived(goal: Goal): void {
    this.walking = false;
    if (!goal) return;
    switch (goal.kind) {
      case 'ladder': this.goDeeper(); break;
      case 'chest': this.openTheChest(goal); break;
      case 'treasure': this.lootTheHoard(goal); break;
      case 'mine': this.startSwinging(goal); break;
    }
  }

  /** The chest's lid swings back on a stairway: the labyrinth. */
  private openTheChest(goal: { x: number; y: number }): void {
    if (!openChest(this.state, Math.random)) return;
    this.ending = true; // pause fuel during the reveal flash
    const { x: cx, y: cy } = this.tileXY(goal.x, goal.y);
    audio.stageUp();
    this.pop(cx, cy - 18, 'THE CHEST HIDES A STAIRWAY!', 0xffd166);
    const flash = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x0c0910)
      .setAlpha(0)
      .setDepth(40).setScrollFactor(0);
    this.tweens.add({
      targets: flash,
      alpha: 1,
      duration: 420,
      yoyo: true,
      hold: 200,
      delay: 350,
      onYoyo: () => {
        this.buildFloor();
        const start = this.tileXY(this.state.knight.x, this.state.knight.y);
        this.knight.setPosition(start.x, start.y - 6);
        this.pickaxe.setPosition(start.x + 8, start.y - 4);
        this.cameras.main.centerOn(start.x, start.y);
        this.applyLight();
        this.refreshHint();
        this.pop(start.x, start.y - 30, 'THE LABYRINTH', 0x6ee3ff);
        this.pop(start.x, start.y - 48, `+${MINE.chestFuelSeconds}S LIGHT`, 0xff9a3c);
      },
      onComplete: () => {
        flash.destroy();
        this.ending = false;
      },
    });
  }

  /** The hoard at the maze's heart: big payout, ladder underneath. */
  private lootTheHoard(goal: { x: number; y: number }): void {
    const result = lootTreasure(this.state);
    if (!result) return;
    audio.stageUp();
    const { x: ox, y: oy } = this.tileXY(goal.x, goal.y);
    const prop = this.props.get(`${goal.x},${goal.y}`);
    prop?.setTexture('mine', 3); // the ladder beneath the pile
    this.pop(ox, oy - 14, `+${formatNumber(this.gs.goldForHours(result.goldHours)).toUpperCase()}`, 0xffd166);
    if (result.gems > 0) this.pop(ox, oy - 32, `+${result.gems} GEMS`, 0x6ee3ff);
    this.pop(ox, oy - 50, 'THE LADDER LIES BENEATH', 0x9a8d6e);
    this.refreshLoot();
  }

  // ---- mining ----

  private startSwinging(target: { x: number; y: number }): void {
    const { x: px } = this.tileXY(target.x, target.y);
    this.knight.setFlipX(px < this.knight.x);
    this.swingTimer = this.time.addEvent({
      delay: MINE.msPerSwing,
      loop: true,
      callback: () => this.swing(target),
    });
    this.swing(target);
  }

  private stopSwinging(): void {
    this.swingTimer?.remove();
    this.swingTimer = null;
  }

  private swing(target: { x: number; y: number }): void {
    if (this.ending) return;
    const cell = this.state.floor.grid[target.y][target.x];
    if (cell !== Cell.Vein && cell !== Cell.Crystal) {
      this.stopSwinging();
      return;
    }
    // Pickaxe arc + knight attack frame
    this.knight.anims.pause();
    this.knight.setFrame(2);
    const dir = this.knight.flipX ? 1 : -1;
    this.tweens.add({
      targets: this.pickaxe,
      angle: dir * 70,
      duration: MINE.msPerSwing * 0.35,
      yoyo: true,
      onComplete: () => {
        this.pickaxe.setAngle(0);
        this.knight.setFrame(0);
        this.knight.anims.resume();
      },
    });
    audio.hit();
    const { x: ox, y: oy } = this.tileXY(target.x, target.y);
    // spark burst
    for (let i = 0; i < 4; i++) {
      const s = this.add
        .rectangle(ox + Phaser.Math.Between(-6, 6), oy + Phaser.Math.Between(-6, 6), 2, 2, 0xffe696)
        .setDepth(22);
      this.tweens.add({
        targets: s,
        y: s.y - Phaser.Math.Between(6, 14),
        alpha: 0,
        duration: 260,
        onComplete: () => s.destroy(),
      });
    }
    const result = mineHit(this.state, target.x, target.y);
    const prop = this.props.get(`${target.x},${target.y}`);
    if (!result.broke) {
      if (prop) {
        this.tweens.add({ targets: prop, x: ox + 2, duration: 45, yoyo: true, repeat: 1 });
      }
      return;
    }
    this.stopSwinging();
    if (prop) {
      prop.setTexture('mine', 4); // rubble
      this.tweens.add({ targets: prop, alpha: 0.5, duration: 400 });
    }
    if (result.gems > 0) {
      audio.stageUp();
      this.pop(ox, oy - 14, `+${result.gems} GEMS`, 0x6ee3ff);
    } else {
      audio.coin();
      this.pop(ox, oy - 14, `+${formatNumber(this.gs.goldForHours(result.goldHours)).toUpperCase()}`, 0xffd166);
    }
    this.refreshLoot();
  }

  private goDeeper(): void {
    this.ending = true; // pause fuel during the transition flash
    const flash = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x0c0910)
      .setAlpha(0)
      .setDepth(40).setScrollFactor(0);
    audio.stageUp();
    this.tweens.add({
      targets: flash,
      alpha: 1,
      duration: 350,
      yoyo: true,
      hold: 150,
      onYoyo: () => {
        if (!descend(this.state, Math.random)) return;
        this.depthLabel.setText(`DEPTH ${this.state.depth}`);
        this.buildFloor();
        const start = this.tileXY(this.state.knight.x, this.state.knight.y);
        this.knight.setPosition(start.x, start.y - 6);
        this.pickaxe.setPosition(start.x + 8, start.y - 4);
        this.cameras.main.centerOn(start.x, start.y);
        this.applyLight();
        this.refreshHint();
        this.pop(start.x, start.y - 30, `THE MINE - FLOOR ${this.state.depth}`, 0x6ee3ff);
      },
      onComplete: () => {
        flash.destroy();
        this.ending = false;
      },
    });
  }

  // ---- run end ----

  private endRun(reason: string): void {
    if (this.ending) return;
    this.ending = true;
    this.stopSwinging();
    this.tweens.killAll();
    const banked = this.gs.bankMine(this.state.lootGoldHours, this.state.lootGems, this.state.depth);
    const dim = this.add
      .rectangle(THEME.width / 2, THEME.height / 2, THEME.width, THEME.height, 0x0c0910, 0.85)
      .setDepth(50).setScrollFactor(0)
      .setInteractive();
    const cy = THEME.height / 2 - 40;
    this.add
      .rectangle(THEME.width / 2, cy, 320, 190, 0x1c1622)
      .setStrokeStyle(3, THEME.gold)
      .setDepth(51).setScrollFactor(0);
    this.add
      .bitmapText(THEME.width / 2, cy - 66, 'pix', reason, 8)
      .setOrigin(0.5)
      .setTint(0xffb4b4)
      .setDepth(52).setScrollFactor(0);
    this.add
      .bitmapText(THEME.width / 2, cy - 34, 'pix', `DEPTH ${this.state.depth} REACHED`, 16)
      .setOrigin(0.5)
      .setTint(0x6ee3ff)
      .setDepth(52).setScrollFactor(0);
    const haul = [
      banked.gold > 0 ? `${formatNumber(banked.gold).toUpperCase()} GOLD` : '',
      banked.gems > 0 ? `${banked.gems} GEMS` : '',
    ]
      .filter(Boolean)
      .join(' + ');
    this.add
      .bitmapText(
        THEME.width / 2,
        cy + 4,
        'pix',
        haul ? `HAUL: ${haul}` : 'EMPTY HANDS THIS TIME',
        8,
      )
      .setOrigin(0.5)
      .setTint(THEME.gold)
      .setDepth(52).setScrollFactor(0);
    this.add
      .bitmapText(THEME.width / 2, cy + 56, 'pix', 'TAP TO RETURN', 8)
      .setOrigin(0.5)
      .setTint(0x9a8d6e)
      .setDepth(52).setScrollFactor(0);
    audio.stageUp();
    this.time.delayedCall(400, () => {
      dim.once('pointerdown', () => this.scene.stop());
    });
  }

  // ---- bits ----

  private refreshLoot(): void {
    // goldForHours floors at 1, so an unmined run must show a literal 0
    this.goldLabel.setText(
      this.state.lootGoldHours > 0
        ? formatNumber(this.gs.goldForHours(this.state.lootGoldHours)).toUpperCase()
        : '0',
    );
    this.gemLabel.setText(`x${this.state.lootGems}`);
  }

  private pop(x: number, y: number, txt: string, tint: number): void {
    const t = this.add
      .bitmapText(x, y, 'pix', txt, 8)
      .setOrigin(0.5)
      .setTint(tint)
      .setDropShadow(1, 1, 0x0c0910, 1)
      .setDepth(35);
    this.tweens.add({ targets: t, y: y - 20, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }
}
