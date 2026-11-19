import {
  blockSeconds,
  describeSequence,
  formatDuration,
  formatTotal,
  isUntimed,
  resolveSteps,
  totalBars,
} from './chain-utils';
import { MetronomeBlock } from './metronome-settings';

const block = (id: string, bars: number, bpm = 60, beatsPerBar = 4): MetronomeBlock => ({
  id,
  name: id.toUpperCase(),
  settings: { bpm, beatsPerBar, subdivision: 1, accents: [0], bars },
});

describe('chain utils', () => {
  const blocks = [block('a', 1), block('b', 2), block('c', 0)];

  it('resolveSteps keeps step order and duplicates, and skips missing blocks', () => {
    expect(resolveSteps(['b', 'a', 'gone', 'b'], blocks).map((b) => b.id)).toEqual(['b', 'a', 'b']);
  });

  it('isUntimed is true for blocks without a bar count', () => {
    expect(blocks.map(isUntimed)).toEqual([false, false, true]);
  });

  it('blockSeconds is bars × beats per bar at the block tempo', () => {
    expect(blockSeconds(block('x', 2, 60, 4).settings)).toBe(8);
    expect(blockSeconds(block('x', 4, 120, 3).settings)).toBe(6);
    expect(blockSeconds(block('x', 3, 90, 7).settings)).toBe(14);
  });

  it('totalBars sums the bars, or is null with an untimed block', () => {
    expect(totalBars([blocks[0], blocks[1], blocks[1]])).toBe(5);
    expect(totalBars(blocks)).toBeNull();
    expect(totalBars([])).toBe(0);
  });

  it.each([
    [0, '0:00'],
    [4.4, '0:04'],
    [65, '1:05'],
    [600, '10:00'],
    [3750, '1:02:30'],
  ])('formatDuration(%s) is %s', (seconds, label) => {
    expect(formatDuration(seconds)).toBe(label);
  });

  it('formatTotal shows bars and the estimated time', () => {
    expect(formatTotal([block('x', 1)])).toBe('1 bar · ≈ 0:04');
    expect(formatTotal([block('x', 8, 120), block('y', 4, 60, 3)])).toBe('12 bars · ≈ 0:28');
    expect(formatTotal(blocks)).toBe('no fixed length');
  });

  it('describeSequence counts blocks', () => {
    expect(describeSequence([blocks[0]])).toBe('1 block · 1 bar · ≈ 0:04');
    expect(describeSequence([blocks[0], blocks[1]])).toBe('2 blocks · 3 bars · ≈ 0:12');
  });
});
