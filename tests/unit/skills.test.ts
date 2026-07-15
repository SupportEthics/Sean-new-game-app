import { describe, expect, it } from 'vitest';
import { SKILLS, skillDefById } from '../../src/config/skills';
import { GameState } from '../../src/core/GameState';

const WHIRLWIND = skillDefById('whirlwind')!;
const GOLDRUSH = skillDefById('goldrush')!;
const WARP = skillDefById('warp')!;

function unlockedState(): GameState {
  const gs = new GameState();
  gs.highestStage = 99; // everything unlocked
  return gs;
}

describe('skill gating', () => {
  it('locks skills behind their stage', () => {
    const gs = new GameState();
    for (const def of SKILLS) {
      expect(gs.skillUnlocked(def.id)).toBe(gs.highestStage >= def.unlockStage);
    }
    expect(gs.canCastSkill('whirlwind')).toBe(false);
    gs.highestStage = WHIRLWIND.unlockStage;
    expect(gs.canCastSkill('whirlwind')).toBe(true);
  });

  it('cooldown blocks recasting until sim time passes', () => {
    const gs = unlockedState();
    expect(gs.castSkill('whirlwind')).toBe(true);
    expect(gs.castSkill('whirlwind')).toBe(false);
    gs.update(WHIRLWIND.cooldownSeconds + 1);
    expect(gs.canCastSkill('whirlwind')).toBe(true);
  });

  it('a rewarded ad casts during cooldown but never during the buff', () => {
    const gs = unlockedState();
    expect(gs.castSkill('whirlwind')).toBe(true);
    // Buff still running: even an ad can't stack it
    expect(gs.canAdCastSkill('whirlwind')).toBe(false);
    expect(gs.castSkill('whirlwind', true)).toBe(false);
    // Buff over, cooldown still ticking: free cast blocked, ad cast allowed
    gs.update(WHIRLWIND.durationSeconds + 1);
    expect(gs.canCastSkill('whirlwind')).toBe(false);
    expect(gs.canAdCastSkill('whirlwind')).toBe(true);
    expect(gs.castSkill('whirlwind', true)).toBe(true);
    expect(gs.skillActiveLeft('whirlwind')).toBeGreaterThan(0);
  });

  it('ad cast still respects the raid guard for time warp', () => {
    const gs = unlockedState();
    gs.prestigeCount = 1;
    gs.startRaid(1, 0);
    expect(gs.castSkill('warp', true)).toBe(false);
  });
});

describe('skill effects', () => {
  it('whirlwind multiplies DPS while active, then expires', () => {
    const gs = unlockedState();
    gs.grid[0] = 5;
    const base = gs.heroDps;
    gs.castSkill('whirlwind');
    expect(gs.heroDps).toBeCloseTo(base * WHIRLWIND.dpsMult!);
    gs.update(WHIRLWIND.durationSeconds + 1);
    expect(gs.heroDps).toBeCloseTo(base);
  });

  it('gold rush multiplies gold income while active', () => {
    const gs = unlockedState();
    expect(gs.goldMultiplier).toBe(1);
    gs.castSkill('goldrush');
    expect(gs.goldMultiplier).toBeCloseTo(GOLDRUSH.goldMult!);
  });

  it('time warp instantly simulates battle seconds', () => {
    const gs = unlockedState();
    gs.grid[0] = 8;
    const kills = gs.totalKills;
    const gold = gs.gold;
    expect(gs.castSkill('warp')).toBe(true);
    expect(gs.totalKills).toBeGreaterThan(kills);
    expect(gs.gold).toBeGreaterThan(gold);
    // The warped seconds tick the warp's own cooldown too — time passed
    // (precision 0: the 100ms tick accumulator can hold back one sub-step)
    expect(gs.skillCooldownLeft('warp')).toBeCloseTo(
      WARP.cooldownSeconds - WARP.warpSeconds!,
      0,
    );
  });

  it('time warp is not castable during a raid', () => {
    const gs = unlockedState();
    gs.prestigeCount = 1;
    gs.startRaid(1, 0);
    expect(gs.canCastSkill('warp')).toBe(false);
    expect(gs.canCastSkill('whirlwind')).toBe(true); // buffs still allowed
  });
});

describe('skill persistence', () => {
  it('timers survive a serialize round-trip', () => {
    const gs = unlockedState();
    gs.castSkill('whirlwind');
    gs.update(4);
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.skillActiveLeft('whirlwind')).toBeCloseTo(
      WHIRLWIND.durationSeconds - 4,
      0,
    );
    expect(revived.skillCooldownLeft('whirlwind')).toBeCloseTo(
      WHIRLWIND.cooldownSeconds - 4,
      0,
    );
  });
});

describe('auto cast', () => {
  it('is gated behind its unlock stage', () => {
    const gs = new GameState();
    expect(gs.autoSkillsUnlocked).toBe(false);
    expect(gs.toggleAutoSkills()).toBe(false);
    expect(gs.autoSkills).toBe(false);
    gs.highestStage = 25;
    expect(gs.toggleAutoSkills()).toBe(true);
    expect(gs.autoSkills).toBe(true);
  });

  it('fires every ready skill as the sim ticks', () => {
    const gs = unlockedState();
    gs.toggleAutoSkills();
    gs.update(1);
    // Auto-cast warps fast-forward the sim, so short buffs may already have
    // run their course — the cooldown is the proof each skill fired.
    for (const def of SKILLS) {
      expect(gs.skillCooldownLeft(def.id), def.id).toBeGreaterThan(0);
    }
  });

  it('does nothing while switched off', () => {
    const gs = unlockedState();
    gs.update(5);
    expect(Object.keys(gs.skillTimers)).toHaveLength(0);
  });

  it('recasts after the cooldown elapses', () => {
    const gs = unlockedState();
    gs.toggleAutoSkills();
    gs.update(1);
    // Run well past the first cooldown: without a recast the timer would sit
    // at zero; a live cooldown proves auto-cast fired it again.
    gs.update(WHIRLWIND.cooldownSeconds + 2);
    expect(gs.skillCooldownLeft('whirlwind')).toBeGreaterThan(0);
  });

  it('the toggle survives a serialize round-trip', () => {
    const gs = unlockedState();
    gs.toggleAutoSkills();
    const revived = GameState.deserialize(gs.serialize());
    expect(revived.autoSkills).toBe(true);
  });
});
