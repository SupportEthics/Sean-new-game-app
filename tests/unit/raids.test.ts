import { describe, expect, it } from 'vitest';
import { PRESTIGE, soulsFor } from '../../src/config/prestige';
import { RAIDS, raidClearKills, raidGems, raidGoldPerKill, raidMonsterHp } from '../../src/config/raids';
import { newBattleState } from '../../src/core/BattleSim';
import { GameState } from '../../src/core/GameState';

function atStage(stage: number): GameState {
  const gs = new GameState();
  gs.battle = newBattleState(stage);
  gs.highestStage = Math.max(gs.highestStage, stage);
  return gs;
}

describe('prestige', () => {
  it('requires the minimum stage', () => {
    const gs = atStage(PRESTIGE.minStage - 1);
    expect(gs.canPrestige).toBe(false);
    expect(gs.prestige()).toBe(false);

    const ready = atStage(PRESTIGE.minStage);
    expect(ready.canPrestige).toBe(true);
  });

  it('resets the run but keeps permanent progress', () => {
    const gs = atStage(45);
    gs.addGold(1e6);
    gs.addGems(50);
    gs.buyGear();
    gs.unlockedCells = 25;
    gs.grantSkin('dragonlord');

    expect(gs.prestige()).toBe(true);
    expect(gs.prestigeCount).toBe(1);
    expect(gs.souls).toBe(soulsFor(45));
    expect(gs.battle.stage).toBe(1);
    expect(gs.gold).toBeLessThan(100); // reset to starting gold
    expect(gs.grid.every((c) => c === null)).toBe(true);
    // Permanent things survive
    expect(gs.gems).toBe(50);
    expect(gs.unlockedCells).toBe(25);
    expect(gs.ownedSkins).toContain('dragonlord');
    expect(gs.highestStage).toBe(45); // sword-slot record kept
  });

  it('souls scale with the stage reached', () => {
    expect(soulsFor(39)).toBe(0);
    expect(soulsFor(40)).toBeGreaterThan(0);
    expect(soulsFor(60)).toBeGreaterThan(soulsFor(40));
  });
});

describe('raids', () => {
  function prestiged(): GameState {
    const gs = atStage(40);
    gs.prestige();
    return gs;
  }

  it('locked until the first prestige', () => {
    const gs = new GameState();
    expect(gs.raidsUnlocked).toBe(false);
    expect(gs.startRaid(1, 0)).toBe(false);
    const p = prestiged();
    expect(p.raidsUnlocked).toBe(true);
    expect(p.startRaid(1, 0)).toBe(true);
  });

  it('only the next level is attemptable', () => {
    const gs = prestiged();
    expect(gs.canStartRaid(2, 0)).toBe(false);
    expect(gs.canStartRaid(1, 0)).toBe(true);
  });

  it('pays gold per kill live and gems at the end; clearing unlocks the next level', () => {
    const gs = prestiged();
    // Strong enough to one-shot level-1 monsters comfortably
    gs.grid[0] = 12;
    const dps = gs.heroDps;
    expect(dps).toBeGreaterThan(raidMonsterHp(1));

    const goldBefore = gs.gold;
    const gemsBefore = gs.gems;
    gs.startRaid(1, 0);
    let ended = false;
    gs.on('raid:ended', (r) => {
      ended = true;
      expect(r.cleared).toBe(true);
      expect(r.gold).toBeGreaterThan(0);
      expect(r.gems).toBe(raidGems(1, r.kills));
    });
    gs.update(RAIDS.durationSeconds + 1);

    expect(ended).toBe(true);
    expect(gs.raid).toBeNull();
    expect(gs.raidHighest).toBe(1);
    expect(gs.gold - goldBefore).toBeGreaterThanOrEqual(
      raidClearKills(1) * raidGoldPerKill(1),
    );
    expect(gs.gems).toBeGreaterThan(gemsBefore);
  });

  it('every raid level demands more kills than the last', () => {
    expect(raidClearKills(1)).toBe(10);
    for (let l = 2; l <= RAIDS.maxLevel; l++) {
      expect(raidClearKills(l)).toBeGreaterThan(raidClearKills(l - 1));
    }
  });

  it('failing the quota gives gems but no unlock', () => {
    const gs = prestiged();
    // Bare hands: 1 DPS vs 200 HP monsters = zero kills
    gs.startRaid(1, 0);
    gs.update(RAIDS.durationSeconds + 1);
    expect(gs.raidHighest).toBe(0);
  });

  it('enforces the cooldown', () => {
    const gs = prestiged();
    gs.grid[0] = 12;
    expect(gs.startRaid(1, 1000)).toBe(true);
    gs.update(RAIDS.durationSeconds + 1);
    expect(gs.canStartRaid(1, 1000 + 60_000)).toBe(false); // 1 min later: still cooling
    expect(gs.canStartRaid(1, 1000 + RAIDS.cooldownMinutes * 60_000 + 1)).toBe(true);
  });

  it('normal stage battle is paused during a raid', () => {
    const gs = prestiged();
    gs.grid[0] = 12;
    gs.startRaid(1, 0);
    const stageBefore = gs.battle.stage;
    const waveBefore = gs.battle.wave;
    gs.update(5);
    expect(gs.battle.stage).toBe(stageBefore);
    expect(gs.battle.wave).toBe(waveBefore);
  });

  it('reward curves grow with level', () => {
    expect(raidGoldPerKill(5)).toBeGreaterThan(raidGoldPerKill(1));
    expect(raidMonsterHp(5)).toBeGreaterThan(raidMonsterHp(1));
    expect(raidGems(5, 20)).toBeGreaterThan(raidGems(1, 20));
  });

  it('resetRaidCooldown (rewarded ad) clears the wait', () => {
    const gs = prestiged();
    gs.grid[0] = 12;
    gs.startRaid(1, 1000);
    gs.update(RAIDS.durationSeconds + 1);
    expect(gs.canStartRaid(1, 2000)).toBe(false);
    gs.resetRaidCooldown();
    expect(gs.canStartRaid(1, 2000)).toBe(true);
  });

  it('prestige/raid fields survive serialize round-trip', () => {
    const gs = prestiged();
    gs.raidHighest = 3;
    gs.raidReadyAt = 12345;
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.prestigeCount).toBe(1);
    expect(revived.souls).toBe(gs.souls);
    expect(revived.raidHighest).toBe(3);
    expect(revived.raidReadyAt).toBe(12345);
  });
});
