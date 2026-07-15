import { AchievementDef, ACHIEVEMENTS, achievementById } from '../config/achievements';
import { AD_LOOT, BOOSTS, ECONOMY } from '../config/economy';
import { FAIRY, fairyLevelCost } from '../config/fairy';
import { GiftDef } from '../config/gifts';
import { LOGIN_REWARDS, LoginReward } from '../config/loginRewards';
import {
  BATTLE_PASS,
  bundleBySku,
  FREE_CHEST,
  gemPackBySku,
  goldPackBySku,
  PIGGY,
  REMOVE_ADS,
  STARTER_PACK,
} from '../config/monetization';
import { enemyHpScale, PRESTIGE, soulsFor } from '../config/prestige';
import {
  DAILY_QUESTS,
  isNextDay,
  periodKey,
  QUESTS,
  QuestMetric,
  QuestPeriod,
  questBy,
  STREAK_BONUS_CAP,
  STREAK_BONUS_PER_DAY,
  utcDay,
} from '../config/quests';
import {
  ACTIVE_PET_SLOTS,
  eggPool,
  EVOLUTION,
  goldEggCost,
  EGGS,
  PET_DUP_GEMS,
  PET_MAX_LEVEL,
  PetDef,
  petById,
  rollPet,
} from '../config/pets';
import { AUTO_SKILLS_UNLOCK_STAGE, SKILLS, skillDefById } from '../config/skills';
import { activeEvent, EventDef } from '../config/events';
import {
  DUNGEON,
  dungeonDuration,
  dungeonGems,
  dungeonModifier,
  dungeonQuota,
} from '../config/dungeon';
import { CodexEntry, codexEntries } from '../config/codex';
import { enchantById, enchantCost } from '../config/enchants';
import { expeditionById } from '../config/expeditions';
import { DUELS } from '../config/duels';
import {
  freeRewardFor,
  PASS,
  passLevel,
  PassReward,
  passSeason,
  premiumRewardFor,
} from '../config/pass';
import { DailyDeal, dailyDeal } from '../config/dailyDeal';
import { soulUpgradeById, soulUpgradeCost } from '../config/soulsTree';
import { buildingById, buildingCost, TOWN } from '../config/town';
import { RAIDS, raidClearKills, raidGems, raidGoldPerKill, raidKillCap, raidMonsterHp } from '../config/raids';
import { DEFAULT_SKIN, SKINS, SkinDef, skinById } from '../config/skins';
import { premiumSwordById, premiumSwordBySku, SWORD_ART } from '../config/swordSkins';
import { BattleState, newBattleState, tick, TickResult } from './BattleSim';
import { GEAR, unlockedSlots } from '../config/gear';
import {
  buyTierUpgradeCost,
  cellCost,
  duelWinChance,
  enemyHp,
  formatNumber,
  gearCost,
  goldDrop,
  heroDps,
  heroLevel,
  levelDpsMultiplier,
  sellValue,
} from './EconomyMath';
import {
  emptyGrid,
  EQUIP_CELLS,
  findBestMerge,
  Grid,
  gridTiers,
  isFull,
  merge,
  move,
  spawn,
  TOTAL_CELLS,
} from './MergeLogic';

/** Random UUID for the leaderboard row; crypto when available (browser,
 * node), timestamp fallback otherwise. */
