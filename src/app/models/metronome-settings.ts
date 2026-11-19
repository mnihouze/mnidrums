/** Every user-adjustable metronome option that can be saved and restored. */
export interface MetronomeSettings {
  bpm: number;
  beatsPerBar: number;
  /** Clicks per beat: 1 = quarter, 2 = eighth, 3 = triplet, 4 = sixteenth. */
  subdivision: number;
  /** 0-based beats of the bar that get the strong click (e.g. [0] = stress the first beat). */
  accents: number[];
  /** Bars to play (a bar = `beatsPerBar` beats); 0 = play indefinitely. */
  bars: number;
}

/** A named, saved metronome configuration. */
export interface MetronomeBlock {
  id: string;
  name: string;
  settings: MetronomeSettings;
}

/**
 * A named, ordered sequence of blocks played one after another in
 * Metronome Plus. Steps reference blocks by id, so editing a block updates
 * every chain that uses it; a block may appear more than once.
 */
export interface MetronomeChain {
  id: string;
  name: string;
  blockIds: string[];
}
