import { ECONOMY } from '../config/economy';
import { PRESTIGE, soulsFor } from '../config/prestige';
import { RAIDS, raidGems, raidGoldPerKill, raidMonsterHp } from '../config/raids';
import { DEFAULT_SKIN, SkinDef, skinById } from '../config/skins';
import { BattleState, newBattleState, tick, TickResult } from './BattleSim';
import { GEAR, unlockedSlots } from '../config/gear';
import { buyTierFor, cellCost, gearCost, heroDps } from './EconomyMath';
import {
  emptyGrid,
  findBestMerge,
  Grid,
  gridTiers,
  isFull,
  merge,
  move,
  spawn,
  TOTAL_CELLS,
} from './MergeLogic';

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
  'skins:changed': string[];
  'cells:changed': number;
  'prestige:done': number;
  'raid:started': number;
  'raid:ended': RaidResult;
}

type Handler<T> = (payload: T) => void;

export interface RaidState {
  level: number;
  timeLeft: number;
  monsterHp: number;
  monsterMaxHp: number;
  kills: number;
  goldEarned: number;
}

export interface RaidResult {
  level: number;
  kills: number;
  gold: number;
  gems: number;
  cleared: boolean;
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
  unlockedCells: number;
  prestigeCount: number;
  souls: number;
  raidHighest: number;
  raidReadyAt: number;
}

const TICK_SECONDS = 0.1;

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
  unlockedCells: number = GEAR.baseCells;
  prestigeCount = 0;
  /** Rebirth currency, banked for the M3 upgrade tree. */
  souls = 0;
  /** Highest raid level cleared (next level = raidHighest + 1). */
  raidHighest = 0;
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

  get heroDps(): number {
    return heroDps(gridTiers(this.grid), this.equipSlots) * this.skinDpsMultiplier;
  }

  /** Sword slots currently unlocked (1..4, by highest stage reached). */
  get equipSlots(): number {
    return unlockedSlots(this.highestStage);
  }

  /** Grid indices of the auto-equipped loadout: top-N tiers, ties by index. */
  get equippedIndices(): number[] {
    return this.grid
      .map((tier, index) => ({ tier, index }))
      .filter((c): c is { tier: number; index: number } => c.tier !== null)
      .sort((a, b) => b.tier - a.tier || a.index - b.index)
      .slice(0, this.equipSlots)
      .map((c) => c.index);
  }

  /** Every owned skin grants its bonus permanently (collection incentive). */
  get skinDpsMultiplier(): number {
    return (
      1 +
      this.ownedSkins.reduce((sum, id) => sum + (skinById(id)?.dpsBonus ?? 0), 0)
    );
  }

  get buyTier(): number {
    return buyTierFor(this.highestTier);
  }

  get buyCost(): number {
    return gearCost(this.buyTier);
  }

  get canBuy(): boolean {
    return this.gold >= this.buyCost && !isFull(this.grid, this.unlockedCells);
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
    this.tickAccumulator += dtSeconds;
    while (this.tickAccumulator >= TICK_SECONDS) {
      this.tickAccumulator -= TICK_SECONDS;
      this.step(TICK_SECONDS);
    }
  }

  private step(dt: number): void {
    if (this.raid) {
      this.raidStep(dt);
      return;
    }
    const before = this.battle.stage;
    const result = tick(this.battle, this.heroDps, dt);

    if (result.goldEarned > 0) this.addGold(result.goldEarned);
    this.totalKills += result.kills;

    if (result.stageCleared) {
      this.highestStage = Math.max(this.highestStage, this.battle.stage);
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
  buyGear(): boolean {
    if (!this.canBuy) return false;
    const tier = this.buyTier;
    this.gold -= this.buyCost;
    const index = spawn(this.grid, tier, this.unlockedCells);
    this.emit('gold:changed', this.gold);
    this.emit('gear:bought', { index, tier });
    this.emit('grid:changed', this.grid);
    return true;
  }

  /** Merge grid item `from` onto `to`. Returns the new tier or null. */
  mergeAt(from: number, to: number): number | null {
    const newTier = merge(this.grid, from, to, this.unlockedCells);
    if (newTier === null) return null;
    this.highestTier = Math.max(this.highestTier, newTier);
    this.emit('gear:merged', { index: to, tier: newTier });
    this.emit('grid:changed', this.grid);
    return newTier;
  }

  /** Move an item to an empty cell or swap two items. */
  moveAt(from: number, to: number): boolean {
    if (!move(this.grid, from, to, this.unlockedCells)) return false;
    this.emit('grid:changed', this.grid);
    return true;
  }

  /** Perform the single best merge available (auto-merge button). */
  autoMergeOnce(): number | null {
    const pair = findBestMerge(this.grid);
    return pair ? this.mergeAt(pair.from, pair.to) : null;
  }

  // ---- Prestige ----

  get canPrestige(): boolean {
    return this.battle.stage >= PRESTIGE.minStage && !this.raid;
  }

  /** Souls this rebirth would bank right now. */
  get prestigeReward(): number {
    return soulsFor(this.battle.stage);
  }

  /**
   * Rebirth: reset the run (gold, gear, stages) and bank Souls. Permanent
   * account progress survives: skins, gems, board cells, sword-slot record
   * (highestStage), raids and prestige count.
   */
  prestige(): boolean {
    if (!this.canPrestige) return false;
    this.souls += this.prestigeReward;
    this.prestigeCount += 1;
    this.gold = ECONOMY.startingGold;
    this.grid = this.grid.map(() => null);
    this.highestTier = 1;
    this.battle = newBattleState(1);
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
    };
    this.raidReadyAt = now + RAIDS.cooldownMinutes * 60_000;
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
    while (budget > 0) {
      const dealt = Math.min(budget, raid.monsterHp);
      raid.monsterHp -= dealt;
      result.damageDealt += dealt;
      budget -= dealt;
      if (raid.monsterHp > 0) break;
      raid.kills += 1;
      result.kills += 1;
      const gold = raidGoldPerKill(raid.level);
      raid.goldEarned += gold;
      result.goldEarned += gold;
      raid.monsterHp = raid.monsterMaxHp;
    }
    if (result.goldEarned > 0) this.addGold(result.goldEarned);
    this.totalKills += result.kills;
    this.emit('battle:tick', result);

    raid.timeLeft -= dt;
    if (raid.timeLeft <= 0) this.endRaid();
  }

  private endRaid(): void {
    const raid = this.raid!;
    this.raid = null;
    const cleared = raid.kills >= RAIDS.clearKills;
    const gems = raidGems(raid.level, raid.kills);
    if (gems > 0) this.addGems(gems);
    if (cleared) this.raidHighest = Math.max(this.raidHighest, raid.level);
    this.emit('raid:ended', {
      level: raid.level,
      kills: raid.kills,
      gold: raid.goldEarned,
      gems,
      cleared,
    });
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
      unlockedCells: this.unlockedCells,
      prestigeCount: this.prestigeCount,
      souls: this.souls,
      raidHighest: this.raidHighest,
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
    gs.activeSkin = data.activeSkin;
    gs.unlockedCells = data.unlockedCells;
    gs.prestigeCount = data.prestigeCount;
    gs.souls = data.souls;
    gs.raidHighest = data.raidHighest;
    gs.raidReadyAt = data.raidReadyAt;
    return gs;
  }
}
