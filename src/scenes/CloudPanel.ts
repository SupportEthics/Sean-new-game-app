import Phaser from 'phaser';
import { GameState } from '../core/GameState';
import { SAVE_KEY, SaveManager } from '../core/SaveManager';
import { audio } from '../services/AudioService';
import {
  CloudSaveService,
  CloudSnapshot,
  cloudRestoreAdvice,
} from '../services/CloudSave';
import { MirroredStorage } from '../services/NativeSave';
import { addBackdrop, addCloseButton } from '../ui/panelInput';
import { THEME } from '../ui/theme';

const PANEL_X = 12;
const PANEL_Y = 116;
const PANEL_W = THEME.width - 24;
const PANEL_H = 600;

/** localStorage key holding the epoch-ms of the last successful cloud push
 * (UIScene's silent auto-backup shares it via its pref helpers). */
export const CLOUD_BACKUP_AT_KEY = 'pawsblades_cloud_backup_at';

function readBackupAt(): number {
  try {
    return Number(localStorage.getItem(CLOUD_BACKUP_AT_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeBackupAt(v: number): void {
  try {
    localStorage.setItem(CLOUD_BACKUP_AT_KEY, String(v));
  } catch {
    /* storage unavailable */
  }
}

/** 'NEVER' / 'JUST NOW' / '5 MIN AGO' — the pix font is uppercase-only. */
function agoLabel(at: number, now = Date.now()): string {
  if (!at) return 'NEVER';
  const s = Math.max(0, (now - at) / 1000);
  if (s < 90) return 'JUST NOW';
  if (s < 3600) return `${Math.round(s / 60)} MIN AGO`;
  if (s < 86400) return `${Math.round(s / 3600)} HR AGO`;
  return `${Math.round(s / 86400)} DAYS AGO`;
}

/**
 * Cloud save panel. Web/dev builds see a friendly "app store version"
 * notice; configured iOS builds get Sign in with Apple plus backup/restore
 * against the Supabase cloud_saves table (services/CloudSave). Restores
 * never silently clobber the better save — cloudRestoreAdvice decides and
 * the player confirms.
 */
export class CloudPanel extends Phaser.Scene {
  private gs!: GameState;
  private saveManager!: SaveManager;
  private svc!: CloudSaveService;
  private content!: Phaser.GameObjects.Container;
  private statusText: Phaser.GameObjects.BitmapText | null = null;
  private backupAtText: Phaser.GameObjects.BitmapText | null = null;
  private busy = false;

  constructor() {
    super('Cloud');
  }

  create(): void {
    this.gs = this.registry.get('gs') as GameState;
    this.saveManager = this.registry.get('saveManager') as SaveManager;
    this.svc = this.registry.get('cloudSave') as CloudSaveService;
    this.busy = false;

    addBackdrop(
      this,
      new Phaser.Geom.Rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H),
      () => this.scene.stop(),
    );

    const g = this.add.graphics();
    g.fillStyle(THEME.panelBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.lineStyle(3, 0xc99a2e);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 12);
    g.fillStyle(THEME.headerBg);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, 40, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .bitmapText(THEME.width / 2, PANEL_Y + 12, 'pix', 'CLOUD SAVE', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);

    this.content = this.add.container(0, 0);

    if (!this.svc.isAvailable) {
      this.renderUnavailable();
    } else {
      void this.svc.isSignedIn().then((signed) => {
        if (!this.scene.isActive()) return;
        if (signed) {
          this.renderMain();
          void this.syncCheck(false);
        } else {
          this.renderSignedOut();
        }
      });
    }

    addCloseButton(this, PANEL_X + PANEL_W - 22, PANEL_Y + 12, () => this.scene.stop());

    if (import.meta.env.DEV) {
      (window as unknown as { __cloudOpen?: boolean }).__cloudOpen = true;
      this.events.once('shutdown', () => {
        (window as unknown as { __cloudOpen?: boolean }).__cloudOpen = false;
      });
    }
  }

  // ---- The three content states ----

  /** Every browser/dev build: cloud saves are a native-store feature. */
  private renderUnavailable(): void {
    this.content.removeAll(true);
    const cx = THEME.width / 2;
    const cy = PANEL_Y + PANEL_H / 2;

    // A soft cloud mark so the empty state doesn't feel broken
    const cloud = this.add.graphics();
    cloud.fillStyle(0xbfd4e8);
    cloud.fillCircle(cx - 22, cy - 96, 16);
    cloud.fillCircle(cx + 2, cy - 106, 20);
    cloud.fillCircle(cx + 26, cy - 94, 14);
    cloud.fillRoundedRect(cx - 34, cy - 96, 68, 18, 8);
    cloud.lineStyle(2, 0x8a5a2e);
    cloud.strokeRoundedRect(cx - 34, cy - 96, 68, 18, 8);

    const main = this.add
      .bitmapText(cx, cy - 30, 'pix', 'CLOUD SAVES WORK IN THE APP STORE VERSION', 16)
      .setTint(0x4a3520)
      .setOrigin(0.5)
      .setMaxWidth(PANEL_W - 80)
      .setCenterAlign();
    const sub = this.add
      .bitmapText(cx, cy + 34, 'pix', 'YOUR PROGRESS IS SAVED ON THIS DEVICE', 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5)
      .setMaxWidth(PANEL_W - 80)
      .setCenterAlign();
    this.content.add([cloud, main, sub]);
  }

  /** Configured native build, no Apple session yet. */
  private renderSignedOut(): void {
    this.content.removeAll(true);
    this.backupAtText = null;
    const cx = THEME.width / 2;
    const cy = PANEL_Y + PANEL_H / 2;

    const blurb = this.add
      .bitmapText(
        cx,
        cy - 110,
        'pix',
        'BIND YOUR APPLE ACCOUNT SO YOUR PROGRESS SURVIVES A NEW PHONE',
        8,
      )
      .setTint(0x4a3520)
      .setOrigin(0.5)
      .setMaxWidth(PANEL_W - 80)
      .setCenterAlign();

    // Apple's guidelines want the white button treatment
    const bg = this.add
      .rectangle(cx, cy, 250, 52, 0xffffff)
      .setStrokeStyle(2, 0x14101c)
      .setInteractive({ useHandCursor: true });
    const lbl = this.add
      .bitmapText(cx, cy, 'pix', 'SIGN IN WITH APPLE', 8)
      .setTint(0x14101c)
      .setOrigin(0.5);
    bg.on('pointerdown', () => {
      if (this.busy) return;
      this.busy = true;
      this.tweens.add({ targets: [bg, lbl], scale: 0.96, duration: 60, yoyo: true });
      audio.buy();
      void this.svc.signIn().then((ok) => {
        this.busy = false;
        if (!this.scene.isActive()) return;
        if (ok) {
          this.renderMain();
          void this.syncCheck(false);
        } else {
          this.setStatus('SIGN IN CANCELLED', 0xd82e2e);
        }
      });
    });

    this.statusText = this.add
      .bitmapText(cx, cy + 56, 'pix', '', 8)
      .setOrigin(0.5)
      .setTint(0xd82e2e);
    this.content.add([blurb, bg, lbl, this.statusText]);
  }

  /** Signed in: account label, last backup time, the three actions. */
  private renderMain(): void {
    this.content.removeAll(true);
    const cx = THEME.width / 2;
    const top = PANEL_Y + 120;

    const account = this.add
      .bitmapText(cx, top, 'pix', 'APPLE ID', 16)
      .setTint(0x4a3520)
      .setOrigin(0.5);
    void this.svc.userLabel().then((label) => {
      if (this.scene.isActive() && label && account.active) account.setText(label);
    });

    this.backupAtText = this.add
      .bitmapText(cx, top + 34, 'pix', `LAST BACKUP: ${agoLabel(readBackupAt())}`, 8)
      .setTint(0x8a5a2e)
      .setOrigin(0.5);

    const backup = this.mkButton(cx, top + 100, 250, 48, 'BACK UP NOW', 0x2e7a1e, () => {
      void this.doBackup(false);
    });
    const restore = this.mkButton(cx, top + 164, 250, 48, 'RESTORE FROM CLOUD', 0x2884a8, () => {
      if (this.busy) return;
      void this.syncCheck(true);
    });
    const signOut = this.mkButton(cx, top + 232, 170, 36, 'SIGN OUT', 0x9a8d6e, () => {
      if (this.busy) return;
      void this.svc.signOut().then(() => {
        if (this.scene.isActive()) this.renderSignedOut();
      });
    });

    this.statusText = this.add
      .bitmapText(cx, top + 288, 'pix', '', 8)
      .setOrigin(0.5)
      .setTint(0x2e7a1e);
    this.content.add([account, this.backupAtText, ...backup, ...restore, ...signOut, this.statusText]);
  }

  /** Panel-style button: card face, tinted stroke + label (see JOIN modal). */
  private mkButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    tint: number,
    onTap: () => void,
  ): Phaser.GameObjects.GameObject[] {
    const bg = this.add
      .rectangle(x, y, w, h, THEME.cardBg)
      .setStrokeStyle(2, tint)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.bitmapText(x, y, 'pix', label, 8).setTint(tint).setOrigin(0.5);
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, txt], scale: 0.94, duration: 60, yoyo: true });
      onTap();
    });
    return [bg, txt];
  }

  private setStatus(msg: string, tint: number): void {
    this.statusText?.setText(msg).setTint(tint);
  }

  private refreshBackupAt(): void {
    this.backupAtText?.setText(`LAST BACKUP: ${agoLabel(readBackupAt())}`);
  }

  // ---- Cloud flows ----

  /**
   * Fetch the cloud snapshot and act on cloudRestoreAdvice. After sign-in
   * (explicit=false) a better cloud save asks before loading and anything
   * else pushes the local save up. From the RESTORE button (explicit=true)
   * any existing snapshot gets the confirm so a deliberate restore always
   * has a path through.
   */
  private async syncCheck(explicit: boolean): Promise<void> {
    const cloud = await this.svc.fetchCloud();
    if (!this.scene.isActive()) return;
    if (explicit) {
      if (!cloud) {
        this.setStatus('NO CLOUD SAVE FOUND', 0xd82e2e);
        return;
      }
      this.showRestoreConfirm(cloud);
      return;
    }
    const advice = cloudRestoreAdvice(this.gs.highestStage, cloud);
    if (advice === 'offer-restore' && cloud) {
      this.showRestoreConfirm(cloud);
    } else {
      // 'push-local' or 'nothing-there': our copy is the truth — push it
      void this.doBackup(false);
    }
  }

  /** Persist locally, then push the exact stored JSON to the cloud. */
  private async doBackup(silent: boolean): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    let ok = false;
    try {
      this.saveManager.save(this.gs);
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) ok = await this.svc.backup(JSON.parse(raw), this.gs.highestStage);
      if (ok) writeBackupAt(Date.now());
    } catch {
      ok = false;
    }
    this.busy = false;
    if (!this.scene.isActive()) return;
    this.refreshBackupAt();
    if (!silent) {
      this.setStatus(
        ok ? 'BACKED UP JUST NOW' : 'BACKUP FAILED - TRY AGAIN',
        ok ? 0x2e7a1e : 0xd82e2e,
      );
    }
  }

  /** Dark cover + card, mirroring the leaderboard's JOIN modal. */
  private showRestoreConfirm(cloud: CloudSnapshot): void {
    const cy = PANEL_Y + PANEL_H / 2;
    const layer = this.add.container(0, 0).setDepth(50);
    const cover = this.add
      .rectangle(THEME.width / 2, cy, PANEL_W, PANEL_H, 0x14101c, 0.75)
      .setInteractive(); // swallow taps under the modal
    const card = this.add
      .rectangle(THEME.width / 2, cy, PANEL_W - 48, 220, THEME.panelBg)
      .setStrokeStyle(3, THEME.gold);
    const title = this.add
      .bitmapText(THEME.width / 2, cy - 88, 'pix', 'CLOUD SAVE FOUND', 16)
      .setTint(THEME.gold)
      .setOrigin(0.5, 0);
    // The pix font has no '?' glyph, hence the statement phrasing
    const body = this.add
      .bitmapText(
        THEME.width / 2,
        cy - 52,
        'pix',
        `CLOUD SAVE FOUND - STAGE ${cloud.stage}. LOAD IT AND REPLACE YOUR CURRENT STAGE ${this.gs.highestStage}.`,
        8,
      )
      .setTint(0x4a3520)
      .setOrigin(0.5, 0)
      .setMaxWidth(PANEL_W - 90)
      .setCenterAlign();

    const mk = (x: number, label: string, tint: number, onTap: () => void) => {
      const bg = this.add
        .rectangle(x, cy + 46, 140, 40, THEME.cardBg)
        .setStrokeStyle(2, tint)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.bitmapText(x, cy + 46, 'pix', label, 8).setTint(tint).setOrigin(0.5);
      bg.on('pointerdown', () => {
        this.tweens.add({ targets: [bg, txt], scale: 0.94, duration: 60, yoyo: true });
        onTap();
      });
      return [bg, txt];
    };

    const load = mk(THEME.width / 2 - 78, 'LOAD', 0x2e7a1e, () => {
      audio.merge();
      this.restoreFromCloud(cloud);
    });
    const keep = mk(THEME.width / 2 + 78, 'KEEP MINE', 0x9a8d6e, () => {
      audio.buy();
      layer.destroy();
      void this.doBackup(false); // their choice: local copy becomes the cloud copy
    });

    layer.add([cover, card, title, body, ...load, ...keep]);
  }

  /** Write the cloud blob through the same mirrored path SaveManager uses
   * (localStorage + Capacitor Preferences on native), then reboot into it. */
  private restoreFromCloud(cloud: CloudSnapshot): void {
    new MirroredStorage().set(SAVE_KEY, JSON.stringify(cloud.save));
    window.location.reload();
  }
}
