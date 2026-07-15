import Phaser from 'phaser';
import { GEAR, weaponFrame } from '../config/gear';
import { GIFTS, rollGift } from '../config/gifts';
import { isLocationEntrance, locationForStage, locationIndex, speciesForWave } from '../config/locations';
import { raidClearKills } from '../config/raids';
import { premiumSwordById, swordSkinFrame } from '../config/swordSkins';
import { EVOLUTION } from '../config/pets';
import { FAIRY_EVOLUTION } from '../config/fairy';
import { DUNGEON_MODIFIERS } from '../config/dungeon';
import { ENEMY_SPECIES, STAGES } from '../config/stages';
import { isBossWave } from '../core/BattleSim';
import { formatNumber, rivalDps } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { AdService } from '../services/monetization/AdService';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const L = THEME.layout;

/**
 * Top-down fenced arena (Idle Sword Master style): the hero stands mid-field
 * with an orbiting blade while monsters walk in from the right.
 */
export class BattleScene extends Phaser.Scene {
  private gs!: GameState;
  private floorTs!: Phaser.GameObjects.TileSprite;
  private wallTs!: Phaser.GameObjects.TileSprite;
  private decoLayer!: Phaser.GameObjects.Group;
  private hero!: Phaser.GameObjects.Sprite;
  private petSprites: Phaser.GameObjects.Sprite[] = [];
  private petShadows: Phaser.GameObjects.Image[] = [];
  private fairySprite: Phaser.GameObjects.Sprite | null = null;
  private ads!: AdService;
  private giftSprite: Phaser.GameObjects.Sprite | null = null;
  private giftBusy = false;
  private reduceMotion = false;
  private blades: { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }[] = [];
  private slotIcons: Phaser.GameObjects.Image[] = [];
  private slotLocks: Phaser.GameObjects.BitmapText[] = [];
  private lastSlots = 0;
  private enemy!: Phaser.GameObjects.Sprite;
  private extraEnemies: Phaser.GameObjects.Sprite[] = [];
  private enemyShadow!: Phaser.GameObjects.Image;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private enemyName!: Phaser.GameObjects.Text;
  private coinEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pendingDamage = 0;
  private lastWaveKey = '';
  private lastBiome = -1;
  private wasBoss = false;
  private orbitAngle = 0;
  private orbitSpeed = 2.4; // radians/sec

  private readonly heroX = 112;
  private readonly heroY = 252;
  private readonly enemyX = 268;
  private readonly enemyY = 252;
  /** Staging spots for the pet squad, all along the bottom of the field —
   * fully clear of the MENU/TOWN buttons (left edge, y < 240), the hero's
   * blade orbit, and the boost buttons on the right edge. */
  static readonly PET_SLOTS = [
    { x: 62, y: 296 },
    { x: 108, y: 318 },
    { x: 154, y: 300 },
    { x: 28, y: 314 },
    { x: 192, y: 322 },
  ];

  constructor() {
    super('Battle');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.ads = this.registry.get('ads') as AdService;
    try {
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      this.reduceMotion = false;
    }

    this.buildArena();
    this.decoLayer = this.add.group();
    this.redrawArena();

    this.createHero();
    this.createEnemy();

    this.coinEmitter = this.add.particles(0, 0, 'coin', {
      speed: { min: 60, max: 160 },
      angle: { min: 220, max: 320 },
      gravityY: 300,
      lifespan: 600,
      scale: { start: 1, end: 0.4 },
      emitting: false,
    });

    this.time.addEvent({
      delay: 1000 / STAGES.heroAttacksPerSecond,
      loop: true,
      callback: () => this.playAttack(),
    });

    this.gs.on('battle:tick', (r) => {
      this.pendingDamage += r.damageDealt;
      if (r.kills > 0) this.onKill(r.kills);
      if (r.stageCleared) this.onStageCleared();
      if (r.bossFailed) this.onBossFailed();
    });
    this.gs.on('stage:changed', () => {
      if (this.gs.equipSlots > this.lastSlots) {
        this.lastSlots = this.gs.equipSlots;
        this.syncWeapon();
        this.onSlotUnlocked();
      }
    });
    this.gs.on('grid:changed', () => this.syncWeapon());
    this.gs.on('swordskin:changed', () => this.syncWeapon());
    this.gs.on('raid:started', (level) => this.onRaidStarted(level));
    this.gs.on('raid:ended', (r) => this.onRaidEnded(r));
    // Duels arrive from the Hall of Legends with the outcome pre-rolled;
    // this scene just stages the show
    this.events.on(
      'duel:play',
      (p: { name: string; skin: string; stage: number; won: boolean; gold: number }) =>
        this.playDuel(p),
    );
    this.gs.on('pets:changed', () => this.syncPets());
    this.gs.on('fairy:changed', () => this.syncFairy());

    this.syncWeapon();
    this.syncPets();
    this.syncFairy();
    this.syncWave(true);
    this.scheduleGift();
  }

