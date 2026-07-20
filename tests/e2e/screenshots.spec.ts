import { test } from '@playwright/test';

/** Captures review screenshots into screenshots/ (gitignored). */

interface GameHooks {
  addGold(n: number): void;
  setWave(stage: number, wave: number): void;
  gs: { grid: (number | null)[]; highestTier: number };
}

declare global {
  interface Window {
    __uiReady?: boolean;
    __game: GameHooks;
  }
}

test.beforeEach(async ({ page }) => {
  // Pre-mark the tutorial as done so suites test the normal UI
  await page.addInitScript(() => localStorage.setItem('pawsblades_tutorial_done', '1'));
  await page.addInitScript(() => localStorage.setItem('pawsblades_nopopups', '1'));
  await page.goto('/');
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.mouse.click(195, 500); // tap through the welcome screen
  await page.waitForFunction(() => window.__uiReady === true);
});

test('welcome screen', async ({ page }) => {
  // beforeEach already tapped through; reload to capture the title itself
  await page.reload();
  await page.waitForFunction(
    () => (window as unknown as { __titleReady?: boolean }).__titleReady === true,
  );
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'screenshots/00-title.png' });
});

test('early game', async ({ page }) => {
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'screenshots/01-early-game.png' });
});

test('mid game with populated grid', async ({ page }) => {
  await page.evaluate(() => {
    (window.__game as unknown as { setStage(s: number): void }).setStage(31); // all 4 sword slots
    window.__game.addGold(1e6);
    // Hand-place a mid-game grid; the UI rebuilds on the next grid event
    const tiers = [8, 8, 7, 6, 5, 5, 4, 3, 3, 2, 1, 1];
    tiers.forEach((t, i) => (window.__game.gs.grid[i] = t));
    window.__game.gs.highestTier = 9;
  });
  // Buy through the UI so grid:changed fires and everything renders
  await page.mouse.click(247, 761);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'screenshots/02-mid-game.png' });
});

test('boss fight', async ({ page }) => {
  await page.evaluate(() => window.__game.setWave(5, 10));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/03-boss.png' });
});

test('skins panel', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openSkins(): void }).openSkins(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __skinsOpen?: boolean }).__skinsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/05-skins.png' });
});

test('sword skins tab with premium weapons', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: {
        bestTier: number;
        grantPremiumSword(id: string): void;
        setSwordSkin(key: string): boolean;
      };
      openSkins(): void;
    };
    g.gs.bestTier = 14;
    g.gs.grantPremiumSword('scythe');
    g.gs.setSwordSkin('premium-scythe');
    g.openSkins();
  });
  await page.waitForFunction(
    () => (window as unknown as { __skinsOpen?: boolean }).__skinsOpen === true,
  );
  await page.waitForTimeout(400);
  await page.mouse.click(283, 157); // SWORDS tab
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/29-sword-skins.png' });
});

test('raids panel after prestige', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { prestigeCount: number };
      openRaids(): void;
    };
    g.gs.prestigeCount = 1;
    (g.gs as unknown as { raidReadyAt: number }).raidReadyAt = Date.now() + 8 * 60_000;
    g.openRaids();
  });
  await page.waitForFunction(
    () => (window as unknown as { __raidsOpen?: boolean }).__raidsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/07-raids.png' });
});

test('pets panel with hatched squad', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { pets: Record<string, number>; gold: number; gems: number };
      hatch(kind: string, roll?: number): unknown;
      openPets(): void;
    };
    g.gs.gold = 50_000;
    g.gs.gems = 60;
    g.gs.pets = { pup: 4, emberbat: 2, drake: 1 };
    g.openPets();
  });
  await page.waitForFunction(
    () => (window as unknown as { __petsOpen?: boolean }).__petsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/08-pets.png' });
});

