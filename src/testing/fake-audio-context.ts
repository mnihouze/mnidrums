/**
 * Minimal Web Audio stand-in so the metronome can start/stop in jsdom.
 * `currentTime` follows Date.now(), so with vi.useFakeTimers() advancing the
 * fake clock also advances audio time (and the metronome keeps scheduling).
 * Setting `currentTime` shifts that clock.
 */
export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  private readonly createdAt = Date.now();
  private offset = 0;
  state: AudioContextState = 'suspended';

  get currentTime(): number {
    return (Date.now() - this.createdAt) / 1000 + this.offset;
  }

  set currentTime(value: number) {
    this.offset += value - this.currentTime;
  }

  destination = {};
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  close = vi.fn(() => Promise.resolve());
  oscillators: { frequency: { value: number } }[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator() {
    const osc = { frequency: { value: 0 }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
    this.oscillators.push(osc);
    return osc;
  }

  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

/** Replaces window.AudioContext with FakeAudioContext (undo with vi.unstubAllGlobals). */
export function stubAudioContext(): void {
  FakeAudioContext.instances = [];
  vi.stubGlobal('AudioContext', FakeAudioContext);
}
