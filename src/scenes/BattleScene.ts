import Phaser from 'phaser';
import { ENEMY_SPECIES, STAGES } from '../config/stages';
import { isBossWave } from '../core/BattleSim';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { gridTiers } from '../core/MergeLogic';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

/** Top half of the screen: the hero auto-battles enemy waves. */
export class BattleScene extends Phaser.Scene {
  private gs!: GameState;
  private bg!: Phaser.GameObjects.Graphics;
  private decoLayer!: Phaser.GameObjects.Group;
  private hero!: Phaser.GameObjects.Sprite;
  private weapon!: Phaser.GameObjects.Image;
  private enemy!: Phaser.GameObjects.Sprite;
  private enemyShadow!: Phaser.GameObjects.Image;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private stageText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private enemyName!: Phaser.GameObjects.Text;
  private coinEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pendingDamage = 0;
  private lastWaveKey = '';
  private lastBiome = -1;
  private wasBoss = false;

  private readonly heroX = 100;
  private readonly groundY = 320;
  private readonly enemyX = 290;

  constructor() {
    super('Battle');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;

    this.bg = this.add.graphics();
    this.decoLayer = this.add.group();
    this.redrawBackground();

    this.createHero();
    this.createEnemy();
    this.createHud();

    this.coinEmitter = this.add.particles(0, 0, 'coin', {
      speed: { min: 60, max: 160 },
      angle: { min: 220, max: 320 },
      gravityY: 300,
      lifespan: 600,
      scale: { start: 1, end: 0.4 },
      emitting: false,
    });

    // Attack swing loop — purely visual; the sim runs on continuous DPS.
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
    // Drive the simulation from the render loop (fixed sub-steps inside).
    this.gs.update(delta / 1000);
    this.syncWave(false);
    this.syncHpBar();
  }

  // ---- Visual construction ----

  private biomeIndex(): number {
    return Math.floor((this.gs.battle.stage - 1) / 5) % THEME.biomes.length;
  }

  private redrawBackground(): void {
    const biome = THEME.biomes[this.biomeIndex()];
    const g = this.bg;
    g.clear();
    g.fillGradientStyle(biome.skyTop, biome.skyTop, biome.skyBottom, biome.skyBottom, 1);
    g.fillRect(0, 0, THEME.width, THEME.battleHeight);

    // Rolling hills
    g.fillStyle(biome.groundDark);
    g.fillEllipse(80, THEME.battleHeight - 40, 340, 160);
    g.fillEllipse(330, THEME.battleHeight - 30, 300, 130);
    g.fillStyle(biome.ground);
    g.fillRect(0, this.groundY + 28, THEME.width, THEME.battleHeight - this.groundY - 28);
    g.fillEllipse(60, this.groundY + 34, 260, 60);
    g.fillEllipse(300, this.groundY + 40, 280, 70);

    // Low drifting mist instead of fluffy clouds
    g.fillStyle(0xffffff, 0.08);
    for (const [cx, cy, s] of [
      [70, 70, 1.4],
      [280, 110, 1.1],
      [180, 45, 0.9],
    ] as const) {
      g.fillEllipse(cx, cy, 110 * s, 20 * s);
      g.fillEllipse(cx + 40 * s, cy + 8 * s, 80 * s, 16 * s);
    }
    // A pale moon
    g.fillStyle(0xf2ecd8, 0.55);
    g.fillCircle(330, 56, 18);
    g.fillStyle(biome.skyTop, 0.75);
    g.fillCircle(323, 50, 15);

    // Ground decorations, deterministic per stage so screenshots are stable
    this.decoLayer.clear(true, true);
    const stage = this.gs.battle.stage;
    for (let i = 0; i < 5; i++) {
      const x = 30 + ((stage * 37 + i * 79) % 330);
      const y = this.groundY + 44 + ((stage * 13 + i * 31) % 40);
      const frame = (stage + i) % 3;
      const img = this.add.image(x, y, 'deco', frame).setFlipX(i % 2 === 0);
      this.decoLayer.add(img);
    }
  }

  private createHero(): void {
    this.add.image(this.heroX, this.groundY + 34, 'shadow').setScale(1.4);
    this.hero = this.add.sprite(this.heroX, this.groundY, 'hero').play('hero-idle');
    this.weapon = this.add
      .image(this.heroX + 32, this.groundY - 4, 'gear', 0)
      .setOrigin(0.5, 0.85)
      .setAngle(40);
  }

