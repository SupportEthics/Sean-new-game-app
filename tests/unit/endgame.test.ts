import { describe, expect, it } from 'vitest';
import { GEAR } from '../../src/config/gear';
import { enemyHpScale } from '../../src/config/prestige';
import { STAGES } from '../../src/config/stages';
import { enemyHp, heroDps } from '../../src/core/EconomyMath';

const FULL_GRID = 4 + GEAR.gridCols * GEAR.gridRows;

/** Sean reached stage 200 in days and the old tier-80 cap walled the game
 * near stage 250. The cap must leave stage 400 genuinely reachable. */
describe('the endgame ceiling', () => {
  it('a maxed grid clears the stage-400 boss inside the boss clock', () => {
    const swordsOnly = heroDps(Array(FULL_GRID).fill(GEAR.maxTier), 4);
    // A deep-endgame knight's passive multipliers (pets, fairy, town,
    // relics, enchants, skins, hero level) are worth well over 100x;
    // even a conservative 20x must beat the boss-timer DPS bar after
    // ten rebirths of +10% enemy HP.
    const need =
      (enemyHp(400, STAGES.wavesPerStage) * enemyHpScale(10)) / STAGES.bossTimeLimit;
    expect(swordsOnly * 20).toBeGreaterThan(need);
  });

  it('but bare swords alone cannot coast to the ceiling (grind stays real)', () => {
    const swordsOnly = heroDps(Array(FULL_GRID).fill(GEAR.maxTier), 4);
    const need =
      (enemyHp(460, STAGES.wavesPerStage) * enemyHpScale(10)) / STAGES.bossTimeLimit;
    expect(swordsOnly).toBeLessThan(need);
  });
});
