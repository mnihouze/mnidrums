import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MetronomeComponent } from './metronome.component';

/** Minimal Web Audio stand-in so start()/stop() can run in jsdom. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  state: AudioContextState = 'suspended';
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

describe('MetronomeComponent', () => {
  let fixture: ComponentFixture<MetronomeComponent>;
  let component: MetronomeComponent;

  beforeEach(async () => {
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);

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

  describe('remainingTimeLabel', () => {
    it.each([
      [0, '0:00 remaining'],
      [9, '0:09 remaining'],
      [65, '1:05 remaining'],
      [600, '10:00 remaining'],
    ])('formats %i seconds as %s', (seconds, label) => {
      component.remainingSeconds = seconds;
      expect(component.remainingTimeLabel).toBe(label);
    });
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

    it('accents the first beat when stressFirstBeat is on', () => {
      component.stressFirstBeat = true;
      component.start();
      expect(FakeAudioContext.instances[0].oscillators[0].frequency.value).toBe(1600);
    });

    it('does not accent the first beat when stressFirstBeat is off', () => {
      component.stressFirstBeat = false;
      component.start();
      expect(FakeAudioContext.instances[0].oscillators[0].frequency.value).toBe(1100);
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
      expect(component.timerProgress).toBe(0);
      expect(ctx.oscillators.length).toBe(scheduled);
    });

    it('does not start a timer when durationMinutes is 0', () => {
      component.durationMinutes = 0;
      component.start();
      vi.advanceTimersByTime(10 * 60_000);
      expect(component.isPlaying).toBe(true);
    });

    it('counts down and stops automatically after durationMinutes', () => {
      component.durationMinutes = 1;
      component.start();
      expect(component.remainingSeconds).toBe(60);

      vi.advanceTimersByTime(30_000);
      expect(component.isPlaying).toBe(true);
      expect(component.remainingSeconds).toBe(30);
      expect(component.timerProgress).toBeCloseTo(50, 0);

      vi.advanceTimersByTime(31_000);
      expect(component.isPlaying).toBe(false);
      expect(component.timerProgress).toBe(0);
    });

    it('ngOnDestroy stops playback and closes the AudioContext', () => {
      component.start();
      component.ngOnDestroy();
      expect(component.isPlaying).toBe(false);
      expect(FakeAudioContext.instances[0].close).toHaveBeenCalled();
    });
  });
});
