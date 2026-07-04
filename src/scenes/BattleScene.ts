import Phaser from 'phaser';
import { ENEMY_SPECIES, STAGES } from '../config/stages';
import { isBossWave } from '../core/BattleSim';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { THEME } from '../ui/theme';

/** Top half of the screen: the hero auto-battles enemy waves. */
export class BattleScene extends Phaser.Scene {
  private gs!: GameState;
  private hero!: Phaser.GameObjects.Image;
  private sword!: Phaser.GameObjects.Image;
  private enemy!: Phaser.GameObjects.Image;
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

  private readonly heroX = 100;
  private readonly groundY = 330;
  private readonly enemyX = 290;

  constructor() {
    super('Battle');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;

    this.drawBackground();
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

    this.syncWave(true);
  }

  override update(_time: number, delta: number): void {
    // Drive the simulation from the render loop (fixed sub-steps inside).
    this.gs.update(delta / 1000);
    this.syncWave(false);
    this.syncHpBar();
  }

  // ---- Visual construction ----

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(THEME.skyTop, THEME.skyTop, THEME.skyBottom, THEME.skyBottom, 1);
    g.fillRect(0, 0, THEME.width, THEME.battleHeight);

    // Rolling hills
    g.fillStyle(THEME.groundDark);
    g.fillEllipse(80, THEME.battleHeight - 40, 340, 160);
    g.fillEllipse(330, THEME.battleHeight - 30, 300, 130);
    g.fillStyle(THEME.ground);
    g.fillRect(0, this.groundY + 28, THEME.width, THEME.battleHeight - this.groundY - 28);
    g.fillEllipse(60, this.groundY + 34, 260, 60);
    g.fillEllipse(300, this.groundY + 40, 280, 70);

    // Fluffy clouds
    g.fillStyle(0xffffff, 0.85);
    for (const [cx, cy, s] of [
      [70, 60, 1],
      [280, 100, 0.8],
      [180, 40, 0.6],
    ] as const) {
      g.fillEllipse(cx, cy, 70 * s, 26 * s);
      g.fillEllipse(cx + 24 * s, cy - 10 * s, 50 * s, 22 * s);
    }
  }

  private createHero(): void {
    this.add.image(this.heroX, this.groundY + 22, 'shadow');
    this.hero = this.add.image(this.heroX, this.groundY, 'hero').setScale(1.6);
    this.sword = this.add
      .image(this.heroX + 30, this.groundY - 6, 'sword')
      .setScale(0.9)
      .setOrigin(0.5, 0.9)
      .setAngle(35)
      .setTint(THEME.gold);

    // Idle bounce
    this.tweens.add({
      targets: this.hero,
      scaleY: { from: 1.6, to: 1.52 },
      scaleX: { from: 1.6, to: 1.66 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private createEnemy(): void {
    this.enemyShadow = this.add.image(this.enemyX, this.groundY + 24, 'shadow');
    this.enemy = this.add.image(this.enemyX, this.groundY, 'enemy-slime').setScale(1.5);

    this.add
      .rectangle(this.enemyX, this.groundY - 52, 84, 10, THEME.hpBarBg)
      .setStrokeStyle(2, 0x221a3a);
    this.hpBar = this.add
      .rectangle(this.enemyX - 40, this.groundY - 52, 80, 6, THEME.hpBar)
      .setOrigin(0, 0.5);
    this.enemyName = this.add
      .text(this.enemyX, this.groundY - 68, '', {
        fontFamily: THEME.fontFamily,
        fontSize: '13px',
        color: THEME.textLight,
        stroke: '#2e2348',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Enemy idle wobble
    this.tweens.add({
      targets: this.enemy,
      scaleX: { from: 1.5, to: 1.58 },
      scaleY: { from: 1.5, to: 1.44 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
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

    const species = ENEMY_SPECIES[(b.stage + b.wave) % ENEMY_SPECIES.length];
    this.enemy.setTexture(`enemy-${species.key}`);
    this.enemyName.setText(boss ? `BOSS ${species.name}` : species.name);
    const scale = boss ? 2.6 : 1.5;
    this.enemy.setScale(scale);
    this.enemyShadow.setScale(boss ? 1.7 : 1);

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
    this.tweens.add({
      targets: this.hero,
      x: { from: this.heroX, to: this.heroX + 26 },
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    });
    this.tweens.add({
      targets: this.sword,
      angle: { from: 35, to: 110 },
      x: { from: this.heroX + 30, to: this.heroX + 52 },
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    });

    if (this.pendingDamage > 0) {
      this.spawnDamageNumber(this.pendingDamage);
      this.pendingDamage = 0;
      // Enemy flinch
      this.tweens.add({
        targets: this.enemy,
        x: { from: this.enemyX, to: this.enemyX + 10 },
        duration: 70,
        yoyo: true,
      });
    }
  }

  private spawnDamageNumber(amount: number): void {
    const t = this.add
      .text(
        this.enemyX + Phaser.Math.Between(-18, 18),
        this.groundY - 70,
        formatNumber(amount),
        {
          fontFamily: THEME.fontFamily,
          fontSize: '20px',
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
    this.coinEmitter.emitParticleAt(this.enemyX, this.groundY - 10, Math.min(3 * kills, 12));
  }

  private onStageCleared(): void {
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
