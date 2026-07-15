import Phaser from 'phaser';
import { ACHIEVEMENTS } from '../config/achievements';
import {
  QUESTS,
  QuestPeriod,
  STREAK_BONUS_CAP,
  STREAK_BONUS_PER_DAY,
} from '../config/quests';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { BATTLE_PASS } from '../config/monetization';
import {
  describeReward,
  freeRewardFor,
  PASS,
  passDaysLeft,
  premiumRewardFor,
} from '../config/pass';
import { IapService } from '../services/monetization/MonetizationService';
import { audio } from '../services/AudioService';
import { addBackdrop, addCloseButton, addDragScroll } from '../ui/panelInput';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 150;
const PANEL_W = THEME.width - 24;
const PANEL_H = 520;
const ROW_H = 62;
const ROW_PITCH = 70;
const AWARD_PITCH = 62;
const LIST_TOP = PANEL_Y + 82;
const LIST_H = PANEL_H - 82 - 30;
type Sheet = QuestPeriod | 'awards' | 'pass';
const TABS: { key: Sheet; label: string }[] = [
  { key: 'daily', label: 'DAILY' },
  { key: 'weekly', label: 'WEEKLY' },
  { key: 'monthly', label: 'MONTHLY' },
  { key: 'awards', label: 'AWARDS' },
  { key: 'pass', label: 'PASS' },
];

/** Quest sheets (daily/weekly/monthly) + lifetime achievements, all paying gems. */
export class QuestsPanel extends Phaser.Scene {
  private gs!: GameState;
  private iap!: IapService;
  private rows!: Phaser.GameObjects.Container;
  private tabs!: Phaser.GameObjects.Container;
  private footer!: Phaser.GameObjects.BitmapText;
  private sheet: Sheet = 'daily';
  private scrollY = 0;
  private maxScroll = 0;
  private passBusy = false;

  constructor() {
    super('Quests');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.iap = this.registry.get('iap') as IapService;
    this.gs.rollDaily();
    this.sheet = 'daily';
    this.scrollY = 0;

    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, THEME.cardBorder);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'QUESTS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);

