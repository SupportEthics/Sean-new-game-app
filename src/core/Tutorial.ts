import { GameState } from './GameState';

export type TutorialStep = 'buy' | 'merge' | 'equip' | 'done';

/**
 * First-run tutorial state machine — pure TS. Steps advance from GameState
 * events; the UI only asks currentStep and renders pointers. Non-blocking
 * by design: a player (or test) can do anything at any time, and skip()
 * ends it instantly.
 */
export class Tutorial {
  private step: TutorialStep;
  private unsubscribes: (() => void)[] = [];
  private listeners = new Set<(step: TutorialStep) => void>();

  constructor(gs: GameState, alreadyDone: boolean) {
    // Veterans (or any save with real progress) never see it
    this.step = alreadyDone || gs.totalKills > 50 ? 'done' : 'buy';
    if (this.step === 'done') return;

    this.unsubscribes.push(
      gs.on('gear:bought', () => {
        if (this.step === 'buy') this.advance('merge');
      }),
      gs.on('gear:merged', () => {
        if (this.step === 'buy' || this.step === 'merge') this.advance('equip');
      }),
    );
  }

  get currentStep(): TutorialStep {
    return this.step;
  }

  get active(): boolean {
    return this.step !== 'done';
  }

  onChange(fn: (step: TutorialStep) => void): void {
    this.listeners.add(fn);
  }

  /** The equip step is informational — the UI confirms it after a pause. */
  acknowledgeEquip(): void {
    if (this.step === 'equip') this.advance('done');
  }

  skip(): void {
    if (this.step !== 'done') this.advance('done');
  }

  private advance(step: TutorialStep): void {
    this.step = step;
    if (step === 'done') {
      this.unsubscribes.forEach((u) => u());
      this.unsubscribes = [];
    }
    this.listeners.forEach((fn) => fn(step));
  }
}
