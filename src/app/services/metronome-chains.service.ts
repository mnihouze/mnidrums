import { Injectable } from '@angular/core';
import { MetronomeChain } from '../models/metronome-settings';
import { PersistedNamedList } from './persisted-named-list';

export const METRONOME_CHAINS_STORAGE_KEY = 'mnidrums.metronomePlus.chains';

/** The saved Metronome Plus chains, in order, persisted to localStorage. */
@Injectable({ providedIn: 'root' })
export class MetronomeChainsService extends PersistedNamedList<MetronomeChain> {
  constructor() {
    super(METRONOME_CHAINS_STORAGE_KEY, (v) => (isValidChain(v) ? v : null), 'Chain');
  }

  get chains(): readonly MetronomeChain[] {
    return this.items;
  }

  add(name: string, blockIds: readonly string[]): MetronomeChain {
    return this.append(name, { blockIds: [...blockIds] });
  }

  updateSteps(id: string, blockIds: readonly string[]): void {
    this.replace(id, (c) => ({ ...c, blockIds: [...blockIds] }));
  }
}

function isValidChain(value: unknown): value is MetronomeChain {
  const c = value as MetronomeChain;
  return (
    typeof c?.id === 'string' &&
    typeof c.name === 'string' &&
    Array.isArray(c.blockIds) &&
    c.blockIds.every((id) => typeof id === 'string')
  );
}
