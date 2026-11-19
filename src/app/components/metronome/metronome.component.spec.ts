import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MetronomeComponent, normalizeAccents, normalizeBars } from './metronome.component';
import { FakeAudioContext, stubAudioContext } from '../../../testing/fake-audio-context';

describe('MetronomeComponent', () => {
  let fixture: ComponentFixture<MetronomeComponent>;
  let component: MetronomeComponent;

  beforeEach(async () => {
    stubAudioContext();

    await TestBed.configureTestingModule({
      imports: [MetronomeComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MetronomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates with sensible defaults', () => {
    expect(component).toBeTruthy();
    expect(component.bpm).toBe(100);
    expect(component.beatsPerBar).toBe(4);
    expect(component.subdivision).toBe(1);
    expect(component.isPlaying).toBe(false);
  });

  describe('onBpmChange', () => {
    it('rounds the value', () => {
      component.onBpmChange(120.6);
      expect(component.bpm).toBe(121);
    });

    it('clamps to the minimum', () => {
      component.onBpmChange(5);
      expect(component.bpm).toBe(component.minBpm);
    });

    it('clamps to the maximum', () => {
      component.onBpmChange(999);
      expect(component.bpm).toBe(component.maxBpm);
    });
  });

  describe('nudgeBpm', () => {
    it('adds the delta', () => {
      component.nudgeBpm(5);
      expect(component.bpm).toBe(105);
      component.nudgeBpm(-10);
      expect(component.bpm).toBe(95);
    });

    it('respects the limits', () => {
      component.bpm = component.maxBpm;
      component.nudgeBpm(1);
      expect(component.bpm).toBe(component.maxBpm);

      component.bpm = component.minBpm;
      component.nudgeBpm(-1);
      expect(component.bpm).toBe(component.minBpm);
    });
  });

  describe('nudgeBeatsPerBar', () => {
    it('moves to the next/previous option', () => {
      component.nudgeBeatsPerBar(1);
      expect(component.beatsPerBar).toBe(5);
      component.nudgeBeatsPerBar(-2);
      expect(component.beatsPerBar).toBe(3);
    });

    it('stays within the available options', () => {
      component.beatsPerBar = 12;
      component.nudgeBeatsPerBar(1);
      expect(component.beatsPerBar).toBe(12);

      component.beatsPerBar = 2;
      component.nudgeBeatsPerBar(-1);
      expect(component.beatsPerBar).toBe(2);
    });

    it('resets the current beat', () => {
      component.currentBeat = 3;
      component.currentSub = 1;
      component.nudgeBeatsPerBar(1);
      expect(component.currentBeat).toBe(0);
      expect(component.currentSub).toBe(0);
    });
  });

  it('beatDots has one entry per beat in the bar', () => {
    component.beatsPerBar = 6;
    expect(component.beatDots).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('renders one beat dot per beat', () => {
    component.beatsPerBar = 7;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.beat-dot').length).toBe(7);
  });

  describe('accent dots', () => {
    const dots = () => Array.from(fixture.nativeElement.querySelectorAll('.beat-dot')) as HTMLButtonElement[];
    const accented = () => dots().map((d) => d.classList.contains('accent'));

    it('has no "stress first beat" switch any more', () => {
      expect(fixture.nativeElement.textContent).not.toContain('Stress first beat');
      expect(fixture.nativeElement.querySelector('mat-slide-toggle')).toBeNull();
    });

    it('accents the first beat by default', () => {
      expect(accented()).toEqual([true, false, false, false]);
      expect(dots()[0].getAttribute('aria-pressed')).toBe('true');
      expect(dots()[1].getAttribute('aria-pressed')).toBe('false');
    });

    it('toggles a beat accent by clicking its dot', () => {
      dots()[2].click();
      fixture.detectChanges();
      expect(accented()).toEqual([true, false, true, false]);
      expect(component.accents).toEqual([0, 2]);

      dots()[0].click();
      fixture.detectChanges();
      expect(accented()).toEqual([false, false, true, false]);
      expect(component.accents).toEqual([2]);
    });

    it('can remove every accent', () => {
      dots()[0].click();
      fixture.detectChanges();
      expect(accented()).toEqual([false, false, false, false]);
      expect(component.getSettings().accents).toEqual([]);
    });

    it('ignores beats outside the bar', () => {
      component.toggleAccent(4);
      component.toggleAccent(-1);
      expect(component.accents).toEqual([0]);
    });

    it('keeps accents of beats hidden by a shorter bar, and restores them', () => {
      component.toggleAccent(3); // [0, 3]
      component.nudgeBeatsPerBar(-1); // 3 beats
      fixture.detectChanges();
      expect(accented()).toEqual([true, false, false]);
      expect(component.getSettings().accents).toEqual([0]);

      component.nudgeBeatsPerBar(1); // back to 4
      fixture.detectChanges();
      expect(accented()).toEqual([true, false, false, true]);
    });

    it('applySettings drops accents outside the bar and duplicates', () => {
      component.applySettings({ bpm: 100, beatsPerBar: 3, subdivision: 1, accents: [2, 0, 2, 5, -1], bars: 0 });
      expect(component.accents).toEqual([0, 2]);
    });
  });

  describe('normalizeAccents', () => {
    it('keeps unique whole beats within the bar, sorted', () => {
      expect(normalizeAccents([3, 0, 3, 1.5, 7, -1], 4)).toEqual([0, 3]);
      expect(normalizeAccents(undefined, 4)).toEqual([]);
    });
  });

  describe('settings snapshot', () => {
    it('getSettings returns the current options', () => {
      component.bpm = 132;
      component.beatsPerBar = 7;
      component.subdivision = 3;
      component.accents = [3, 1, 6];
      component.barsToPlay = 16;

      expect(component.getSettings()).toEqual({
        bpm: 132,
        beatsPerBar: 7,
        subdivision: 3,
        accents: [1, 3, 6],
        bars: 16,
      });
    });

    it('getSettings saves an empty bar count as 0 (play nonstop)', () => {
      component.barsToPlay = null;
      expect(component.getSettings().bars).toBe(0);
    });

    it('applySettings restores every option', () => {
      const saved = { bpm: 72, beatsPerBar: 6, subdivision: 4, accents: [0, 3], bars: 10 };
      component.applySettings(saved);
      expect(component.getSettings()).toEqual(saved);
      expect(component.barsToPlay).toBe(10);
    });

    it('applySettings leaves the bars field empty for nonstop blocks', () => {
      component.barsToPlay = 8;
      component.applySettings({ bpm: 72, beatsPerBar: 4, subdivision: 1, accents: [0], bars: 0 });
      expect(component.barsToPlay).toBeNull();
    });

    it('applySettings clamps BPM and ignores unsupported values', () => {
      component.applySettings({ bpm: 999, beatsPerBar: 99, subdivision: 7, accents: [0, 9], bars: -1 });

      expect(component.bpm).toBe(component.maxBpm);
      expect(component.beatsPerBar).toBe(4);
      expect(component.subdivision).toBe(1);
      expect(component.barsToPlay).toBeNull();
    });

    it('applySettings does not change the bar count while playing', () => {
      vi.useFakeTimers();
      component.start();
      component.applySettings({ bpm: 90, beatsPerBar: 3, subdivision: 2, accents: [0], bars: 8 });

      expect(component.bpm).toBe(90);
      expect(component.beatsPerBar).toBe(3);
      expect(component.barsToPlay).toBeNull();
    });
  });

  describe('normalizeBars', () => {
    it.each([
      [null, null],
      [undefined, null],
      [0, null],
      [-3, null],
      [NaN, null],
      [0.5, null],
      [1, 1],
      [8, 8],
      [4.7, 4],
    ])('%s -> %s', (input, expected) => {
      expect(normalizeBars(input as number | null | undefined)).toBe(expected);
    });
  });

  describe('stopped event', () => {
    let reasons: string[];

    beforeEach(() => {
      vi.useFakeTimers();
      reasons = [];
      component.stopped.subscribe((r) => reasons.push(r));
    });

    it('emits "user" when stopped manually', () => {
      component.start();
      component.stop();
      expect(reasons).toEqual(['user']);
    });

    it('emits "completed" after the last bar', () => {
      component.bpm = 60;
      component.barsToPlay = 1;
      component.start();
      vi.advanceTimersByTime(4_200);
      expect(reasons).toEqual(['completed']);
    });

    it('does not emit when stopping while already stopped', () => {
      component.stop();
      expect(reasons).toEqual([]);
    });
  });

  it('start() is a no-op while already playing', () => {
    vi.useFakeTimers();
    component.start();
    const ctx = FakeAudioContext.instances[0];
    const scheduled = ctx.oscillators.length;
    component.start();
    expect(ctx.oscillators.length).toBe(scheduled);
  });


  describe('tapTempo', () => {
    let now = 0;

    beforeEach(() => {
      now = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
    });

    it('does nothing after a single tap', () => {
      component.tapTempo();
      expect(component.bpm).toBe(100);
    });

    it('sets the BPM from the average interval between taps', () => {
      component.tapTempo();
      now += 500;
      component.tapTempo();
      expect(component.bpm).toBe(120);

      now += 400; // average of 500ms and 400ms = 450ms -> 133.3 BPM
      component.tapTempo();
      expect(component.bpm).toBe(133);
    });

    it('ignores taps older than 2.5s', () => {
      component.tapTempo();
      now += 3000;
      component.tapTempo();
      expect(component.bpm).toBe(100);

      now += 1000;
      component.tapTempo();
      expect(component.bpm).toBe(60);
    });
  });

  describe('playback', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('start() creates and resumes an AudioContext and schedules a note', () => {
      component.start();

      expect(component.isPlaying).toBe(true);
      expect(FakeAudioContext.instances.length).toBe(1);
      const ctx = FakeAudioContext.instances[0];
      expect(ctx.resume).toHaveBeenCalled();
      expect(ctx.oscillators.length).toBeGreaterThan(0);
    });

    it('plays the strong click on the first beat by default', () => {
      component.start();
      expect(FakeAudioContext.instances[0].oscillators[0].frequency.value).toBe(1600);
    });

    it('plays a normal click on the first beat when it is not accented', () => {
      component.toggleAccent(0);
      component.start();
      expect(FakeAudioContext.instances[0].oscillators[0].frequency.value).toBe(1100);
    });

    it('plays the strong click on every accented beat', () => {
      component.bpm = 60;
      component.accents = [1, 3];
      component.start();
      vi.advanceTimersByTime(7_000); // 8 beats: two bars

      expect(FakeAudioContext.instances[0].oscillators.map((o) => o.frequency.value)).toEqual([
        1100, 1600, 1100, 1600, 1100, 1600, 1100, 1600,
      ]);
    });

    it('uses a softer click for subdivisions', () => {
      component.subdivision = 2;
      component.bpm = 120; // 0.25s per eighth note
      component.start();

      const ctx = FakeAudioContext.instances[0];
      ctx.currentTime = 0.3;
      vi.advanceTimersByTime(25);

      expect(ctx.oscillators.map((o) => o.frequency.value)).toEqual([1600, 700]);
    });

    it('reuses the AudioContext across start/stop cycles', () => {
      component.start();
      component.stop();
      component.start();
      expect(FakeAudioContext.instances.length).toBe(1);
    });

    it('toggle() starts and stops', () => {
      component.toggle();
      expect(component.isPlaying).toBe(true);
      component.toggle();
      expect(component.isPlaying).toBe(false);
    });

    it('flashes the beat when the note sounds', () => {
      component.start();
      vi.advanceTimersByTime(50);
      expect(component.pulse).toBe(true);
      expect(component.currentBeat).toBe(0);

      vi.advanceTimersByTime(100);
      expect(component.pulse).toBe(false);
    });

    it('stop() resets state and stops scheduling', () => {
      component.start();
      component.stop();

      const ctx = FakeAudioContext.instances[0];
      const scheduled = ctx.oscillators.length;
      ctx.currentTime = 10;
      vi.advanceTimersByTime(1000);

      expect(component.isPlaying).toBe(false);
      expect(component.pulse).toBe(false);
      expect(component.barProgress).toBe(0);
      expect(ctx.oscillators.length).toBe(scheduled);
    });
  });

  describe('play for X bars', () => {
    const clicks = () => FakeAudioContext.instances[0].oscillators.map((o) => o.frequency.value);

    beforeEach(() => {
      vi.useFakeTimers();
      component.bpm = 60; // 1 beat per second
    });

    it('plays nonstop when the bar count is empty', () => {
      component.barsToPlay = null;
      component.start();
      vi.advanceTimersByTime(120_000);
      expect(component.isPlaying).toBe(true);
      expect(component.barsTarget).toBeNull();
    });

    it('plays exactly the given number of full bars, then stops', () => {
      component.beatsPerBar = 4;
      component.barsToPlay = 2;
      component.start();

      // Bar = 4 beats = 4 s. Last beat sounds at ~7 s; the run ends when bar 3 would begin (~8 s).
      vi.advanceTimersByTime(7_900);
      expect(component.isPlaying).toBe(true);

      vi.advanceTimersByTime(300);
      expect(component.isPlaying).toBe(false);
      expect(clicks()).toEqual([1600, 1100, 1100, 1100, 1600, 1100, 1100, 1100]);
    });

    it('counts a bar as beats per bar beats', () => {
      component.beatsPerBar = 3;
      component.barsToPlay = 2;
      component.start();

      vi.advanceTimersByTime(6_300);
      expect(component.isPlaying).toBe(false);
      expect(clicks().length).toBe(6);
    });

    it('counts whole beats, not subdivision clicks', () => {
      component.beatsPerBar = 4;
      component.subdivision = 2;
      component.barsToPlay = 1;
      component.start();

      vi.advanceTimersByTime(4_300);
      expect(component.isPlaying).toBe(false);
      expect(clicks()).toEqual([1600, 700, 1100, 700, 1100, 700, 1100, 700]);
    });

    it('shows which bar is playing and the progress', () => {
      component.beatsPerBar = 4;
      component.barsToPlay = 2;
      component.start();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.timer-label')?.textContent).toContain('Bar 1 of 2');

      vi.advanceTimersByTime(100); // first beat
      expect(component.currentBar).toBe(1);
      expect(component.barProgress).toBeCloseTo(12.5);

      vi.advanceTimersByTime(4_000); // first beat of bar 2
      fixture.detectChanges();
      expect(component.currentBar).toBe(2);
      expect(component.barProgress).toBeCloseTo(62.5);
      expect(fixture.nativeElement.querySelector('.timer-label')?.textContent).toContain('Bar 2 of 2');
    });

    it('locks the bar count while playing and uses the value from the start', () => {
      component.barsToPlay = 1;
      component.start();
      component.barsToPlay = 50;

      vi.advanceTimersByTime(4_300);
      expect(component.isPlaying).toBe(false);
    });

    it('restarts the bar count on every start', () => {
      component.barsToPlay = 1;
      component.start();
      vi.advanceTimersByTime(2_000);
      component.stop();

      component.start();
      vi.advanceTimersByTime(3_900);
      expect(component.isPlaying).toBe(true);
      vi.advanceTimersByTime(400);
      expect(component.isPlaying).toBe(false);
    });

    it('ignores beat flashes from a previous run', () => {
      component.barsToPlay = 2;
      component.start();
      component.stop();
      component.start();
      vi.advanceTimersByTime(100);
      expect(component.currentBar).toBe(1);
    });

  });

  describe('lifecycle', () => {
    it('ngOnDestroy stops playback and closes the AudioContext', () => {
      vi.useFakeTimers();
      component.start();
      component.ngOnDestroy();
      expect(component.isPlaying).toBe(false);
      expect(FakeAudioContext.instances[0].close).toHaveBeenCalled();
    });
  });
});
