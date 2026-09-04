import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';

interface SubdivisionOption {
  value: number;
  label: string;
  symbol: string;
}

@Component({
  selector: 'app-metronome',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule
  ],
  templateUrl: './metronome.component.html',
  styleUrl: './metronome.component.scss',
})
export class MetronomeComponent implements OnDestroy {
  // --- Tempo ---
  bpm = 100;
  readonly minBpm = 30;
  readonly maxBpm = 260;

  // --- Bars / beats per bar ---
  beatsPerBar = 4;
  readonly barOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // --- Stress first beat ---
  stressFirstBeat = true;

  // --- Subdivision (notation) ---
  readonly subdivisionOptions: SubdivisionOption[] = [
    { value: 1, label: 'Quarter notes', symbol: '♩' },
    { value: 2, label: 'Eighth notes', symbol: '♫' },
    { value: 3, label: 'Eighth triplets', symbol: '♪₃' },
    { value: 4, label: 'Sixteenth notes', symbol: '♬' },
  ];
  subdivision = 1;

  // --- Play-for-X-minutes timer ---
  durationMinutes = 0; // 0 = play indefinitely
  timerProgress = 0;
  remainingSeconds = 0;

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

  private timerIntervalId: number | null = null;
  private timerEndAt = 0;
  private timerTotalMs = 0;

  // ----- Playback control -----

  toggle(): void {
    this.isPlaying ? this.stop() : this.start();
  }

  start(): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isPlaying = true;
    this.currentBeat = 0;
    this.currentSub = 0;
    this.schedulingBeat = 0;
    this.schedulingSub = 0;
    this.nextNoteTime = this.audioCtx.currentTime + 0.05;
    this.scheduler();

    if (this.durationMinutes > 0) {
      this.timerTotalMs = this.durationMinutes * 60000;
      this.timerEndAt = Date.now() + this.timerTotalMs;
      this.timerProgress = 0;
      this.remainingSeconds = Math.ceil(this.timerTotalMs / 1000);
      this.timerIntervalId = window.setInterval(() => this.tickTimer(), 200);
    }
  }

  stop(): void {
    this.isPlaying = false;
    this.pulse = false;
    if (this.schedulerId !== null) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    this.timerProgress = 0;
  }

  private tickTimer(): void {
    const remaining = this.timerEndAt - Date.now();
    if (remaining <= 0) {
      this.stop();
      return;
    }
    this.remainingSeconds = Math.ceil(remaining / 1000);
    this.timerProgress = 100 - (remaining / this.timerTotalMs) * 100;
  }

  get remainingTimeLabel(): string {
    const m = Math.floor(this.remainingSeconds / 60);
    const s = this.remainingSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')} remaining`;
  }

  // ----- Scheduling (Web Audio API, no libraries) -----

  private scheduler = (): void => {
    if (!this.audioCtx) return;
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.schedulingBeat, this.schedulingSub, this.nextNoteTime);
      this.advanceNote();
    }
    this.schedulerId = window.setTimeout(this.scheduler, this.lookahead);
  };

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
    const isFirstBeat = beat === 0 && isDownbeat;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    let freq = 700;
    let vol = 0.3;

    if (isFirstBeat && this.stressFirstBeat) {
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
    window.setTimeout(() => this.flashBeat(beat, sub), delayMs);
  }

  private flashBeat(beat: number, sub: number): void {
    this.currentBeat = beat;
    this.currentSub = sub;
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

  get beatDots(): number[] {
    return Array.from({ length: this.beatsPerBar }, (_, i) => i);
  }

  ngOnDestroy(): void {
    this.stop();
    this.audioCtx?.close();
  }
}
