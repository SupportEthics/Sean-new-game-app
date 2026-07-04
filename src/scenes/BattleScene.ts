import Phaser from 'phaser';
import { ENEMY_SPECIES, STAGES } from '../config/stages';
import { isBossWave } from '../core/BattleSim';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { gridTiers } from '../core/MergeLogic';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const L = THEME.layout;

/**
 * Top-down fenced arena (Idle Sword Master style): the hero stands mid-field
 * with an orbiting blade while monsters walk in from the right.
 */
export class BattleScene extends Phaser.Scene {
  private gs!: GameState;
  private bg!: Phaser.GameObjects.Graphics;
  private decoLayer!: Phaser.GameObjects.Group;
  private hero!: Phaser.GameObjects.Sprite;
  private weapon!: Phaser.GameObjects.Image;
  private weaponGlow!: Phaser.GameObjects.Image;
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
  private bestTier = 1;

  private readonly heroX = 120;
  private readonly heroY = 258;
  private readonly enemyX = 272;
  private readonly enemyY = 258;

  constructor() {
    super('Battle');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;

    this.bg = this.add.graphics();
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
    this.gs.on('grid:changed', () => this.syncWeapon());

    this.syncWeapon();
    this.syncWave(true);
  }

  override update(_time: number, delta: number): void {
    this.gs.update(delta / 1000);
    this.syncWave(false);
    this.syncHpBar();

    // Signature orbiting blade
    this.orbitAngle += (delta / 1000) * this.orbitSpeed;
    const r = 44;
    const wx = this.heroX + Math.cos(this.orbitAngle) * r;
    const wy = this.heroY + Math.sin(this.orbitAngle) * r * 0.6; // elliptical = top-down feel
    this.weapon.setPosition(wx, wy);
    this.weapon.setAngle(Phaser.Math.RadToDeg(this.orbitAngle) + 135);
    this.weaponGlow.setPosition(wx, wy);
    this.weapon.setDepth(wy > this.heroY ? 20 : 8);
    this.weaponGlow.setDepth(wy > this.heroY ? 19 : 7);
    // Ease burst speed back down to cruise
    this.orbitSpeed = Math.max(2.4, this.orbitSpeed * 0.97);
  }

  // ---- Arena construction ----

  private biomeIndex(): number {
    return Math.floor((this.gs.battle.stage - 1) / 5) % THEME.biomes.length;
  }

  private redrawArena(): void {
    const biome = THEME.biomes[this.biomeIndex()];
    const g = this.bg;
    g.clear();

    // Dirt field
    g.fillStyle(biome.dirt);
    g.fillRect(0, L.arenaTop, THEME.width, L.arenaBottom - L.arenaTop);

    // Deterministic dirt speckles + patches
    for (let i = 0; i < 60; i++) {
      const x = (i * 73 + 41) % THEME.width;
      const y = L.arenaTop + 34 + ((i * 131 + 17) % (L.arenaBottom - L.arenaTop - 60));
      g.fillStyle(biome.dirtDark, 0.6);
      g.fillRect(x, y, 4 + (i % 3) * 2, 3);
    }
    for (let i = 0; i < 7; i++) {
      const x = (i * 149 + 60) % (THEME.width - 60);
      const y = L.arenaTop + 60 + ((i * 97) % (L.arenaBottom - L.arenaTop - 120));
      g.fillStyle(biome.dirtDark, 0.35);
      g.fillEllipse(x + 30, y, 54, 22);
    }

    // Grass verge along the top
    g.fillStyle(biome.grass);
    g.fillRect(0, L.arenaTop, THEME.width, 26);
    g.fillStyle(biome.grassDark);
    for (let x = 0; x < THEME.width; x += 12) {
      g.fillTriangle(x, L.arenaTop + 26, x + 6, L.arenaTop + 18, x + 12, L.arenaTop + 26);
    }

    // Wooden fence along the bottom
    const fy = L.arenaBottom - 20;
    g.fillStyle(THEME.fenceDark);
    g.fillRect(0, fy + 6, THEME.width, 4);
    g.fillStyle(THEME.fence);
    for (let x = 6; x < THEME.width; x += 22) {
      g.fillRect(x, fy, 8, 18);
      g.fillTriangle(x, fy, x + 8, fy, x + 4, fy - 5);
    }

    // Props: bushes on the verge + battlefield litter
    this.decoLayer.clear(true, true);
    const stage = this.gs.battle.stage;
    for (let i = 0; i < 4; i++) {
      const x = 24 + ((stage * 53 + i * 97) % (THEME.width - 48));
      this.decoLayer.add(this.add.image(x, L.arenaTop + 16, 'deco', 5).setDepth(2));
    }
    for (let i = 0; i < 6; i++) {
      const x = 28 + ((stage * 37 + i * 79) % (THEME.width - 56));
      const y = L.arenaTop + 60 + ((stage * 13 + i * 53) % (L.arenaBottom - L.arenaTop - 110));
      const frame = [1, 2, 3, 4][(stage + i) % 4]; // skull, rock, sword, bone
      this.decoLayer.add(
        this.add.image(x, y, 'deco', frame).setFlipX(i % 2 === 0).setDepth(3).setAlpha(0.9),
      );
    }
  }

