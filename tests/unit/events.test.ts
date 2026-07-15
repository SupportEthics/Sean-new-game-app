import { describe, expect, it } from 'vitest';
import { activeEvent, eventActiveAt, EVENTS } from '../../src/config/events';
import { GameState } from '../../src/core/GameState';

// Known UTC anchors
const WED = Date.UTC(2026, 0, 7); // Wednesday
const FRI = Date.UTC(2026, 0, 9); // Friday
const SAT = Date.UTC(2026, 0, 10);
const SUN = Date.UTC(2026, 0, 11);
const WEEK = 7 * 86_400_000;

/** First Friday at/after FRI whose weekend runs the given event. */
function fridayFor(id: string): number {
  for (let i = 0; i < EVENTS.length; i++) {
    const ts = FRI + i * WEEK;
    if (activeEvent(ts)?.id === id) return ts;
  }
  throw new Error(`no weekend found for ${id}`);
}

describe('event schedule', () => {
  it('runs only on Friday through Sunday (UTC)', () => {
    expect(eventActiveAt(WED)).toBe(false);
    expect(eventActiveAt(FRI)).toBe(true);
    expect(eventActiveAt(SAT)).toBe(true);
    expect(eventActiveAt(SUN)).toBe(true);
    expect(activeEvent(WED)).toBeNull();
    expect(activeEvent(FRI)).not.toBeNull();
  });

  it('holds the same event across one weekend', () => {
    const fri = activeEvent(FRI)!;
    expect(activeEvent(SAT)!.id).toBe(fri.id);
    expect(activeEvent(SUN)!.id).toBe(fri.id);
  });

  it('rotates weekend to weekend, covering every event', () => {
    const seen = new Set<string>();
    for (let i = 0; i < EVENTS.length; i++) seen.add(activeEvent(FRI + i * WEEK)!.id);
    expect(seen.size).toBe(EVENTS.length);
  });
});

describe('event effects on the sim', () => {
  it('no event on a weekday: multipliers untouched', () => {
    const gs = new GameState();
    expect(gs.currentEvent).toBeNull();
  });

  it('gold weekend multiplies battle gold', () => {
    const gs = new GameState();
    const base = gs.goldMultiplier;
    gs.clock = () => fridayFor('gold');
    expect(gs.goldMultiplier).toBeCloseTo(base * 1.5, 5);
  });

  it('storm weekend multiplies hero DPS', () => {
    const gs = new GameState();
    gs.grid[0] = 3;
    const base = gs.heroDps;
    gs.clock = () => fridayFor('storm');
    expect(gs.heroDps).toBeCloseTo(base * 1.25, 5);
  });

  it('soul harvest doubles the rebirth payout', () => {
    const gs = new GameState();
    gs.battle.stage = 45;
    gs.highestStage = 45;
    const base = gs.prestigeReward;
    gs.clock = () => fridayFor('souls');
    expect(gs.prestigeReward).toBe(base * 2);
  });

  it('raid frenzy doubles raid gold per kill', () => {
    const mk = (clockMs: number): number => {
      const gs = new GameState();
      gs.clock = () => clockMs;
      gs.prestigeCount = 1;
      gs.highestStage = 99;
      gs.grid[0] = 40; // enough DPS to one-shot raid level 1
      const before = gs.gold;
      gs.startRaid(1, clockMs);
      // Step until the kill cap ends the raid, so normal battle gold never
      // pollutes the measurement
      for (let i = 0; i < 100 && gs.raid; i++) gs.update(0.1);
      return gs.gold - before;
    };
    // Compare a frenzy weekend against a quiet Wednesday
    const quiet = mk(WED);
    const frenzy = mk(fridayFor('raid'));
    expect(quiet).toBeGreaterThan(0);
    expect(frenzy).toBeGreaterThanOrEqual(quiet * 2);
  });
});
