import Phaser from 'phaser';
import { RAIDS, raidClearKills, raidGems, raidGoldPerKill } from '../config/raids';
import { addBackdrop, addCloseButton, addDragScroll } from '../ui/panelInput';
import { formatNumber } from '../core/EconomyMath';
import { GameState } from '../core/GameState';
import { AdService } from '../services/monetization/AdService';
import { audio } from '../services/AudioService';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 116;
const PANEL_W = THEME.width - 24;
const PANEL_H = 620;
const ROW_H = 56;
const ROW_PITCH = 62;

/** Raid level list: fight the next level, review cleared ones. */
export class RaidPanel extends Phaser.Scene {
  private gs!: GameState;
  private ads!: AdService;
  private adBtn!: Phaser.GameObjects.Image;
  private adLabel!: Phaser.GameObjects.BitmapText;
  private adPlaying = false;
  private rows!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private cooldownText!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Raids');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.ads = this.registry.get('ads') as AdService;
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
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'RAIDS', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    // Footer sits above the masked list so clipped rows never show through
    const footer = this.add.graphics().setDepth(4);
    footer.fillStyle(THEME.panelBg);
    footer.fillRoundedRect(PANEL_X + 2, PANEL_Y + PANEL_H - 112, PANEL_W - 4, 110, {
      tl: 0,
      tr: 0,
      bl: 12,
      br: 12,
    });
    footer.lineStyle(2, THEME.cardBorder);
    footer.lineBetween(PANEL_X + 10, PANEL_Y + PANEL_H - 112, PANEL_X + PANEL_W - 10, PANEL_Y + PANEL_H - 112);

