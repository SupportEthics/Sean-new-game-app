import Phaser from 'phaser';
import { addBackdrop, addCloseButton } from '../ui/panelInput';
import { SKILLS } from '../config/skills';
import { GameState } from '../core/GameState';
import { AdService } from '../services/monetization/AdService';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;
const ROW_H = 74;
const ROW_PITCH = 84;

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, '0')}`;
}

/** Active hero skills: cast timed buffs, watch their cooldowns tick. */
export class SkillsPanel extends Phaser.Scene {
  private gs!: GameState;
  private ads!: AdService;
  private rows!: Phaser.GameObjects.Container;
  private adBusy = false;

  constructor() {
    super('Skills');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.ads = this.registry.get('ads') as AdService;

    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, 0xb03a2e);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'SKILLS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 52, 'pix', 'CAST IN BATTLE - TIMERS RUN ON FIGHT TIME', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);

    this.rows = this.add.container(0, 0);
    this.buildRows();
    this.gs.on('skills:changed', () => {
      if (this.scene.isActive()) this.buildRows();
    });
    // Cooldowns tick every sim second — keep the labels honest
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.buildRows() });

    if (import.meta.env.DEV) {
      (window as unknown as { __skillsOpen?: boolean }).__skillsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __skillsOpen?: boolean }).__skillsOpen = false;
      });
    }
  }

  private buildRows(): void {
    this.rows.removeAll(true);

    SKILLS.forEach((def, i) => {
      const y = PANEL_Y + 76 + i * ROW_PITCH + ROW_H / 2;
      const unlocked = this.gs.skillUnlocked(def.id);
      const activeLeft = this.gs.skillActiveLeft(def.id);
      const cooldownLeft = this.gs.skillCooldownLeft(def.id);
      const ready = this.gs.canCastSkill(def.id);

      const row = this.add.container(0, 0);
      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, THEME.cardBg)
        .setStrokeStyle(2, activeLeft > 0 ? 0xffd166 : ready ? 0xb03a2e : THEME.cardBorder);
      const name = this.add
        .bitmapText(PANEL_X + 16, y - 24, 'pix', def.name, 8)
        .setTint(unlocked ? 0xb03a2e : 0x9a8d6e);
      const desc = this.add
        .bitmapText(PANEL_X + 16, y - 6, 'pix', def.desc, 8)
        .setTint(0x4a3520);
      const status = this.add
        .bitmapText(
          PANEL_X + 16,
          y + 12,
          'pix',
          !unlocked
            ? `UNLOCKS AT STAGE ${def.unlockStage}`
            : activeLeft > 0
              ? `ACTIVE ${Math.ceil(activeLeft)}S`
              : cooldownLeft > 0
                ? `READY IN ${clock(cooldownLeft)}`
                : 'READY',
          8,
        )
        .setTint(activeLeft > 0 ? 0xc9961e : 0x8a5a2e);

      // Free cast when off cooldown; an ad casts early while cooling
      const adCast = !ready && cooldownLeft > 0 && this.gs.canAdCastSkill(def.id);
      const btn = this.add
        .image(PANEL_X + PANEL_W - 52, y, 'btn-sm')
        .setTint(ready ? 0xb03a2e : adCast ? 0x2884a8 : THEME.buttonBgDisabled);
      const lbl = this.add
        .bitmapText(
          PANEL_X + PANEL_W - 52,
          y,
          'pix',
          ready ? 'CAST' : adCast ? 'AD CAST' : 'CAST',
          8,
        )
        .setOrigin(0.5);
      if (ready) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.gs.castSkill(def.id)) audio.stageUp();
        });
      } else if (adCast) {
        btn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.adBusy) return;
          this.adBusy = true;
          void this.ads.showRewarded('skill_cast').then((result) => {
            this.adBusy = false;
            if (!result.rewarded) return;
            this.gs.trackQuest('ads');
            if (this.gs.castSkill(def.id, true)) audio.stageUp();
          });
        });
      }
      row.add([bg, name, desc, status, btn, lbl]);
      this.rows.add(row);
    });
  }
}