  override update(_time: number, delta: number): void {
    this.gs.update(delta / 1000);
    this.syncWave(false);
    this.syncHpBar();

    // Signature orbiting blades — one per equipped sword, evenly spaced
    this.orbitAngle += (delta / 1000) * this.orbitSpeed;
    const r = 34;
    const n = this.blades.length || 1;
    this.blades.forEach((blade, i) => {
      const a = this.orbitAngle + (i * Math.PI * 2) / n;
      const wx = this.heroX + Math.cos(a) * r;
      const wy = this.heroY + Math.sin(a) * r * 0.6; // elliptical = top-down feel
      blade.img.setPosition(wx, wy);
      blade.img.setAngle(Phaser.Math.RadToDeg(a) + 135);
      blade.glow.setPosition(wx, wy);
      blade.img.setDepth(wy > this.heroY ? 20 : 8);
      blade.glow.setDepth(wy > this.heroY ? 19 : 7);
    });
    // Ease burst speed back down to cruise
    this.orbitSpeed = Math.max(2.4, this.orbitSpeed * 0.97);
  }

  // ---- Arena construction ----

  private biomeIndex(): number {
    return locationIndex(this.gs.battle.stage);
  }

  /** Static arena furniture, created once: wall, floor, fence, torches. */
  private buildArena(): void {
    const wallH = 44;
    this.wallTs = this.add
      .tileSprite(0, L.arenaTop, THEME.width, wallH, 'tiles', 3)
      .setOrigin(0, 0);
    this.floorTs = this.add
      .tileSprite(0, L.arenaTop + wallH, THEME.width, L.arenaBottom - L.arenaTop - wallH, 'tiles', 0)
      .setOrigin(0, 0);
    // Fence overlaps the bottom edge of the floor
    this.add
      .tileSprite(0, L.arenaBottom - 56, THEME.width, 64, 'tiles', 4)
      .setOrigin(0, 0)
      .setDepth(21);
    // Torches on the wall
    for (const x of [70, THEME.width - 70]) {
      this.add.sprite(x, L.arenaTop + 26, 'torch').play('torch-flame').setDepth(2);
    }

    // Equip slots, mounted on the wall between the torches: one socket per
    // wieldable sword — filled sockets mirror the orbiting loadout.
    const slotW = 44;
    const startX = THEME.width / 2 - ((GEAR.equipSlotStages.length - 1) * (slotW + 6)) / 2;
    const sg = this.add.graphics().setDepth(2);
    for (let i = 0; i < GEAR.equipSlotStages.length; i++) {
      const x = startX + i * (slotW + 6);
      sg.fillStyle(0x2a1c10, 0.85);
      sg.fillRoundedRect(x - slotW / 2, L.arenaTop + 4, slotW, 40, 6);
      sg.lineStyle(2, THEME.gold, 0.55);
      sg.strokeRoundedRect(x - slotW / 2, L.arenaTop + 4, slotW, 40, 6);
      const icon = this.add
        .image(x, L.arenaTop + 24, 'gear', 0)
        .setScale(0.5)
        .setDepth(3)
        .setVisible(false);
      this.slotIcons.push(icon);
      // Locked sockets advertise their unlock stage
      const lock = this.add
        .bitmapText(x, L.arenaTop + 24, 'pix', `ST\n${GEAR.equipSlotStages[i]}`, 8)
        .setTint(0x9a8d6e)
        .setCenterAlign()
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
      this.slotLocks.push(lock);
    }
  }

