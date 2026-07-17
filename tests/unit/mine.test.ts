import { describe, expect, it } from 'vitest';
import { crystalGemsAt, MINE, veinGoldHoursAt } from '../../src/config/mine';
import {
  Cell,
  descend,
  findPath,
  generateFloor,
  lightRadius,
  mineHit,
  newMine,
  stepTo,
  tickFuel,
} from '../../src/core/MineSim';

/** Deterministic rng: cycles a fixed sequence. */
function seeded(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function count(grid: Cell[][], cell: Cell): number {
  return grid.flat().filter((c) => c === cell).length;
}

describe('floor generation', () => {
  it('always carves a connected cave with a reachable ladder', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const state = newMine(seeded(seed));
      const { grid } = state.floor;
      // exactly one ladder
      expect(count(grid, Cell.Ladder)).toBe(1);
      let lx = -1;
      let ly = -1;
      grid.forEach((row, y) =>
        row.forEach((c, x) => {
          if (c === Cell.Ladder) {
            lx = x;
            ly = y;
          }
        }),
      );
      // the knight can walk to it from the entry
      expect(findPath(state, lx, ly)).not.toBeNull();
    }
  });

  it('spawns ore, crystals and fuel within configured bounds', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { grid } = generateFloor(1, seeded(seed));
      expect(count(grid, Cell.Vein)).toBeGreaterThanOrEqual(MINE.veinsPerFloor[0]);
      expect(count(grid, Cell.Vein)).toBeLessThanOrEqual(MINE.veinsPerFloor[1]);
      expect(count(grid, Cell.Crystal)).toBeGreaterThanOrEqual(MINE.crystalsPerFloor[0]);
      expect(count(grid, Cell.Crystal)).toBeLessThanOrEqual(MINE.crystalsPerFloor[1]);
      expect(count(grid, Cell.Fuel)).toBeGreaterThanOrEqual(MINE.fuelPerFloor[0]);
      expect(count(grid, Cell.Fuel)).toBeLessThanOrEqual(MINE.fuelPerFloor[1]);
    }
  });

  it('keeps a solid rock border', () => {
    const { grid } = generateFloor(3, seeded(7));
    const rows = grid.length;
    const cols = grid[0].length;
    for (let x = 0; x < cols; x++) {
      expect(grid[0][x]).toBe(Cell.Rock);
      expect(grid[rows - 1][x]).toBe(Cell.Rock);
    }
    for (let y = 0; y < rows; y++) {
      expect(grid[y][0]).toBe(Cell.Rock);
      expect(grid[y][cols - 1]).toBe(Cell.Rock);
    }
  });
});

describe('walking and mining', () => {
  it('paths beside a vein, never through rock', () => {
    const state = newMine(seeded(3));
    const { grid } = state.floor;
    let vx = -1;
    let vy = -1;
    grid.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c === Cell.Vein && vx < 0) {
          vx = x;
          vy = y;
        }
      }),
    );
    const path = findPath(state, vx, vy);
    expect(path).not.toBeNull();
    const last = path![path!.length - 1] ?? state.knight;
    expect(Math.abs(last.x - vx) + Math.abs(last.y - vy)).toBe(1);
    // every step is walkable
    for (const step of path!) {
      expect([Cell.Floor, Cell.Fuel, Cell.Ladder]).toContain(grid[step.y][step.x]);
    }
  });

  it('veins take the configured hits and pay depth-scaled gold', () => {
    const state = newMine(seeded(3));
    state.floor.grid[10][5] = Cell.Vein;
    state.knight = { x: 5, y: 11 };
    for (let i = 0; i < MINE.veinHits - 1; i++) {
      expect(mineHit(state, 5, 10).broke).toBe(false);
    }
    const final = mineHit(state, 5, 10);
    expect(final.broke).toBe(true);
    expect(final.goldHours).toBeCloseTo(veinGoldHoursAt(1), 5);
    expect(state.floor.grid[10][5]).toBe(Cell.Floor);
  });

  it('crystals shatter in one and respect the per-run gem cap', () => {
    const state = newMine(seeded(3));
    state.lootGems = MINE.gemCapPerRun - 1;
    state.floor.grid[10][5] = Cell.Crystal;
    state.knight = { x: 5, y: 11 };
    const hit = mineHit(state, 5, 10);
    expect(hit.broke).toBe(true);
    expect(hit.gems).toBe(1); // capped
    expect(state.lootGems).toBe(MINE.gemCapPerRun);
  });

  it('cannot mine from a distance', () => {
    const state = newMine(seeded(3));
    state.floor.grid[10][5] = Cell.Vein;
    state.knight = { x: 5, y: 13 };
    expect(mineHit(state, 5, 10).broke).toBe(false);
    expect(state.floor.grid[10][5]).toBe(Cell.Vein);
  });
});

describe('fuel and descent', () => {
  it('fuel pickups extend the torch; running dry ends the run', () => {
    const state = newMine(seeded(5));
    state.floor.grid[12][6] = Cell.Fuel;
    const before = state.fuelMs;
    expect(stepTo(state, 6, 12)).toBe(MINE.fuelSeconds * 1000);
    expect(state.fuelMs).toBe(before + MINE.fuelSeconds * 1000);
    tickFuel(state, state.fuelMs - 1);
    expect(state.over).toBe(false);
    tickFuel(state, 10);
    expect(state.over).toBe(true);
  });

  it('the light closes in as fuel runs low', () => {
    const state = newMine(seeded(5));
    const bright = lightRadius(state);
    state.fuelMs = 10_000;
    const dim = lightRadius(state);
    state.fuelMs = 3_000;
    const dying = lightRadius(state);
    expect(bright).toBeGreaterThan(dim);
    expect(dim).toBeGreaterThan(dying);
  });

  it('descending needs the ladder underfoot and deepens the mine', () => {
    const state = newMine(seeded(9));
    expect(descend(state, seeded(10))).toBe(false); // not on the ladder
    const { grid } = state.floor;
    grid.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c === Cell.Ladder) state.knight = { x, y };
      }),
    );
    expect(descend(state, seeded(10))).toBe(true);
    expect(state.depth).toBe(2);
    // deeper veins pay more
    expect(veinGoldHoursAt(2)).toBeGreaterThan(veinGoldHoursAt(1));
    expect(crystalGemsAt(4)).toBeGreaterThan(crystalGemsAt(1));
  });
});