    this.cooldownText = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 92, 'pix', '', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5, 0)
      .setDepth(5);
    this.adBtn = this.add
      .image(THEME.width / 2, PANEL_Y + PANEL_H - 56, 'btn-wide')
      .setTint(0x2884a8)
      .setVisible(false)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    this.adLabel = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 56, 'pix', 'WATCH AD - RAID NOW!', 8)
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(6);
    this.adBtn.on('pointerdown', () => this.watchAd());

    this.rows = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillRect(PANEL_X + 2, PANEL_Y + 44, PANEL_W - 4, PANEL_H - 104);
    this.rows.setMask(maskShape.createGeometryMask());

    this.buildRows();

    // After the rows so masked-but-interactive rows never cover the X
    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());
    this.maxScroll = Math.max(0, RAIDS.maxLevel * ROW_PITCH + 16 - (PANEL_H - 104));

    addDragScroll(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y + 44, PANEL_W, PANEL_H - 156),
      (delta) => this.setScroll(this.scrollY + delta),
    );
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) =>
        this.setScroll(this.scrollY + dy * 0.6),
    );

    // Cooldown countdown + row refresh when it elapses
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.refreshCooldown(),
    });
    this.refreshCooldown();

    if (import.meta.env.DEV) {
      (window as unknown as { __raidsOpen?: boolean }).__raidsOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __raidsOpen?: boolean }).__raidsOpen = false;
      });
    }
  }

  private setScroll(v: number): void {
    this.scrollY = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.rows.setY(-this.scrollY);
  }

  private refreshCooldown(): void {
    const left = this.gs.raidCooldownLeft(Date.now());
    if (left > 0) {
      const m = Math.floor(left / 60000);
      const sec = Math.floor((left % 60000) / 1000);
      this.cooldownText.setText(`NEXT RAID READY IN ${m}:${String(sec).padStart(2, '0')}`);
      const canAd = !this.adPlaying && this.ads.isReady('raid_reset');
      this.adBtn.setVisible(true).setTint(canAd ? 0x2884a8 : THEME.buttonBgDisabled);
      this.adLabel.setVisible(true).setText(this.adPlaying ? 'AD PLAYING...' : 'WATCH AD - RAID NOW!');
    } else {
      if (this.cooldownText.text !== '') this.buildRows();
      this.cooldownText.setText('');
      this.adBtn.setVisible(false);
      this.adLabel.setVisible(false);
    }
  }

  private watchAd(): void {
    if (this.adPlaying || this.gs.raidCooldownLeft(Date.now()) === 0) return;
    if (!this.ads.isReady('raid_reset')) return;
    this.adPlaying = true;
    this.refreshCooldown();
    void this.ads.showRewarded('raid_reset').then((result) => {
      this.adPlaying = false;
      if (result.rewarded) {
        this.gs.trackQuest('ads');
        this.gs.resetRaidCooldown();
        audio.coin();
      }
      if (this.scene.isActive()) {
        this.refreshCooldown();
        this.buildRows();
      }
    });
  }

  private buildRows(): void {
    this.rows.removeAll(true);
    const now = Date.now();
    const left = PANEL_X + 10;
    const top = PANEL_Y + 50;

    for (let level = 1; level <= RAIDS.maxLevel; level++) {
      const y = top + (level - 1) * ROW_PITCH + ROW_H / 2;
      const cleared = level <= this.gs.raidHighest;
      const isNext = level === this.gs.raidNextLevel && !cleared;
      const locked = !cleared && !isNext;
      const canFight = isNext && this.gs.canStartRaid(level, now);

      const row = this.add.container(0, 0);
      const bg = this.add
        .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, cleared ? 0xd8e4c4 : THEME.cardBg)
        .setStrokeStyle(2, cleared ? 0x6fae4e : isNext ? THEME.gold : THEME.cardBorder);
      if (locked) bg.setFillStyle(0xb8ab8e, 0.6);

      const kills = raidClearKills(level);
      const title = this.add
        .bitmapText(left + 6, y - 20, 'pix', `RAID LV ${level}`, 16)
        .setTint(locked ? 0x8a7d60 : 0x4a3520);
      const gold = formatNumber(raidGoldPerKill(level)).toUpperCase();
      const gems = raidGems(level, kills);
      // Two short info lines that end well before the FIGHT button
      const goal = this.add
        .bitmapText(left + 6, y + 0, 'pix', `KILL ${kills} IN ${RAIDS.durationSeconds}S`, 8)
        .setTint(locked ? 0x8a7d60 : 0xb03a2e);
      const reward = this.add
        .bitmapText(left + 6, y + 13, 'pix', `${gold} GOLD/KILL - UP TO ${gems} GEMS`, 8)
        .setTint(locked ? 0x8a7d60 : 0x8a5a2e);

      let stateText = 'LOCKED';
      let stateTint = 0x8a7d60;
      if (cleared) {
        stateText = 'CLEARED';
        stateTint = 0x2e7a1e;
      } else if (isNext) {
        stateText = canFight ? 'FIGHT!' : 'WAIT';
        stateTint = canFight ? 0xffffff : 0x8a5a2e;
      }
      // The label sits centred ON the button, never over the row text
      const state = this.add
        .bitmapText(PANEL_X + PANEL_W - 60, y, 'pix', stateText, 8)
        .setOrigin(0.5)
        .setTint(stateTint);
      if (canFight) {
        const btn = this.add
          .image(PANEL_X + PANEL_W - 60, y, 'btn-sm')
          .setTint(THEME.buttonBg);
        state.setDepth(1);
        // pointerup + gates: a scroll-drag must not fight, nor taps on rows
        // that are masked away under the header or footer
        btn.setInteractive({ useHandCursor: true }).on('pointerup', (ptr: Phaser.Input.Pointer) => {
          if (Math.abs(ptr.downY - ptr.upY) > 10) return;
          if (ptr.upY < PANEL_Y + 44 || ptr.upY > PANEL_Y + PANEL_H - 112) return;
          if (this.gs.startRaid(level, Date.now())) {
            audio.bossWarn();
            this.scene.stop();
          }
        });
        row.add([bg, title, goal, reward, btn, state]);
      } else {
        row.add([bg, title, goal, reward, state]);
      }
      this.rows.add(row);
    }
    this.rows.setY(-this.scrollY);
  }
}
