import { describe, expect, it } from 'vitest';
import { DUNGEON } from '../../src/config/dungeon';
import { GameState } from '../../src/core/GameState';
import {
  COMEBACK_NUDGE_HOURS,
  DRAGON_NUDGE_HOUR,
  nextDragonNudge,
  planNotifications,
} from '../../src/core/NotificationPlan';

const NOW = Date.UTC(2026, 0, 7, 12, 0, 0); // Wednesday noon UTC

describe('the notification plan', () => {
  it('a fresh knight gets the full-chest nudge and a comeback nudge', () => {
    const gs = new GameState();
    const plan = planNotifications(gs, NOW);
    expect(plan.map((n) => n.id)).toEqual([3, 4]);
    // The chest nudge fires exactly when offline earnings hit the cap
    const chest = plan.find((n) => n.id === 3)!;
    expect(chest.at).toBe(NOW + gs.offlineCapHours * 3_600_000);
    // The streak nudge lands just under a day out
    const comeback = plan.find((n) => n.id === 4)!;
    expect(comeback.at).toBe(NOW + COMEBACK_NUDGE_HOURS * 3_600_000);
  });

  it('a travelling pet schedules its homecoming a minute after arrival', () => {
    const gs = new GameState();
    gs.expedition = { petId: 'pup', defId: 'hunt', endsAt: NOW + 4 * 3_600_000 };
    const plan = planNotifications(gs, NOW);
    const pet = plan.find((n) => n.id === 1)!;
    expect(pet.at).toBe(NOW + 4 * 3_600_000 + 60_000);
    expect(pet.title).toContain('DIRE PUP');
  });

  it('an already-returned pet is not re-announced', () => {
    const gs = new GameState();
    gs.expedition = { petId: 'pup', defId: 'scout', endsAt: NOW - 1 };
    expect(planNotifications(gs, NOW).find((n) => n.id === 1)).toBeUndefined();
  });

  it('the dragon nudge appears once the dungeon is unlocked', () => {
    const gs = new GameState();
    expect(planNotifications(gs, NOW).find((n) => n.id === 2)).toBeUndefined();
    gs.highestStage = DUNGEON.unlockStage;
    const dragon = planNotifications(gs, NOW).find((n) => n.id === 2)!;
    expect(dragon.at).toBe(nextDragonNudge(NOW));
    expect(dragon.at).toBeGreaterThan(NOW);
  });

  it('the dragon nudge lands at the nudge hour, local time, in the future', () => {
    const at = new Date(nextDragonNudge(NOW));
    expect(at.getHours()).toBe(DRAGON_NUDGE_HOUR);
    expect(at.getMinutes()).toBe(0);
    // And asking just before the hour schedules that same day's nudge
    const justBefore = new Date(NOW);
    justBefore.setHours(DRAGON_NUDGE_HOUR - 1, 30, 0, 0);
    const next = new Date(nextDragonNudge(justBefore.getTime()));
    expect(next.getDate()).toBe(justBefore.getDate());
  });
});
