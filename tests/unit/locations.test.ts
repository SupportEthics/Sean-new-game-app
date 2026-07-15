import { describe, expect, it } from 'vitest';
import { weaponFrame, GEAR, TIER_NAMES, tierName } from '../../src/config/gear';
import { formatNumber, gearDps } from '../../src/core/EconomyMath';
import {
  isLocationEntrance,
  LOCATIONS,
  locationForStage,
  locationIndex,
  speciesForWave,
  STAGES_PER_LOCATION,
} from '../../src/config/locations';
import { ENEMY_SPECIES } from '../../src/config/stages';

describe('locations', () => {
  it('every 10-stage set maps to one location, cycling after the last', () => {
    expect(locationIndex(1)).toBe(0);
    expect(locationIndex(10)).toBe(0);
    expect(locationIndex(11)).toBe(1);
    expect(locationIndex(80)).toBe(7);
    expect(locationIndex(81)).toBe(8); // the deep-endgame realms
    expect(locationIndex(91)).toBe(9);
    expect(locationIndex(101)).toBe(0); // wraps back around
    expect(locationForStage(21).name).toBe('THE CASTLE');
    expect(locationForStage(61).name).toBe('DRAGONS LAIR');
    expect(locationForStage(85).name).toBe('THE ABYSS');
    expect(locationForStage(95).name).toBe('CELESTIAL REALM');
  });

  it('flags the first stage of each set as an entrance', () => {
    expect(isLocationEntrance(1)).toBe(true);
    expect(isLocationEntrance(11)).toBe(true);
    expect(isLocationEntrance(10)).toBe(false);
    expect(isLocationEntrance(15)).toBe(false);
  });

  it('every location pool references real species with sprite sheets', () => {
    const keys = new Set(ENEMY_SPECIES.map((s) => s.key));
    for (const loc of LOCATIONS) {
      expect(loc.species.length).toBeGreaterThanOrEqual(2);
      for (const k of loc.species) expect(keys.has(k)).toBe(true);
    }
  });

  it('every species appears in at least one location', () => {
    const used = new Set(LOCATIONS.flatMap((l) => [...l.species]));
    for (const s of ENEMY_SPECIES) expect(used.has(s.key)).toBe(true);
  });

  it('waves only spawn monsters from the local pool', () => {
    for (let stage = 1; stage <= 90; stage++) {
      const pool = locationForStage(stage).species;
      for (let wave = 1; wave <= 10; wave++) {
        const sp = speciesForWave(stage, wave);
        expect(pool).toContain(sp.key);
      }
    }
  });

  it('a full set cycles through its whole pool', () => {
    const seen = new Set<string>();
    for (let wave = 1; wave <= 10; wave++) seen.add(speciesForWave(1, wave).key);
    expect(seen.size).toBe(locationForStage(1).species.length);
  });

  it('stage sets are 10 stages long', () => {
    expect(STAGES_PER_LOCATION).toBe(10);
  });
});

describe('weapon art', () => {
  it('tiers 1-25 each get their own sprite frame', () => {
    for (let t = 1; t <= GEAR.weaponArtCount; t++) expect(weaponFrame(t)).toBe(t - 1);
  });

  it('tiers past the art count keep the final blade, never cycling back', () => {
    expect(weaponFrame(26)).toBe(24);
    expect(weaponFrame(GEAR.maxTier)).toBe(24);
  });

  it('the merge ceiling is tier 80 and its numbers still display', () => {
    expect(GEAR.maxTier).toBe(160);
    expect(tierName(80)).toBe('Godsteel Blade +55');
    expect(formatNumber(gearDps(80))).not.toContain('∞'); // huge but finite
    expect(formatNumber(gearDps(80)).length).toBeLessThan(10); // readable suffix
  });

  it('has a name for all 25 sword designs', () => {
    expect(TIER_NAMES.length).toBe(GEAR.weaponArtCount);
    expect(tierName(25)).toBe('Godsteel Blade');
    expect(tierName(27)).toBe('Godsteel Blade +2');
  });
});
