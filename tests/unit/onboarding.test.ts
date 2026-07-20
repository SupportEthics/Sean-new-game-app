import { beforeEach, describe, expect, it } from 'vitest';
import { ONBOARDING_REWARDS } from '../../src/config/onboarding';
import { GameState } from '../../src/core/GameState';

const DAY = 86_400_000;
const D0 = Date.UTC(2026, 0, 7); // a fixed UTC day

describe('the new-recruit welcome ramp', () => {
  let gs: GameState;
  beforeEach(() => {
    gs = new GameState();
  });

  it('a fresh recruit has day-one waiting and nothing claimed', () => {
    expect(gs.onboardingDay).toBe(0);
    expect(gs.onboardingComplete).toBe(false);
    expect(gs.onboardingReady(D0)).toBe(true);
    expect(gs.todaysOnboardingReward).toEqual(ONBOARDING_REWARDS[0]);
  });

  it('claiming grants the reward and advances the ramp by one', () => {
    const gemsBefore = gs.gems;
    const reward = gs.claimOnboarding(D0);
    expect(reward).toEqual(ONBOARDING_REWARDS[0]);
    expect(gs.gems).toBe(gemsBefore + (ONBOARDING_REWARDS[0].gems ?? 0));
    expect(gs.onboardingDay).toBe(1);
  });

  it('only one gift per UTC day', () => {
    expect(gs.claimOnboarding(D0)).not.toBeNull();
    expect(gs.onboardingReady(D0)).toBe(false);
    expect(gs.claimOnboarding(D0)).toBeNull();
    // Next day the ramp opens again
    expect(gs.onboardingReady(D0 + DAY)).toBe(true);
    expect(gs.claimOnboarding(D0 + DAY)).toEqual(ONBOARDING_REWARDS[1]);
    expect(gs.onboardingDay).toBe(2);
  });

  it('a missed day pauses rather than resets the ramp', () => {
    gs.claimOnboarding(D0); // day 1 -> onboardingDay 1
    // Skip several days; the next claim is still day 2 of the ramp
    const reward = gs.claimOnboarding(D0 + 5 * DAY);
    expect(reward).toEqual(ONBOARDING_REWARDS[1]);
    expect(gs.onboardingDay).toBe(2);
  });

  it('the ramp is one-time: it finishes after all 7 and gives nothing more', () => {
    for (let i = 0; i < ONBOARDING_REWARDS.length; i++) {
      expect(gs.claimOnboarding(D0 + i * DAY)).not.toBeNull();
    }
    expect(gs.onboardingComplete).toBe(true);
    expect(gs.onboardingReady(D0 + 99 * DAY)).toBe(false);
    expect(gs.claimOnboarding(D0 + 99 * DAY)).toBeNull();
    expect(gs.todaysOnboardingReward).toBeNull();
  });

  it('survives a save round-trip', () => {
    gs.claimOnboarding(D0);
    const clone = GameState.deserialize(gs.serialize());
    expect(clone.onboardingDay).toBe(1);
    expect(clone.onboardingLastDay).toBe(gs.onboardingLastDay);
  });
});