test('pets panel with evolution stages', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: {
        pets: Record<string, number>;
        petStages: Record<string, number>;
        gems: number;
      };
      openPets(): void;
    };
    g.gs.pets = { pup: 10, emberbat: 6, drake: 3 };
    g.gs.petStages = { pup: 2, emberbat: 1 }; // alpha wolf + cinder bat
    g.gs.gems = 500;
    g.openPets();
  });
  await page.waitForFunction(
    () => (window as unknown as { __petsOpen?: boolean }).__petsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/33-pet-evolution.png' });
});

test('pets fighting beside the hero', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: {
        pets: Record<string, number>;
        emit?: unknown;
        hatchEgg(kind: string, roll?: number): unknown;
        gold: number;
      };
    };
    // Hatch through the API so pets:changed fires and the arena renders them
    g.gs.gold = 1e9;
    g.gs.hatchEgg('gold', 0); // pup
    g.gs.hatchEgg('gold', 0.75); // emberbat
    g.gs.hatchEgg('gold', 0.99); // drake
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/09-arena-pets.png' });
});

test('shop panel', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { piggyGems: number };
      openShop(): void;
    };
    g.gs.piggyGems = 84;
    g.openShop();
  });
  await page.waitForFunction(
    () => (window as unknown as { __shopOpen?: boolean }).__shopOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/10-shop.png' });
});

test('shop GEMS tab', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openShop(): void }).openShop(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __shopOpen?: boolean }).__shopOpen === true,
  );
  await page.waitForTimeout(400);
  await page.mouse.click(125, 165); // GEMS tab
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/31-shop-gems.png' });
});

test('shop BUNDLES tab', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openShop(): void }).openShop(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __shopOpen?: boolean }).__shopOpen === true,
  );
  await page.waitForTimeout(400);
  await page.mouse.click(265, 165); // BUNDLES tab
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/30-shop-bundles.png' });
});

test('shop SKINS tab with premium weapons and heroes', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openShop(): void }).openShop(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __shopOpen?: boolean }).__shopOpen === true,
  );
  await page.waitForTimeout(400);
  await page.mouse.click(335, 165); // SKINS tab
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/32-shop-skins.png' });
});

test('skills panel with one buff active', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { highestStage: number; castSkill(id: string): boolean };
      openSkills(): void;
    };
    g.gs.highestStage = 25;
    g.gs.castSkill('whirlwind');
    g.openSkills();
  });
  await page.waitForFunction(
    () => (window as unknown as { __skillsOpen?: boolean }).__skillsOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/11-skills.png' });
});

test('fairy panel levelled up', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { highestStage: number; fairyLevel: number; gold: number };
      openFairy(): void;
    };
    g.gs.highestStage = 12;
    g.gs.fairyLevel = 6;
    g.gs.gold = 1e6;
    g.openFairy();
  });
  await page.waitForFunction(
    () => (window as unknown as { __fairyOpen?: boolean }).__fairyOpen === true,
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/12-fairy.png' });
});

test('quests panel weekly tab', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { trackQuest(id: string, n: number): void };
      openQuests(): void;
    };
    g.gs.trackQuest('kills', 850);
    g.gs.trackQuest('merges', 40);
    g.openQuests();
  });
  await page.waitForFunction(
    () => (window as unknown as { __questsOpen?: boolean }).__questsOpen === true,
  );
  await page.waitForTimeout(400);
  await page.mouse.click(125, 212); // WEEKLY tab (5-tab row)
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/13-quests-weekly.png' });
});

test('daily login popup', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openLogin(): void }).openLogin(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __loginOpen?: boolean }).__loginOpen === true,
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/19-login.png' });
});

test('awards tab with claimable achievement', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { totalKills: number; totalMerges: number };
      openQuests(): void;
    };
    g.gs.totalKills = 1200;
    g.gs.totalMerges = 150;
    g.openQuests();
  });
  await page.waitForFunction(
    () => (window as unknown as { __questsOpen?: boolean }).__questsOpen === true,
  );
  await page.waitForTimeout(400);
  await page.mouse.click(265, 212); // AWARDS tab (5-tab row)
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/20-awards.png' });
});

