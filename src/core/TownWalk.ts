// The walkable Town's pure layout: a tile grid taller than the screen,
// building footprints that block walking, and a BFS path to any tapped
// tile — tap a building and the path runs to its door tile instead.
// ZERO Phaser; the TownScene renders this and feeds it taps.

export const TOWN_TILE = 30;
export const TOWN_COLS = 13;
export const TOWN_ROWS = 38;

export type TownSpotId = 'keep' | 'farm' | 'blacksmith' | 'soulforge' | 'mine' | 'jeweler';

export interface TownSpot {
  id: TownSpotId;
  /** Blocked footprint in tiles, inclusive. */
  rect: { x0: number; y0: number; x1: number; y1: number };
  /** Walkable tile the knight stands on to interact. */
  door: { x: number; y: number };
  /** Sprite anchor in world px (centre of the structure). */
  anchor: { x: number; y: number };
}

export const TOWN_SPOTS: TownSpot[] = [
  { id: 'keep', rect: { x0: 1, y0: 0, x1: 11, y1: 5 }, door: { x: 6, y: 6 }, anchor: { x: 195, y: 126 } },
  { id: 'farm', rect: { x0: 0, y0: 8, x1: 4, y1: 12 }, door: { x: 5, y: 10 }, anchor: { x: 73, y: 292 } },
  { id: 'blacksmith', rect: { x0: 8, y0: 8, x1: 12, y1: 10 }, door: { x: 7, y: 10 }, anchor: { x: 317, y: 285 } },
  { id: 'soulforge', rect: { x0: 4, y0: 14, x1: 5, y1: 15 }, door: { x: 6, y: 15 }, anchor: { x: 150, y: 450 } },
  { id: 'mine', rect: { x0: 0, y0: 20, x1: 4, y1: 22 }, door: { x: 5, y: 21 }, anchor: { x: 73, y: 645 } },
  { id: 'jeweler', rect: { x0: 8, y0: 20, x1: 12, y1: 22 }, door: { x: 7, y: 21 }, anchor: { x: 317, y: 642 } },
];

/** Where the knight enters: the gate at the bottom of the lane. */
export const TOWN_ENTRY = { x: 6, y: 35 };

/** Tiles drawn (and walked) as cobbles: the lane, the crossbars, the
 * castle forecourt. */
export function isCobble(x: number, y: number): boolean {
  if (x === 6 && y >= 6) return true;
  if ((y === 16 || y === 17) && x >= 0 && x <= 12) return true;
  if (y === 6 && x >= 4 && x <= 8) return true;
  return false;
}

/** The farm's wheat rows, drawn golden (part of the farm footprint). */
export function isField(x: number, y: number): boolean {
  return x >= 0 && x <= 4 && y >= 11 && y <= 12;
}

export function spotAt(x: number, y: number): TownSpot | null {
  for (const s of TOWN_SPOTS) {
    if (x >= s.rect.x0 && x <= s.rect.x1 && y >= s.rect.y0 && y <= s.rect.y1) return s;
  }
  return null;
}

export function isBlocked(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= TOWN_COLS || y >= TOWN_ROWS) return true;
  // bottom fence with a gate gap on the lane
  if (y === TOWN_ROWS - 1 && x !== 6) return true;
  return spotAt(x, y) !== null;
}

/** BFS from `from` to `to` over walkable tiles. Returns the step list
 * excluding the start, or null if unreachable. Tap a building tile and
 * the caller should route to its spot's door instead. */
export function findTownPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] | null {
  if (isBlocked(to.x, to.y)) return null;
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x: number, y: number): string => `${x},${y}`;
  const prev = new Map<string, string | null>([[key(from.x, from.y), null]]);
  const queue = [from];
  let found = false;
  while (queue.length > 0 && !found) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (prev.has(key(nx, ny)) || isBlocked(nx, ny)) continue;
      prev.set(key(nx, ny), key(cur.x, cur.y));
      if (nx === to.x && ny === to.y) {
        found = true;
        break;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  if (!found) return null;
  const path: { x: number; y: number }[] = [];
  let cursor: string | null = key(to.x, to.y);
  while (cursor) {
    const [x, y] = cursor.split(',').map(Number);
    path.unshift({ x, y });
    cursor = prev.get(cursor) ?? null;
  }
  path.shift();
  return path;
}
