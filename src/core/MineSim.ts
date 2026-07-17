// The Labyrinth's pure logic: floor generation, walking, mining, fuel.
// Each depth is two halves — a mining cave hiding a treasure chest, then
// (once the chest is opened) an actual labyrinth: a true maze whose
// farthest dead end holds the treasure hoard and, beneath it, the ladder
// down. ZERO Phaser — the MineScene renders this state and feeds it taps
// and time. Deterministic via an injectable rng so every rule is testable.
import {
  crystalGemsAt,
  MINE,
  treasureGemsAt,
  treasureGoldHoursAt,
  veinGoldHoursAt,
} from '../config/mine';

export enum Cell {
  Floor = 0,
  Rock = 1,
  Vein = 2,
  Crystal = 3,
  Fuel = 4,
  Ladder = 5,
  Chest = 6,
  Treasure = 7,
}

export type MinePhase = 'cave' | 'maze';

export interface MineFloor {
  grid: Cell[][]; // [row][col]
  entry: { x: number; y: number };
}

export interface MineState {
  depth: number;
  /** 'cave' = the mine; 'maze' = the labyrinth behind the chest. */
  phase: MinePhase;
  floor: MineFloor;
  knight: { x: number; y: number };
  fuelMs: number;
  /** Remaining pickaxe hits per ore cell, keyed "x,y". */
  hits: Record<string, number>;
  /** Banked this run (goldHours converts via income at cash-out). */
  lootGoldHours: number;
  lootGems: number;
  over: boolean;
}

export type Rng = () => number;

const key = (x: number, y: number): string => `${x},${y}`;

function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Carve a wandering cavern, then sprinkle ore/fuel and hide the
 * treasure chest far from the entry. Everything sits inside a 1-tile
 * rock border. */
export function generateFloor(depth: number, rng: Rng): MineFloor {
  const { cols, rows } = MINE;
  const grid: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(Cell.Rock));

  const entry = { x: 2 + randInt(rng, 0, 2), y: rows - 3 };
  let cx = entry.x;
  let cy = entry.y;
  const carve = (x: number, y: number, r: number): void => {
    for (let yy = Math.max(1, y - r); yy <= Math.min(rows - 2, y + r); yy++) {
      for (let xx = Math.max(1, x - r); xx <= Math.min(cols - 2, x + r); xx++) {
        if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r) grid[yy][xx] = Cell.Floor;
      }
    }
  };
  carve(cx, cy, 2);
  // Random walk upward-ish until we near the top: guarantees a connected
  // cavern with a natural far corner for the ladder
  let guard = 400;
  while (cy > 2 && guard-- > 0) {
    const roll = rng();
    if (roll < 0.45) cy -= 1;
    else if (roll < 0.65) cx = Math.max(2, cx - 1);
    else if (roll < 0.85) cx = Math.min(cols - 3, cx + 1);
    else cy = Math.min(rows - 3, cy + 1);
    carve(cx, cy, randInt(rng, 1, 2));
  }
  const chestAt = { x: cx, y: Math.max(1, cy - 1) };
  carve(chestAt.x, chestAt.y, 1);
  grid[chestAt.y][chestAt.x] = Cell.Chest;

  // Floor tiles adjacent to rock make natural ore walls
  const oreSpots: { x: number; y: number }[] = [];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] !== Cell.Rock) continue;
      const touchesFloor =
        grid[y - 1][x] === Cell.Floor ||
        grid[y + 1][x] === Cell.Floor ||
        grid[y][x - 1] === Cell.Floor ||
        grid[y][x + 1] === Cell.Floor;
      if (touchesFloor && !(x === entry.x && y === entry.y)) oreSpots.push({ x, y });
    }
  }
  const take = (n: number, cell: Cell): void => {
    for (let i = 0; i < n && oreSpots.length > 0; i++) {
      const idx = Math.floor(rng() * oreSpots.length);
      const spot = oreSpots.splice(idx, 1)[0];
      grid[spot.y][spot.x] = cell;
    }
  };
  // Deeper floors sprout a few extra veins on top of the base range
  const extraVeins = Math.min(3, Math.floor((depth - 1) / 2));
  take(randInt(rng, ...MINE.veinsPerFloor) + extraVeins, Cell.Vein);
  take(randInt(rng, ...MINE.crystalsPerFloor), Cell.Crystal);
  // Fuel lies on open floor, not in walls
  const floorSpots: { x: number; y: number }[] = [];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] === Cell.Floor && !(x === entry.x && y === entry.y)) {
        floorSpots.push({ x, y });
      }
    }
  }
  for (let i = randInt(rng, ...MINE.fuelPerFloor); i > 0 && floorSpots.length > 0; i--) {
    const idx = Math.floor(rng() * floorSpots.length);
    const spot = floorSpots.splice(idx, 1)[0];
    grid[spot.y][spot.x] = Cell.Fuel;
  }

  return { grid, entry };
}

