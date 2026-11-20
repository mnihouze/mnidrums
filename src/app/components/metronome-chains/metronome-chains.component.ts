import { Component, EventEmitter, Input, Output, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MetronomeBlock, MetronomeChain } from '../../models/metronome-settings';
import { describeSequence, resolveSteps } from '../../models/chain-utils';
import { describeSettings } from '../metronome-blocks/metronome-blocks.component';
import { MetronomeBlocksService } from '../../services/metronome-blocks.service';
import { MetronomeChainsService } from '../../services/metronome-chains.service';

/** Draft of a chain being created (`chainId` null) or edited. */
export interface ChainDraft {
  chainId: string | null;
  name: string;
  blockIds: string[];
}

/** Lists the saved chains and lets the user create, edit, reorder, delete and play them. */
@Component({
    selector: 'app-metronome-chains',
    imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
],
    templateUrl: './metronome-chains.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './metronome-chains.component.scss'
})
export class MetronomeChainsComponent {
  /** Chain currently playing, highlighted in the list. */
  @Input() playingChainId: string | null = null;
  /** Emitted when the user presses Play on a chain. */
  @Output() play = new EventEmitter<MetronomeChain>();

  private readonly blockStore = inject(MetronomeBlocksService);
  private readonly chainStore = inject(MetronomeChainsService);

  readonly describeBlock = describeSettings;

  draft: ChainDraft | null = null;
  /** Block selected in the editor's "Add block" picker. */
  blockToAdd: string | null = null;

  get chains(): readonly MetronomeChain[] {
    return this.chainStore.chains;
  }

  get blocks(): readonly MetronomeBlock[] {
    return this.blockStore.blocks;
  }

  get draftSteps(): MetronomeBlock[] {
    return this.draft ? resolveSteps(this.draft.blockIds, this.blocks) : [];
  }

  stepsOf(chain: MetronomeChain): MetronomeBlock[] {
    return resolveSteps(chain.blockIds, this.blocks);
  }

  summary(chain: MetronomeChain): string {
    return describeSequence(this.stepsOf(chain));
  }

  stepNames(chain: MetronomeChain): string {
    return this.stepsOf(chain)
      .map((b) => b.name)
      .join(' → ');
  }

  // ----- List actions -----

  playChain(chain: MetronomeChain): void {
    if (this.stepsOf(chain).length) this.play.emit(chain);
  }

  moveChain(index: number, delta: number): void {
    this.chainStore.move(index, index + delta);
  }

  deleteChain(chain: MetronomeChain): void {
    if (!window.confirm(`Delete chain "${chain.name}"?`)) return;
    this.chainStore.remove(chain.id);
    if (this.draft?.chainId === chain.id) this.cancelEdit();
  }

  // ----- Editor -----

  newChain(): void {
    this.draft = { chainId: null, name: '', blockIds: [] };
    this.blockToAdd = this.blocks[0]?.id ?? null;
  }

  editChain(chain: MetronomeChain): void {
    // Drop steps whose block no longer exists.
    this.draft = {
      chainId: chain.id,
      name: chain.name,
      blockIds: this.stepsOf(chain).map((b) => b.id),
    };
    this.blockToAdd = this.blocks[0]?.id ?? null;
  }

  addStep(): void {
    if (this.draft && this.blockToAdd && this.blocks.some((b) => b.id === this.blockToAdd)) {
      this.draft.blockIds = [...this.draft.blockIds, this.blockToAdd];
    }
  }

  addAllBlocks(): void {
    if (this.draft) {
      this.draft.blockIds = [...this.draft.blockIds, ...this.blocks.map((b) => b.id)];
    }
  }

  moveStep(index: number, delta: number): void {
    if (!this.draft) return;
    // Indexes refer to the visible steps, so drop steps whose block was deleted.
    const steps = this.draftSteps.map((b) => b.id);
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    this.draft.blockIds = steps;
  }

  removeStep(index: number): void {
    if (!this.draft) return;
    this.draft.blockIds = this.draftSteps.map((b) => b.id).filter((_, i) => i !== index);
  }

  saveDraft(): void {
    if (!this.draft) return;
    const blockIds = this.draftSteps.map((b) => b.id);
    if (!blockIds.length) return;
    const { chainId, name } = this.draft;
    if (chainId) {
      this.chainStore.updateSteps(chainId, blockIds);
      this.chainStore.rename(chainId, name);
    } else {
      this.chainStore.add(name, blockIds);
    }
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.draft = null;
    this.blockToAdd = null;
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }
}