function newDeviceId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback: hand-rolled v4-shaped UUID (valid for the server's uuid type)
  const hex = (n: number) =>
    Math.floor(Math.random() * 16 ** n)
      .toString(16)
      .padStart(n, '0');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-8${hex(3)}-${hex(12)}`;
}

export interface GameEvents {
  'gold:changed': number;
  'gems:changed': number;
  'grid:changed': Grid;
  'battle:tick': TickResult;
  'stage:changed': number;
  'boss:failed': number;
  'gear:merged': { index: number; tier: number };
  'gear:bought': { index: number; tier: number };
  'skin:changed': string;
  'swordskin:changed': string;
  'swordskins:changed': string[];
  'skins:changed': string[];
  'cells:changed': number;
  'prestige:done': number;
  'souls:changed': number;
  'quests:changed': undefined;
  'raid:started': number;
  'raid:ended': RaidResult;
  'pets:changed': Record<string, number>;
  'shop:changed': undefined;
  'skills:changed': undefined;
  'codex:changed': undefined;
  'enchants:changed': undefined;
  'expedition:changed': undefined;
  'duel:done': boolean;
  'pass:changed': undefined;
  'fairy:changed': number;
  'login:changed': undefined;
  'town:changed': undefined;
}

/** Sim-time seconds left on a skill's buff and cooldown. */
export interface SkillTimer {
  active: number;
  cooldown: number;
}

export type EggKind = 'gold' | 'gem' | 'free';

export interface HatchResult {
  pet: PetDef;
  /** Level after hatching (0 delta means it was already maxed). */
  level: number;
  /** True when the pet was already max level; consolation gems were paid. */
  wasMaxed: boolean;
}

type Handler<T> = (payload: T) => void;

export interface DailyState {
  day: string; // UTC calendar day the progress belongs to
  progress: Record<string, number>;
  claimed: string[];
  streak: number;
  lastAllDoneDay: string; // last day every quest was claimed
}

export function freshDaily(day: string): DailyState {
  return { day, progress: {}, claimed: [], streak: 0, lastAllDoneDay: '' };
}

/** Weekly/monthly quest sheet: same shape as daily, minus the streak. */
export interface PeriodQuestState {
  key: string; // the utcWeek/utcMonth this sheet belongs to
  progress: Record<string, number>;
  claimed: string[];
}

export function freshPeriod(key: string): PeriodQuestState {
  return { key, progress: {}, claimed: [] };
}

export interface RaidState {
  level: number;
  timeLeft: number;
  monsterHp: number;
  monsterMaxHp: number;
  kills: number;
  goldEarned: number;
  /** Full timer length (drives the countdown bar). */
  duration: number;
  /** Kills needed to clear. */
  clearKills: number;
  /** Kills after which the run ends early (anti-farm). */
  killCap: number;
  /** Base bounty per kill (events multiply on top). */
  goldPerKill: number;
  /** Set on Daily Dungeon runs: the modifier id in play. */
  dungeon?: string;
}

export interface RaidResult {
  level: number;
  kills: number;
  gold: number;
  gems: number;
  cleared: boolean;
  /** Daily Dungeon runs: the modifier id + the kill quota that was set. */
  dungeon?: string;
  quota?: number;
}

/** Serializable snapshot of everything that must survive a restart. */
export interface SerializedState {
  gold: number;
  gems: number;
  grid: Grid;
  highestTier: number;
  highestStage: number;
  battle: BattleState;
  totalKills: number;
  totalGoldEarned: number;
  ownedSkins: string[];
  activeSkin: string;
  swordSkin: string;
  ownedPremiumSwords: string[];
  deviceId?: string;
  boardName?: string | null;
  bestTier: number;
  unlockedCells: number;
  buyTierLevel: number;
  soulUpgrades: Record<string, number>;
  pets: Record<string, number>;
  petStages: Record<string, number>;
  goldEggsBought: number;
  lastFreeEggDay: string;
  removeAds: boolean;
  starterPackOwned: boolean;
  piggyGems: number;
  freeChestReadyAt: number;
  skillTimers: Record<string, SkillTimer>;
  autoSkills?: boolean;
  boardRealOnly?: boolean;
  dungeonClearedDay?: string;
  codexClaimed?: string[];
  enchants?: Record<string, number>;
  expedition?: { petId: string; defId: string; endsAt: number } | null;
  duelDay?: string;
  duelsUsed?: number;
  passSeasonNum?: number;
  passXp?: number;
  passClaimedFree?: number[];
  passClaimedPremium?: number[];
  passPremiumSeason?: number;
  dealClaimedDay?: string;
  fairyLevel: number;
  dmgBoostUntil: number;
  speedBoostUntil: number;
  adLootReadyAt: number;
  loginStreakDay: number;
  lastLoginClaimDay: string;
  totalMerges: number;
  achievementsClaimed: string[];
  townBuildings: Record<string, number>;
  jewelerCollectedAt: number;
  daily: DailyState;
  weekly: PeriodQuestState;
  monthly: PeriodQuestState;
  prestigeCount: number;
  souls: number;
  raidHighest: number;
  raidBest: number;
  raidReadyAt: number;
}

const TICK_SECONDS = 0.1;

// Vitest runs on any day of the week; a real-time weekend event switching
// itself on mid-suite would make every economy assertion flaky. Freeze the
// default clock to a Wednesday under test — event tests inject their own.
const TEST_WEDNESDAY = Date.UTC(2026, 0, 7);
const defaultClock: () => number =
  typeof process !== 'undefined' && process.env?.VITEST
    ? () => TEST_WEDNESDAY
    : () => Date.now();

/**
 * Single source of truth. Scenes subscribe to events and call methods;
 * they never mutate fields directly. Pure TS — no Phaser imports.
 */
export class GameState {
  gold: number = ECONOMY.startingGold;
  gems: number = ECONOMY.startingGems;
  grid: Grid = emptyGrid();
  highestTier = 1;
  highestStage = 1;
  battle: BattleState = newBattleState(1);
  totalKills = 0;
  totalGoldEarned = 0;
  ownedSkins: string[] = [DEFAULT_SKIN];
  activeSkin: string = DEFAULT_SKIN;
  /** Blade cosmetic: 'auto' (each sword wears its tier art), 'tier-<n>' or
   * 'premium-<id>'. Purely visual — never affects DPS. */
  swordSkin = 'auto';
  ownedPremiumSwords: string[] = [];
  /** Anonymous id for the global leaderboard row — random, never reused
   * across installs, no personal data. */
  deviceId: string = newDeviceId();
  /** Call sign shown on the global board; null until the player joins. */
  boardName: string | null = null;
  /** Best merge tier ever reached, across rebirths — unlocks blade art. */
  bestTier = 1;
  unlockedCells: number = GEAR.baseCells;
  /** The tier the shop sells at; raised with gold via upgradeBuyTier(). */
  buyTierLevel = 1;
  prestigeCount = 0;
  /** Rebirth currency, spent on permanent Soul Relics. */
  souls = 0;
  /** Soul Relic levels by upgrade id. */
  soulUpgrades: Record<string, number> = {};
  /** Pet levels by pet id; absent = not hatched yet. */
  pets: Record<string, number> = {};
  /** Evolution stage (0-2) by pet id; absent = stage 0. */
  petStages: Record<string, number> = {};
  /** Lifetime gold eggs bought — drives the escalating gold-egg price. */
  goldEggsBought = 0;
  /** UTC day the free ad egg was last claimed. */
  lastFreeEggDay = '';
  /** True once the remove_ads IAP is owned — kills interstitial breaks. */
  removeAds = false;
  /** The one-time starter bundle can only be bought once. */
  starterPackOwned = false;
  /** Gems banked in the piggy; grows as bosses fall, cashed out via IAP. */
  piggyGems = 0;
  /** Epoch ms when the free ad chest can next be opened. */
  freeChestReadyAt = 0;
  /** Buff/cooldown seconds by skill id; ticks down on sim time. */
  skillTimers: Record<string, SkillTimer> = {};
  /** AUTO CAST: skills fire themselves as they come off cooldown. */
  autoSkills = false;
  /** Wall clock for the weekend-event schedule. Injectable so the sim
   * stays deterministic: under vitest it freezes to a Wednesday (no
   * event) unless a test sets its own time. */
  clock: () => number = defaultClock;
  /** Hall of Legends filter: hide the seeded rivals, real players only. */
  boardRealOnly = false;
  /** UTC day the Daily Dungeon reward was last collected. */
  dungeonClearedDay = '';
  /** Codex entries whose gem bounty has been collected. */
  codexClaimed: string[] = [];
  /** Forge enchantment levels by id — gem-bought, survives rebirth. */
  enchants: Record<string, number> = {};
  /** The pet currently away on an expedition (null = everyone's home). */
  expedition: { petId: string; defId: string; endsAt: number } | null = null;
  /** Duel allowance: the UTC day + how many were fought that day. */
  duelDay = '';
  duelsUsed = 0;
  /** Knight's Pass: season number, XP within it, claimed levels per lane,
   * and which season the premium lane was bought for. */
  passSeasonNum = 0;
  passXp = 0;
  passClaimedFree: number[] = [];
  passClaimedPremium: number[] = [];
  passPremiumSeason = 0;
  /** UTC day the shop's daily deal was last claimed. */
  dealClaimedDay = '';
  /** Fairy helper level; 0 = not recruited yet. */
  fairyLevel = 0;
  /** Rewarded-ad boosts: epoch ms the x2 damage / x2 speed windows end. */
  dmgBoostUntil = 0;
  speedBoostUntil = 0;
  /** Epoch ms when the treasure ad can next be watched. */
  adLootReadyAt = 0;
  /** Login calendar: how many days of the 7-day cycle are claimed (0-7,
   * wraps), and the UTC day of the last claim (one per day). */
  loginStreakDay = 0;
  lastLoginClaimDay = '';
  /** Lifetime merge count (achievements; quests use per-period sheets). */
  totalMerges = 0;
  /** Achievement ids already claimed. */
  achievementsClaimed: string[] = [];
  /** Town building levels by id (unlocks after the second rebirth). */
  townBuildings: Record<string, number> = {};
  /** Epoch ms the jeweler's gem vault was last emptied. */
  jewelerCollectedAt = 0;
  daily: DailyState = freshDaily(utcDay(0));
  weekly: PeriodQuestState = freshPeriod('');
  monthly: PeriodQuestState = freshPeriod('');
  /** Highest raid level cleared THIS rebirth (next = raidHighest + 1);
   * resets on prestige so the ladder is farmable again. */
  raidHighest = 0;
  /** Lifetime best raid level — feeds achievements, never resets. */
  raidBest = 0;
  /** Epoch ms when the next raid may start. */
  raidReadyAt = 0;
  /** Active raid, or null. Not persisted — quitting abandons the raid. */
  raid: RaidState | null = null;

  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();
  private tickAccumulator = 0;

  on<K extends keyof GameEvents>(event: K, fn: Handler<GameEvents[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(fn as Handler<never>);
    this.handlers.set(event, set);
    return () => set.delete(fn as Handler<never>);
  }

  private emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    this.handlers.get(event)?.forEach((fn) => (fn as Handler<GameEvents[K]>)(payload));
  }

  // ---- Derived values ----

  /** The weekend event in effect right now (null on weekdays). */
  get currentEvent(): EventDef | null {
    return activeEvent(this.clock());
  }

  get heroDps(): number {
    return (
      heroDps(gridTiers(this.grid), this.equipSlots) *
      this.skinDpsMultiplier *
      this.petDpsMultiplier *
      this.skillDpsMultiplier *
      this.fairyDpsMultiplier *
      this.townDpsMultiplier *
      (this.dmgBoostActive() ? BOOSTS.dmgMult : 1) *
      (1 + this.soulLevel('might') * 0.1) *
      levelDpsMultiplier(this.heroLevel) *
      this.swordSkinDpsMultiplier *
      this.enchantBonus('sharpness') *
      (this.currentEvent?.dpsMult ?? 1)
    );
  }

  /** Hero level, from lifetime kills — never resets, feeds a DPS bonus. */
  get heroLevel(): number {
    return heroLevel(this.totalKills);
  }

  /** Gold income multiplier from Soul Relics, skill buffs and the fairy. */
  get goldMultiplier(): number {
    return (
      (1 + this.soulLevel('fortune') * 0.1) *
      this.skillGoldMultiplier *
      this.fairyGoldMultiplier *
      this.townGoldMultiplier *
      this.skinGoldMultiplier *
      this.swordSkinGoldMultiplier *
      this.enchantBonus('greed') *
      (this.currentEvent?.goldMult ?? 1)
    );
  }

  /**
   * Estimated active gold income at the current position: how fast a
   * mid-wave enemy dies, times its bounty. Used by offline earnings and the
   * starter pack's gold grant. Deterministic, so it's unit-testable.
   */
  get goldPerSecondEstimate(): number {
    const wave = Math.min(this.battle.wave, 9); // never price the boss in
    const hp = enemyHp(this.battle.stage, wave) * this.enemyHpMultiplier;
    const killsPerSecond = Math.min(this.heroDps / hp, 5); // cap absurd overkill
    return killsPerSecond * goldDrop(this.battle.stage, wave);
  }

  /** Monsters toughen with every rebirth. */
  get enemyHpMultiplier(): number {
    return enemyHpScale(this.prestigeCount);
  }

  /** Offline cap in hours, extended by the Endurance relic. */
  get offlineCapHours(): number {
    return ECONOMY.offlineCapHours + this.soulLevel('endurance');
  }

  soulLevel(id: string): number {
    return this.soulUpgrades[id] ?? 0;
  }

  soulUpgradePrice(id: string): number | null {
    const def = soulUpgradeById(id);
    if (!def) return null;
    const level = this.soulLevel(id);
    return level >= def.maxLevel ? null : soulUpgradeCost(def, level);
  }

  buySoulUpgrade(id: string): boolean {
    const price = this.soulUpgradePrice(id);
    if (price === null || this.souls < price) return false;
    this.souls -= price;
    this.soulUpgrades[id] = this.soulLevel(id) + 1;
    this.emit('souls:changed', this.souls);
    return true;
  }

  /** Sword slots currently unlocked (1..4, by highest stage reached). */
  get equipSlots(): number {
    return unlockedSlots(this.highestStage);
  }

  /** Equip-row cells whose loadout slot hasn't been unlocked yet — they
   * hold nothing and accept nothing until their stage milestone. */
  get lockedEquipCells(): ReadonlySet<number> {
    const locked = new Set<number>();
    for (let i = this.equipSlots; i < EQUIP_CELLS; i++) locked.add(i);
    return locked;
  }

  /** The loadout lives in the board's equip row (Sean's design): cells
   * 0..equipSlots-1 are the equip bar, kept stocked with the best swords
   * by syncLoadout(). */
  get equippedIndices(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.equipSlots; i++) {
      if (this.grid[i] !== null) out.push(i);
    }
    return out;
  }

  /** Pull the best swords on the board into the equip bar (top row,
   * slot 0 = strongest). Stable: equal tiers never swap, and `keep`
   * (a cell mid-drag) is never touched as slot or source. */
  private syncLoadout(keep?: number): void {
    const slots = this.equipSlots;
    for (let s = 0; s < slots; s++) {
      if (s === keep) continue;
      let bestIdx = -1;
      let bestTier = this.grid[s] ?? 0;
      for (let i = s + 1; i < this.unlockedCells; i++) {
        if (i === keep) continue;
        const t = this.grid[i];
        if (t !== null && t > bestTier) {
          bestTier = t;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        const tmp = this.grid[s];
        this.grid[s] = this.grid[bestIdx];
        this.grid[bestIdx] = tmp;
      }
    }
  }

  /** Owned skins also pay gold (rares + the paid legendaries). */
  get skinGoldMultiplier(): number {
    return (
      1 +
      this.ownedSkins.reduce((sum, id) => sum + (skinById(id)?.goldBonus ?? 0), 0)
    );
  }

  /** The blade art being WORN pays damage: premium weapons a flat bonus,
   * tier art +0.5% per art tier — chasing prettier swords makes you stronger. */
  get swordSkinDpsMultiplier(): number {
    const key = this.swordSkin;
    if (key.startsWith('premium-')) {
      return 1 + (premiumSwordById(key.slice(8))?.dpsBonus ?? 0);
    }
    if (key.startsWith('tier-')) {
      const n = Number(key.slice(5));
      if (Number.isInteger(n) && n >= 1) return 1 + n * SWORD_ART.dpsPerTier;
    }
    // 'auto': the art shown on the strongest equipped blade
    const best = Math.min(this.grid[0] ?? 1, GEAR.weaponArtCount);
    return 1 + best * SWORD_ART.dpsPerTier;
  }

  /** Premium weapons also sweeten gold while worn. */
  get swordSkinGoldMultiplier(): number {
    if (!this.swordSkin.startsWith('premium-')) return 1;
    return 1 + (premiumSwordById(this.swordSkin.slice(8))?.goldBonus ?? 0);
  }

  /** Every owned skin grants its bonus permanently (collection incentive). */
  get skinDpsMultiplier(): number {
    return (
      1 +
      this.ownedSkins.reduce((sum, id) => sum + (skinById(id)?.dpsBonus ?? 0), 0)
    );
  }

  get buyTier(): number {
    return this.buyTierLevel;
  }

  /** Gold cost to raise the shop tier, or null at the cap. */
  get buyTierUpgradeCost(): number | null {
    return this.buyTierLevel >= GEAR.maxTier ? null : buyTierUpgradeCost(this.buyTierLevel + 1);
  }

  get canUpgradeBuyTier(): boolean {
    return this.buyTierUpgradeCost !== null && this.gold >= this.buyTierUpgradeCost;
  }

  upgradeBuyTier(): boolean {
    if (!this.canUpgradeBuyTier) return false;
    this.gold -= this.buyTierUpgradeCost as number;
    this.buyTierLevel += 1;
    this.emit('gold:changed', this.gold);
    return true;
  }

  get buyCost(): number {
    return gearCost(this.buyTier);
  }

  get canBuy(): boolean {
    return this.gold >= this.buyCost && !isFull(this.grid, this.unlockedCells, this.lockedEquipCells);
  }

  /** Gold price of the next grid cell, or null when the board is complete. */
  get cellCost(): number | null {
    return this.unlockedCells >= TOTAL_CELLS ? null : cellCost(this.unlockedCells + 1);
  }

  get canBuyCell(): boolean {
    return this.cellCost !== null && this.gold >= this.cellCost;
  }

  /** Buy the next locked grid cell with gold. */
  buyCell(): boolean {
    if (!this.canBuyCell) return false;
    this.gold -= this.cellCost as number;
    this.unlockedCells += 1;
    this.emit('gold:changed', this.gold);
    this.emit('cells:changed', this.unlockedCells);
    this.emit('grid:changed', this.grid);
    return true;
  }

  // ---- Actions ----

  /** Advance simulation time; called from the scene update loop with real dt,
   * and from offline fast-forward with large dt. Fixed 100ms sub-steps keep
   * the sim identical regardless of frame rate. */
  update(dtSeconds: number): void {
    // The x2 speed boost makes battle time itself run faster
    this.tickAccumulator += dtSeconds * (this.speedBoostActive() ? BOOSTS.speedMult : 1);
    while (this.tickAccumulator >= TICK_SECONDS) {
      this.tickAccumulator -= TICK_SECONDS;
      this.step(TICK_SECONDS);
    }
  }

  private step(dt: number): void {
    this.tickSkillTimers(dt);
    this.autoCastReadySkills();
    if (this.raid) {
      this.raidStep(dt);
      return;
    }
    const before = this.battle.stage;
    const result = tick(this.battle, this.heroDps, dt, this.enemyHpMultiplier);

    if (result.goldEarned > 0) this.addGold(Math.round(result.goldEarned * this.goldMultiplier));
    this.totalKills += result.kills;
    if (result.kills > 0) this.trackQuest('kills', result.kills);

    if (result.stageCleared) {
      const slotsBefore = this.equipSlots;
      this.highestStage = Math.max(this.highestStage, this.battle.stage);
      this.trackQuest('stages');
      if (this.equipSlots > slotsBefore) {
        this.syncLoadout();
        this.emit('grid:changed', this.grid);
      }
      // The piggy bank fattens every time a boss falls
      if (this.piggyGems < PIGGY.cap) {
        this.piggyGems = Math.min(PIGGY.cap, this.piggyGems + PIGGY.gemsPerStage);
        this.emit('shop:changed', undefined);
      }
      this.emit('stage:changed', this.battle.stage);
    }
    if (result.bossFailed) this.emit('boss:failed', before);
    this.emit('battle:tick', result);
  }

  addGold(amount: number): void {
    this.gold += amount;
    if (amount > 0) this.totalGoldEarned += amount;
    this.emit('gold:changed', this.gold);
  }

  addGems(amount: number): void {
    this.gems += amount;
    this.emit('gems:changed', this.gems);
  }

  /** Buy one gear item at the current buy tier into the first empty cell. */
  buyGear(keep?: number): boolean {
    if (!this.canBuy) return false;
    const tier = this.buyTier;
    this.gold -= this.buyCost;
    const index = spawn(this.grid, tier, this.unlockedCells, this.lockedEquipCells);
    this.syncLoadout(keep);
    this.emit('gold:changed', this.gold);
    this.emit('gear:bought', { index, tier });
    this.emit('grid:changed', this.grid);
    return true;
  }

  /** Merge grid item `from` onto `to`. Returns the new tier or null. */
  mergeAt(from: number, to: number, keep?: number): number | null {
    const newTier = merge(this.grid, from, to, this.unlockedCells, this.lockedEquipCells);
    if (newTier === null) return null;
    this.highestTier = Math.max(this.highestTier, newTier);
    this.bestTier = Math.max(this.bestTier, newTier);
    this.totalMerges += 1;
    this.trackQuest('merges');
    this.syncLoadout(keep);
    this.emit('gear:merged', { index: to, tier: newTier });
    this.emit('grid:changed', this.grid);
    return newTier;
  }

  /** Move an item to an empty cell or swap two items. The equip bar
   * re-asserts itself afterwards: the top row always holds the best. */
  moveAt(from: number, to: number): boolean {
    if (!move(this.grid, from, to, this.unlockedCells, this.lockedEquipCells)) return false;
    this.syncLoadout();
    this.emit('grid:changed', this.grid);
    return true;
  }

  /** Gold refunded if the sword at `index` were binned, or null when empty. */
  sellValueAt(index: number): number | null {
    const tier = this.grid[index];
    return tier === null ? null : sellValue(tier);
  }

  /** Bin a sword for gold. Equipped swords can't be sold — losing part of
   * the loadout must be a deliberate choice, not a mis-drag. */
  sellAt(index: number): number | null {
    const tier = this.grid[index];
    if (tier === null || this.equippedIndices.includes(index)) return null;
    const gold = sellValue(tier);
    this.grid[index] = null;
    this.addGold(gold);
    this.syncLoadout(); // a lower sword may get promoted into the bar
    this.emit('grid:changed', this.grid);
    return gold;
  }

  /** Auto-merge one pair — never touching equipped swords (merging those
   * is a deliberate manual drag) nor a cell the player is mid-dragging. */
  autoMergeOnce(excludeIndex?: number): number | null {
    const skip = new Set(this.equippedIndices);
    for (const i of this.lockedEquipCells) skip.add(i);
    if (excludeIndex !== undefined) skip.add(excludeIndex);
    const pair = findBestMerge(this.grid, skip);
    return pair ? this.mergeAt(pair.from, pair.to, excludeIndex) : null;
  }

  // ---- Prestige ----

  get canPrestige(): boolean {
    return this.battle.stage >= PRESTIGE.minStage && !this.raid;
  }

  /** Souls this rebirth would bank right now (Soul Harvest weekends pay
   * double — the boosted number is what the confirm dialog shows). */
  get prestigeReward(): number {
    return Math.round(
      soulsFor(this.battle.stage) *
        this.enchantBonus('soulbind') *
        (this.currentEvent?.soulsMult ?? 1),
    );
  }

  /**
   * Rebirth: reset the run (gold, gear, stages) and bank Souls. Permanent
   * account progress survives: skins, gems, board cells, sword-slot record
   * (highestStage) and prestige count. The raid ladder resets with the run
   * (Sean: rebirth should reopen the lower raid levels to farm again).
   */
  prestige(): boolean {
    if (!this.canPrestige) return false;
    this.souls += this.prestigeReward;
    this.prestigeCount += 1;
    this.gold = ECONOMY.startingGold;
    this.grid = this.grid.map(() => null);
    this.highestTier = 1;
    this.buyTierLevel = 1;
    this.raidHighest = 0;
    // The new cycle's monsters already carry the higher rebirth HP scale
    this.battle = newBattleState(1, 1, this.enemyHpMultiplier);
    this.emit('prestige:done', this.prestigeCount);
    this.emit('gold:changed', this.gold);
    this.emit('grid:changed', this.grid);
    this.emit('stage:changed', 1);
    return true;
  }

  // ---- Raids ----

  get raidsUnlocked(): boolean {
    return this.prestigeCount >= 1;
  }

  /** Highest raid level currently attemptable. */
  get raidNextLevel(): number {
    return Math.min(this.raidHighest + 1, RAIDS.maxLevel);
  }

  raidCooldownLeft(now: number): number {
    return Math.max(0, this.raidReadyAt - now);
  }

  /** Rewarded-ad payoff: skip the remaining raid cooldown. */
  resetRaidCooldown(): void {
    this.raidReadyAt = 0;
  }

  canStartRaid(level: number, now: number): boolean {
    return (
      this.raidsUnlocked &&
      !this.raid &&
      level >= 1 &&
      level <= this.raidNextLevel &&
      this.raidCooldownLeft(now) === 0
    );
  }

  startRaid(level: number, now: number = Date.now()): boolean {
    if (!this.canStartRaid(level, now)) return false;
    const hp = raidMonsterHp(level);
    this.raid = {
      level,
      timeLeft: RAIDS.durationSeconds,
      monsterHp: hp,
      monsterMaxHp: hp,
      kills: 0,
      goldEarned: 0,
      duration: RAIDS.durationSeconds,
      clearKills: raidClearKills(level),
      killCap: raidKillCap(level),
      goldPerKill: raidGoldPerKill(level),
    };
    this.raidReadyAt = now + RAIDS.cooldownMinutes * 60_000;
    this.trackQuest('raids', 1, now);
    this.emit('raid:started', level);
    return true;
  }

  private raidStep(dt: number): void {
    const raid = this.raid!;
    const result: TickResult = {
      goldEarned: 0,
      kills: 0,
      damageDealt: 0,
      waveCleared: false,
      stageCleared: false,
      bossFailed: false,
    };

    let budget = this.heroDps * dt;
    while (budget > 0 && raid.kills < raid.killCap) {
      const dealt = Math.min(budget, raid.monsterHp);
      raid.monsterHp -= dealt;
      result.damageDealt += dealt;
      budget -= dealt;
      if (raid.monsterHp > 0) break;
      raid.kills += 1;
      result.kills += 1;
      const gold = raid.goldPerKill * (this.currentEvent?.raidGoldMult ?? 1);
      raid.goldEarned += gold;
      result.goldEarned += gold;
      raid.monsterHp = raid.monsterMaxHp;
    }
    if (result.goldEarned > 0) this.addGold(Math.round(result.goldEarned * this.goldMultiplier));
    this.totalKills += result.kills;
    if (result.kills > 0) this.trackQuest('kills', result.kills);
    this.emit('battle:tick', result);

    raid.timeLeft -= dt;
    // Cap harvested: no reason to sit out the clock
    if (raid.timeLeft <= 0 || raid.kills >= raid.killCap) this.endRaid();
  }

  private endRaid(): void {
    const raid = this.raid!;
    this.raid = null;
    const cleared = raid.kills >= raid.clearKills;
    if (raid.dungeon) {
      this.endDungeon(raid, cleared);
      return;
    }
    const gems =
      raidGems(raid.level, raid.kills) + (raid.kills > 0 ? this.soulLevel('raider') : 0);
    if (gems > 0) this.addGems(gems);
    if (cleared) {
      this.raidHighest = Math.max(this.raidHighest, raid.level);
      this.raidBest = Math.max(this.raidBest, raid.level);
    }
    this.emit('raid:ended', {
      level: raid.level,
      kills: raid.kills,
      gold: raid.goldEarned,
      gems,
      cleared,
    });
  }

  // ---- Daily Dungeon (rides the raid machinery) ----

  get dungeonUnlocked(): boolean {
    return this.highestStage >= DUNGEON.unlockStage;
  }

  /** The one-per-day reward: already collected today? */
  dungeonClearedToday(now: number = this.clock()): boolean {
    return this.dungeonClearedDay === utcDay(now);
  }

  canStartDungeon(now: number = this.clock()): boolean {
    return this.dungeonUnlocked && !this.raid && !this.dungeonClearedToday(now);
  }

  /** Kick off today's dungeon: a kill quota against monsters tuned to the
   * player's own frontier, twisted by the daily modifier. Free retries
   * until it's cleared; the reward pays once per day. */
  startDungeon(now: number = this.clock()): boolean {
    if (!this.canStartDungeon(now)) return false;
    const mod = dungeonModifier(now);
    const hp = enemyHp(this.highestStage, 5) * this.enemyHpMultiplier * mod.hpMult;
    const duration = dungeonDuration(mod);
    this.raid = {
      level: 0,
      timeLeft: duration,
      monsterHp: hp,
      monsterMaxHp: hp,
      kills: 0,
      goldEarned: 0,
      duration,
      clearKills: dungeonQuota(mod),
      killCap: dungeonQuota(mod) * 2,
      goldPerKill: goldDrop(this.highestStage, 5) * mod.goldMult,
      dungeon: mod.id,
    };
    this.emit('raid:started', 0);
    return true;
  }

  private endDungeon(raid: RaidState, cleared: boolean): void {
    let gems = 0;
    if (cleared) {
      this.dungeonClearedDay = utcDay(this.clock());
      gems = dungeonGems(this.highestStage);
      this.addGems(gems);
      this.addGold(this.goldForHours(DUNGEON.goldHours));
    }
    this.emit('raid:ended', {
      level: 0,
      kills: raid.kills,
      gold: raid.goldEarned,
      gems,
      cleared,
      dungeon: raid.dungeon,
      quota: raid.clearKills,
    });
  }

  // ---- Forge enchantments ----

  enchantLevel(id: string): number {
    return this.enchants[id] ?? 0;
  }

  /** Gem price of the next level, or null at the cap. */
  enchantPrice(id: string): number | null {
    const def = enchantById(id);
    if (!def) return null;
    const level = this.enchantLevel(id);
    return level >= def.maxLevel ? null : enchantCost(def, level);
  }

  buyEnchant(id: string): boolean {
    const price = this.enchantPrice(id);
    if (price === null || this.gems < price) return false;
    this.gems -= price;
    this.enchants[id] = this.enchantLevel(id) + 1;
    this.emit('gems:changed', this.gems);
    this.emit('enchants:changed', undefined);
    return true;
  }

  private enchantBonus(id: string): number {
    const def = enchantById(id);
    return 1 + (def ? this.enchantLevel(id) * def.perLevel : 0);
  }

  // ---- The daily deal ----

  dealClaimedToday(now: number = this.clock()): boolean {
    return this.dealClaimedDay === utcDay(now);
  }

  /** What today's deal would cost/pay right now (for the shop card). */
  dealTerms(now: number = this.clock()): { deal: DailyDeal; cost: string; affordable: boolean } {
    const deal = dailyDeal(now);
    if (deal.kind === 'gems') {
      const gold = this.goldForHours(deal.goldHoursCost!);
      return { deal, cost: `${formatNumber(gold).toUpperCase()} GOLD`, affordable: this.gold >= gold };
    }
    if (deal.kind === 'gold') {
      return { deal, cost: `${deal.gemCost} GEMS`, affordable: this.gems >= deal.gemCost! };
    }
    const price = Math.floor(this.goldEggCost * deal.eggPriceFraction!);
    return { deal, cost: `${formatNumber(price).toUpperCase()} GOLD`, affordable: this.gold >= price };
  }

  /** Take today's bargain (once per UTC day). */
  claimDailyDeal(now: number = this.clock(), roll: number = Math.random()): boolean {
    if (this.dealClaimedToday(now)) return false;
    const deal = dailyDeal(now);
    if (deal.kind === 'gems') {
      const gold = this.goldForHours(deal.goldHoursCost!);
      if (this.gold < gold) return false;
      this.gold -= gold;
      this.addGems(deal.gems!);
      this.emit('gold:changed', this.gold);
    } else if (deal.kind === 'gold') {
      if (this.gems < deal.gemCost!) return false;
      this.gems -= deal.gemCost!;
      this.addGold(this.goldForHours(deal.goldHours!));
      this.emit('gems:changed', this.gems);
    } else {
      const price = Math.floor(this.goldEggCost * deal.eggPriceFraction!);
      if (this.gold < price) return false;
      this.gold -= price;
      const pet = rollPet(roll, eggPool('gold'));
      if (this.petLevel(pet.id) >= PET_MAX_LEVEL) this.addGems(PET_DUP_GEMS);
      else this.pets[pet.id] = this.petLevel(pet.id) + 1;
      this.emit('gold:changed', this.gold);
      this.emit('pets:changed', this.pets);
    }
    this.dealClaimedDay = utcDay(now);
    this.emit('shop:changed', undefined);
    return true;
  }

  // ---- The Knight's Pass ----

  /** Season rollover: a new season wipes XP and claims (premium stays
   * bound to the season it was bought for). */
  private syncPassSeason(now: number = this.clock()): void {
    const season = passSeason(now);
    if (this.passSeasonNum === season) return;
    this.passSeasonNum = season;
    this.passXp = 0;
    this.passClaimedFree = [];
    this.passClaimedPremium = [];
    this.emit('pass:changed', undefined);
  }

  addPassXp(amount: number, now: number = this.clock()): void {
    this.syncPassSeason(now);
    const cap = PASS.maxLevel * PASS.xpPerLevel;
    const next = Math.min(cap, this.passXp + amount);
    if (next === this.passXp) return;
    this.passXp = next;
    this.emit('pass:changed', undefined);
  }

  get passLevelNow(): number {
    return passLevel(this.passXp);
  }

  passPremiumOwned(now: number = this.clock()): boolean {
    this.syncPassSeason(now);
    return this.passPremiumSeason === this.passSeasonNum;
  }

  passClaimed(level: number, lane: 'free' | 'premium'): boolean {
    return (lane === 'free' ? this.passClaimedFree : this.passClaimedPremium).includes(level);
  }

  canClaimPass(level: number, lane: 'free' | 'premium', now: number = this.clock()): boolean {
    this.syncPassSeason(now);
    if (level < 1 || level > PASS.maxLevel) return false;
    if (this.passLevelNow < level || this.passClaimed(level, lane)) return false;
    return lane === 'free' || this.passPremiumOwned(now);
  }

  claimPass(level: number, lane: 'free' | 'premium', now: number = this.clock()): PassReward | null {
    if (!this.canClaimPass(level, lane, now)) return null;
    const reward = lane === 'free' ? freeRewardFor(level) : premiumRewardFor(level);
    (lane === 'free' ? this.passClaimedFree : this.passClaimedPremium).push(level);
    if (reward.gems) this.addGems(reward.gems);
    if (reward.goldHours) this.addGold(this.goldForHours(reward.goldHours));
    if (reward.goldEgg) {
      const pet = rollPet(Math.random(), eggPool('gold'));
      if (this.petLevel(pet.id) >= PET_MAX_LEVEL) this.addGems(PET_DUP_GEMS);
      else this.pets[pet.id] = this.petLevel(pet.id) + 1;
      this.emit('pets:changed', this.pets);
    }
    this.emit('pass:changed', undefined);
    return reward;
  }

  /** Unclaimed-but-earned pass rewards (badge fodder). */
  get passClaimable(): number {
    this.syncPassSeason();
    let n = 0;
    for (let lv = 1; lv <= this.passLevelNow; lv++) {
      if (!this.passClaimed(lv, 'free')) n++;
      if (this.passPremiumOwned() && !this.passClaimed(lv, 'premium')) n++;
    }
    return n;
  }

  // ---- Rival duels ----

  duelsLeft(now: number = this.clock()): number {
    return this.duelDay === utcDay(now) ? Math.max(0, DUELS.perDay - this.duelsUsed) : DUELS.perDay;
  }

  /** Fight a board rival: instant DPS-ratio showdown. Pass a fixed roll
   * for tests; runtime uses Math.random. Returns null when out of duels. */
  duel(
    theirStage: number,
    now: number = this.clock(),
    roll: number = Math.random(),
  ): { won: boolean; gold: number; chance: number } | null {
    if (this.duelsLeft(now) <= 0) return null;
    const today = utcDay(now);
    if (this.duelDay !== today) {
      this.duelDay = today;
      this.duelsUsed = 0;
    }
    this.duelsUsed += 1;
    const chance = duelWinChance(this.heroDps, theirStage);
    const won = roll < chance;
    let gold = 0;
    if (won) {
      gold = this.goldForHours(DUELS.goldHours);
      this.addGold(gold);
    }
    this.emit('duel:done', won);
    return { won, gold, chance };
  }

  // ---- Codex ----

  /** Live codex with claim states baked in. */
  codexList(): (CodexEntry & { claimed: boolean })[] {
    return codexEntries(this.highestStage, this.bestTier, this.pets).map((e) => ({
      ...e,
      claimed: this.codexClaimed.includes(e.id),
    }));
  }

  /** Unlocked-but-unclaimed bounties (drives badges). */
  get codexClaimable(): number {
    return this.codexList().filter((e) => e.unlocked && !e.claimed).length;
  }

  /** Collect a codex entry's one-time gem bounty. */
  claimCodex(id: string): boolean {
    const entry = this.codexList().find((e) => e.id === id);
    if (!entry || !entry.unlocked || entry.claimed) return false;
    this.codexClaimed.push(id);
    this.addGems(entry.gems);
    this.emit('codex:changed', undefined);
    return true;
  }

  // ---- Pets ----

  petLevel(id: string): number {
    return this.pets[id] ?? 0;
  }

  /** Every pet level ever hatched keeps helping (collection incentive) —
   * except a pet away on an expedition, whose help travels with it. */
  get petDpsMultiplier(): number {
    return (
      1 +
      Object.entries(this.pets).reduce(
        (sum, [id, level]) =>
          this.petHome(id)
            ? sum +
              level *
                (petById(id)?.dpsPerLevel ?? 0) *
                EVOLUTION.stageMultipliers[this.petStage(id)]
            : sum,
        0,
      )
    );
  }

  /** Evolution stage 0-2 for a pet. */
  petStage(id: string): number {
    return Math.min(this.petStages[id] ?? 0, EVOLUTION.stageMultipliers.length - 1);
  }

  /** Why a pet can/can't ascend right now (drives the EVOLVE button). */
  evolveStatus(id: string): { ok: boolean; reason: 'ready' | 'maxed' | 'gems' | 'unhatched'; gems: number } {
    const stage = this.petStage(id);
    if (stage >= EVOLUTION.gemCosts.length) {
      return { ok: false, reason: 'maxed', gems: 0 };
    }
    const gems = EVOLUTION.gemCosts[stage];
    if (this.petLevel(id) === 0) return { ok: false, reason: 'unhatched', gems };
    if (this.gems < gems) return { ok: false, reason: 'gems', gems };
    return { ok: true, reason: 'ready', gems };
  }

  /** Ascend a pet to its next stage: pure gem spend -> 2x/4x pet power. */
  evolvePet(id: string): boolean {
    const status = this.evolveStatus(id);
    if (!status.ok || !petById(id)) return false;
    this.gems -= status.gems;
    this.petStages[id] = this.petStage(id) + 1;
    this.emit('gems:changed', this.gems);
    this.emit('pets:changed', this.pets);
    return true;
  }

  /** Pets shown fighting in the arena: highest level first, ties by roster order. */
  get activePets(): string[] {
    return Object.entries(this.pets)
      .filter(([id, level]) => level > 0 && id !== this.expedition?.petId)
      .sort((a, b) => b[1] - a[1])
      .slice(0, ACTIVE_PET_SLOTS)
      .map(([id]) => id);
  }

  // ---- Pet expeditions ----

  /** A travelling pet neither fights nor pays its DPS bonus. */
  private petHome(id: string): boolean {
    return this.expedition?.petId !== id;
  }

  /** The least-powerful hatched pet — "the reserve" gets the job. */
  get reservePetId(): string | null {
    const hatched = Object.entries(this.pets).filter(([, lv]) => lv > 0);
    if (hatched.length === 0) return null;
    hatched.sort(
      (a, b) =>
        a[1] * (petById(a[0])?.dpsPerLevel ?? 0) * EVOLUTION.stageMultipliers[this.petStage(a[0])] -
        b[1] * (petById(b[0])?.dpsPerLevel ?? 0) * EVOLUTION.stageMultipliers[this.petStage(b[0])],
    );
    return hatched[0][0];
  }

  canStartExpedition(): boolean {
    return this.expedition === null && this.reservePetId !== null;
  }

  startExpedition(defId: string, now: number = Date.now()): boolean {
    const def = expeditionById(defId);
    const petId = this.reservePetId;
    if (!def || !petId || this.expedition !== null) return false;
    this.expedition = { petId, defId, endsAt: now + def.hours * 3_600_000 };
    this.emit('expedition:changed', undefined);
    this.emit('pets:changed', this.pets); // arena drops the traveller
    return true;
  }

  expeditionTimeLeft(now: number = Date.now()): number {
    return this.expedition ? Math.max(0, this.expedition.endsAt - now) : 0;
  }

  expeditionReady(now: number = Date.now()): boolean {
    return this.expedition !== null && now >= this.expedition.endsAt;
  }

  /** Welcome the pet home and bank the loot. */
  collectExpedition(now: number = Date.now()): { gems: number; gold: number } | null {
    if (!this.expeditionReady(now)) return null;
    const def = expeditionById(this.expedition!.defId)!;
    this.expedition = null;
    const gold = this.goldForHours(def.goldHours);
    this.addGems(def.gems);
    this.addGold(gold);
    this.emit('expedition:changed', undefined);
    this.emit('pets:changed', this.pets); // the traveller rejoins the arena
    return { gems: def.gems, gold };
  }

  /** Current gold-egg price (escalates with every gold egg bought). */
  get goldEggCost(): number {
    return goldEggCost(this.goldEggsBought);
  }

  get gemEggCost(): number {
    return EGGS.gemCost;
  }

  freeEggAvailable(now: number = Date.now()): boolean {
    return this.lastFreeEggDay !== utcDay(now);
  }

  canHatchEgg(kind: EggKind, now: number = Date.now()): boolean {
    switch (kind) {
      case 'gold':
        return this.gold >= this.goldEggCost;
      case 'gem':
        return this.gems >= this.gemEggCost;
      case 'free':
        return this.freeEggAvailable(now);
    }
  }

  /**
   * Buy + crack an egg. `roll` is injectable for deterministic tests; the
   * free (ad-rewarded) egg is limited to one per UTC day.
   */
  hatchEgg(
    kind: EggKind,
    roll: number = Math.random(),
    now: number = Date.now(),
  ): HatchResult | null {
    if (!this.canHatchEgg(kind, now)) return null;
    if (kind === 'gold') {
      this.gold -= this.goldEggCost;
      this.goldEggsBought += 1;
      this.emit('gold:changed', this.gold);
    } else if (kind === 'gem') {
      this.gems -= this.gemEggCost;
      this.emit('gems:changed', this.gems);
    } else {
      this.lastFreeEggDay = utcDay(now);
    }

    const pet = rollPet(roll, eggPool(kind));
    const wasMaxed = this.petLevel(pet.id) >= PET_MAX_LEVEL;
    if (wasMaxed) {
      this.addGems(PET_DUP_GEMS);
    } else {
      this.pets[pet.id] = this.petLevel(pet.id) + 1;
    }
    this.emit('pets:changed', this.pets);
    return { pet, level: this.petLevel(pet.id), wasMaxed };
  }

  // ---- Skills ----

  private skillTimer(id: string): SkillTimer {
    return this.skillTimers[id] ?? { active: 0, cooldown: 0 };
  }

  skillActiveLeft(id: string): number {
    return this.skillTimer(id).active;
  }

  skillCooldownLeft(id: string): number {
    return this.skillTimer(id).cooldown;
  }

  skillUnlocked(id: string): boolean {
    const def = skillDefById(id);
    return def !== undefined && this.highestStage >= def.unlockStage;
  }

  /** DPS multiplier from active skill buffs (stacks multiplicatively). */
  get skillDpsMultiplier(): number {
    return SKILLS.reduce(
      (m, def) => (def.dpsMult && this.skillActiveLeft(def.id) > 0 ? m * def.dpsMult : m),
      1,
    );
  }

  get skillGoldMultiplier(): number {
    return SKILLS.reduce(
      (m, def) => (def.goldMult && this.skillActiveLeft(def.id) > 0 ? m * def.goldMult : m),
      1,
    );
  }

  canCastSkill(id: string): boolean {
    return this.canAdCastSkill(id) && this.skillCooldownLeft(id) <= 0;
  }

  /** A rewarded ad casts during cooldown; only the hard guards remain. */
  canAdCastSkill(id: string): boolean {
    const def = skillDefById(id);
    if (!def || !this.skillUnlocked(id) || this.skillActiveLeft(id) > 0) return false;
    if (def.warpSeconds && this.raid) return false; // no warping the raid timer
    return true;
  }

  castSkill(id: string, viaAd = false): boolean {
    if (viaAd ? !this.canAdCastSkill(id) : !this.canCastSkill(id)) return false;
    const def = skillDefById(id)!;
    this.skillTimers[id] = { active: def.durationSeconds, cooldown: def.cooldownSeconds };
    this.emit('skills:changed', undefined);
    // Time Warp: the warped seconds tick every timer too — time really passed
    if (def.warpSeconds) this.update(def.warpSeconds);
    return true;
  }

  private tickSkillTimers(dt: number): void {
    let changed = false;
    for (const id of Object.keys(this.skillTimers)) {
      const t = this.skillTimers[id];
      const wasActive = t.active > 0;
      const wasCooling = t.cooldown > 0;
      t.active = Math.max(0, t.active - dt);
      t.cooldown = Math.max(0, t.cooldown - dt);
      if ((wasActive && t.active === 0) || (wasCooling && t.cooldown === 0)) changed = true;
      if (t.active === 0 && t.cooldown === 0) delete this.skillTimers[id];
    }
    if (changed) this.emit('skills:changed', undefined);
  }

  // ---- Auto cast ----

  get autoSkillsUnlocked(): boolean {
    return this.highestStage >= AUTO_SKILLS_UNLOCK_STAGE;
  }

  toggleAutoSkills(): boolean {
    if (!this.autoSkillsUnlocked) return false;
    this.autoSkills = !this.autoSkills;
    this.emit('skills:changed', undefined);
    return true;
  }

  /** Hall of Legends view: flip between rivals-included and live-only. */
  toggleBoardRealOnly(): void {
    this.boardRealOnly = !this.boardRealOnly;
  }

  /** Warp skills call update() from castSkill — time really passes — so a
   * depth guard keeps auto-cast from chaining warps inside warps. */
  private autoCasting = false;

  private autoCastReadySkills(): void {
    if (!this.autoSkills || !this.autoSkillsUnlocked || this.autoCasting) return;
    for (const def of SKILLS) {
      if (!this.canCastSkill(def.id)) continue;
      this.autoCasting = true;
      try {
        this.castSkill(def.id);
      } finally {
        this.autoCasting = false;
      }
    }
  }

  // ---- Fairy ----

  get fairyUnlocked(): boolean {
    return this.highestStage >= FAIRY.unlockStage;
  }

  get fairyDpsMultiplier(): number {
    return 1 + this.fairyLevel * FAIRY.dpsPerLevel;
  }

  get fairyGoldMultiplier(): number {
    return 1 + this.fairyLevel * FAIRY.goldPerLevel;
  }

  /** Gold price of the next fairy level, or null at the cap. */
  get fairyUpgradeCost(): number | null {
    return this.fairyLevel >= FAIRY.maxLevel ? null : fairyLevelCost(this.fairyLevel + 1);
  }

  get canUpgradeFairy(): boolean {
    return (
      this.fairyUnlocked &&
      this.fairyUpgradeCost !== null &&
      this.gold >= this.fairyUpgradeCost
    );
  }

  upgradeFairy(): boolean {
    if (!this.canUpgradeFairy) return false;
    this.gold -= this.fairyUpgradeCost as number;
    this.fairyLevel += 1;
    this.emit('gold:changed', this.gold);
    this.emit('fairy:changed', this.fairyLevel);
    return true;
  }

  // ---- Shop / IAP fulfillment ----

  /** True when the piggy holds enough gems to be worth cracking. */
  get canCrackPiggy(): boolean {
    return this.piggyGems >= PIGGY.minToCrack;
  }

  freeChestReady(now: number = Date.now()): boolean {
    return now >= this.freeChestReadyAt;
  }

  /** Rewarded-ad payoff: open the free chest and start its cooldown. */
  openFreeChest(now: number = Date.now()): number | null {
    if (!this.freeChestReady(now)) return null;
    this.freeChestReadyAt = now + FREE_CHEST.cooldownHours * 3_600_000;
    this.addGems(FREE_CHEST.gems);
    this.emit('shop:changed', undefined);
    return FREE_CHEST.gems;
  }

  /**
   * Grant what a completed purchase bought. Called by the shop after the
   * IAP service confirms payment — never before. Returns false for SKUs
   * this method doesn't handle (skins fulfill via grantSkin) or repeats of
   * one-time products.
   */
  // ---- Treasure ad (coins + gems for a rewarded ad) ----

  /** What the treasure ad would pay right now — shown in the preview modal. */
  get adLootGold(): number {
    return this.goldForHours(AD_LOOT.goldHours);
  }

  get adLootGems(): number {
    return AD_LOOT.gemsBase + Math.floor(this.battle.stage / AD_LOOT.gemsPerStages);
  }

  adLootReady(now: number): boolean {
    return now >= this.adLootReadyAt;
  }

  /** Pay the previewed loot and start the cooldown (after the ad rewards). */
  grantAdLoot(now: number = Date.now()): { gold: number; gems: number } | null {
    if (!this.adLootReady(now)) return null;
    const gold = this.adLootGold;
    const gems = this.adLootGems;
    this.addGold(gold);
    this.addGems(gems);
    this.adLootReadyAt = now + AD_LOOT.cooldownMinutes * 60_000;
    return { gold, gems };
  }

  /** A pack's gold grant: N hours of the buyer's current income. */
  goldForHours(hours: number): number {
    return Math.max(1, Math.floor(this.goldPerSecondEstimate * hours * 3600));
  }

  fulfillProduct(sku: string): boolean {
    const pack = gemPackBySku(sku);
    if (pack) {
      this.addGems(pack.gems);
      this.emit('shop:changed', undefined);
      return true;
    }
    const gold = goldPackBySku(sku);
    if (gold) {
      this.addGold(this.goldForHours(gold.goldHours));
      this.emit('shop:changed', undefined);
      return true;
    }
    const bundle = bundleBySku(sku);
    if (bundle) {
      this.addGems(bundle.gems);
      this.addGold(this.goldForHours(bundle.goldHours));
      this.emit('shop:changed', undefined);
      return true;
    }
    if (sku === STARTER_PACK.sku) {
      if (this.starterPackOwned) return false;
      this.starterPackOwned = true;
      this.addGems(STARTER_PACK.gems);
      this.addGold(Math.floor(this.goldPerSecondEstimate * STARTER_PACK.goldMinutes * 60));
      this.emit('shop:changed', undefined);
      return true;
    }
    if (sku === REMOVE_ADS.sku) {
      if (this.removeAds) return false;
      this.removeAds = true;
      this.emit('shop:changed', undefined);
      return true;
    }
    if (sku === BATTLE_PASS.sku) {
      this.syncPassSeason();
      if (this.passPremiumOwned()) return false; // already own this season
      this.passPremiumSeason = this.passSeasonNum;
      this.emit('pass:changed', undefined);
      this.emit('shop:changed', undefined);
      return true;
    }
    if (sku === PIGGY.product.sku) {
      if (!this.canCrackPiggy) return false;
      this.addGems(this.piggyGems);
      this.piggyGems = 0;
      this.emit('shop:changed', undefined);
      return true;
    }
    return false;
  }

  // ---- Town ----

  get townUnlocked(): boolean {
    return this.prestigeCount >= TOWN.unlockPrestiges;
  }

  buildingLevel(id: string): number {
    return this.townBuildings[id] ?? 0;
  }

  /** Gold price of the next level, or null at the cap. */
  buildingUpgradeCost(id: string): number | null {
    const def = buildingById(id);
    if (!def) return null;
    const level = this.buildingLevel(id);
    return level >= def.maxLevel ? null : buildingCost(def, level);
  }

  buyBuilding(id: string): boolean {
    if (!this.townUnlocked) return false;
    const cost = this.buildingUpgradeCost(id);
    if (cost === null || this.gold < cost) return false;
    // The jeweler's clock starts on its first level, not at epoch
    if (id === 'jeweler' && this.buildingLevel('jeweler') === 0) {
      this.jewelerCollectedAt = Date.now();
    }
    this.gold -= cost;
    this.townBuildings[id] = this.buildingLevel(id) + 1;
    this.emit('gold:changed', this.gold);
    this.emit('town:changed', undefined);
    return true;
  }

  get townGoldMultiplier(): number {
    return 1 + this.buildingLevel('farm') * (buildingById('farm')?.perLevel ?? 0);
  }

  get townDpsMultiplier(): number {
    return 1 + this.buildingLevel('blacksmith') * (buildingById('blacksmith')?.perLevel ?? 0);
  }

  get townOfflineMultiplier(): number {
    return 1 + this.buildingLevel('mine') * (buildingById('mine')?.perLevel ?? 0);
  }

  /** Gems waiting in the jeweler's vault (level x days, capped). */
  jewelerVault(now: number = Date.now()): number {
    const level = this.buildingLevel('jeweler');
    if (level === 0) return 0;
    const days = Math.min((now - this.jewelerCollectedAt) / 86_400_000, TOWN.jewelerCapDays);
    return Math.floor(Math.max(0, days) * level);
  }

  collectJeweler(now: number = Date.now()): number {
    const gems = this.jewelerVault(now);
    if (gems <= 0) return 0;
    this.jewelerCollectedAt = now;
    this.addGems(gems);
    this.emit('town:changed', undefined);
    return gems;
  }

  // ---- Boosts + gifts ----

  dmgBoostActive(now: number = Date.now()): boolean {
    return now < this.dmgBoostUntil;
  }

  speedBoostActive(now: number = Date.now()): boolean {
    return now < this.speedBoostUntil;
  }

  activateDmgBoost(now: number = Date.now(), minutes: number = BOOSTS.adMinutes): void {
    this.dmgBoostUntil = Math.max(this.dmgBoostUntil, now + minutes * 60_000);
  }

  activateSpeedBoost(now: number = Date.now(), minutes: number = BOOSTS.adMinutes): void {
    this.speedBoostUntil = Math.max(this.speedBoostUntil, now + minutes * 60_000);
  }

  /** Apply a rolled gift prize. Returns a human-readable summary. */
  grantGift(gift: GiftDef, now: number = Date.now()): string {
    switch (gift.kind) {
      case 'gold': {
        const gold = Math.max(50, Math.floor(this.goldPerSecondEstimate * (gift.minutes ?? 10) * 60));
        this.addGold(gold);
        return 'A PILE OF GOLD!';
      }
      case 'gems':
        this.addGems(gift.gems ?? 5);
        return `+${gift.gems ?? 5} GEMS!`;
      case 'dmg_boost':
        this.activateDmgBoost(now, gift.minutes ?? 10);
        return `X2 DAMAGE FOR ${gift.minutes ?? 10} MIN!`;
      case 'speed_boost':
        this.activateSpeedBoost(now, gift.minutes ?? 10);
        return `X2 SPEED FOR ${gift.minutes ?? 10} MIN!`;
    }
  }

  // ---- Daily login rewards ----

  /** The reward on offer today (next unclaimed day in the 7-day cycle). */
  get todaysLoginReward(): LoginReward {
    return LOGIN_REWARDS[this.loginStreakDay % LOGIN_REWARDS.length];
  }

  loginRewardReady(now: number = Date.now()): boolean {
    return this.lastLoginClaimDay !== utcDay(now);
  }

  /** Claim today's reward; the cycle pauses (not resets) on missed days. */
  claimLoginReward(now: number = Date.now()): LoginReward | null {
    if (!this.loginRewardReady(now)) return null;
    const reward = this.todaysLoginReward;
    this.lastLoginClaimDay = utcDay(now);
    this.loginStreakDay = (this.loginStreakDay + 1) % LOGIN_REWARDS.length;
    if (reward.goldMinutes) {
      this.addGold(Math.max(50, Math.floor(this.goldPerSecondEstimate * reward.goldMinutes * 60)));
    }
    if (reward.gems) this.addGems(reward.gems);
    if (reward.goldEgg) {
      // A free hatch, no gold spent: same roll table as the gold egg
      const pet = rollPet(Math.random(), eggPool('gold'));
      if (this.petLevel(pet.id) >= PET_MAX_LEVEL) this.addGems(PET_DUP_GEMS);
      else this.pets[pet.id] = this.petLevel(pet.id) + 1;
      this.emit('pets:changed', this.pets);
    }
    this.emit('login:changed', undefined);
    return reward;
  }

  // ---- Quests (daily / weekly / monthly) ----

  /** The progress/claimed sheet for a period. */
  private questSheet(period: QuestPeriod): {
    progress: Record<string, number>;
    claimed: string[];
  } {
    if (period === 'daily') return this.daily;
    return period === 'weekly' ? this.weekly : this.monthly;
  }

  /** Start fresh quest sheets when their UTC period rolls over. */
  rollDaily(now: number = Date.now()): void {
    let changed = false;
    const today = utcDay(now);
    if (this.daily.day !== today) {
      const streak = this.daily.streak;
      const lastAllDoneDay = this.daily.lastAllDoneDay;
      this.daily = freshDaily(today);
      this.daily.streak = streak;
      this.daily.lastAllDoneDay = lastAllDoneDay;
      changed = true;
    }
    const week = periodKey('weekly', now);
    if (this.weekly.key !== week) {
      this.weekly = freshPeriod(week);
      changed = true;
    }
    const month = periodKey('monthly', now);
    if (this.monthly.key !== month) {
      this.monthly = freshPeriod(month);
      changed = true;
    }
    if (changed) this.emit('quests:changed', undefined);
  }

  /** Progress counts toward every period's sheet at once. */
  trackQuest(id: QuestMetric, amount = 1, now: number = Date.now()): void {
    this.rollDaily(now);
    // The same actions feed the Knight's Pass (kills excluded — too hot)
    const xp = PASS.xp[id];
    if (xp) this.addPassXp(xp * amount, now);
    let changed = false;
    for (const period of ['daily', 'weekly', 'monthly'] as QuestPeriod[]) {
      const sheet = this.questSheet(period);
      const target = questBy(period, id).target;
      const current = sheet.progress[id] ?? 0;
      if (current >= target) continue;
      sheet.progress[id] = Math.min(target, current + amount);
      changed = true;
    }
    if (changed) this.emit('quests:changed', undefined);
  }

  questProgress(id: QuestMetric, period: QuestPeriod = 'daily'): number {
    return this.questSheet(period).progress[id] ?? 0;
  }

  questClaimed(id: QuestMetric, period: QuestPeriod = 'daily'): boolean {
    return this.questSheet(period).claimed.includes(id);
  }

  /** Finished-but-unclaimed quests AND achievements — the badge number. */
  get claimableQuests(): number {
    let n = 0;
    for (const period of ['daily', 'weekly', 'monthly'] as QuestPeriod[]) {
      for (const quest of QUESTS[period]) {
        if (this.canClaimQuest(quest.id, period)) n += 1;
      }
    }
    for (const a of ACHIEVEMENTS) {
      if (this.canClaimAchievement(a.id)) n += 1;
    }
    return n;
  }

  // ---- Achievements ----

  achievementProgress(def: AchievementDef): number {
    switch (def.metric) {
      case 'kills':
        return this.totalKills;
      case 'merges':
        return this.totalMerges;
      case 'stage':
        return this.highestStage;
      case 'tier':
        return this.highestTier;
      case 'skins':
        return this.ownedSkins.length;
      case 'pets':
        return Object.keys(this.pets).length;
      case 'fairy':
        return this.fairyLevel;
      case 'prestiges':
        return this.prestigeCount;
      case 'raids':
        return this.raidBest;
      case 'gold':
        return this.totalGoldEarned;
    }
  }

  canClaimAchievement(id: string): boolean {
    const def = achievementById(id);
    return (
      def !== undefined &&
      !this.achievementsClaimed.includes(id) &&
      this.achievementProgress(def) >= def.target
    );
  }

  claimAchievement(id: string): boolean {
    if (!this.canClaimAchievement(id)) return false;
    this.achievementsClaimed.push(id);
    this.addGems(achievementById(id)!.gems);
    this.emit('quests:changed', undefined); // shares the badge/panel refresh
    return true;
  }

  canClaimQuest(id: QuestMetric, period: QuestPeriod = 'daily'): boolean {
    const sheet = this.questSheet(period);
    return (
      this.questProgress(id, period) >= questBy(period, id).target &&
      !sheet.claimed.includes(id)
    );
  }

  /** Claim a finished quest; full-clearing the dailies grows the streak. */
  claimQuest(
    id: QuestMetric,
    now: number = Date.now(),
    period: QuestPeriod = 'daily',
  ): boolean {
    this.rollDaily(now);
    if (!this.canClaimQuest(id, period)) return false;
    const sheet = this.questSheet(period);
    sheet.claimed.push(id);
    this.addGems(questBy(period, id).gems);
    if (period === 'daily' && this.daily.claimed.length === DAILY_QUESTS.length) {
      this.daily.streak =
        this.daily.lastAllDoneDay && isNextDay(this.daily.lastAllDoneDay, this.daily.day)
          ? this.daily.streak + 1
          : 1;
      this.daily.lastAllDoneDay = this.daily.day;
      this.addGems(Math.min(this.daily.streak * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP));
    }
    this.emit('quests:changed', undefined);
    return true;
  }

  // ---- Skins ----

  /** Why a skin can/can't be unlocked right now (IAP handled via grantSkin). */
  canUnlockSkin(def: SkinDef): { ok: boolean; reason?: string } {
    if (this.ownedSkins.includes(def.id)) return { ok: false, reason: 'owned' };
    switch (def.unlock.type) {
      case 'free':
        return { ok: true };
      case 'gold':
        return this.gold >= def.unlock.amount
          ? { ok: true }
          : { ok: false, reason: 'gold' };
      case 'gems':
        return this.gems >= def.unlock.amount
          ? { ok: true }
          : { ok: false, reason: 'gems' };
      case 'stage':
        return this.highestStage >= def.unlock.stage
          ? { ok: true }
          : { ok: false, reason: 'stage' };
      case 'iap':
        return { ok: false, reason: 'iap' };
    }
  }

  /** Unlock via in-game currency / stage requirement. Returns success. */
  unlockSkin(id: string): boolean {
    const def = skinById(id);
    if (!def) return false;
    const check = this.canUnlockSkin(def);
    if (!check.ok) return false;
    if (def.unlock.type === 'gold') {
      this.gold -= def.unlock.amount;
      this.emit('gold:changed', this.gold);
    } else if (def.unlock.type === 'gems') {
      this.gems -= def.unlock.amount;
      this.emit('gems:changed', this.gems);
    }
    this.ownedSkins.push(id);
    this.emit('skins:changed', this.ownedSkins);
    return true;
  }

  /** Unconditional grant — the IAP fulfillment path (and restores). */
  grantSkin(id: string): void {
    if (!skinById(id) || this.ownedSkins.includes(id)) return;
    this.ownedSkins.push(id);
    this.emit('skins:changed', this.ownedSkins);
  }

  // ---- Sword skins (cosmetic blade art) ----

  /** May this blade art be worn? Tier art unlocks at that lifetime tier;
   * premium weapons must be owned. */
  canUseSwordSkin(key: string): boolean {
    if (key === 'auto') return true;
    if (key.startsWith('tier-')) {
      const n = Number(key.slice(5));
      return Number.isInteger(n) && n >= 1 && n <= GEAR.weaponArtCount && this.bestTier >= n;
    }
    if (key.startsWith('premium-')) return this.ownedPremiumSwords.includes(key.slice(8));
    return false;
  }

  setSwordSkin(key: string): boolean {
    if (this.swordSkin === key || !this.canUseSwordSkin(key)) return false;
    this.swordSkin = key;
    this.emit('swordskin:changed', key);
    return true;
  }

  /** IAP fulfilment (and store restore) for a premium weapon. */
  grantPremiumSword(id: string): void {
    if (!premiumSwordById(id) || this.ownedPremiumSwords.includes(id)) return;
    this.ownedPremiumSwords.push(id);
    this.emit('swordskins:changed', this.ownedPremiumSwords);
  }

  /** Store restore: re-grant every non-consumable the store says is owned.
   * Used on boot and by the shop's RESTORE PURCHASES button (Apple 3.1.1
   * requires a visible way to recover purchases on a new device).
   * Returns how many SKUs were recognised, for the confirmation toast. */
  applyRestoredSkus(skus: string[]): number {
    let recognised = 0;
    for (const sku of skus) {
      if (sku === REMOVE_ADS.sku) {
        this.removeAds = true;
        recognised++;
        continue;
      }
      if (sku === STARTER_PACK.sku) {
        this.starterPackOwned = true;
        recognised++;
        continue;
      }
      const skin = SKINS.find((s) => s.unlock.type === 'iap' && s.unlock.sku === sku);
      if (skin) {
        this.grantSkin(skin.id);
        recognised++;
        continue;
      }
      const sword = premiumSwordBySku(sku);
      if (sword) {
        this.grantPremiumSword(sword.id);
        recognised++;
      }
    }
    return recognised;
  }

  equipSkin(id: string): boolean {
    if (!this.ownedSkins.includes(id) || this.activeSkin === id) return false;
    this.activeSkin = id;
    this.emit('skin:changed', id);
    return true;
  }

  // ---- Persistence ----

  serialize(): SerializedState {
    return {
      gold: this.gold,
      gems: this.gems,
      grid: [...this.grid],
      highestTier: this.highestTier,
      highestStage: this.highestStage,
      battle: { ...this.battle },
      totalKills: this.totalKills,
      totalGoldEarned: this.totalGoldEarned,
      ownedSkins: [...this.ownedSkins],
      activeSkin: this.activeSkin,
      swordSkin: this.swordSkin,
      deviceId: this.deviceId,
      boardName: this.boardName,
      ownedPremiumSwords: [...this.ownedPremiumSwords],
      bestTier: this.bestTier,
      unlockedCells: this.unlockedCells,
      buyTierLevel: this.buyTierLevel,
      soulUpgrades: { ...this.soulUpgrades },
      pets: { ...this.pets },
      petStages: { ...this.petStages },
      goldEggsBought: this.goldEggsBought,
      lastFreeEggDay: this.lastFreeEggDay,
      removeAds: this.removeAds,
      starterPackOwned: this.starterPackOwned,
      piggyGems: this.piggyGems,
      freeChestReadyAt: this.freeChestReadyAt,
      skillTimers: Object.fromEntries(
        Object.entries(this.skillTimers).map(([id, t]) => [id, { ...t }]),
      ),
      autoSkills: this.autoSkills,
      boardRealOnly: this.boardRealOnly,
      dungeonClearedDay: this.dungeonClearedDay,
      codexClaimed: [...this.codexClaimed],
      enchants: { ...this.enchants },
      expedition: this.expedition ? { ...this.expedition } : null,
      duelDay: this.duelDay,
      duelsUsed: this.duelsUsed,
      passSeasonNum: this.passSeasonNum,
      passXp: this.passXp,
      passClaimedFree: [...this.passClaimedFree],
      passClaimedPremium: [...this.passClaimedPremium],
      passPremiumSeason: this.passPremiumSeason,
      dealClaimedDay: this.dealClaimedDay,
      fairyLevel: this.fairyLevel,
      dmgBoostUntil: this.dmgBoostUntil,
      speedBoostUntil: this.speedBoostUntil,
      adLootReadyAt: this.adLootReadyAt,
      loginStreakDay: this.loginStreakDay,
      lastLoginClaimDay: this.lastLoginClaimDay,
      totalMerges: this.totalMerges,
      achievementsClaimed: [...this.achievementsClaimed],
      townBuildings: { ...this.townBuildings },
      jewelerCollectedAt: this.jewelerCollectedAt,
      daily: {
        ...this.daily,
        progress: { ...this.daily.progress },
        claimed: [...this.daily.claimed],
      },
      weekly: {
        ...this.weekly,
        progress: { ...this.weekly.progress },
        claimed: [...this.weekly.claimed],
      },
      monthly: {
        ...this.monthly,
        progress: { ...this.monthly.progress },
        claimed: [...this.monthly.claimed],
      },
      prestigeCount: this.prestigeCount,
      souls: this.souls,
      raidHighest: this.raidHighest,
      raidBest: this.raidBest,
      raidReadyAt: this.raidReadyAt,
    };
  }

  static deserialize(data: SerializedState): GameState {
    const gs = new GameState();
    gs.gold = data.gold;
    gs.gems = data.gems;
    gs.grid = [...data.grid];
    gs.highestTier = data.highestTier;
    gs.highestStage = data.highestStage;
    gs.battle = { ...data.battle };
    gs.totalKills = data.totalKills;
    gs.totalGoldEarned = data.totalGoldEarned;
    gs.ownedSkins = [...data.ownedSkins];
    gs.swordSkin = data.swordSkin;
    gs.deviceId = data.deviceId ?? newDeviceId();
    gs.boardName = data.boardName ?? null;
    gs.ownedPremiumSwords = [...data.ownedPremiumSwords];
    gs.bestTier = data.bestTier;
    gs.activeSkin = data.activeSkin;
    gs.unlockedCells = data.unlockedCells;
    gs.buyTierLevel = data.buyTierLevel;
    gs.soulUpgrades = { ...data.soulUpgrades };
    gs.pets = { ...data.pets };
    gs.petStages = { ...data.petStages };
    gs.goldEggsBought = data.goldEggsBought;
    gs.lastFreeEggDay = data.lastFreeEggDay;
    gs.removeAds = data.removeAds;
    gs.starterPackOwned = data.starterPackOwned;
    gs.piggyGems = data.piggyGems;
    gs.freeChestReadyAt = data.freeChestReadyAt;
    gs.skillTimers = Object.fromEntries(
      Object.entries(data.skillTimers).map(([id, t]) => [id, { ...t }]),
    );
    gs.autoSkills = data.autoSkills ?? false;
    gs.boardRealOnly = data.boardRealOnly ?? false;
    gs.dungeonClearedDay = data.dungeonClearedDay ?? '';
    gs.codexClaimed = [...(data.codexClaimed ?? [])];
    gs.enchants = { ...(data.enchants ?? {}) };
    gs.expedition = data.expedition ? { ...data.expedition } : null;
    gs.duelDay = data.duelDay ?? '';
    gs.duelsUsed = data.duelsUsed ?? 0;
    gs.passSeasonNum = data.passSeasonNum ?? 0;
    gs.passXp = data.passXp ?? 0;
    gs.passClaimedFree = [...(data.passClaimedFree ?? [])];
    gs.passClaimedPremium = [...(data.passClaimedPremium ?? [])];
    gs.passPremiumSeason = data.passPremiumSeason ?? 0;
    gs.dealClaimedDay = data.dealClaimedDay ?? '';
    gs.fairyLevel = data.fairyLevel;
    gs.dmgBoostUntil = data.dmgBoostUntil;
    gs.speedBoostUntil = data.speedBoostUntil;
    gs.adLootReadyAt = data.adLootReadyAt;
    gs.loginStreakDay = data.loginStreakDay;
    gs.lastLoginClaimDay = data.lastLoginClaimDay;
    gs.totalMerges = data.totalMerges;
    gs.achievementsClaimed = [...data.achievementsClaimed];
    gs.townBuildings = { ...data.townBuildings };
    gs.jewelerCollectedAt = data.jewelerCollectedAt;
    gs.daily = {
      ...data.daily,
      progress: { ...data.daily.progress },
      claimed: [...data.daily.claimed],
    };
    gs.weekly = {
      ...data.weekly,
      progress: { ...data.weekly.progress },
      claimed: [...data.weekly.claimed],
    };
    gs.monthly = {
      ...data.monthly,
      progress: { ...data.monthly.progress },
      claimed: [...data.monthly.claimed],
    };
    gs.prestigeCount = data.prestigeCount;
    gs.souls = data.souls;
    gs.syncLoadout(); // pre-equip-bar saves: pull the loadout into the top row
    gs.raidHighest = data.raidHighest;
    gs.raidBest = data.raidBest;
    gs.raidReadyAt = data.raidReadyAt;
    return gs;
  }
}