/** The labyrinth behind the chest: a true maze via recursive
 * backtracker on the odd-cell lattice — 1-tile corridors, rock walls.
 * The treasure hoard sits on the farthest corridor cell from the entry
 * (BFS distance), with fuel dropped along the corridors and a few
 * crystals seamed into the walls between them. */
export function generateMaze(depth: number, rng: Rng): MineFloor {
  const { cols, rows } = MINE;
  const grid: Cell[][] = Array.from({ length: rows }, () => Array<Cell>(cols).fill(Cell.Rock));

  // Carve on odd coordinates; cols/rows are odd so a 1-tile rock border
  // survives on every side
  const entry = { x: 1, y: rows - 2 };
  const stack = [entry];
  grid[entry.y][entry.x] = Cell.Floor;
  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const options: { x: number; y: number }[] = [];
    for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0]] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 1 || ny < 1 || nx > cols - 2 || ny > rows - 2) continue;
      if (grid[ny][nx] === Cell.Rock) options.push({ x: nx, y: ny });
    }
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(rng() * options.length)];
    grid[(cur.y + next.y) / 2][(cur.x + next.x) / 2] = Cell.Floor;
    grid[next.y][next.x] = Cell.Floor;
    stack.push(next);
  }

  // BFS from the entry: the farthest corridor cell hides the hoard
  const dist = new Map<string, number>([[key(entry.x, entry.y), 0]]);
  const queue = [entry];
  let far = entry;
  let farDist = 0;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = dist.get(key(cur.x, cur.y))!;
    if (d > farDist) {
      farDist = d;
      far = cur;
    }
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || ny >= rows || nx >= cols) continue;
      if (grid[ny][nx] !== Cell.Floor || dist.has(key(nx, ny))) continue;
      dist.set(key(nx, ny), d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  grid[far.y][far.x] = Cell.Treasure;

  // Fuel along the corridors (never the entry or the hoard)
  const corridor: { x: number; y: number }[] = [];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] === Cell.Floor && !(x === entry.x && y === entry.y)) {
        corridor.push({ x, y });
      }
    }
  }
  for (let i = randInt(rng, ...MINE.mazeFuelPerFloor); i > 0 && corridor.length > 0; i--) {
    const idx = Math.floor(rng() * corridor.length);
    const spot = corridor.splice(idx, 1)[0];
    grid[spot.y][spot.x] = Cell.Fuel;
  }

  // A few crystals in the walls between corridors — side temptations
  const wallSpots: { x: number; y: number }[] = [];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (grid[y][x] !== Cell.Rock) continue;
      const touchesFloor =
        grid[y - 1][x] === Cell.Floor ||
        grid[y + 1][x] === Cell.Floor ||
        grid[y][x - 1] === Cell.Floor ||
        grid[y][x + 1] === Cell.Floor;
      if (touchesFloor) wallSpots.push({ x, y });
    }
  }
  // Deeper labyrinths seam an extra crystal or two into their walls
  const extraCrystals = Math.min(2, Math.floor((depth - 1) / 3));
  for (let i = randInt(rng, ...MINE.mazeCrystalsPerFloor) + extraCrystals; i > 0 && wallSpots.length > 0; i--) {
    const idx = Math.floor(rng() * wallSpots.length);
    const spot = wallSpots.splice(idx, 1)[0];
    grid[spot.y][spot.x] = Cell.Crystal;
  }

  return { grid, entry };
}

export function newMine(rng: Rng): MineState {
  const floor = generateFloor(1, rng);
  return {
    depth: 1,
    phase: 'cave',
    floor,
    knight: { ...floor.entry },
    fuelMs: MINE.torchSeconds * 1000,
    hits: {},
    lootGoldHours: 0,
    lootGems: 0,
    over: false,
  };
}

/** BFS path over floor-ish tiles from the knight to (tx,ty); the target
 * may be a walkable tile OR a mineable/ladder tile (path stops beside
 * it). Returns tile steps excluding the start, or null if unreachable. */
