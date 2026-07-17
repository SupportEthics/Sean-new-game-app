import { describe, expect, it } from 'vitest';
import {
  crystalGemsAt,
  MINE,
  treasureGemsAt,
  treasureGoldHoursAt,
  veinGoldHoursAt,
} from '../../src/config/mine';
import {
  Cell,
  descend,
  findPath,
  generateFloor,
  generateMaze,
  lightRadius,
  lootTreasure,
  mineHit,
  MineState,
  newMine,
  openChest,
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

function find(grid: Cell[][], cell: Cell): { x: number; y: number } {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === cell) return { x, y };
    }
  }
  return { x: -1, y: -1 };
}

/** Walk the knight beside a solid cell via findPath (throws if no path). */
function walkBeside(state: MineState, x: number, y: number): void {
  const path = findPath(state, x, y);
  expect(path).not.toBeNull();
  const last = path![path!.length - 1] ?? state.knight;
  state.knight = { ...last };
}

describe('cave generation', () => {
  it('always carves a connected cave with a reachable treasure chest', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const state = newMine(seeded(seed));
      const { grid } = state.floor;
      expect(state.phase).toBe('cave');
      // exactly one chest, no ladder or hoard yet
      expect(count(grid, Cell.Chest)).toBe(1);
      expect(count(grid, Cell.Ladder)).toBe(0);
      expect(count(grid, Cell.Treasure)).toBe(0);
      // the knight can walk to stand beside it from the entry
      const chest = find(grid, Cell.Chest);
      expect(findPath(state, chest.x, chest.y)).not.toBeNull();
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

describe('the labyrinth (maze half)', () => {
  it('always generates a solvable maze with one hoard at its heart', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const floor = generateMaze(1, seeded(seed));
      const { grid } = floor;
      expect(count(grid, Cell.Treasure)).toBe(1);
      expect(count(grid, Cell.Chest)).toBe(0);
      // solvable: a walk from the entry reaches beside the hoard
      const state: MineState = {
        depth: 1,
        phase: 'maze',
        floor,
        knight: { ...floor.entry },
        fuelMs: 60_000,
        hits: {},
        lootGoldHours: 0,
        lootGems: 0,
        over: false,
      };
      const hoard = find(grid, Cell.Treasure);
      expect(findPath(state, hoard.x, hoard.y)).not.toBeNull();
      // rock border intact
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
    }
  });

  it('is a true maze: narrow corridors, no open chambers', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { grid } = generateMaze(1, seeded(seed));
      // no 2x2 block of walkable tiles anywhere — corridors are 1 wide
      const open = (y: number, x: number): boolean => grid[y][x] !== Cell.Rock && grid[y][x] !== Cell.Crystal;
      for (let y = 0; y < grid.length - 1; y++) {
        for (let x = 0; x < grid[y].length - 1; x++) {
          const block = open(y, x) && open(y, x + 1) && open(y + 1, x) && open(y + 1, x + 1);
          expect(block).toBe(false);
        }
      }
    }
  });

  it('drops fuel on the corridors within configured bounds', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { grid } = generateMaze(2, seeded(seed));
      expect(count(grid, Cell.Fuel)).toBeGreaterThanOrEqual(MINE.mazeFuelPerFloor[0]);
      expect(count(grid, Cell.Fuel)).toBeLessThanOrEqual(MINE.mazeFuelPerFloor[1]);
      expect(count(grid, Cell.Crystal)).toBeGreaterThanOrEqual(MINE.mazeCrystalsPerFloor[0]);
      expect(count(grid, Cell.Crystal)).toBeLessThanOrEqual(MINE.mazeCrystalsPerFloor[1]);
    }
  });
});

