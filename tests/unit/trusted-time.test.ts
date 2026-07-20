import { describe, expect, it } from 'vitest';
import { computeTrusted } from '../../src/services/TrustedTime';

const DAY = 86_400_000;
const REAL = Date.UTC(2026, 6, 20, 12, 0, 0); // a fixed "true" server time

describe('trusted time (anti clock-cheat)', () => {
  it('with a locked server offset, the true time wins whatever the device says', () => {
    // Device clock is wrong by +5 days, but the offset was locked to the
    // server, so device+offset lands back on real time.
    const deviceWrong = REAL + 5 * DAY;
    const offset = REAL - deviceWrong; // what syncTime() computes
    expect(computeTrusted(deviceWrong, offset, 0)).toBe(REAL);
  });

  it('winding the clock BACKWARD is neutralised by the floor', () => {
    const floor = REAL; // highest server-confirmed time seen
    // Player sets the phone back a week; with no fresh offset it would read
    // a week ago, but the floor clamps it to the last real time.
    const deviceBack = REAL - 7 * DAY;
    expect(computeTrusted(deviceBack, 0, floor)).toBe(floor);
  });

  it('never returns a value below the floor, and never rewinds the day', () => {
    const floor = REAL;
    for (const drift of [-DAY, -3600_000, -1, 0]) {
      expect(computeTrusted(REAL + drift, 0, floor)).toBeGreaterThanOrEqual(floor);
    }
  });

  it('genuine forward progress (real time passing) is respected', () => {
    // No cheat: device advances an hour, offset ~0, floor from an hour ago.
    const floor = REAL;
    const later = REAL + 3600_000;
    expect(computeTrusted(later, 0, floor)).toBe(later);
  });
});
