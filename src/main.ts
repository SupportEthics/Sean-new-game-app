import Phaser from 'phaser';
import { newBattleState } from './core/BattleSim';
import { GameState } from './core/GameState';
import { computeOffline } from './core/OfflineEarnings';
import { LocalStorageAdapter, SaveManager } from './core/SaveManager';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { PetsPanel } from './scenes/PetsPanel';
import { PreloadScene } from './scenes/PreloadScene';
import { QuestsPanel } from './scenes/QuestsPanel';
import { RaidPanel } from './scenes/RaidPanel';
import { SkinsPanel } from './scenes/SkinsPanel';
import { SoulsPanel } from './scenes/SoulsPanel';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { WebMockAd } from './services/monetization/AdService';
import { WebMockIap } from './services/monetization/WebMockIap';
import { THEME } from './ui/theme';

const saveManager = new SaveManager(new LocalStorageAdapter());
const loaded = saveManager.load();
const gs = loaded?.state ?? new GameState();
const offline = loaded ? computeOffline(gs, loaded.awaySeconds) : null;
gs.rollDaily();

// Web/browser IAP mock; the native RevenueCat implementation replaces this
// inside the Capacitor shells (M5).
const iap = new WebMockIap();
const ads = new WebMockAd();

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
  scene: [BootScene, PreloadScene, TitleScene, BattleScene, UIScene, SkinsPanel, RaidPanel, SoulsPanel, QuestsPanel, PetsPanel],
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

// Dev/test hooks — used by Playwright and manual QA; stripped from prod builds.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = {
    gs,
    addGold: (n: number) => gs.addGold(n),
    addGems: (n: number) => gs.addGems(n),
    setStage: (s: number) => {
      gs.battle = newBattleState(s);
      gs.highestStage = Math.max(gs.highestStage, s);
    },
    setWave: (stage: number, wave: number) => {
      gs.battle = newBattleState(stage, wave);
      gs.highestStage = Math.max(gs.highestStage, stage);
    },
    timeTravel: (hours: number) => gs.update(hours * 3600),
    save: () => saveManager.save(gs),
    openSkins: () => game.scene.getScene('UI')?.scene.launch('Skins'),
    openRaids: () => game.scene.getScene('UI')?.scene.launch('Raids'),
    openSouls: () => game.scene.getScene('UI')?.scene.launch('Souls'),
    openQuests: () => game.scene.getScene('UI')?.scene.launch('Quests'),
    openPets: () => game.scene.getScene('UI')?.scene.launch('Pets'),
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
