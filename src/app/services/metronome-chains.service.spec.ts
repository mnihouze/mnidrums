import { TestBed } from '@angular/core/testing';
import { METRONOME_CHAINS_STORAGE_KEY, MetronomeChainsService } from './metronome-chains.service';

describe('MetronomeChainsService', () => {
  const create = () => TestBed.inject(MetronomeChainsService);
  const names = (s: MetronomeChainsService) => s.chains.map((c) => c.name);

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('adds chains with a copy of the steps and a default name', () => {
    const service = create();
    const steps = ['a', 'b', 'a'];
    const chain = service.add('', steps);
    steps.push('c');

    expect(chain.name).toBe('Chain 1');
    expect(chain.blockIds).toEqual(['a', 'b', 'a']);
  });

  it('updates steps, renames, reorders and removes', () => {
    const service = create();
    const a = service.add('A', ['x']);
    service.add('B', ['y']);

    service.updateSteps(a.id, ['y', 'x']);
    service.rename(a.id, 'Morning');
    service.move(0, 1);
    expect(names(service)).toEqual(['B', 'Morning']);
    expect(service.chains[1].blockIds).toEqual(['y', 'x']);

    service.remove(a.id);
    expect(names(service)).toEqual(['B']);
  });

  it('persists to localStorage separately from the blocks', () => {
    create().add('Saved', ['x', 'y']);

    TestBed.resetTestingModule();
    expect(create().chains.map((c) => [c.name, c.blockIds])).toEqual([['Saved', ['x', 'y']]]);
    expect(localStorage.getItem(METRONOME_CHAINS_STORAGE_KEY)).toContain('Saved');
  });

  it('drops malformed stored chains', () => {
    localStorage.setItem(
      METRONOME_CHAINS_STORAGE_KEY,
      JSON.stringify([{ id: '1', name: 'ok', blockIds: ['a'] }, { id: '2', name: 'bad', blockIds: [1] }, { id: '3' }]),
    );
    expect(names(create())).toEqual(['ok']);
  });
});