    this.footer = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 24, 'pix', '', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0);

    this.tabs = this.add.container(0, 0);
    this.rows = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillRect(PANEL_X + 2, LIST_TOP, PANEL_W - 4, LIST_H);
    this.rows.setMask(maskShape.createGeometryMask());

    addDragScroll(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, LIST_TOP, PANEL_W, LIST_H),
      (delta) => this.setScroll(this.scrollY + delta),
    );

    this.buildTabs();
    this.buildRows();
    this.gs.on('quests:changed', () => {
      if (this.scene.isActive()) this.buildRows();
    });
    this.gs.on('pass:changed', () => {
      if (this.scene.isActive() && this.sheet === 'pass') this.buildRows();
    });

    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    if (import.meta.env.DEV) {
      (window as unknown as { __questsOpen?: boolean }).__questsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __questsOpen?: boolean }).__questsOpen = false;
      });
    }
  }

  private setScroll(v: number): void {
    this.scrollY = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.rows.setY(-this.scrollY);
  }

  private buildTabs(): void {
    this.tabs.removeAll(true);
    const w = (PANEL_W - 20 - 24) / 5;
    TABS.forEach((t, i) => {
      const cx = PANEL_X + 10 + w / 2 + i * (w + 6);
      const active = this.sheet === t.key;
      const bg = this.add
        .rectangle(cx, PANEL_Y + 62, w, 26, active ? THEME.headerBg : THEME.cardBg)
        .setStrokeStyle(2, active ? THEME.gold : THEME.cardBorder)
        .setInteractive({ useHandCursor: true });
      const lbl = this.add
        .bitmapText(cx, PANEL_Y + 62, 'pix', t.label, 8)
        .setOrigin(0.5)
        .setTint(active ? 0xffd166 : 0x8a5a2e);
      bg.on('pointerdown', () => {
        if (this.sheet === t.key) return;
        this.sheet = t.key;
        this.scrollY = 0;
        audio.buy();
        this.buildTabs();
        this.buildRows();
      });
      this.tabs.add([bg, lbl]);
    });
  }

  private buildRows(): void {
    this.rows.removeAll(true);

    if (this.sheet === 'awards') {
      this.buildAwardRows();
      // Progress events rebuild this list constantly while battle runs —
      // keep (and re-clamp) the player's scroll instead of snapping to top
      this.setScroll(this.scrollY);
      return;
    }
    if (this.sheet === 'pass') {
      this.buildPassRows();
      this.setScroll(this.scrollY);
      return;
    }
    this.maxScroll = 0;
    this.setScroll(0);
    const period = this.sheet;
    this.footer.setText(
      period === 'daily'
        ? `STREAK ${this.gs.daily.streak} - FULL CLEAR PAYS +${Math.min(
            (this.gs.daily.streak + 1) * STREAK_BONUS_PER_DAY,
            STREAK_BONUS_CAP,
          )} BONUS GEMS`
        : period === 'weekly'
          ? 'RESETS EVERY MONDAY'
          : 'RESETS ON THE 1ST OF THE MONTH',
    );

    QUESTS[period].forEach((quest, i) => {
      const y = LIST_TOP + 6 + i * ROW_PITCH + ROW_H / 2;
      const progress = this.gs.questProgress(quest.id, period);
      const claimed = this.gs.questClaimed(quest.id, period);
      const ready = this.gs.canClaimQuest(quest.id, period);
      this.questRow(
        y,
        quest.name,
        progress,
        quest.target,
        quest.gems,
        claimed,
        ready,
        () => this.gs.claimQuest(quest.id, Date.now(), period),
      );
    });
  }

  /** The Knight's Pass: a 30-level double-lane reward track. */
  private buildPassRows(): void {
    const now = Date.now();
    const level = this.gs.passLevelNow;
    const premium = this.gs.passPremiumOwned(now);
    const intoLevel = this.gs.passXp - level * PASS.xpPerLevel;

    this.footer.setText(
      `SEASON ${this.gs.passSeasonNum} - ENDS IN ${passDaysLeft(now)} DAY${passDaysLeft(now) === 1 ? '' : 'S'}`,
    );

    // Header card: level, XP bar, premium unlock
    const hy = LIST_TOP + 6 + 34;
    const head = this.add
      .rectangle(THEME.width / 2, hy, PANEL_W - 20, 62, THEME.headerBg)
      .setStrokeStyle(2, THEME.gold);
    const lvl = this.add
      .bitmapText(PANEL_X + 18, hy - 18, 'pix', `PASS LEVEL ${level}/${PASS.maxLevel}`, 8)
      .setTint(0xffd166);
    const barBg = this.add
      .rectangle(PANEL_X + 18, hy + 2, 170, 8, 0x14101c)
      .setOrigin(0, 0);
    const frac = level >= PASS.maxLevel ? 1 : intoLevel / PASS.xpPerLevel;
    const bar = this.add
      .rectangle(PANEL_X + 19, hy + 3, Math.max(2, 168 * frac), 6, 0x7ac74f)
      .setOrigin(0, 0);
    const xpLbl = this.add
      .bitmapText(
        PANEL_X + 18,
        hy + 16,
        'pix',
        level >= PASS.maxLevel ? 'TRACK COMPLETE!' : `${intoLevel}/${PASS.xpPerLevel} XP - PLAY TO EARN`,
        8,
      )
      .setTint(0x9a8d6e);
    this.rows.add([head, lvl, barBg, bar, xpLbl]);
    if (!premium) {
      const btn = this.add
        .image(PANEL_X + PANEL_W - 76, hy, 'btn-sm')
        .setDisplaySize(104, 34)
        .setTint(this.passBusy ? THEME.buttonBgDisabled : 0x2e7a1e)
        .setInteractive({ useHandCursor: true });
      const blbl = this.add
        .bitmapText(
          PANEL_X + PANEL_W - 76,
          hy,
          'pix',
          this.passBusy ? '...' : `PREMIUM\n${this.iap.getPriceLabel(BATTLE_PASS.sku)}`,
          8,
        )
        .setCenterAlign()
        .setOrigin(0.5);
      btn.on('pointerdown', () => {
        if (this.passBusy) return;
        this.passBusy = true;
        this.buildRows();
        void this.iap.purchase(BATTLE_PASS.sku).then((result) => {
          this.passBusy = false;
          if (result.success) {
            this.gs.fulfillProduct(BATTLE_PASS.sku);
            audio.stageUp();
          }
          if (this.scene.isActive()) this.buildRows();
        });
      });
      this.rows.add([btn, blbl]);
    } else {
      const owned = this.add
        .bitmapText(PANEL_X + PANEL_W - 76, hy, 'pix', 'PREMIUM\nACTIVE', 8)
        .setCenterAlign()
        .setOrigin(0.5)
        .setTint(0x7ac74f);
      this.rows.add(owned);
    }

    // 30 levels, two lanes each
    const top = LIST_TOP + 6 + 76;
    for (let lv = 1; lv <= PASS.maxLevel; lv++) {
      const y = top + (lv - 1) * ROW_PITCH + ROW_H / 2;
      const reached = level >= lv;
      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, reached ? THEME.cardBg : 0xb8ab8e)
        .setStrokeStyle(2, reached ? THEME.gold : THEME.cardBorder);
      if (!reached) bg.setFillStyle(0xb8ab8e, 0.55);
      const lvLbl = this.add
        .bitmapText(PANEL_X + 16, y, 'pix', `${lv}`, 16)
        .setOrigin(0, 0.5)
        .setTint(reached ? 0xc9961e : 0x8a7d60);
      this.rows.add([bg, lvLbl]);
      this.passLane(y - 13, lv, 'free', freeRewardFor(lv), reached);
      this.passLane(y + 14, lv, 'premium', premiumRewardFor(lv), reached && premium);
    }
    this.maxScroll = Math.max(0, 76 + PASS.maxLevel * ROW_PITCH + 12 - LIST_H);
  }

  private passLane(
    y: number,
    lv: number,
    lane: 'free' | 'premium',
    reward: { gems?: number; goldHours?: number; goldEgg?: boolean },
    unlocked: boolean,
  ): void {
    const claimed = this.gs.passClaimed(lv, lane);
    const tint = lane === 'premium' ? 0xc9961e : 0x4a3520;
    const label = this.add
      .bitmapText(
        PANEL_X + 52,
        y,
        'pix',
        `${lane === 'premium' ? 'PRO ' : 'FREE'} ${describeReward(reward)}`,
        8,
      )
      .setOrigin(0, 0.5)
      .setTint(claimed ? 0x8a9a70 : unlocked ? tint : 0x8a7d60);
    this.rows.add(label);
    if (claimed) {
      this.rows.add(
        this.add
          .bitmapText(PANEL_X + PANEL_W - 60, y, 'pix', 'CLAIMED', 8)
          .setOrigin(0.5)
          .setTint(0x2e7a1e),
      );
    } else if (unlocked && this.gs.canClaimPass(lv, lane)) {
      const btn = this.add
        .image(PANEL_X + PANEL_W - 60, y, 'btn-sm')
        .setDisplaySize(64, 20)
        .setTint(0x2e7a1e)
        .setInteractive({ useHandCursor: true });
      const blbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 60, y, 'pix', 'CLAIM', 8)
        .setOrigin(0.5);
      btn.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.downY - ptr.upY) > 10) return;
        if (ptr.upY < LIST_TOP || ptr.upY > LIST_TOP + LIST_H) return;
        if (this.gs.claimPass(lv, lane)) audio.coin();
      });
      this.rows.add([btn, blbl]);
    } else if (lane === 'premium' && !this.gs.passPremiumOwned()) {
      this.rows.add(
        this.add
          .bitmapText(PANEL_X + PANEL_W - 60, y, 'pix', 'LOCKED', 8)
          .setOrigin(0.5)
          .setTint(0x8a7d60),
      );
    }
  }

  private buildAwardRows(): void {
    this.footer.setText('LIFETIME GOALS - DRAG TO SCROLL');
    this.maxScroll = Math.max(0, ACHIEVEMENTS.length * AWARD_PITCH + 12 - LIST_H);

    ACHIEVEMENTS.forEach((def, i) => {
      const y = LIST_TOP + 6 + i * AWARD_PITCH + 27;
      const progress = this.gs.achievementProgress(def);
      const claimed = this.gs.achievementsClaimed.includes(def.id);
      const ready = this.gs.canClaimAchievement(def.id);
      this.questRow(y, def.name, progress, def.target, def.gems, claimed, ready, () =>
        this.gs.claimAchievement(def.id),
      );
    });
  }

  /** Shared row layout for quests and achievements. */
  private questRow(
    y: number,
    name: string,
    progress: number,
    target: number,
    gems: number,
    claimed: boolean,
    ready: boolean,
    claim: () => boolean,
  ): void {
    const h = this.sheet === 'awards' ? 54 : ROW_H;
    const row = this.add.container(0, 0);
    const bg = this.add
      .rectangle(THEME.width / 2, y, PANEL_W - 20, h, claimed ? 0xd8e4c4 : THEME.cardBg)
      .setStrokeStyle(2, ready ? THEME.gold : claimed ? 0x6fae4e : THEME.cardBorder);
    const title = this.add
      .bitmapText(PANEL_X + 16, y - h / 2 + 8, 'pix', name, 8)
      .setTint(0x4a3520);
    const barW = 150;
    const barBg = this.add
      .rectangle(PANEL_X + 16, y + 10, barW, 10, 0x2a1c10, 0.35)
      .setOrigin(0, 0.5);
    const bar = this.add
      .rectangle(PANEL_X + 18, y + 10, (barW - 4) * Math.min(progress / target, 1), 6, THEME.expBar)
      .setOrigin(0, 0.5);
    const count = this.add
      .bitmapText(
        PANEL_X + 16 + barW + 8,
        y + 10,
        'pix',
        `${formatNumber(Math.min(progress, target)).toUpperCase()}/${formatNumber(target).toUpperCase()}`,
        8,
      )
      .setOrigin(0, 0.5)
      .setTint(0x8a5a2e);
    const btn = this.add
      .image(PANEL_X + PANEL_W - 58, y, 'btn-sm')
      .setTint(ready ? THEME.buttonBg : THEME.buttonBgDisabled);
    const btnLbl = this.add
      .bitmapText(PANEL_X + PANEL_W - 58, y, 'pix', claimed ? 'DONE' : `+${gems} GEMS`, 8)
      .setOrigin(0.5);
    if (ready) {
      // pointerup + gates so scroll-drags and masked rows can't claim
      btn.setInteractive({ useHandCursor: true }).on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.downY - ptr.upY) > 10) return;
        const shown = y - this.scrollY;
        if (shown < LIST_TOP || shown > LIST_TOP + LIST_H) return;
        if (claim()) audio.coin();
      });
    }
    row.add([bg, title, barBg, bar, count, btn, btnLbl]);
    this.rows.add(row);
  }
}
