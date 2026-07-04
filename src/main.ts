import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Phaser from 'phaser';
import { REMOVE_ADS, STARTER_PACK } from './config/monetization';
import { SKINS } from './config/skins';
import { newBattleState } from './core/BattleSim';
import { GameState } from './core/GameState';
import { computeOffline } from './core/OfflineEarnings';
import { SaveManager } from './core/SaveManager';
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
import { TownPanel } from './scenes/TownPanel';
import { UIScene } from './scenes/UIScene';
import { hydrateSaveFromPreferences, MirroredStorage } from './services/NativeSave';
import { createMonetization } from './services/monetization/factory';
import { THEME } from './ui/theme';

async function boot(): Promise<void> {
  // On native, restore a durable save copy before anything reads storage
  await hydrateSaveFromPreferences();

  const saveManager = new SaveManager(new MirroredStorage());
  const loaded = saveManager.load();
  const gs = loaded?.state ?? new GameState();
  const offline = loaded ? computeOffline(gs, loaded.awaySeconds) : null;
  gs.rollDaily();

  // Real AdMob/RevenueCat inside the Capacitor shells, web mocks elsewhere
  const { iap, ads } = createMonetization();

  // App Store restore flow: non-consumables reappear on reinstall
  void iap.restore().then((skus) => {
    for (const sku of skus) {
      if (sku === REMOVE_ADS.sku) gs.removeAds = true;
      if (sku === STARTER_PACK.sku) gs.starterPackOwned = true;
      const skin = SKINS.find(
        (s) => s.unlock.type === 'iap' && (s.unlock as { sku: string }).sku === sku,
      );
      if (skin) gs.grantSkin(skin.id);
    }
  });

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
    scene: [BootScene, PreloadScene, TitleScene, BattleScene, UIScene, SkinsPanel, RaidPanel, SoulsPanel, QuestsPanel, PetsPanel, ShopPanel, SkillsPanel, FairyPanel, TownPanel],
    callbacks: {
      preBoot: (g) => {
        g.registry.set('gs', gs);
        g.registry.set('saveManager', saveManager);
        g.registry.set('iap', iap);
        g.registry.set('ads', ads);
        g.registry.set('offline', offline);
      },
    },
  });

  // Native lifecycle: persist the moment the app is backgrounded
  if (Capacitor.isNativePlatform()) {
    void App.addListener('pause', () => saveManager.save(gs));
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
