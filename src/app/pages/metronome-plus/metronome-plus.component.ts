import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MetronomeComponent, MetronomeStopReason } from '../../components/metronome/metronome.component';
import { MetronomeBlocksComponent } from '../../components/metronome-blocks/metronome-blocks.component';
import { MetronomeChainsComponent } from '../../components/metronome-chains/metronome-chains.component';
import { MetronomeBlock, MetronomeChain } from '../../models/metronome-settings';
import { describeSequence, isUntimed, resolveSteps } from '../../models/chain-utils';
import { MetronomeBlocksService } from '../../services/metronome-blocks.service';
import { MetronomeChainsService } from '../../services/metronome-chains.service';

/** Plays every saved block, in list order. */
export const ALL_BLOCKS = 'all';

/**
 * Plays a sequence of blocks — all saved blocks or a saved chain — one after
 * another: each block runs for its saved "play for X bars", then the next
 * one starts automatically.
 */
@Component({
    selector: 'app-metronome-plus',
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MetronomeComponent,
        MetronomeBlocksComponent,
        MetronomeChainsComponent,
    ],
    templateUrl: './metronome-plus.component.html',
    styleUrl: './metronome-plus.component.scss'
})
export class MetronomePlusComponent {
  @ViewChild(MetronomeComponent, { static: true }) metronome!: MetronomeComponent;

  private readonly blockStore = inject(MetronomeBlocksService);
  private readonly chainStore = inject(MetronomeChainsService);

  readonly ALL_BLOCKS = ALL_BLOCKS;

  /** What the player plays: ALL_BLOCKS or a saved chain's id. */
  source: string = ALL_BLOCKS;
  chainRunning = false;
  chainFinished = false;
  repeatChain = false;
  /** Id of the block being played. */
  currentBlockId: string | null = null;
  /** Step being played; with currentBlockId it survives reordering and deletions. */
  private currentStep = 0;
  /** True while the player itself stops the metronome to switch blocks. */
  private switching = false;

  get blocks(): readonly MetronomeBlock[] {
    return this.blockStore.blocks;
  }

  get chains(): readonly MetronomeChain[] {
    return this.chainStore.chains;
  }

  get selectedChain(): MetronomeChain | null {
    return this.chains.find((c) => c.id === this.source) ?? null;
  }

  get sourceName(): string {
    return this.selectedChain?.name ?? 'All blocks';
  }

  /** The blocks to play, in order (follows edits made while playing). */
  get sequence(): MetronomeBlock[] {
    if (this.source === ALL_BLOCKS) return [...this.blocks];
    const chain = this.selectedChain;
    return chain ? resolveSteps(chain.blockIds, this.blocks) : [];
  }

  get sequenceSummary(): string {
    return describeSequence(this.sequence);
  }

  /** Chain to highlight in the saved chains list. */
  get playingChainId(): string | null {
    return this.chainRunning ? this.selectedChain?.id ?? null : null;
  }

  get currentBlock(): MetronomeBlock | null {
    return this.blocks.find((b) => b.id === this.currentBlockId) ?? null;
  }

  /** Index of the playing step in the current sequence. */
  get currentPosition(): number {
    const seq = this.sequence;
    if (seq[this.currentStep]?.id === this.currentBlockId) return this.currentStep;
    const moved = seq.findIndex((b) => b.id === this.currentBlockId);
    // If the playing block was removed, the step after it now sits at currentStep.
    return moved >= 0 ? moved : this.currentStep - 1;
  }

  get nextBlock(): MetronomeBlock | null {
    const seq = this.sequence;
    const next = this.currentPosition + 1;
    if (next < seq.length) return seq[next];
    return this.repeatChain ? seq[0] ?? null : null;
  }

  get hasUntimedBlocks(): boolean {
    return this.sequence.some(isUntimed);
  }

  /** Starts playing `source` (or the currently selected one) from the first block. */
  startChain(source: string = this.source): void {
    this.source = this.chains.some((c) => c.id === source) ? source : ALL_BLOCKS;
    if (!this.sequence.length) return;
    this.chainFinished = false;
    this.chainRunning = true;
    this.playStep(0);
  }

  playSavedChain(chain: MetronomeChain): void {
    this.startChain(chain.id);
  }

  stopChain(): void {
    this.chainRunning = false;
    this.currentBlockId = null;
    this.metronome.stop();
  }

  toggleChain(): void {
    this.chainRunning ? this.stopChain() : this.startChain();
  }

  skipNext(): void {
    if (this.chainRunning) this.advance();
  }

  skipPrevious(): void {
    if (this.chainRunning) this.playStep(Math.max(0, this.currentPosition - 1));
  }

  /** Called whenever the embedded metronome stops. */
  onMetronomeStopped(reason: MetronomeStopReason): void {
    if (!this.chainRunning || this.switching) return;
    if (reason === 'completed') {
      this.advance();
    } else {
      // The user pressed Stop on the metronome itself: end the chain.
      this.chainRunning = false;
      this.currentBlockId = null;
    }
  }

  private advance(): void {
    let next = this.currentPosition + 1;
    if (next >= this.sequence.length) {
      if (this.repeatChain && this.sequence.length) {
        next = 0;
      } else {
        this.finishChain();
        return;
      }
    }
    this.playStep(next);
  }

  private playStep(index: number): void {
    const block = this.sequence[index];
    if (!block) {
      this.finishChain();
      return;
    }
    this.currentStep = index;
    this.currentBlockId = block.id;

    this.switching = true;
    this.metronome.stop();
    this.switching = false;

    this.metronome.applySettings(block.settings);
    this.metronome.start();
  }

  private finishChain(): void {
    this.chainRunning = false;
    this.chainFinished = true;
    this.currentBlockId = null;
    this.switching = true;
    this.metronome.stop();
    this.switching = false;
  }
}
