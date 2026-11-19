import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MetronomeSettings } from '../../models/metronome-settings';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';

export type MetronomeStopReason = 'user' | 'completed';

interface SubdivisionOption {
  value: number;
  label: string;
  symbol: string;
}

@Component({
    selector: 'app-metronome',
    imports: [
    FormsModule,
    MatCardModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule
],
    templateUrl: './metronome.component.html',
    styleUrl: './metronome.component.scss'
})
export class MetronomeComponent implements OnDestroy {
  /**
   * Emitted whenever playback stops: `'completed'` after the last of the
   * "play for X bars" has sounded, `'user'` for any other stop (Stop button,
   * `stop()` call).
   */
  @Output() stopped = new EventEmitter<MetronomeStopReason>();

  // --- Tempo ---
  bpm = 100;
  readonly minBpm = 30;
  readonly maxBpm = 260;

  // --- Bars / beats per bar ---
  beatsPerBar = 4;
  readonly barOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // --- Accented beats (toggled by clicking the beat dots) ---
  /** 0-based beats of the bar that get the strong click. Kept when the bar shrinks, so growing it back restores them. */
  accents: number[] = [0];

  // --- Subdivision (notation) ---
  readonly subdivisionOptions: SubdivisionOption[] = [
    { value: 1, label: 'Quarter notes', symbol: '♩' },
    { value: 2, label: 'Eighth notes', symbol: '♫' },
    { value: 3, label: 'Eighth triplets', symbol: '♪₃' },
    { value: 4, label: 'Sixteenth notes', symbol: '♬' },
  ];
  subdivision = 1;

  // --- Play for X bars (optional) ---
  /** Bars to play; empty (null) or 0 = play indefinitely. A bar is `beatsPerBar` beats. */
  barsToPlay: number | null = null;
  /** Bar limit of the current run (snapshot of `barsToPlay` at start), or null. */
  barsTarget: number | null = null;
  /** 1-based bar currently sounding (0 before the first click). */
  currentBar = 0;
  /** 0–100 progress through `barsTarget`, beat by beat. */
  barProgress = 0;

  // --- Playback state ---
  isPlaying = false;
  currentBeat = 0;
  currentSub = 0;
  pulse = false;

  private audioCtx: AudioContext | null = null;
  private nextNoteTime = 0;
  private schedulerId: number | null = null;
  private readonly lookahead = 25; // ms
  private readonly scheduleAheadTime = 0.1; // seconds

  // Ahead-of-time counters used only for scheduling; `currentBeat`/`currentSub`
  // (bound in the template) are updated separately by `flashBeat`, in sync
  // with when each note actually sounds.
  private schedulingBeat = 0;
  private schedulingSub = 0;

  private tapTimes: number[] = [];

  /** Bars whose first note has been scheduled in this run. */
  private scheduledBars = 0;
  /** Pending "last bar has finished" stop, once all bars are scheduled. */
  private endTimeoutId: number | null = null;
  /** Increments every start, so beat flashes from a previous run are ignored. */
  private runId = 0;

  // ----- Playback control -----

  toggle(): void {
    this.isPlaying ? this.stop() : this.start();
  }

  start(): void {
    if (this.isPlaying) return;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isPlaying = true;
    this.runId++;
    this.currentBeat = 0;
    this.currentSub = 0;
    this.schedulingBeat = 0;
    this.schedulingSub = 0;
    this.barsTarget = normalizeBars(this.barsToPlay);
    this.scheduledBars = 0;
    this.currentBar = 0;
    this.barProgress = 0;
    this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    this.scheduler();
  }

  stop(): void {
    this.halt('user');
  }

