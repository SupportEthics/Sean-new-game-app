import { describe, expect, it } from 'vitest';
import { GEAR } from '../../src/config/gear';
import { enemyHpScale } from '../../src/config/prestige';
import { STAGES } from '../../src/config/stages';
import { enemyHp, heroDps } from '../../src/core/EconomyMath';

const FULL_GRID = 4 + GEAR.gridCols * GEAR.gridRows;

/** Sean reached stage 377 (his top whale stage 251) and the old tier-200
 * cap walled the game near stage 560. Raised to 500, the ceiling is now
 * ~stage 1350 — the cap must leave stage 1000 genuinely reachable while
 * keeping the tail an honest grind. */
describe('the endgame ceiling', () => {
  it('a maxed grid clears the stage-1000 boss inside the boss clock', () => {
    const swordsOnly = heroDps(Array(FULL_GRID).fill(GEAR.maxTier), 4);
    // A deep-endgame knight's passive multipliers (pets, fairy, town,
    // relics, enchants, skins, hero level) are worth well over 100x;
    // even a conservative 20x must beat the boss-timer DPS bar after
    // ten rebirths of +10% enemy HP.
    const need =
      (enemyHp(1000, STAGES.wavesPerStage) * enemyHpScale(10)) / STAGES.bossTimeLimit;
    expect(swordsOnly * 20).toBeGreaterThan(need);
  });

  it('but bare swords alone cannot coast to the ceiling (grind stays real)', () => {
    const swordsOnly = heroDps(Array(FULL_GRID).fill(GEAR.maxTier), 4);
    const need =
      (enemyHp(1500, STAGES.wavesPerStage) * enemyHpScale(10)) / STAGES.bossTimeLimit;
    expect(swordsOnly).toBeLessThan(need);
  });
});