test('gift parcel drifting through the arena', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { spawnGift(): void }).spawnGift(),
  );
  await page.waitForTimeout(2500); // mid-drift
  await page.screenshot({ path: 'screenshots/21-gift.png' });
});

test('all five pets in the arena', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: {
        pets: Record<string, number>;
        gold: number;
        hatchEgg(kind: string, roll?: number): unknown;
      };
    };
    g.gs.gold = 1e9;
    g.gs.pets = { emberbat: 2, wisp: 1, pebble: 3, drake: 1 };
    g.gs.hatchEgg('gold', 0); // pup — fires pets:changed with all five
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/22-five-pets.png' });
});

test('town panel after second rebirth', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: {
        prestigeCount: number;
        gold: number;
        townBuildings: Record<string, number>;
        jewelerCollectedAt: number;
      };
      openTown(): void;
    };
    g.gs.prestigeCount = 2;
    g.gs.gold = 500_000;
    g.gs.townBuildings = { farm: 4, blacksmith: 2, jeweler: 2 };
    g.gs.jewelerCollectedAt = Date.now() - 36 * 3600 * 1000; // 1.5 days -> vault has gems
    g.openTown();
  });
  await page.waitForFunction(
    () => (window as unknown as { __townOpen?: boolean }).__townOpen === true,
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/24-town.png' });
});

test('hall of legends centred on the player', async ({ page }) => {
  await page.evaluate(() => {
    const g = window.__game as unknown as {
      gs: { highestStage: number; prestigeCount: number };
      openRanks(): void;
    };
    g.gs.highestStage = 52;
    g.gs.prestigeCount = 1;
    g.openRanks();
  });
  await page.waitForFunction(
    () => (window as unknown as { __ranksOpen?: boolean }).__ranksOpen === true,
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/25-ranks.png' });
});

test('dark forest location at stage 12', async ({ page }) => {
  await page.evaluate(() => window.__game.setWave(12, 3));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/04-biome.png' });
});

test('castle location with gargoyles at stage 25', async ({ page }) => {
  await page.evaluate(() => window.__game.setWave(25, 2));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/26-castle.png' });
});

test('void citadel with cultists at stage 75', async ({ page }) => {
  await page.evaluate(() => window.__game.setWave(75, 4));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'screenshots/27-void-citadel.png' });
});

test('late-game sword art past tier 12', async ({ page }) => {
  await page.evaluate(() => {
    (window.__game as unknown as { setStage(s: number): void }).setStage(31);
    window.__game.addGold(1e12);
    const tiers = [22, 20, 18, 16, 15, 14, 13, 12, 10, 8, 6, 4];
    tiers.forEach((t, i) => (window.__game.gs.grid[i] = t));
    window.__game.gs.highestTier = 22;
  });
  await page.mouse.click(247, 761); // buy so grid:changed fires
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshots/28-late-swords.png' });
});

test('hatch odds disclosure modal', async ({ page }) => {
  await page.evaluate(() =>
    (window.__game as unknown as { openPets(): void }).openPets(),
  );
  await page.waitForFunction(
    () => (window as unknown as { __petsOpen?: boolean }).__petsOpen === true,
  );
  await page.waitForTimeout(500);
  await page.mouse.click(334, 302); // ODDS button right of the egg caption
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'screenshots/35-hatch-odds.png' });
});

test('treasure ad preview modal', async ({ page }) => {
  await page.evaluate(() => {
    (window.__game as unknown as { setStage(s: number): void }).setStage(143);
    window.__game.gs.grid[0] = 20; // real income so the promised gold is real
  });
  await page.waitForTimeout(400);
  await page.mouse.click(360, 228); // LOOT button on the right edge
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/34-treasure-ad.png' });
});
