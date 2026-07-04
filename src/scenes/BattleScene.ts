import Phaser from 'phaser';
import { RAIDS } from '../config/raids';
import { skinById } from '../config/skins';
import { ENEMY_SPECIES, STAGES } from '../config/stages';
import { isBossWave } from '../core/BattleSim';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
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
  private blades: { img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }[] = [];
  private auraTint: number = THEME.gold;
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
  /** Reserved staging spots for M3 pets/companions — keep clear of props. */
  static readonly PET_SLOTS = [
    { x: 62, y: 296 },
    { x: 108, y: 318 },
    { x: 56, y: 224 },
  ];

  constructor() {
    super('Battle');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;

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
    this.gs.on('raid:started', (level) => this.onRaidStarted(level));
    this.gs.on('raid:ended', (r) => this.onRaidEnded(r));

    this.syncWeapon();
    this.syncWave(true);
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
    return Math.floor((this.gs.battle.stage - 1) / 5) % THEME.biomes.length;
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
  }

  /** Per-biome pass: tint the tiles and scatter this stage's props. */
  private redrawArena(): void {
    const biome = THEME.biomes[this.biomeIndex()];
    this.floorTs.setTint(biome.dirt);
    this.wallTs.setTint(biome.dirtDark);

    this.decoLayer.clear(true, true);
    const stage = this.gs.battle.stage;
    // Cracked floor slabs
    for (let i = 0; i < 3; i++) {
      const x = 32 + ((stage * 61 + i * 127) % (THEME.width - 64));
      const y = L.arenaTop + 84 + ((stage * 23 + i * 71) % (L.arenaBottom - L.arenaTop - 160));
      this.decoLayer.add(
        this.add.image(x, y, 'tiles', 1).setTint(biome.dirt).setDepth(1).setAlpha(0.9),
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
    // Legendary auras color the orbiting blades' glow
    const aura = skinById(id)?.art.aura;
    this.auraTint = aura
      ? Phaser.Display.Color.HexStringToColor(aura.slice(0, 7)).color
      : THEME.gold;
    this.blades.forEach((b) => b.glow.setTint(this.auraTint));
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
    const want = Math.max(1, equipped.length);

    while (this.blades.length < want) {
      const glow = this.add
        .image(this.heroX, this.heroY, 'spark')
        .setScale(2.4)
        .setAlpha(0.3)
        .setTint(this.auraTint)
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

    this.blades.forEach((blade, i) => {
      const tier = equipped[i] ?? 1;
      blade.img.setFrame((tier - 1) % 12);
      const band = Math.min((tier - 1) / 12, 1);
      blade.glow.setAlpha(0.18 + band * 0.35);
    });
  }

  private syncWave(force: boolean): void {
    if (this.gs.raid) {
      // Raid mode: the boss bar doubles as the raid timer
      this.bossBar.width =
        196 * Phaser.Math.Clamp(this.gs.raid.timeLeft / RAIDS.durationSeconds, 0, 1);
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

    const species = ENEMY_SPECIES[(b.stage + b.wave) % ENEMY_SPECIES.length];
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
    const frac = raid
      ? raid.monsterHp / raid.monsterMaxHp
      : this.gs.battle.currentEnemyMaxHp > 0
        ? this.gs.battle.currentEnemyHp / this.gs.battle.currentEnemyMaxHp
        : 0;
    this.hpBar.width = 42 * Phaser.Math.Clamp(frac, 0, 1);
  }

  private onRaidStarted(level: number): void {
    const species = ENEMY_SPECIES[(level * 3) % ENEMY_SPECIES.length];
    const tex = `enemy-${species.key}`;
    this.enemy.setTexture(tex);
    this.enemy.play(`${tex}-idle`);
    this.enemy.setScale(1.4).setTint(0xffb0b0);
    this.enemyShadow.setScale(1.5);
    this.extraEnemies.forEach((e) => e.setVisible(false));
    this.enemyName.setText(`RAID LV ${level}`).setVisible(true);
    this.bossBarBg.setVisible(true);
    this.bossBar.setVisible(true).setFillStyle(0x9b7ede);
    this.lastWaveKey = ''; // force resync after the raid
  }

  private onRaidEnded(r: { kills: number; gold: number; gems: number; cleared: boolean }): void {
    this.enemy.clearTint();
    this.bossBar.setFillStyle(THEME.bossTimer);
    this.enemyName.setVisible(false);
    this.syncWave(true);

    audio.stageUp();
    const msg = r.cleared
      ? `RAID CLEARED! +${formatNumber(r.gold).toUpperCase()} GOLD +${r.gems} GEMS`
      : `RAID OVER - ${r.kills}/${RAIDS.clearKills} KILLS +${r.gems} GEMS`;
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
  }

  private onStageCleared(): void {
    audio.stageUp();
    this.cameras.main.shake(180, 0.006);
    const banner = this.add
      .text(THEME.width / 2, L.arenaTop + 120, `Stage ${this.gs.battle.stage}!`, {
        fontFamily: THEME.fontFamily,
        fontSize: '32px',
        fontStyle: 'bold',
        color: THEME.textGold,
        stroke: '#2a1c10',
        strokeThickness: 6,
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
