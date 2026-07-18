import { describe, expect, it } from 'vitest';
import {
  findTownPath,
  isBlocked,
  spotAt,
  TOWN_COLS,
  TOWN_ENTRY,
  TOWN_ROWS,
  TOWN_SPOTS,
} from '../../src/core/TownWalk';

describe('the walkable town', () => {
  it('every building door is walkable and reachable from the gate', () => {
    for (const spot of TOWN_SPOTS) {
      expect(isBlocked(spot.door.x, spot.door.y)).toBe(false);
      const path = findTownPath(TOWN_ENTRY, spot.door);
      expect(path, `path to ${spot.id}`).not.toBeNull();
      // every step stays on walkable ground
      for (const step of path!) expect(isBlocked(step.x, step.y)).toBe(false);
      const last = path![path!.length - 1] ?? TOWN_ENTRY;
      expect(last).toEqual(spot.door);
      // and the door really is beside (or inside reach of) its building
      const near =
        spotAt(spot.door.x - 1, spot.door.y)?.id === spot.id ||
        spotAt(spot.door.x + 1, spot.door.y)?.id === spot.id ||
        spotAt(spot.door.x, spot.door.y - 1)?.id === spot.id ||
        spotAt(spot.door.x, spot.door.y + 1)?.id === spot.id;
      expect(near, `door of ${spot.id} touches it`).toBe(true);
    }
  });

  it('the entry gate is open, the rest of the fence is not', () => {
    expect(isBlocked(TOWN_ENTRY.x, TOWN_ENTRY.y)).toBe(false);
    expect(isBlocked(6, TOWN_ROWS - 1)).toBe(false); // the gate gap
    expect(isBlocked(0, TOWN_ROWS - 1)).toBe(true);
    expect(isBlocked(TOWN_COLS - 1, TOWN_ROWS - 1)).toBe(true);
  });

  it('building footprints block walking; taps route around them', () => {
    const farm = TOWN_SPOTS.find((s) => s.id === 'farm')!;
    expect(isBlocked(farm.rect.x0, farm.rect.y0)).toBe(true);
    expect(findTownPath(TOWN_ENTRY, { x: farm.rect.x0, y: farm.rect.y0 })).toBeNull();
    // walking from one door to another crosses the town
    const smith = TOWN_SPOTS.find((s) => s.id === 'blacksmith')!;
    const keep = TOWN_SPOTS.find((s) => s.id === 'keep')!;
    expect(findTownPath(smith.door, keep.door)).not.toBeNull();
  });

  it('footprints never overlap each other', () => {
    for (let y = 0; y < TOWN_ROWS; y++) {
      for (let x = 0; x < TOWN_COLS; x++) {
        const hits = TOWN_SPOTS.filter(
          (s) => x >= s.rect.x0 && x <= s.rect.x1 && y >= s.rect.y0 && y <= s.rect.y1,
        );
        expect(hits.length).toBeLessThanOrEqual(1);
      }
    }
  });
});
