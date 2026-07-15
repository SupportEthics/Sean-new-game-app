import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildGlobalBoard,
  GlobalRow,
  isValidCallSign,
  rollCallSign,
} from '../../src/config/globalBoard';

describe('call signs', () => {
  it('rolls uppercase words + number, always valid', () => {
    for (let i = 0; i < 200; i++) {
      const name = rollCallSign();
      expect(isValidCallSign(name)).toBe(true);
      expect(name.length).toBeLessThanOrEqual(20);
    }
  });

  it('is deterministic under a seeded rng', () => {
    const rng = () => 0.5;
    expect(rollCallSign(rng)).toBe(rollCallSign(rng));
  });

  it('rejects lowercase, symbols and silly lengths', () => {
    expect(isValidCallSign('grim wolf 47')).toBe(false);
    expect(isValidCallSign('GRIM_WOLF')).toBe(false);
    expect(isValidCallSign('AB')).toBe(false);
    expect(isValidCallSign('A'.repeat(21))).toBe(false);
    expect(isValidCallSign('GRIM WOLF 47')).toBe(true);
  });
});

describe('buildGlobalBoard', () => {
  const real: GlobalRow[] = [
    { device_id: 'aaa', name: 'GRIM WOLF 47', stage: 120, prestiges: 4, skin: 'ember' },
    { device_id: 'bbb', name: 'PALE RAVEN 12', stage: 55, prestiges: 1, skin: 'frost' },
    { device_id: 'me', name: 'IRON KNIGHT 90', stage: 30, prestiges: 0, skin: 'squire' },
  ];

  it('drops my own server row and shows me from local state', () => {
    const board = buildGlobalBoard(real, 'me', 'IRON KNIGHT 90', 33, 0, 'squire');
    const mine = board.filter((r) => r.name.includes('IRON KNIGHT 90') || r.isPlayer);
    expect(mine).toHaveLength(1);
    expect(mine[0].isPlayer).toBe(true);
    expect(mine[0].stage).toBe(33); // local, fresher than the server's 30
  });

  it('mixes real players with the seeded rivals, sorted by stage', () => {
    const board = buildGlobalBoard(real, 'me', 'IRON KNIGHT 90', 33, 0, 'squire');
    const stages = board.map((r) => r.stage);
    expect([...stages].sort((a, b) => b - a)).toEqual(stages);
    expect(board.some((r) => r.name === 'GRIM WOLF 47')).toBe(true);
    expect(board.some((r) => r.name === 'THE FIRST FORGED')).toBe(true); // rival
    expect(board[0].rank).toBe(1);
  });

  it('never cuts the player off the bottom of the board', () => {
    const crowd: GlobalRow[] = Array.from({ length: 80 }, (_, i) => ({
      device_id: `d${i}`,
      name: 'BOLD LION 10',
      stage: 500 - i,
      prestiges: 0,
      skin: 'squire',
    }));
    const board = buildGlobalBoard(crowd, 'me', 'IRON KNIGHT 90', 2, 0, 'squire');
    expect(board.some((r) => r.isPlayer)).toBe(true);
  });
});

describe('GlobalBoard service', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is configured now that the Supabase keys are wired in', async () => {
    const { globalBoard } = await import('../../src/services/GlobalBoard');
    expect(globalBoard.isConfigured).toBe(true);
  });

  it('rejects an invalid call sign before hitting the network', async () => {
    const { globalBoard } = await import('../../src/services/GlobalBoard');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await globalBoard.submit('id', 'bad name!', 10, 0, 'squire')).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails soft (null) when the network throws', async () => {
    const { globalBoard } = await import('../../src/services/GlobalBoard');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await globalBoard.fetchTop()).toBeNull();
  });
});

describe('cloudRestoreAdvice', () => {
  it('offers a restore only when the cloud is ahead', async () => {
    const { cloudRestoreAdvice } = await import('../../src/services/CloudSave');
    const snap = { save: {}, stage: 50, updatedAt: '2026-07-13T00:00:00Z' };
    expect(cloudRestoreAdvice(10, snap)).toBe('offer-restore');
    expect(cloudRestoreAdvice(50, snap)).toBe('push-local');
    expect(cloudRestoreAdvice(90, snap)).toBe('push-local');
    expect(cloudRestoreAdvice(10, null)).toBe('nothing-there');
  });
});

describe('real-players-only view', () => {
  const real: GlobalRow[] = [
    { device_id: 'aaa', name: 'GRIM WOLF 47', stage: 120, prestiges: 4, skin: 'ember' },
  ];

  it('drops the seeded rivals but keeps live players and me', () => {
    const board = buildGlobalBoard(real, 'me', 'IRON KNIGHT 90', 33, 0, 'squire', 60, false);
    expect(board.some((r) => r.name === 'THE FIRST FORGED')).toBe(false); // rival gone
    expect(board.some((r) => r.name === 'GRIM WOLF 47')).toBe(true);
    expect(board.some((r) => r.isPlayer)).toBe(true);
    expect(board).toHaveLength(2);
  });
});

describe('weekly seasons', () => {
  it('counts Monday-anchored weeks from launch, never below 1', async () => {
    const { seasonNumber } = await import('../../src/config/globalBoard');
    const launchMonday = Date.UTC(2026, 6, 13);
    expect(seasonNumber(launchMonday)).toBe(1);
    expect(seasonNumber(launchMonday + 6 * 86_400_000)).toBe(1); // Sunday, same week
    expect(seasonNumber(launchMonday + 7 * 86_400_000)).toBe(2); // next Monday
    expect(seasonNumber(launchMonday - 30 * 86_400_000)).toBe(1); // pre-launch clamps
  });
});
