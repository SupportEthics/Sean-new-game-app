import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Phaser from 'phaser';
import { newBattleState } from './core/BattleSim';
import { GameState } from './core/GameState';
import { computeOffline } from './core/OfflineEarnings';
import { SAVE_KEY, SaveManager } from './core/SaveManager';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { FairyPanel } from './scenes/FairyPanel';
import { PetsPanel } from './scenes/PetsPanel';
import { PreloadScene } from './scenes/PreloadScene';
import { QuestsPanel } from './scenes/QuestsPanel';
import { RaidPanel } from './scenes/RaidPanel';
import { ShopPanel } from './scenes/ShopPanel';
import { SkillsPanel } from './scenes/SkillsPanel';
import { SkinsPanel } from './scenes/SkinsPanel';
import { SoulsPanel } from './scenes/SoulsPanel';
import { TitleScene } from './scenes/TitleScene';
import { TownScene } from './scenes/TownScene';
import { UIScene } from './scenes/UIScene';
import { CloudPanel } from './scenes/CloudPanel';
import { DungeonPanel } from './scenes/DungeonPanel';
import { CodexPanel } from './scenes/CodexPanel';
import { MenuPanel } from './scenes/MenuPanel';
import { MinePanel } from './scenes/MinePanel';
import { MineScene } from './scenes/MineScene';
import { LeaderboardPanel } from './scenes/LeaderboardPanel';
import { makeCloudSave } from './services/CloudSave';
import { LeaderboardService, WebMockLeaderboard } from './services/LeaderboardService';
import { hydrateSaveFromPreferences, MirroredStorage } from './services/NativeSave';
import { createMonetization } from './services/monetization/factory';
import { wrapWithGoldenKnight } from './services/monetization/GoldenAdService';
import { attachAnalytics } from './services/Analytics';
import {
  cancelAllNotifications,
  maybeRequestNotificationPermission,
  scheduleNotifications,
} from './services/Notifications';
import { attachHaptics } from './services/Haptics';
import { attachReviewPrompt } from './services/Review';
import { THEME } from './ui/theme';