  /** Per-location pass: tint the tiles and scatter this stage's props. */
  private redrawArena(): void {
    const loc = locationForStage(this.gs.battle.stage);
    this.floorTs.setTint(loc.floor);
    this.wallTs.setTint(loc.wall);

    this.decoLayer.clear(true, true);
    const stage = this.gs.battle.stage;
    // Cracked floor slabs
    for (let i = 0; i < 3; i++) {
      const x = 32 + ((stage * 61 + i * 127) % (THEME.width - 64));
      const y = L.arenaTop + 84 + ((stage * 23 + i * 71) % (L.arenaBottom - L.arenaTop - 160));
      this.decoLayer.add(
        this.add.image(x, y, 'tiles', 1).setTint(loc.floor).setDepth(1).setAlpha(0.9),
      );
    }
    // Battlefield litter: skull, rock, stuck sword, bone, crate
    for (let i = 0; i < 6; i++) {
      const x = 28 + ((stage * 37 + i * 79) % (THEME.width - 56));
      const y = L.arenaTop + 76 + ((stage * 13 + i * 53) % (L.arenaBottom - L.arenaTop - 140));
      const frame = [1, 2, 3, 4, 6][(stage + i) % 5];
      this.decoLayer.add(
        this.add.image(x, y, 'deco', frame).setFlipX(i % 2 === 0).setDepth(3).setAlpha(0.95),
      );
    }
  }

  private createHero(): void {
    this.add.image(this.heroX, this.heroY + 32, 'shadow').setScale(1.2).setDepth(4);
    const skin = this.gs.activeSkin;
    this.hero = this.add
      .sprite(this.heroX, this.heroY, `hero-${skin}`)
      .play(`hero-${skin}-idle`)
      .setDepth(10);

    this.lastSlots = this.gs.equipSlots;
    this.gs.on('skin:changed', (id) => this.applySkin(id));
    this.applySkin(skin);
  }

  private applySkin(id: string): void {
    this.hero.setTexture(`hero-${id}`);
    this.hero.play(`hero-${id}-idle`);
    // Hero skins never touch the blades (Sean: switching knight skin made
    // the worn sword look like a different weapon — that was the old
    // legendary-aura tint washing over the blade glow)
  }

  /** Blade glow follows the WORN SWORD: premium swords bring their own
   * aura color, everything else glows the standard gold. */
  private bladeGlowTint(): number {
    const key = this.gs.swordSkin;
    if (key.startsWith('premium-')) {
      const sword = premiumSwordById(key.slice('premium-'.length));
      if (sword) return sword.aura;
    }
    return THEME.gold;
  }

  /** Companions flanking the hero, one per active pet, on the reserved spots. */
  private syncPets(): void {
    this.petSprites.forEach((s) => s.destroy());
    this.petShadows.forEach((s) => s.destroy());
    this.petSprites = [];
    this.petShadows = [];
    this.gs.activePets.forEach((id, i) => {
      const slot = BattleScene.PET_SLOTS[i];
      if (!slot) return;
      // Evolved pets wear their fiercer form and stand visibly larger
      const stage = this.gs.petStage(id);
      const scale = EVOLUTION.scales[stage];
      const tex = `pet-${id}${stage > 0 ? `-s${stage}` : ''}`;
      this.petShadows.push(
        this.add.image(slot.x, slot.y + 12, 'shadow').setScale(0.6 * scale).setDepth(4),
      );
      this.petSprites.push(
        this.add
          .sprite(slot.x, slot.y, tex)
          .setScale(scale)
          .play(`${tex}-idle`)
          .setDepth(slot.y > this.heroY ? 12 : 6),
      );
    });
  }