describe('chest, hoard and descent', () => {
  it('the chest only opens from beside it and swaps in the maze', () => {
    const state = newMine(seeded(4));
    expect(openChest(state, seeded(5))).toBe(false); // entry is far away
    const chest = find(state.floor.grid, Cell.Chest);
    walkBeside(state, chest.x, chest.y);
    const fuelBefore = state.fuelMs;
    expect(openChest(state, seeded(5))).toBe(true);
    expect(state.phase).toBe('maze');
    expect(state.knight).toEqual(state.floor.entry);
    expect(state.fuelMs).toBe(fuelBefore + MINE.chestFuelSeconds * 1000);
    expect(count(state.floor.grid, Cell.Treasure)).toBe(1);
    // and never opens twice
    expect(openChest(state, seeded(5))).toBe(false);
  });

  it('looting the hoard pays depth-scaled treasure and uncovers the ladder', () => {
    const state = newMine(seeded(4));
    const chest = find(state.floor.grid, Cell.Chest);
    walkBeside(state, chest.x, chest.y);
    openChest(state, seeded(5));
    expect(lootTreasure(state)).toBeNull(); // entry is far from the hoard
    const hoard = find(state.floor.grid, Cell.Treasure);
    walkBeside(state, hoard.x, hoard.y);
    const paid = lootTreasure(state);
    expect(paid).not.toBeNull();
    expect(paid!.goldHours).toBeCloseTo(treasureGoldHoursAt(1), 5);
    expect(paid!.gems).toBe(treasureGemsAt(1));
    expect(state.lootGems).toBe(treasureGemsAt(1));
    expect(state.floor.grid[hoard.y][hoard.x]).toBe(Cell.Ladder);
    // hoard gems respect the per-run cap
    const capped = newMine(seeded(6));
    const c2 = find(capped.floor.grid, Cell.Chest);
    walkBeside(capped, c2.x, c2.y);
    openChest(capped, seeded(7));
    capped.lootGems = MINE.gemCapPerRun - 1;
    const h2 = find(capped.floor.grid, Cell.Treasure);
    walkBeside(capped, h2.x, h2.y);
    expect(lootTreasure(capped)!.gems).toBe(1);
  });

  it('descending needs the maze ladder underfoot and returns to a cave', () => {
    const state = newMine(seeded(9));
    expect(descend(state, seeded(10))).toBe(false); // no ladder in the cave
    const chest = find(state.floor.grid, Cell.Chest);
    walkBeside(state, chest.x, chest.y);
    openChest(state, seeded(10));
    const hoard = find(state.floor.grid, Cell.Treasure);
    walkBeside(state, hoard.x, hoard.y);
    lootTreasure(state);
    expect(descend(state, seeded(11))).toBe(false); // beside, not on it
    const ladder = find(state.floor.grid, Cell.Ladder);
    state.knight = { ...ladder };
    expect(descend(state, seeded(11))).toBe(true);
    expect(state.depth).toBe(2);
    expect(state.phase).toBe('cave');
    expect(count(state.floor.grid, Cell.Chest)).toBe(1);
    // deeper floors pay more
    expect(veinGoldHoursAt(2)).toBeGreaterThan(veinGoldHoursAt(1));
    expect(crystalGemsAt(4)).toBeGreaterThan(crystalGemsAt(1));
    expect(treasureGoldHoursAt(3)).toBeGreaterThan(treasureGoldHoursAt(1));
    expect(treasureGemsAt(3)).toBeGreaterThan(treasureGemsAt(1));
  });
});

describe('walking and mining', () => {
  it('paths beside a vein, never through rock', () => {
    const state = newMine(seeded(3));
    const { grid } = state.floor;
    const vein = find(grid, Cell.Vein);
    const path = findPath(state, vein.x, vein.y);
    expect(path).not.toBeNull();
    const last = path![path!.length - 1] ?? state.knight;
    expect(Math.abs(last.x - vein.x) + Math.abs(last.y - vein.y)).toBe(1);
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

describe('fuel and light', () => {
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

  it('the dark presses in with depth, down to a hard floor', () => {
    const state = newMine(seeded(5));
    const surface = lightRadius(state);
    state.depth = 5;
    const deep = lightRadius(state);
    state.depth = 50;
    const abyss = lightRadius(state);
    expect(surface).toBeGreaterThan(deep);
    expect(deep).toBeGreaterThan(abyss);
    expect(abyss).toBe(MINE.minLightRadius);
    // full fuel at depth 5 still beats low fuel at depth 5
    state.depth = 5;
    const deepBright = lightRadius(state);
    state.fuelMs = 3_000;
    expect(deepBright).toBeGreaterThan(lightRadius(state));
  });

  it('fuel spawns thin out on deeper floors but never vanish', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const shallow = count(generateFloor(1, seeded(seed)).grid, Cell.Fuel);
      const deep = count(generateFloor(1 + MINE.fuelDropEveryDepths, seeded(seed)).grid, Cell.Fuel);
      expect(deep).toBeLessThanOrEqual(MINE.fuelPerFloor[1] - 1);
      expect(deep).toBeLessThanOrEqual(shallow);
      const bottom = count(generateFloor(99, seeded(seed)).grid, Cell.Fuel);
      expect(bottom).toBe(1);
      const mazeDeep = count(generateMaze(1 + MINE.fuelDropEveryDepths, seeded(seed)).grid, Cell.Fuel);
      const mazeShallow = count(generateMaze(1, seeded(seed)).grid, Cell.Fuel);
      expect(mazeDeep).toBe(Math.max(1, mazeShallow - 1));
    }
  });
});
