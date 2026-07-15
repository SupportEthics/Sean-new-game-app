import { describe, expect, it } from 'vitest';
import { BATTLE_PASS } from '../../src/config/monetization';
import {
  freeRewardFor,
  PASS,
  passDaysLeft,
  passLevel,
  passSeason,
  premiumRewardFor,
} from '../../src/config/pass';
import { GameState } from '../../src/core/GameState';

const DAY = 86_400_000;

describe('pass seasons', () => {
  it('rolls every 30 days from the epoch', () => {
    expect(passSeason(PASS.epoch)).toBe(1);
    expect(passSeason(PASS.epoch + 29 * DAY)).toBe(1);
    expect(passSeason(PASS.epoch + 30 * DAY)).toBe(2);
    expect(passDaysLeft(PASS.epoch)).toBe(30);
    expect(passDaysLeft(PASS.epoch + 29 * DAY + 1)).toBe(1);
  });

  it('levels cap at 30', () => {
    expect(passLevel(0)).toBe(0);
    expect(passLevel(150)).toBe(1);
    expect(passLevel(999_999)).toBe(PASS.maxLevel);
  });

  it('every level pays something in both lanes', () => {
    for (let lv = 1; lv <= PASS.maxLevel; lv++) {
      const free = freeRewardFor(lv);
      const pro = premiumRewardFor(lv);
      expect(free.gems || free.goldHours || free.goldEgg).toBeTruthy();
      expect(pro.gems || pro.goldHours || pro.goldEgg).toBeTruthy();
    }
  });
});

describe('pass progression', () => {
  it('playing earns XP through the quest tracker', () => {
    const gs = new GameState();
    gs.trackQuest('stages'); // +5 XP
    gs.trackQuest('raids'); // +25 XP
    expect(gs.passXp).toBe(PASS.xp.stages + PASS.xp.raids);
  });

  it('free claims work at level; premium needs the purchase', () => {
    const gs = new GameState();
    gs.addPassXp(PASS.xpPerLevel); // level 1
    expect(gs.canClaimPass(1, 'free')).toBe(true);
    expect(gs.canClaimPass(1, 'premium')).toBe(false);
    const gems = gs.gems;
    expect(gs.claimPass(1, 'free')).not.toBeNull();
    expect(gs.gems).toBeGreaterThan(gems);
    expect(gs.claimPass(1, 'free')).toBeNull(); // once only
    // Buy premium -> the lane opens for the same level
    expect(gs.fulfillProduct(BATTLE_PASS.sku)).toBe(true);
    expect(gs.canClaimPass(1, 'premium')).toBe(true);
    expect(gs.fulfillProduct(BATTLE_PASS.sku)).toBe(false); // once per season
  });

  it('a new season wipes XP and claims; premium stays with its season', () => {
    const gs = new GameState();
    gs.addPassXp(500);
    gs.fulfillProduct(BATTLE_PASS.sku);
    gs.claimPass(1, 'free');
    const season1 = gs.passSeasonNum;
    gs.clock = () => PASS.epoch + 31 * DAY; // next season
    expect(gs.passLevelNow).toBeGreaterThanOrEqual(0);
    gs.addPassXp(0); // touch to sync
    expect(gs.passSeasonNum).toBe(season1 + 1);
    expect(gs.passXp).toBe(0);
    expect(gs.passClaimed(1, 'free')).toBe(false);
    expect(gs.passPremiumOwned()).toBe(false); // last season's pass expired
  });

  it('pass state survives a save round-trip', () => {
    const gs = new GameState();
    gs.addPassXp(250);
    gs.fulfillProduct(BATTLE_PASS.sku);
    gs.claimPass(1, 'premium');
    const revived = GameState.deserialize(JSON.parse(JSON.stringify(gs.serialize())));
    expect(revived.passXp).toBe(250);
    expect(revived.passPremiumOwned()).toBe(true);
    expect(revived.passClaimed(1, 'premium')).toBe(true);
  });
});
