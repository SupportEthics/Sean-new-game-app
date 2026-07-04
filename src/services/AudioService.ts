/**
 * All SFX are tiny synthesized WebAudio tones — no audio files needed.
 * The AudioContext unlocks on the first user gesture; calls before that
 * simply stay silent, so headless tests never break.
 */
export class AudioService {
  private ctx: AudioContext | null = null;
  private muted: boolean;

  constructor() {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem('pawsblades_muted');
    } catch {
      /* storage unavailable */
    }
    this.muted = stored === '1';
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('pawsblades_muted', this.muted ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
    return this.muted;
  }

  private tone(
    freq: number,
    duration: number,
    opts: { type?: OscillatorType; vol?: number; slide?: number; delay?: number } = {},
  ): void {
    if (this.muted) return;
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      const { type = 'square', vol = 0.06, slide = 0, delay = 0 } = opts;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide !== 0) osc.frequency.linearRampToValueAtTime(freq + slide, t0 + duration);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      /* no audio available — play silently */
    }
  }

  hit(): void {
    this.tone(200, 0.05, { type: 'square', vol: 0.03, slide: -80 });
  }

  coin(): void {
    this.tone(880, 0.06, { type: 'triangle', vol: 0.05 });
    this.tone(1320, 0.09, { type: 'triangle', vol: 0.05, delay: 0.06 });
  }

  buy(): void {
    this.tone(330, 0.07, { type: 'triangle', vol: 0.06, slide: 60 });
  }

  merge(): void {
    this.tone(440, 0.07, { type: 'triangle', vol: 0.06 });
    this.tone(660, 0.07, { type: 'triangle', vol: 0.06, delay: 0.07 });
    this.tone(880, 0.12, { type: 'triangle', vol: 0.06, delay: 0.14 });
  }

  stageUp(): void {
    this.tone(523, 0.1, { type: 'square', vol: 0.05 });
    this.tone(659, 0.1, { type: 'square', vol: 0.05, delay: 0.1 });
    this.tone(784, 0.2, { type: 'square', vol: 0.05, delay: 0.2 });
  }

  bossWarn(): void {
    this.tone(110, 0.25, { type: 'sawtooth', vol: 0.06 });
    this.tone(104, 0.3, { type: 'sawtooth', vol: 0.06, delay: 0.28 });
  }
}

export const audio = new AudioService();