  private halt(reason: MetronomeStopReason): void {
    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this.pulse = false;
    if (this.schedulerId !== null) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.endTimeoutId !== null) {
      clearTimeout(this.endTimeoutId);
      this.endTimeoutId = null;
    }
    this.barProgress = 0;
    if (wasPlaying) {
      this.stopped.emit(reason);
    }
  }

  /** e.g. "Bar 3 of 8". */
  get barLabel(): string {
    return `Bar ${Math.max(1, this.currentBar)} of ${this.barsTarget}`;
  }

  // ----- Scheduling (Web Audio API, no libraries) -----

  private scheduler = (): void => {
    if (!this.audioCtx) return;
    while (this.endTimeoutId === null && this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      const startsBar = this.schedulingBeat === 0 && this.schedulingSub === 0;
      if (startsBar) {
        if (this.barsTarget !== null && this.scheduledBars >= this.barsTarget) {
          // Every bar is scheduled: stop when the next bar would begin, i.e.
          // right after the last bar's final beat has fully played.
          this.scheduleEnd(this.nextNoteTime);
          break;
        }
        this.scheduledBars++;
      }
      this.scheduleNote(this.schedulingBeat, this.schedulingSub, this.nextNoteTime);
      this.advanceNote();
    }
    this.schedulerId = window.setTimeout(this.scheduler, this.lookahead);
  };

  private scheduleEnd(time: number): void {
    const delayMs = Math.max(0, (time - this.audioCtx!.currentTime) * 1000);
    this.endTimeoutId = window.setTimeout(() => {
      this.endTimeoutId = null;
      this.halt('completed');
    }, delayMs);
  }

  private advanceNote(): void {
    const secondsPerBeat = 60 / this.bpm;
    const secondsPerSub = secondsPerBeat / this.subdivision;
    this.nextNoteTime += secondsPerSub;

    this.schedulingSub++;
    if (this.schedulingSub >= this.subdivision) {
      this.schedulingSub = 0;
      this.schedulingBeat = (this.schedulingBeat + 1) % this.beatsPerBar;
    }
  }

  private scheduleNote(beat: number, sub: number, time: number): void {
    if (!this.audioCtx) return;
    const isDownbeat = sub === 0;
    const isAccent = isDownbeat && this.isAccented(beat);

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    let freq = 700;
    let vol = 0.3;

    if (isAccent) {
      freq = 1600;
      vol = 0.9;
    } else if (isDownbeat) {
      freq = 1100;
      vol = 0.6;
    }

    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);

    const delayMs = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
    const runId = this.runId;
    window.setTimeout(() => this.flashBeat(beat, sub, runId), delayMs);
  }

  private flashBeat(beat: number, sub: number, runId: number): void {
    if (runId !== this.runId || !this.isPlaying) return;
    this.currentBeat = beat;
    this.currentSub = sub;
    if (sub === 0) {
      if (beat === 0) this.currentBar++;
      if (this.barsTarget) {
        const beatsDone = (this.currentBar - 1) * this.beatsPerBar + beat + 1;
        this.barProgress = Math.min(100, (beatsDone / (this.barsTarget * this.beatsPerBar)) * 100);
      }
    }
    this.pulse = true;
    window.setTimeout(() => (this.pulse = false), 90);
  }

  // ----- User controls -----

  onBpmChange(value: number): void {
    this.bpm = Math.min(this.maxBpm, Math.max(this.minBpm, Math.round(value)));
  }

  nudgeBpm(delta: number): void {
    this.onBpmChange(this.bpm + delta);
  }

  onBeatsPerBarChange(): void {
    this.currentBeat = 0;
    this.currentSub = 0;
    this.schedulingBeat = 0;
    this.schedulingSub = 0;
  }

  nudgeBeatsPerBar(delta: number): void {
    const currentIndex = this.barOptions.indexOf(this.beatsPerBar);
    const nextIndex = Math.min(this.barOptions.length - 1, Math.max(0, currentIndex + delta));
    this.beatsPerBar = this.barOptions[nextIndex];
    this.onBeatsPerBarChange();
  }

  tapTempo(): void {
    const now = performance.now();
    this.tapTimes = this.tapTimes.filter((t) => now - t < 2500);
    this.tapTimes.push(now);
    if (this.tapTimes.length < 2) return;

    const intervals: number[] = [];
    for (let i = 1; i < this.tapTimes.length; i++) {
      intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
    }
    const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    this.onBpmChange(60000 / avgMs);
  }

  // ----- Settings snapshot (used by Metronome Plus blocks) -----

  getSettings(): MetronomeSettings {
    return {
      bpm: this.bpm,
      beatsPerBar: this.beatsPerBar,
      subdivision: this.subdivision,
      accents: this.accents.filter((b) => b < this.beatsPerBar).sort((a, b) => a - b),
      bars: normalizeBars(this.barsToPlay) ?? 0,
    };
  }

  /** Applies saved settings, ignoring values outside the supported options. */
  applySettings(settings: MetronomeSettings): void {
    this.onBpmChange(settings.bpm);

    if (this.barOptions.includes(settings.beatsPerBar) && settings.beatsPerBar !== this.beatsPerBar) {
      this.beatsPerBar = settings.beatsPerBar;
      this.onBeatsPerBarChange();
    }

    if (this.subdivisionOptions.some((o) => o.value === settings.subdivision)) {
      this.subdivision = settings.subdivision;
    }

    this.accents = normalizeAccents(settings.accents, this.beatsPerBar);

    // The bars field is locked while playing, so only change it when stopped.
    if (!this.isPlaying) {
      this.barsToPlay = normalizeBars(settings.bars);
    }
  }

  isAccented(beat: number): boolean {
    return this.accents.includes(beat);
  }

  /** Turns the strong click on/off for one beat of the bar (clicking its dot). */
  toggleAccent(beat: number): void {
    if (beat < 0 || beat >= this.beatsPerBar) return;
    this.accents = this.isAccented(beat)
      ? this.accents.filter((b) => b !== beat)
      : [...this.accents, beat].sort((a, b) => a - b);
  }

  get beatDots(): number[] {
    return Array.from({ length: this.beatsPerBar }, (_, i) => i);
  }

  ngOnDestroy(): void {
    this.stop();
    this.audioCtx?.close();
  }
}

/** Unique, sorted, whole beat indexes within the bar. */
export function normalizeAccents(accents: readonly number[] | null | undefined, beatsPerBar: number): number[] {
  const valid = (accents ?? []).filter((b) => Number.isInteger(b) && b >= 0 && b < beatsPerBar);
  return [...new Set(valid)].sort((a, b) => a - b);
}

/** Whole number of bars to play, or null for "play indefinitely" (empty, 0, invalid). */
export function normalizeBars(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? Math.floor(value) : null;
}