  private createEnemy(): void {
    this.enemyShadow = this.add.image(this.enemyX, this.groundY + 30, 'shadow').setScale(1.5);
    this.enemy = this.add.sprite(this.enemyX, this.groundY, 'enemy-wolf');

    this.add
      .rectangle(this.enemyX, this.groundY - 56, 84, 10, THEME.hpBarBg)
      .setStrokeStyle(2, 0x221a3a);
    this.hpBar = this.add
      .rectangle(this.enemyX - 40, this.groundY - 56, 80, 6, THEME.hpBar)
      .setOrigin(0, 0.5);
    this.enemyName = this.add
      .text(this.enemyX, this.groundY - 72, '', {
        fontFamily: THEME.fontFamily,
        fontSize: '13px',
        color: THEME.textLight,
        stroke: '#2e2348',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
  }

  private createHud(): void {
    this.stageText = this.add
      .text(THEME.width / 2, 78, '', {
        fontFamily: THEME.fontFamily,
        fontSize: '22px',
        fontStyle: 'bold',
        color: THEME.textLight,
        stroke: '#2e2348',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.waveText = this.add
      .text(THEME.width / 2, 102, '', {
        fontFamily: THEME.fontFamily,
        fontSize: '15px',
        color: THEME.textLight,
        stroke: '#2e2348',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.bossBarBg = this.add
      .rectangle(THEME.width / 2, 122, 180, 12, THEME.hpBarBg)
      .setStrokeStyle(2, 0x221a3a)
      .setVisible(false);
    this.bossBar = this.add
      .rectangle(THEME.width / 2 - 88, 122, 176, 8, THEME.bossTimer)
      .setOrigin(0, 0.5)
      .setVisible(false);
  }

  // ---- Sync with the sim ----

  /** The hero holds the best weapon currently on the merge grid. */
  private syncWeapon(): void {
    const tiers = gridTiers(this.gs.grid);
    const best = tiers.length ? Math.max(...tiers) : 1;
    this.weapon.setFrame((best - 1) % 12);
  }

  private syncWave(force: boolean): void {
    const b = this.gs.battle;
    const key = `${b.stage}-${b.wave}-${b.enemiesLeftInWave}`;
    const boss = isBossWave(b);

    this.bossBarBg.setVisible(boss);
    this.bossBar.setVisible(boss);
    if (boss) {
      this.bossBar.width = 176 * Phaser.Math.Clamp(b.bossTimeLeft / STAGES.bossTimeLimit, 0, 1);
    }

    if (key === this.lastWaveKey && !force) return;
    this.lastWaveKey = key;

    if (boss && !this.wasBoss) audio.bossWarn();
    this.wasBoss = boss;

    const biome = this.biomeIndex();
    if (biome !== this.lastBiome) {
      this.lastBiome = biome;
      this.redrawBackground();
    }

    const species = ENEMY_SPECIES[(b.stage + b.wave) % ENEMY_SPECIES.length];
    this.enemy.setTexture(`enemy-${species.key}`);
    this.enemy.play(`enemy-${species.key}-idle`);
    this.enemyName.setText(boss ? `BOSS ${species.name}` : species.name);
    this.enemy.setScale(boss ? 1.8 : 1);
    this.enemyShadow.setScale(boss ? 2 : 1.5);

    // Spawn pop
    this.enemy.setAlpha(0);
    this.tweens.add({ targets: this.enemy, alpha: 1, duration: 150 });

    this.stageText.setText(`Stage ${b.stage}`);
    this.waveText.setText(
      boss ? 'BOSS FIGHT!' : `Wave ${b.wave}/${STAGES.wavesPerStage}`,
    );
  }

  private syncHpBar(): void {
    const b = this.gs.battle;
    const frac = b.currentEnemyMaxHp > 0 ? b.currentEnemyHp / b.currentEnemyMaxHp : 0;
    this.hpBar.width = 80 * Phaser.Math.Clamp(frac, 0, 1);
  }

  // ---- Reactions ----

  private playAttack(): void {
    // Lunge + attack frame (anim pauses, shows the squint frame, resumes)
    this.hero.anims.pause();
    this.hero.setFrame(2);
    this.time.delayedCall(160, () => {
      this.hero.setFrame(0);
      this.hero.anims.resume();
    });

    this.tweens.add({
      targets: this.hero,
      x: { from: this.heroX, to: this.heroX + 26 },
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    });
    this.tweens.add({
      targets: this.weapon,
      angle: { from: 40, to: 115 },
      x: { from: this.heroX + 32, to: this.heroX + 54 },
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    });

    if (this.pendingDamage > 0) {
      audio.hit();
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
        this.groundY - 96,
        formatNumber(amount),
        {
          fontFamily: THEME.fontFamily,
          fontSize: `${Math.round(18 + punch * 10)}px`,
          fontStyle: 'bold',
          color: '#fff3c4',
          stroke: '#b33951',
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5);
    this.tweens.add({
      targets: t,
      y: t.y - 46,
      alpha: { from: 1, to: 0 },
      duration: 700,
      ease: 'Quad.out',
      onComplete: () => t.destroy(),
    });
  }

  private onKill(kills: number): void {
    audio.coin();
    this.coinEmitter.emitParticleAt(this.enemyX, this.groundY - 10, Math.min(3 * kills, 12));
  }

  private onStageCleared(): void {
    audio.stageUp();
    this.cameras.main.shake(180, 0.006);
    const banner = this.add
      .text(THEME.width / 2, 190, `Stage ${this.gs.battle.stage}!`, {
        fontFamily: THEME.fontFamily,
        fontSize: '34px',
        fontStyle: 'bold',
        color: THEME.textGold,
        stroke: '#2e2348',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScale(0.4);
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 260,
      ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: 160,
          delay: 700,
          duration: 350,
          onComplete: () => banner.destroy(),
        });
      },
    });
  }

  private onBossFailed(): void {
    const txt = this.add
      .text(THEME.width / 2, 190, 'Boss too strong — regroup!', {
        fontFamily: THEME.fontFamily,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffb4b4',
        stroke: '#2e2348',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: txt,
      alpha: 0,
      delay: 1100,
      duration: 400,
      onComplete: () => txt.destroy(),
    });
  }
}
