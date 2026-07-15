import Phaser from 'phaser';
import { CodexEntry, CodexKind } from '../config/codex';
import { GameState } from '../core/GameState';
import { audio } from '../services/AudioService';
import { addBackdrop, addCloseButton, addDragScroll } from '../ui/panelInput';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 116;
const PANEL_W = THEME.width - 24;
const PANEL_H = 600;
const ROW_H = 54;
const ROW_PITCH = 60;
const LIST_TOP = PANEL_Y + 96;
const LIST_H = PANEL_H - 96 - 34;

const TABS: { key: CodexKind; label: string }[] = [
  { key: 'beast', label: 'BEASTS' },
  { key: 'blade', label: 'BLADES' },
  { key: 'pet', label: 'PETS' },
];

/** The Codex: a collection book of everything met, forged and hatched.
 * Each unlocked entry pays a one-time gem bounty — tick the boxes. */
export class CodexPanel extends Phaser.Scene {
  private gs!: GameState;
  private tab: CodexKind = 'beast';
  private rows!: Phaser.GameObjects.Container;
  private tabButtons!: Phaser.GameObjects.Container;
  private footer!: Phaser.GameObjects.BitmapText;
  private scrollY = 0;
  private maxScroll = 0;

  constructor() {
    super('Codex');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.scrollY = 0;

    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, 0x8a5a2e);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'CODEX', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);

    this.tabButtons = this.add.container(0, 0);
    this.rows = this.add.container(0, 0);
    const maskShape = this.make.graphics();
    maskShape.fillRect(PANEL_X + 2, LIST_TOP, PANEL_W - 4, LIST_H);
    this.rows.setMask(maskShape.createGeometryMask());

    addDragScroll(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, LIST_TOP, PANEL_W, LIST_H),
      (delta) => this.setScroll(this.scrollY + delta),
    );
    this.input.on(
      'wheel',
      (_p: unknown, _o: unknown, _dx: number, dy: number) =>
        this.setScroll(this.scrollY + dy * 0.6),
    );

    this.footer = this.add
      .bitmapText(THEME.width / 2, PANEL_Y + PANEL_H - 24, 'pix', '', 8)
      .setOrigin(0.5, 0)
      .setTint(0x9a8d6e);

    this.buildTabs();
    this.buildRows();
    this.gs.on('codex:changed', () => {
      if (this.scene.isActive()) {
        this.buildTabs();
        this.buildRows();
      }
    });

    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    if (import.meta.env.DEV) {
      (window as unknown as { __codexOpen?: boolean }).__codexOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __codexOpen?: boolean }).__codexOpen = false;
      });
    }
  }

  private setScroll(v: number): void {
    this.scrollY = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.rows.setY(-this.scrollY);
  }

  private buildTabs(): void {
    this.tabButtons.removeAll(true);
    const list = this.gs.codexList();
    TABS.forEach((t, i) => {
      const x = PANEL_X + 62 + i * 122;
      const y = PANEL_Y + 62;
      const active = this.tab === t.key;
      const claimable = list.filter((e) => e.kind === t.key && e.unlocked && !e.claimed).length;
      const bg = this.add
        .rectangle(x, y, 116, 26, active ? 0x8a5a2e : THEME.cardBg)
        .setStrokeStyle(2, active ? THEME.gold : THEME.cardBorder)
        .setInteractive({ useHandCursor: true });
      const lbl = this.add
        .bitmapText(x, y, 'pix', t.label, 8)
        .setOrigin(0.5)
        .setTint(active ? 0xf5e3b8 : 0x8a5a2e);
      bg.on('pointerdown', () => {
        if (this.tab === t.key) return;
        this.tab = t.key;
        this.scrollY = 0;
        audio.buy();
        this.buildTabs();
        this.buildRows();
      });
      this.tabButtons.add([bg, lbl]);
      if (claimable > 0) {
        const dot = this.add.circle(x + 52, y - 10, 8, 0xb03a2e).setStrokeStyle(1, 0x14101c);
        const n = this.add
          .bitmapText(x + 52, y - 10, 'pix', String(Math.min(claimable, 9)), 8)
          .setOrigin(0.5)
          .setTint(0xffffff);
        this.tabButtons.add([dot, n]);
      }
    });
  }

  private buildRows(): void {
    this.rows.removeAll(true);
    const entries = this.gs.codexList().filter((e) => e.kind === this.tab);
    this.maxScroll = Math.max(0, entries.length * ROW_PITCH + 12 - LIST_H);

    const done = entries.filter((e) => e.claimed).length;
    this.footer.setText(`COLLECTED ${done}/${entries.length}`);

    entries.forEach((e, i) => {
      const y = LIST_TOP + 8 + i * ROW_PITCH + ROW_H / 2;
      this.codexRow(e as CodexEntry & { claimed: boolean }, y);
    });
    this.rows.setY(-this.scrollY);
  }

  private codexRow(e: CodexEntry & { claimed: boolean }, y: number): void {
    const bg = this.add
      .rectangle(THEME.width / 2, y, PANEL_W - 20, ROW_H, e.claimed ? 0xd8e4c4 : THEME.cardBg)
      .setStrokeStyle(2, e.claimed ? 0x6fae4e : e.unlocked ? THEME.gold : THEME.cardBorder);
    if (!e.unlocked) bg.setFillStyle(0xb8ab8e, 0.55);

    // Portrait: silhouetted until discovered — the classic collection tease
    const portrait = this.add
      .image(PANEL_X + 40, y, e.spriteKey, e.spriteFrame ?? 0)
      .setScale(this.tab === 'blade' ? 0.9 : 0.62);
    if (!e.unlocked) portrait.setTintFill(0x3a3244);

    const name = this.add
      .bitmapText(PANEL_X + 76, y - 14, 'pix', e.unlocked ? e.name : '???', 8)
      .setTint(e.unlocked ? 0x4a3520 : 0x8a7d60);
    const sub = this.add
      .bitmapText(
        PANEL_X + 76,
        y + 4,
        'pix',
        e.claimed ? 'COLLECTED' : e.unlocked ? `BOUNTY: ${e.gems} GEMS` : e.hint,
        8,
      )
      .setTint(e.claimed ? 0x2e7a1e : e.unlocked ? 0xc9961e : 0x8a7d60);

    this.rows.add([bg, portrait, name, sub]);

    if (e.unlocked && !e.claimed) {
      const btn = this.add
        .image(PANEL_X + PANEL_W - 52, y, 'btn-sm')
        .setTint(0x2e7a1e)
        .setInteractive({ useHandCursor: true });
      const lbl = this.add
        .bitmapText(PANEL_X + PANEL_W - 52, y, 'pix', 'CLAIM', 8)
        .setOrigin(0.5);
      btn.on('pointerup', (ptr: Phaser.Input.Pointer) => {
        if (Math.abs(ptr.downY - ptr.upY) > 10) return; // scroll, not a tap
        if (ptr.upY < LIST_TOP || ptr.upY > LIST_TOP + LIST_H) return;
        if (this.gs.claimCodex(e.id)) audio.coin();
      });
      this.rows.add([btn, lbl]);
    }
  }
}
