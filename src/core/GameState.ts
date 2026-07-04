import { ECONOMY } from '../config/economy';
import { BattleState, newBattleState, tick, TickResult } from './BattleSim';
import { buyTierFor, gearCost, heroDps } from './EconomyMath';
import {
  emptyGrid,
  findBestMerge,
  Grid,
  gridTiers,
  isFull,
  merge,
  move,
  spawn,
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
}

type Handler<T> = (payload: T) => void;

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
    return heroDps(gridTiers(this.grid));
  }

  get buyTier(): number {
    return buyTierFor(this.highestTier);
  }

  get buyCost(): number {
    return gearCost(this.buyTier);
  }

  get canBuy(): boolean {
    return this.gold >= this.buyCost && !isFull(this.grid);
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
    const index = spawn(this.grid, tier);
    this.emit('gold:changed', this.gold);
    this.emit('gear:bought', { index, tier });
    this.emit('grid:changed', this.grid);
    return true;
  }

  /** Merge grid item `from` onto `to`. Returns the new tier or null. */
  mergeAt(from: number, to: number): number | null {
    const newTier = merge(this.grid, from, to);
    if (newTier === null) return null;
    this.highestTier = Math.max(this.highestTier, newTier);
    this.emit('gear:merged', { index: to, tier: newTier });
    this.emit('grid:changed', this.grid);
    return newTier;
  }

  /** Move an item to an empty cell or swap two items. */
  moveAt(from: number, to: number): boolean {
    if (!move(this.grid, from, to)) return false;
    this.emit('grid:changed', this.grid);
    return true;
  }

  /** Perform the single best merge available (auto-merge button). */
  autoMergeOnce(): number | null {
    const pair = findBestMerge(this.grid);
    return pair ? this.mergeAt(pair.from, pair.to) : null;
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
    return gs;
  }
}
