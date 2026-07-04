import Phaser from 'phaser';
import { newBattleState } from './core/BattleSim';
import { GameState } from './core/GameState';
import { LocalStorageAdapter, SaveManager } from './core/SaveManager';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { UIScene } from './scenes/UIScene';
import { THEME } from './ui/theme';

const saveManager = new SaveManager(new LocalStorageAdapter());
const loaded = saveManager.load();
const gs = loaded?.state ?? new GameState();
// Offline earnings popup arrives in M3; loaded.awaySeconds is ready for it.

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a1330',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: THEME.width,
    height: THEME.height,
  },
  scene: [BootScene, BattleScene, UIScene],
  callbacks: {
    preBoot: (game) => {
      game.registry.set('gs', gs);
      game.registry.set('saveManager', saveManager);
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
    reset: () => {
      localStorage.clear();
      location.reload();
    },
  };
}