  /** The fairy flutters above the hero's shoulder once recruited; her
   * evolution stage picks the sheet and she grows a little each time. */
  private syncFairy(): void {
    if (this.gs.fairyLevel <= 0) return;
    const stage = Math.min(this.gs.fairyStage, FAIRY_EVOLUTION.scales.length - 1);
    const tex = `fairy${stage > 0 ? `-s${stage}` : ''}`;
    if (this.fairySprite?.texture.key === tex) return;
    this.fairySprite?.destroy();
    this.fairySprite = this.add
      .sprite(this.heroX - 34, this.heroY - 44, tex)
      .play(`${tex}-idle`)
      .setScale(FAIRY_EVOLUTION.scales[stage])
      .setDepth(11);
    this.tweens.add({
      targets: this.fairySprite,
      y: this.heroY - 50,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  // ---- Floating gift event ----

  /** Every few minutes a parcel drifts across the arena; tapping it plays
   * a rewarded ad for a random prize. */
  private scheduleGift(): void {
    const { min, max } = GIFTS.intervalMinutes;
    const delay = (min + Math.random() * (max - min)) * 60_000;
    this.time.delayedCall(delay, () => {
      this.spawnGift();
      this.scheduleGift();
    });
  }

  private spawnGift(): void {
    if (this.giftSprite || this.gs.raid) return;
    const fromLeft = Math.random() < 0.5;
    const y = 150 + Math.random() * 60;
    const startX = fromLeft ? -16 : THEME.width + 16;
    const endX = fromLeft ? THEME.width + 16 : -16;
    const gift = this.add
      .sprite(startX, y, 'gift')
      .play('gift-idle')
      .setDepth(25)
      .setInteractive({ useHandCursor: true });
    this.giftSprite = gift;

    const drift = this.tweens.add({
      targets: gift,
      x: endX,
      duration: GIFTS.lifetimeSeconds * 1000,
      onComplete: () => {
        gift.destroy();
        if (this.giftSprite === gift) this.giftSprite = null;
      },
    });
    this.tweens.add({ targets: gift, y: y - 10, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    gift.on('pointerdown', () => {
      if (this.giftBusy) return;
      this.giftBusy = true;
      drift.pause();
      void this.ads.showRewarded('gift').then((result) => {
        this.giftBusy = false;
        gift.destroy();
        if (this.giftSprite === gift) this.giftSprite = null;
        if (!result.rewarded) return;
        this.gs.trackQuest('ads');
        const summary = this.gs.grantGift(rollGift(Math.random()));
        audio.coin();
        this.events.emit('toast', summary);
      });
    });
  }

  private createEnemy(): void {
    this.enemyShadow = this.add
      .image(this.enemyX, this.enemyY + 22, 'shadow')
      .setScale(1.1)
      .setDepth(4);
    this.enemy = this.add.sprite(this.enemyX, this.enemyY, 'enemy-wolf').setDepth(10);
    this.enemy.setFlipX(true); // face the hero

    // Waiting pack, spread across the right flank
    for (const [dx, dy] of [
      [46, -40],
      [64, 26],
    ]) {
      const s = this.add
        .sprite(this.enemyX + dx, this.enemyY + dy, 'enemy-wolf')
        .setDepth(9)
        .setAlpha(0.92)
        .setFlipX(true);
      this.extraEnemies.push(s);
    }

    this.add
      .rectangle(this.enemyX, this.enemyY - 36, 46, 7, THEME.hpBarBg)
      .setStrokeStyle(1, 0x2a1c10)
      .setDepth(12);
    this.hpBar = this.add
      .rectangle(this.enemyX - 21, this.enemyY - 36, 42, 4, THEME.hpBar)
      .setOrigin(0, 0.5)
      .setDepth(13);
    this.enemyName = this.add
      .text(this.enemyX, this.enemyY - 50, '', {
        fontFamily: THEME.fontFamily,
        fontSize: '13px',
        fontStyle: 'bold',
        color: THEME.textLight,
        stroke: '#2a1c10',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(12);

    // Boss timer bar pinned to the top of the arena
    this.bossBarBg = this.add
      .rectangle(THEME.width / 2, L.arenaTop + 40, 200, 12, THEME.hpBarBg)
      .setStrokeStyle(2, 0x2a1c10)
      .setVisible(false)
      .setDepth(12);
    this.bossBar = this.add
      .rectangle(THEME.width / 2 - 98, L.arenaTop + 40, 196, 8, THEME.bossTimer)
      .setOrigin(0, 0.5)
      .setVisible(false)
      .setDepth(13);
  }

  // ---- Sync with the sim ----

  /** The hero wields his equipped loadout: one orbiting blade per slot. */
  private syncWeapon(): void {
    const equipped = this.gs.equippedIndices.map((i) => this.gs.grid[i] as number);

    // Wall sockets mirror the loadout; locked ones show their unlock stage
    const slots = this.gs.equipSlots;
    this.slotIcons.forEach((icon, i) => {
      const unlocked = i < slots;
      const tier = equipped[i];
      this.slotLocks[i].setVisible(!unlocked);
      if (unlocked && tier !== undefined) {
        icon.setVisible(true).setFrame(weaponFrame(tier));
      } else {
        icon.setVisible(false);
      }
    });
    const want = Math.max(1, equipped.length);

    while (this.blades.length < want) {
      const glow = this.add
        .image(this.heroX, this.heroY, 'spark')
        .setScale(2.4)
        .setAlpha(0.3)
        .setTint(this.bladeGlowTint())
        .setDepth(7);
      const img = this.add
        .image(this.heroX, this.heroY, 'gear', 0)
        .setScale(0.5)
        .setOrigin(0.5, 0.5)
        .setDepth(8);
      this.blades.push({ img, glow });
    }
    while (this.blades.length > want) {
      const b = this.blades.pop()!;
      b.img.destroy();
      b.glow.destroy();
    }

    const glowTint = this.bladeGlowTint();
    this.blades.forEach((blade, i) => {
      const tier = equipped[i] ?? 1;
      blade.img.setFrame(swordSkinFrame(this.gs.swordSkin, tier));
      const band = Math.min((tier - 1) / GEAR.weaponArtCount, 1);
      blade.glow.setAlpha(0.18 + band * 0.35).setTint(glowTint);
    });
  }

  private syncWave(force: boolean): void {
    if (this.gs.raid) {
      // Raid mode: the boss bar doubles as the raid timer
      this.bossBar.width =
        196 * Phaser.Math.Clamp(this.gs.raid.timeLeft / this.gs.raid.duration, 0, 1);
      return;
    }
    const b = this.gs.battle;
    const key = `${b.stage}-${b.wave}-${b.enemiesLeftInWave}`;
    const boss = isBossWave(b);

    this.bossBarBg.setVisible(boss);
    this.bossBar.setVisible(boss);
    if (boss) {
      this.bossBar.width = 196 * Phaser.Math.Clamp(b.bossTimeLeft / STAGES.bossTimeLimit, 0, 1);
    }

    if (key === this.lastWaveKey && !force) return;
    this.lastWaveKey = key;

    if (boss && !this.wasBoss) audio.bossWarn();
    this.wasBoss = boss;

    const biome = this.biomeIndex();
    if (biome !== this.lastBiome) {
      this.lastBiome = biome;
      this.redrawArena();
    }

    const species = speciesForWave(b.stage, b.wave);
    const tex = `enemy-${species.key}`;
    this.enemy.setTexture(tex);
    this.enemy.play(`${tex}-idle`);
    // Nameplates are boss-only; regular mobs fight anonymously
    this.enemyName.setText(`BOSS ${species.name}`).setVisible(boss);
    this.enemy.setScale(boss ? 1.5 : 1);
    this.enemyShadow.setScale(boss ? 1.6 : 1.1);

    // Walk in from the right
    this.enemy.setX(this.enemyX + 80).setAlpha(0.4);
    this.tweens.add({
      targets: this.enemy,
      x: this.enemyX,
      alpha: 1,
      duration: 320,
      ease: 'Quad.out',
    });

    // Waiting pack behind the current target
    const waiting = Math.max(0, Math.min(b.enemiesLeftInWave - 1, 2));
    this.extraEnemies.forEach((s, i) => {
      s.setVisible(i < waiting);
      if (i < waiting) {
        s.setTexture(tex);
        s.play(`${tex}-idle`);
      }
    });
  }

  private syncHpBar(): void {
    const raid = this.gs.raid;
    let frac: number;
    if (raid?.dungeon) {
      // The dragon has ONE life bar: its whole health drains across the
      // fight instead of resetting per internal segment
      const chewed = raid.kills + (1 - raid.monsterHp / raid.monsterMaxHp);
      frac = 1 - chewed / raid.killCap;
    } else if (raid) {
      frac = raid.monsterHp / raid.monsterMaxHp;
    } else {
      frac =
        this.gs.battle.currentEnemyMaxHp > 0
          ? this.gs.battle.currentEnemyHp / this.gs.battle.currentEnemyMaxHp
          : 0;
    }
    this.hpBar.width = 42 * Phaser.Math.Clamp(frac, 0, 1);
  }

  private onRaidStarted(level: number): void {
    const dungeon = this.gs.raid?.dungeon;
    this.extraEnemies.forEach((e) => e.setVisible(false));
    if (dungeon) {
      // The day's dragon looms over the right flank, breathing
      const color = DUNGEON_MODIFIERS.find((m) => m.id === dungeon)?.dragon ?? 'emerald';
      this.enemy.setVisible(false);
      this.enemyShadow.setVisible(false);
      this.dragonSprite?.destroy();
      this.dragonSprite = this.add
        .sprite(282, 226, `dragon-${color}`, 0)
        .setScale(2)
        .setDepth(9);
      this.tweens.add({
        targets: this.dragonSprite,
        scaleY: 2.05,
        y: 230,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      // No name tag — it's clearly a dragon (Sean's call); the timer bar
      // is all the chrome the fight needs
      this.enemyName.setVisible(false);
      this.bossBarBg.setVisible(true);
      this.bossBar.setVisible(true).setFillStyle(0x2884a8);
      this.lastWaveKey = '';
      return;
    }
    const species = ENEMY_SPECIES[(level * 3) % ENEMY_SPECIES.length];
    const tex = `enemy-${species.key}`;
    this.enemy.setTexture(tex);
    this.enemy.play(`${tex}-idle`);
    this.enemy.setScale(1.4).setTint(0xffb0b0);
    this.enemyShadow.setScale(1.5);
    this.enemyName.setText(`RAID LV ${level}`).setVisible(true);
    this.bossBarBg.setVisible(true);
    this.bossBar.setVisible(true).setFillStyle(0x9b7ede);
    this.lastWaveKey = ''; // force resync after the raid
  }

  private onRaidEnded(r: {
    level: number;
    kills: number;
    gold: number;
    gems: number;
    cleared: boolean;
    dungeon?: string;
    quota?: number;
  }): void {
    this.enemy.clearTint().setVisible(true);
    this.enemyShadow.setVisible(true);
    if (this.dragonSprite) {
      // The beaten dragon sinks away (or slinks off if it won)
      const d = this.dragonSprite;
      this.dragonSprite = null;
      this.tweens.add({
        targets: d,
        y: d.y + 40,
        alpha: 0,
        angle: r.cleared ? 12 : 0,
        duration: 600,
        onComplete: () => d.destroy(),
      });
    }
    this.bossBar.setFillStyle(THEME.bossTimer);
    this.enemyName.setVisible(false);
    this.syncWave(true);

    audio.stageUp();
    const msg = r.dungeon
      ? r.cleared
        ? `DRAGON SLAIN! +${r.gems} GEMS + A GOLD HOARD`
        : 'THE DRAGON ENDURES - FREE RETRY!'
      : r.cleared
        ? `RAID CLEARED! +${formatNumber(r.gold).toUpperCase()} GOLD +${r.gems} GEMS`
        : `RAID OVER - ${r.kills}/${raidClearKills(r.level)} KILLS +${r.gems} GEMS`;
    const banner = this.add
      .bitmapText(THEME.width / 2, L.arenaTop + 150, 'pix', msg, 8)
      .setTint(r.cleared ? THEME.gold : 0xffb4b4)
      .setDropShadow(1, 1, 0x14101c, 1)
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: banner,
      y: banner.y - 24,
      alpha: 0,
      delay: 2200,
      duration: 500,
      onComplete: () => banner.destroy(),
    });
  }

  // ---- Duels ----

  private duelActive = false;
  private dragonSprite: Phaser.GameObjects.Sprite | null = null;
  private dragonBusy = false;

  /** Stage a rival-knight showdown in the arena: three lunging exchanges
   * with damage pops, then the pre-rolled loser topples. The battle sim
   * keeps running underneath; only the visuals borrow the stage. */
  private playDuel(p: { name: string; skin: string; stage: number; won: boolean; gold: number }): void {
    if (this.duelActive) return;
    this.duelActive = true;

    const tex = this.textures.exists(`hero-${p.skin}`) ? `hero-${p.skin}` : 'hero-squire';
    this.enemy.setVisible(false);
    this.extraEnemies.forEach((e) => e.setVisible(false));
    this.enemyName.setText(`DUEL: ${p.name}`).setVisible(true);
    const rivalShadow = this.add
      .image(this.enemyX, this.enemyY + 32, 'shadow')
      .setScale(1.2)
      .setDepth(4);
    const rival = this.add.sprite(this.enemyX, this.enemyY, tex).setDepth(10).setFlipX(true);
    if (this.textures.exists(`${tex}-idle`) || rival.anims) {
      try {
        rival.play(`${tex}-idle`);
      } catch {
        /* static frame is fine */
      }
    }

    const pop = (x: number, y: number, txt: string, tint: number): void => {
      const t = this.add
        .bitmapText(x, y - 40, 'pix', txt, 16)
        .setOrigin(0.5)
        .setTint(tint)
        .setDropShadow(1, 1, 0x14101c, 1)
        .setDepth(41);
      this.tweens.add({ targets: t, y: t.y - 28, alpha: 0, duration: 650, onComplete: () => t.destroy() });
    };
    const lunge = (s: Phaser.GameObjects.Sprite, dir: 1 | -1): void => {
      this.tweens.add({ targets: s, x: `+=${dir * 42}`, duration: 150, yoyo: true, ease: 'Quad.out' });
    };
    const myHit = formatNumber(this.gs.heroDps).toUpperCase();
    const theirHit = formatNumber(rivalDps(p.stage)).toUpperCase();

    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(250 + i * 700, () => {
        lunge(this.hero, 1);
        audio.hit();
        pop(this.enemyX, this.enemyY, myHit, 0xffd166);
      });
      this.time.delayedCall(600 + i * 700, () => {
        lunge(rival, -1);
        audio.hit();
        pop(this.heroX, this.heroY, theirHit, 0xff8a8a);
      });
    }

    this.time.delayedCall(2500, () => {
      const loser = p.won ? rival : this.hero;
      this.tweens.add({ targets: loser, angle: p.won ? 90 : -90, alpha: 0.35, duration: 420 });
      audio.stageUp();
      const msg = p.won
        ? `VICTORY! +${formatNumber(p.gold).toUpperCase()} GOLD`
        : `${p.name} STANDS TALL - TRAIN AND RETRY`;
      const banner = this.add
        .bitmapText(THEME.width / 2, L.arenaTop + 150, 'pix', msg, 8)
        .setTint(p.won ? THEME.gold : 0xffb4b4)
        .setDropShadow(1, 1, 0x14101c, 1)
        .setOrigin(0.5)
        .setDepth(42);
      this.tweens.add({
        targets: banner,
        y: banner.y - 24,
        alpha: 0,
        delay: 2000,
        duration: 500,
        onComplete: () => banner.destroy(),
      });
    });

    this.time.delayedCall(4300, () => {
      rival.destroy();
      rivalShadow.destroy();
      this.hero.setAngle(0).setAlpha(1);
      this.enemy.setVisible(true);
      this.enemyName.setVisible(false);
      this.syncWave(true);
      this.duelActive = false;
    });
  }

  // ---- Reactions ----

  private playAttack(): void {
    this.hero.anims.pause();
    this.hero.setFrame(2);
    this.time.delayedCall(160, () => {
      this.hero.setFrame(0);
      this.hero.anims.resume();
    });

    this.tweens.add({
      targets: this.hero,
      x: { from: this.heroX, to: this.heroX + 16 },
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    });

    if (this.pendingDamage > 0) {
      audio.hit();
      this.orbitSpeed = 9; // blade whirls on hit
      this.spawnDamageNumber(this.pendingDamage);
      this.pendingDamage = 0;
      this.tweens.add({
        targets: this.enemy,
        x: { from: this.enemyX, to: this.enemyX + 8 },
        duration: 70,
        yoyo: true,
      });
    }
  }

  private spawnDamageNumber(amount: number): void {
    const b = this.gs.battle;
    const punch = Phaser.Math.Clamp(amount / Math.max(b.currentEnemyMaxHp, 1), 0, 1);
    const t = this.add
      .bitmapText(
        this.enemyX + Phaser.Math.Between(-18, 18),
        this.enemyY - 70,
        'pix',
        formatNumber(amount).toUpperCase(),
        punch > 0.5 ? 24 : 16,
      )
      .setTint(punch > 0.5 ? 0xffd166 : 0xfff3c4)
      .setDropShadow(2, 2, 0x14101c, 1)
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: t,
      y: t.y - 44,
      alpha: { from: 1, to: 0 },
      duration: 700,
      ease: 'Quad.out',
      onComplete: () => t.destroy(),
    });
  }

  private onKill(kills: number): void {
    audio.coin();
    this.coinEmitter.emitParticleAt(this.enemyX, this.enemyY - 10, Math.min(3 * kills, 12));
    // Dungeon dragon reacts to every landed kill: jaw snaps open, a white
    // flash, and a little recoil
    if (this.dragonSprite && !this.dragonBusy) {
      const d = this.dragonSprite;
      this.dragonBusy = true;
      d.setFrame(1);
      d.setTintFill(0xffffff);
      this.tweens.add({ targets: d, x: d.x + 6, duration: 70, yoyo: true });
      this.time.delayedCall(90, () => d.clearTint());
      this.time.delayedCall(200, () => {
        if (d.active) d.setFrame(0);
        this.dragonBusy = false;
      });
    }
  }

  private onStageCleared(): void {
    audio.stageUp();
    // Boss death flash + a solid screen kick (skipped for reduced motion)
    this.enemy.setTintFill(0xffffff);
    this.time.delayedCall(90, () => this.enemy.clearTint());
    if (!this.reduceMotion) this.cameras.main.shake(220, 0.008);
    // Arriving somewhere new? Announce the place, not just the number.
    const stage = this.gs.battle.stage;
    const label = isLocationEntrance(stage)
      ? `${locationForStage(stage).name}\nStage ${stage}`
      : `Stage ${stage}!`;
    const banner = this.add
      .text(THEME.width / 2, L.arenaTop + 120, label, {
        fontFamily: THEME.fontFamily,
        fontSize: isLocationEntrance(stage) ? '26px' : '32px',
        fontStyle: 'bold',
        color: THEME.textGold,
        stroke: '#2a1c10',
        strokeThickness: 6,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScale(0.4)
      .setDepth(40);
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 260,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: banner.y - 30,
          delay: 700,
          duration: 350,
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  private onSlotUnlocked(): void {
    audio.stageUp();
    const banner = this.add
      .bitmapText(THEME.width / 2, L.arenaTop + 150, 'pix', 'SWORD SLOT UNLOCKED!', 16)
      .setTint(THEME.gold)
      .setDropShadow(2, 2, 0x14101c, 1)
      .setOrigin(0.5)
      .setScale(0.4)
      .setDepth(40);
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 280,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: banner.y - 26,
          delay: 1200,
          duration: 400,
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  private onBossFailed(): void {
    const txt = this.add
      .text(THEME.width / 2, L.arenaTop + 120, 'Boss too strong — regroup!', {
        fontFamily: THEME.fontFamily,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#ffb4b4',
        stroke: '#2a1c10',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: txt,
      alpha: 0,
      delay: 1100,
      duration: 400,
      onComplete: () => txt.destroy(),
    });
  }
}
