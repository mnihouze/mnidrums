import { TestBed } from '@angular/core/testing';
import { METRONOME_BLOCKS_STORAGE_KEY, MetronomeBlocksService } from './metronome-blocks.service';
import { MetronomeSettings } from '../models/metronome-settings';

const settings = (bpm: number): MetronomeSettings => ({
  bpm,
  beatsPerBar: 4,
  subdivision: 1,
  accents: [0],
  bars: 0,
});

describe('MetronomeBlocksService', () => {
  const create = () => TestBed.inject(MetronomeBlocksService);
  const names = (s: MetronomeBlocksService) => s.blocks.map((b) => b.name);

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty', () => {
    expect(create().blocks).toEqual([]);
  });

  it('adds blocks with a trimmed name and a copy of the settings', () => {
    const service = create();
    const s = settings(90);
    const block = service.add('  Warm-up  ', s);
    s.bpm = 200;

    expect(block.name).toBe('Warm-up');
    expect(block.settings.bpm).toBe(90);
    expect(service.blocks).toEqual([block]);
  });

  it('gives unnamed blocks a unique default name', () => {
    const service = create();
    service.add('', settings(80));
    service.add('   ', settings(90));
    service.remove(service.blocks[0].id);
    service.add('', settings(100));

    expect(names(service)).toEqual(['Block 2', 'Block 3']);
  });

  it('assigns distinct ids', () => {
    const service = create();
    const a = service.add('a', settings(80));
    const b = service.add('b', settings(80));
    expect(a.id).not.toBe(b.id);
  });

  it('renames a block and ignores blank names', () => {
    const service = create();
    const { id } = service.add('Old', settings(80));

    service.rename(id, ' New ');
    expect(names(service)).toEqual(['New']);

    service.rename(id, '   ');
    expect(names(service)).toEqual(['New']);
  });

  it('replaces the settings of a block', () => {
    const service = create();
    const { id } = service.add('A', settings(80));
    service.updateSettings(id, settings(150));
    expect(service.blocks[0].settings.bpm).toBe(150);
  });

  it('removes a block', () => {
    const service = create();
    service.add('A', settings(80));
    const b = service.add('B', settings(80));
    service.remove(b.id);
    expect(names(service)).toEqual(['A']);
  });

  describe('move', () => {
    let service: MetronomeBlocksService;

    beforeEach(() => {
      service = create();
      ['A', 'B', 'C', 'D'].forEach((n) => service.add(n, settings(80)));
    });

    it('moves a block down', () => {
      service.move(0, 2);
      expect(names(service)).toEqual(['B', 'C', 'A', 'D']);
    });

    it('moves a block up', () => {
      service.move(3, 1);
      expect(names(service)).toEqual(['A', 'D', 'B', 'C']);
    });

    it('clamps the target index', () => {
      service.move(1, 99);
      expect(names(service)).toEqual(['A', 'C', 'D', 'B']);
      service.move(2, -5);
      expect(names(service)).toEqual(['D', 'A', 'C', 'B']);
    });

    it('ignores an out-of-range source index', () => {
      service.move(9, 0);
      expect(names(service)).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('persistence', () => {
    it('saves to localStorage and restores on a new instance', () => {
      const service = create();
      service.add('A', settings(80));
      service.add('B', settings(120));
      service.move(1, 0);

      TestBed.resetTestingModule();
      const reloaded = create();
      expect(names(reloaded)).toEqual(['B', 'A']);
      expect(reloaded.blocks[0].settings.bpm).toBe(120);
    });

    it('converts blocks saved with "play for X minutes" to the same length in bars', () => {
      const legacy = (name: string, bpm: number, beatsPerBar: number, durationMinutes: number) => ({
        id: name,
        name,
        settings: { bpm, beatsPerBar, subdivision: 1, stressFirstBeat: true, durationMinutes },
      });
      localStorage.setItem(
        METRONOME_BLOCKS_STORAGE_KEY,
        JSON.stringify([
          legacy('two-min', 120, 4, 2), // 240 beats / 4 = 60 bars
          legacy('waltz', 90, 3, 1), // 90 beats / 3 = 30 bars
          legacy('nonstop', 100, 4, 0), // stays nonstop
          legacy('tiny', 60, 4, 0.01), // rounds up to at least 1 bar
        ]),
      );

      const bars = create().blocks.map((b) => [b.name, b.settings.bars]);
      expect(bars).toEqual([
        ['two-min', 60],
        ['waltz', 30],
        ['nonstop', 0],
        ['tiny', 1],
      ]);
      expect(create().blocks[0].settings).not.toHaveProperty('durationMinutes');
    });

    it('converts the old "stress first beat" switch into per-beat accents', () => {
      const legacy = (name: string, stressFirstBeat: boolean) => ({
        id: name,
        name,
        settings: { bpm: 100, beatsPerBar: 4, subdivision: 1, stressFirstBeat, bars: 8 },
      });
      localStorage.setItem(METRONOME_BLOCKS_STORAGE_KEY, JSON.stringify([legacy('on', true), legacy('off', false)]));

      const blocks = create().blocks;
      expect(blocks.map((b) => [b.name, b.settings.accents])).toEqual([
        ['on', [0]],
        ['off', []],
      ]);
      expect(blocks[0].settings).not.toHaveProperty('stressFirstBeat');
    });

    it('cleans up stored accents', () => {
      localStorage.setItem(
        METRONOME_BLOCKS_STORAGE_KEY,
        JSON.stringify([
          { id: '1', name: 'x', settings: { bpm: 100, beatsPerBar: 3, subdivision: 1, accents: [2, 'a', 0, 2, 7], bars: 0 } },
        ]),
      );
      expect(create().blocks[0].settings.accents).toEqual([0, 2]);
    });

    it('saves a copy of the accents', () => {
      const service = create();
      const s = settings(90);
      service.add('A', s);
      s.accents.push(3);
      expect(service.blocks[0].settings.accents).toEqual([0]);
    });

    it('drops blocks without accents or the old stress switch', () => {
      localStorage.setItem(
        METRONOME_BLOCKS_STORAGE_KEY,
        JSON.stringify([{ id: '1', name: 'x', settings: { bpm: 60, beatsPerBar: 4, subdivision: 1, bars: 4 } }]),
      );
      expect(create().blocks).toEqual([]);
    });

    it('drops blocks with neither bars nor minutes', () => {
      localStorage.setItem(
        METRONOME_BLOCKS_STORAGE_KEY,
        JSON.stringify([{ id: '1', name: 'x', settings: { bpm: 60, beatsPerBar: 4, subdivision: 1, stressFirstBeat: true } }]),
      );
      expect(create().blocks).toEqual([]);
    });

    it('ignores corrupt storage', () => {
      localStorage.setItem(METRONOME_BLOCKS_STORAGE_KEY, '{not json');
      expect(create().blocks).toEqual([]);
    });

    it('drops malformed entries', () => {
      localStorage.setItem(
        METRONOME_BLOCKS_STORAGE_KEY,
        JSON.stringify([{ id: '1', name: 'ok', settings: settings(80) }, { id: 2, name: 'bad' }, null]),
      );
      expect(names(create())).toEqual(['ok']);
    });

    it('keeps working in memory when storage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked');
      });

      const service = create();
      service.add('A', settings(80));
      expect(names(service)).toEqual(['A']);
    });
  });
});