  private createHero(): void {
    this.add.image(this.heroX, this.heroY + 34, 'shadow').setScale(1.5).setDepth(4);
    this.hero = this.add.sprite(this.heroX, this.heroY, 'hero').play('hero-idle').setDepth(10);

    this.weaponGlow = this.add
      .image(this.heroX + 44, this.heroY, 'spark')
      .setScale(3.2)
      .setAlpha(0.35)
      .setTint(THEME.gold)
      .setDepth(7);
    this.weapon = this.add
      .image(this.heroX + 44, this.heroY, 'gear', 0)
      .setOrigin(0.5, 0.5)
      .setDepth(8);
  }

  private createEnemy(): void {
    this.enemyShadow = this.add
      .image(this.enemyX, this.enemyY + 28, 'shadow')
      .setScale(1.5)
      .setDepth(4);
    this.enemy = this.add.sprite(this.enemyX, this.enemyY, 'enemy-wolf').setDepth(10);
    this.enemy.setFlipX(true); // face the hero

    for (let i = 0; i < 2; i++) {
      const s = this.add
        .sprite(this.enemyX + 60 + i * 26, this.enemyY - 34 + i * 62, 'enemy-wolf')
        .setDepth(9)
        .setAlpha(0.92)
        .setScale(0.9)
        .setFlipX(true);
      this.extraEnemies.push(s);
    }

    this.add
      .rectangle(this.enemyX, this.enemyY - 54, 84, 10, THEME.hpBarBg)
      .setStrokeStyle(2, 0x2a1c10)
      .setDepth(12);
    this.hpBar = this.add
      .rectangle(this.enemyX - 40, this.enemyY - 54, 80, 6, THEME.hpBar)
      .setOrigin(0, 0.5)
      .setDepth(13);
    this.enemyName = this.add
      .text(this.enemyX, this.enemyY - 70, '', {
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

  private syncWeapon(): void {
    const tiers = gridTiers(this.gs.grid);
    this.bestTier = tiers.length ? Math.max(...tiers) : 1;
    this.weapon.setFrame((this.bestTier - 1) % 12);
    // Glow gets stronger with tier band
    const band = Math.min((this.bestTier - 1) / 12, 1);
    this.weaponGlow.setAlpha(0.2 + band * 0.35);
  }

  private syncWave(force: boolean): void {
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
    this.enemyName.setText(boss ? `BOSS ${species.name}` : species.name);
    this.enemy.setScale(boss ? 1.8 : 1);
    this.enemyShadow.setScale(boss ? 2 : 1.5);

    // Walk in from the right
    this.enemy.setX(this.enemyX + 90).setAlpha(0.4);
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
    const b = this.gs.battle;
    const frac = b.currentEnemyMaxHp > 0 ? b.currentEnemyHp / b.currentEnemyMaxHp : 0;
    this.hpBar.width = 80 * Phaser.Math.Clamp(frac, 0, 1);
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
      x: { from: this.heroX, to: this.heroX + 22 },
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
        x: { from: this.enemyX, to: this.enemyX + 10 },
        duration: 70,
        yoyo: true,
      });
    }
  }

  private spawnDamageNumber(amount: number): void {
    const b = this.gs.battle;
    const punch = Phaser.Math.Clamp(amount / Math.max(b.currentEnemyMaxHp, 1), 0, 1);
    const t = this.add
      .text(
        this.enemyX + Phaser.Math.Between(-18, 18),
        this.enemyY - 88,
        formatNumber(amount),
        {
          fontFamily: THEME.fontFamily,
          fontSize: `${Math.round(17 + punch * 10)}px`,
          fontStyle: 'bold',
          color: '#fff3c4',
          stroke: '#8a2a1e',
          strokeThickness: 4,
        },
      )
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
