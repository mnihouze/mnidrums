import { Injectable } from '@angular/core';
import { MetronomeBlock, MetronomeSettings } from '../models/metronome-settings';
import { PersistedNamedList } from './persisted-named-list';
import { normalizeAccents } from '../components/metronome/metronome.component';

export const METRONOME_BLOCKS_STORAGE_KEY = 'mnidrums.metronomePlus.blocks';

/** The saved metronome blocks, in order, persisted to localStorage. */
@Injectable({ providedIn: 'root' })
export class MetronomeBlocksService extends PersistedNamedList<MetronomeBlock> {
  constructor() {
    super(METRONOME_BLOCKS_STORAGE_KEY, parseBlock, 'Block');
  }

  get blocks(): readonly MetronomeBlock[] {
    return this.items;
  }

  add(name: string, settings: MetronomeSettings): MetronomeBlock {
    return this.append(name, { settings: copySettings(settings) });
  }

  updateSettings(id: string, settings: MetronomeSettings): void {
    this.replace(id, (b) => ({ ...b, settings: copySettings(settings) }));
  }
}

function copySettings(settings: MetronomeSettings): MetronomeSettings {
  return { ...settings, accents: [...settings.accents] };
}

/**
 * Settings as they may be stored by older versions: "play for X minutes"
 * (`durationMinutes`) instead of bars, and a single "stress first beat"
 * switch (`stressFirstBeat`) instead of per-beat accents.
 */
type StoredSettings = Omit<MetronomeSettings, 'bars' | 'accents'> & {
  bars?: number;
  durationMinutes?: number;
  accents?: unknown;
  stressFirstBeat?: boolean;
};

/** Validates a stored block, migrating older formats. */
export function parseBlock(value: unknown): MetronomeBlock | null {
  const b = value as { id?: unknown; name?: unknown; settings?: StoredSettings };
  const s = b?.settings;
  const valid =
    typeof b?.id === 'string' &&
    typeof b.name === 'string' &&
    !!s &&
    typeof s.bpm === 'number' &&
    typeof s.beatsPerBar === 'number' && s.beatsPerBar > 0 &&
    typeof s.subdivision === 'number';
  if (!valid) return null;

  let accents: number[];
  if (Array.isArray(s.accents)) {
    accents = normalizeAccents(s.accents.filter((a): a is number => typeof a === 'number'), s.beatsPerBar);
  } else if (typeof s.stressFirstBeat === 'boolean') {
    accents = s.stressFirstBeat ? [0] : [];
  } else {
    return null;
  }

  let bars: number;
  if (typeof s.bars === 'number') {
    bars = s.bars;
  } else if (typeof s.durationMinutes === 'number') {
    // Same length of time: minutes × beats per minute ÷ beats per bar.
    bars = s.durationMinutes > 0 ? Math.max(1, Math.round((s.durationMinutes * s.bpm) / s.beatsPerBar)) : 0;
  } else {
    return null;
  }

  return {
    id: b.id as string,
    name: b.name as string,
    settings: {
      bpm: s.bpm,
      beatsPerBar: s.beatsPerBar,
      subdivision: s.subdivision,
      accents,
      bars: Math.max(0, Math.floor(bars)),
    },
  };
}