async function boot(): Promise<void> {
  // On native, restore a durable save copy before anything reads storage
  await hydrateSaveFromPreferences();

  // Tester lever (web only): play.html?resetdaily=1 wipes today's
  // dungeon/duel/deal locks so the daily content can be re-tested at will
  if (!Capacitor.isNativePlatform() && new URLSearchParams(location.search).has('resetdaily')) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const file = JSON.parse(raw) as { state: Record<string, unknown> };
        file.state.dungeonClearedDay = '';
        file.state.duelDay = '';
        file.state.duelsUsed = 0;
        file.state.dealClaimedDay = '';
        localStorage.setItem(SAVE_KEY, JSON.stringify(file));
      }
    } catch {
      /* malformed save: leave it alone */
    }
  }

  const saveManager = new SaveManager(new MirroredStorage());
  const loaded = saveManager.load();
  const gs = loaded?.state ?? new GameState();
  const offline = loaded ? computeOffline(gs, loaded.awaySeconds) : null;
  gs.rollDaily();

  // Tester lever (web only): play.html?teststage=35 jumps the run to that
  // stage so stage-gated features can be tried without the grind. Never on
  // native, and web scores never reach the real leaderboard.
  if (!Capacitor.isNativePlatform()) {
    const teststage = Number(new URLSearchParams(location.search).get('teststage'));
    if (Number.isFinite(teststage) && teststage >= 1 && teststage <= 500) {
      gs.battle = newBattleState(teststage, 1, gs.enemyHpMultiplier);
      gs.highestStage = Math.max(gs.highestStage, teststage);
    }
  }

  // Real AdMob/RevenueCat inside the Capacitor shells, web mocks elsewhere.
  // Golden Knight owners skip every ad, so the service gets wrapped once here.
  const { iap, ads: platformAds } = createMonetization();
  const ads = wrapWithGoldenKnight(platformAds, gs);
  // Firebase Analytics (native only; silent no-op on web)
  attachAnalytics(gs);
  // Rating prompt at a proud moment (native only, once ever)
  attachReviewPrompt(gs);
  // Haptic buzzes on merges, stage clears and victories (native only)
  attachHaptics(gs);
  // Platform leaderboards stay mocked until store setup (see the service)
  const leaderboard: LeaderboardService = new WebMockLeaderboard();
  // Apple-account cloud saves on configured iOS builds, quiet mock elsewhere
  const cloudSave = makeCloudSave();
  gs.on('stage:changed', () => void leaderboard.submitHighestStage(gs.highestStage));

  // App Store restore flow: non-consumables reappear on reinstall.
  // The shop also has a manual RESTORE PURCHASES button (Apple 3.1.1).
  void iap.restore().then((skus) => gs.applyRestoredSkus(skus));

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#2a1c10',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: THEME.width,
      height: THEME.height,
    },
    scene: [BootScene, PreloadScene, TitleScene, BattleScene, UIScene, SkinsPanel, RaidPanel, SoulsPanel, QuestsPanel, PetsPanel, ShopPanel, SkillsPanel, FairyPanel, TownScene, LeaderboardPanel, CloudPanel, DungeonPanel, CodexPanel, MenuPanel, MinePanel, MineScene],
    callbacks: {
      preBoot: (g) => {
        g.registry.set('gs', gs);
        g.registry.set('saveManager', saveManager);
        g.registry.set('iap', iap);
        g.registry.set('ads', ads);
        g.registry.set('leaderboard', leaderboard);
        g.registry.set('cloudSave', cloudSave);
        g.registry.set('offline', offline);
      },
    },
  });

  // Native lifecycle: persist the moment the app is backgrounded, line up
  // the come-back notifications, and clear them again on return
  if (Capacitor.isNativePlatform()) {
    void App.addListener('pause', () => {
      saveManager.save(gs);
      void scheduleNotifications(gs);
    });
    void App.addListener('resume', () => void cancelAllNotifications());
    void cancelAllNotifications();
    void maybeRequestNotificationPermission(gs);
  }

  // Mobile browsers move/resize the canvas when their toolbars collapse or
  // the page shifts; Phaser caches canvas bounds for input, so refresh them
  // on every viewport change or taps land offset from where they should.
  const refreshBounds = (): void => {
    game.scale.refresh();
  };
  window.visualViewport?.addEventListener('resize', refreshBounds);
  window.visualViewport?.addEventListener('scroll', refreshBounds);
  window.addEventListener('orientationchange', refreshBounds);
  window.addEventListener('scroll', refreshBounds, { passive: true });

  // Dev/test hooks — used by Playwright and manual QA; stripped from prod builds.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__game = {
      gs,
      game,
      addGold: (n: number) => gs.addGold(n),
      addGems: (n: number) => gs.addGems(n),
      setStage: (s: number) => {
        gs.battle = newBattleState(s, 1, gs.enemyHpMultiplier);
        gs.highestStage = Math.max(gs.highestStage, s);
      },
      setWave: (stage: number, wave: number) => {
        gs.battle = newBattleState(stage, wave, gs.enemyHpMultiplier);
        gs.highestStage = Math.max(gs.highestStage, stage);
      },
      timeTravel: (hours: number) => gs.update(hours * 3600),
      save: () => saveManager.save(gs),
      openSkins: () => game.scene.getScene('UI')?.scene.launch('Skins'),
      openRaids: () => game.scene.getScene('UI')?.scene.launch('Raids'),
      openSouls: () => game.scene.getScene('UI')?.scene.launch('Souls'),
      openQuests: () => game.scene.getScene('UI')?.scene.launch('Quests'),
      openPets: () => game.scene.getScene('UI')?.scene.launch('Pets'),
      openShop: () => game.scene.getScene('UI')?.scene.launch('Shop'),
      openSkills: () => game.scene.getScene('UI')?.scene.launch('Skills'),
      openFairy: () => game.scene.getScene('UI')?.scene.launch('Fairy'),
    openTown: () => game.scene.getScene('UI')?.scene.launch('Town'),
    openDungeon: () => game.scene.getScene('UI')?.scene.launch('Dungeon'),
    openCodex: () => game.scene.getScene('UI')?.scene.launch('Codex'),
    openMine: () => game.scene.getScene('UI')?.scene.launch('Mine'),
    openRanks: () => game.scene.getScene('UI')?.scene.launch('Ranks'),
    openCloud: () => game.scene.getScene('UI')?.scene.launch('Cloud'),
    spawnGift: () => (game.scene.getScene('Battle') as unknown as { spawnGift(): void }).spawnGift(),
    openLogin: () => {
      gs.lastLoginClaimDay = '';
      (game.scene.getScene('UI') as unknown as { maybeShowLogin(force: boolean): void }).maybeShowLogin(true);
    },
      hatch: (kind: 'gold' | 'gem' | 'free', roll?: number) => gs.hatchEgg(kind, roll),
      addSouls: (n: number) => { gs.souls += n; },
      prestige: () => gs.prestige(),
      showOffline: (gold: number, seconds: number) => {
        game.registry.set('offline', { gold, seconds });
        (game.scene.getScene('UI') as unknown as { maybeShowOffline(): void }).maybeShowOffline();
      },
      iap,
      ads,
      reset: () => {
        localStorage.clear();
        location.reload();
      },
    };
  }
}

void boot();