export function findPath(
  state: MineState,
  tx: number,
  ty: number,
): { x: number; y: number }[] | null {
  const { grid } = state.floor;
  const rows = grid.length;
  const cols = grid[0].length;
  const walkable = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && y < rows && x < cols &&
    (grid[y][x] === Cell.Floor || grid[y][x] === Cell.Fuel || grid[y][x] === Cell.Ladder);
  const targetIsSolid = !walkable(tx, ty);

  const start = state.knight;
  const prev = new Map<string, string | null>();
  const queue: { x: number; y: number }[] = [start];
  prev.set(key(start.x, start.y), null);
  let found: { x: number; y: number } | null = null;
  while (queue.length > 0 && !found) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (prev.has(key(nx, ny))) continue;
      if (targetIsSolid && nx === tx && ny === ty) {
        // Stop beside the ore: cur is the standing tile
        found = cur;
        break;
      }
      if (!walkable(nx, ny)) continue;
      prev.set(key(nx, ny), key(cur.x, cur.y));
      if (!targetIsSolid && nx === tx && ny === ty) {
        found = { x: nx, y: ny };
        break;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  if (!found) return null;
  const path: { x: number; y: number }[] = [];
  let cursor: string | null = key(found.x, found.y);
  while (cursor) {
    const [x, y] = cursor.split(',').map(Number);
    path.unshift({ x, y });
    cursor = prev.get(cursor) ?? null;
  }
  path.shift(); // drop the start tile
  return path;
}

/** One pickaxe swing at an adjacent ore cell. Returns what happened. */
export function mineHit(
  state: MineState,
  x: number,
  y: number,
): { broke: boolean; goldHours: number; gems: number } {
  const cell = state.floor.grid[y][x];
  const nothing = { broke: false, goldHours: 0, gems: 0 };
  if (cell !== Cell.Vein && cell !== Cell.Crystal) return nothing;
  const dx = Math.abs(state.knight.x - x);
  const dy = Math.abs(state.knight.y - y);
  if (dx + dy !== 1) return nothing; // must stand beside it
  const k = key(x, y);
  const needed = cell === Cell.Vein ? MINE.veinHits : 1;
  const left = (state.hits[k] ?? needed) - 1;
  if (left > 0) {
    state.hits[k] = left;
    return nothing;
  }
  delete state.hits[k];
  state.floor.grid[y][x] = Cell.Floor;
  if (cell === Cell.Vein) {
    const goldHours = veinGoldHoursAt(state.depth);
    state.lootGoldHours += goldHours;
    return { broke: true, goldHours, gems: 0 };
  }
  const gems = Math.min(crystalGemsAt(state.depth), Math.max(0, MINE.gemCapPerRun - state.lootGems));
  state.lootGems += gems;
  return { broke: true, goldHours: 0, gems };
}

/** Step onto a tile; picks up fuel underfoot. Returns fuel gained (ms). */
export function stepTo(state: MineState, x: number, y: number): number {
  state.knight = { x, y };
  if (state.floor.grid[y][x] === Cell.Fuel) {
    state.floor.grid[y][x] = Cell.Floor;
    state.fuelMs += MINE.fuelSeconds * 1000;
    return MINE.fuelSeconds * 1000;
  }
  return 0;
}

/** Open the cave's chest (must stand beside it): the lid swings back on
 * a stairway — the labyrinth. Swaps the floor for a true maze and tops
 * the torch up for the corridors ahead. */
export function openChest(state: MineState, rng: Rng): boolean {
  if (state.phase !== 'cave') return false;
  const cx = state.knight.x;
  const cy = state.knight.y;
  let beside = false;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    if (state.floor.grid[cy + dy]?.[cx + dx] === Cell.Chest) beside = true;
  }
  if (!beside) return false;
  state.phase = 'maze';
  state.floor = generateMaze(state.depth, rng);
  state.knight = { ...state.floor.entry };
  state.hits = {};
  state.fuelMs += MINE.chestFuelSeconds * 1000;
  return true;
}

/** Loot the hoard at the maze's heart (must stand beside it). Pays
 * depth-scaled gold + gems and uncovers the ladder beneath the pile. */
export function lootTreasure(state: MineState): { goldHours: number; gems: number } | null {
  if (state.phase !== 'maze') return null;
  const cx = state.knight.x;
  const cy = state.knight.y;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    const x = cx + dx;
    const y = cy + dy;
    if (state.floor.grid[y]?.[x] !== Cell.Treasure) continue;
    state.floor.grid[y][x] = Cell.Ladder;
    const goldHours = treasureGoldHoursAt(state.depth);
    state.lootGoldHours += goldHours;
    const gems = Math.min(
      treasureGemsAt(state.depth),
      Math.max(0, MINE.gemCapPerRun - state.lootGems),
    );
    state.lootGems += gems;
    return { goldHours, gems };
  }
  return null;
}

/** Standing on the looted hoard's ladder: descend to the next, richer
 * cave. Only the maze holds a way down. */
export function descend(state: MineState, rng: Rng): boolean {
  const { x, y } = state.knight;
  if (state.phase !== 'maze' || state.floor.grid[y][x] !== Cell.Ladder) return false;
  state.depth += 1;
  state.phase = 'cave';
  state.floor = generateFloor(state.depth, rng);
  state.knight = { ...state.floor.entry };
  state.hits = {};
  return true;
}

/** Burn torchlight; flips `over` when the dark arrives. */
export function tickFuel(state: MineState, dtMs: number): void {
  if (state.over) return;
  state.fuelMs = Math.max(0, state.fuelMs - dtMs);
  if (state.fuelMs === 0) state.over = true;
}

/** Light radius in tiles for the scene's falloff (shrinks when low). */
export function lightRadius(state: MineState): number {
  const secs = state.fuelMs / 1000;
  if (secs > 25) return 5.2;
  if (secs > 12) return 4.2;
  if (secs > 5) return 3.2;
  return 2.4;
}
