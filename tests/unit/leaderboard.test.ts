import { describe, expect, it } from 'vitest';
import { buildBoard, RIVALS } from '../../src/config/leaderboard';

describe('hall of legends', () => {
  it('slots the player by highest stage, losing ties to rivals', () => {
    const board = buildBoard(41, 1, 'squire');
    const me = board.find((r) => r.isPlayer)!;
    const rook = board.find((r) => r.name === 'ROOK OF EMBERS')!;
    expect(me.rank).toBe(rook.rank + 1); // tie at 41 -> rival stays ahead
  });

  it('a brand-new player starts near the bottom, a legend hits rank 1', () => {
    const fresh = buildBoard(1, 0, 'squire');
    expect(fresh.find((r) => r.isPlayer)!.rank).toBe(RIVALS.length + 1);
    const legend = buildBoard(301, 20, 'voidreaper');
    expect(legend.find((r) => r.isPlayer)!.rank).toBe(1);
  });

  it('ranks are dense, ordered and include everyone exactly once', () => {
    const board = buildBoard(60, 2, 'squire');
    expect(board).toHaveLength(RIVALS.length + 1);
    board.forEach((row, i) => expect(row.rank).toBe(i + 1));
    for (let i = 1; i < board.length; i++) {
      expect(board[i].stage).toBeLessThanOrEqual(board[i - 1].stage);
    }
    expect(board.filter((r) => r.isPlayer)).toHaveLength(1);
  });

  it('there is always a next rival to chase until the very top', () => {
    for (const stage of [1, 10, 50, 120, 250]) {
      const board = buildBoard(stage, 0, 'squire');
      const me = board.find((r) => r.isPlayer)!;
      expect(me.rank).toBeGreaterThan(1); // someone above to beat
    }
  });
});
