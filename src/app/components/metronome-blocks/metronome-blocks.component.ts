import { Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MetronomeComponent } from '../metronome/metronome.component';
import { MetronomeBlock, MetronomeSettings } from '../../models/metronome-settings';
import { MetronomeBlocksService } from '../../services/metronome-blocks.service';

const SUBDIVISION_SYMBOLS: Record<number, string> = { 1: '♩', 2: '♫', 3: '♪₃', 4: '♬' };

/** e.g. "no accent", "accent on 1", "accents on 1, 3" (beats are shown 1-based). */
export function describeAccents(accents: readonly number[]): string {
  if (!accents.length) return 'no accent';
  const beats = accents.map((b) => b + 1).join(', ');
  return accents.length === 1 ? `accent on ${beats}` : `accents on ${beats}`;
}

/** One-line description of a block's settings, e.g. "120 BPM · 3 beats · ♫ · accent on 1 · 8 bars". */
export function describeSettings(settings: MetronomeSettings): string {
  const parts = [
    `${settings.bpm} BPM`,
    `${settings.beatsPerBar} beats`,
    SUBDIVISION_SYMBOLS[settings.subdivision] ?? '',
    describeAccents(settings.accents),
    settings.bars > 0 ? `${settings.bars} ${settings.bars === 1 ? 'bar' : 'bars'}` : '∞',
  ];
  return parts.filter(Boolean).join(' · ');
}

/**
 * Saved metronome setups ("blocks"): save the current settings of `metronome`,
 * load them back, rename, reorder and delete. Shared by the Metronome and
 * Metronome Plus pages, which see the same list.
 */
@Component({
    selector: 'app-metronome-blocks',
    imports: [
        CommonModule,
        FormsModule,
        DragDropModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatTooltipModule,
    ],
    templateUrl: './metronome-blocks.component.html',
    styleUrl: './metronome-blocks.component.scss'
})
export class MetronomeBlocksComponent {
  /** The metronome whose settings are saved and loaded. */
  @Input({ required: true }) metronome!: MetronomeComponent;
  /** Block currently playing in a chain; it gets a "now playing" highlight. */
  @Input() playingBlockId: string | null = null;
  /** Disables loading blocks (e.g. while a chain is running). */
  @Input() loadDisabled = false;

  /** Focuses and selects the rename field as soon as it appears. */
  @ViewChild('renameInput') set renameInput(ref: ElementRef<HTMLInputElement> | undefined) {
    if (ref) {
      const input = ref.nativeElement;
      input.focus();
      // ngModel fills the field asynchronously; select once the name is in it
      // so typing replaces the old name instead of appending to it.
      setTimeout(() => input.select());
    }
  }

  private readonly store = inject(MetronomeBlocksService);

  readonly summary = describeSettings;

  newBlockName = '';
  /** Block whose settings were last saved or loaded into the metronome. */
  activeBlockId: string | null = null;
  /** Block currently being renamed, and the draft name. */
  editingBlockId: string | null = null;
  editingName = '';

  get blocks(): readonly MetronomeBlock[] {
    return this.store.blocks;
  }

  saveCurrent(form?: NgForm): void {
    const block = this.store.add(this.newBlockName, this.metronome.getSettings());
    this.activeBlockId = block.id;
    // Reset through the form so the input is cleared even when typing and
    // submitting land in the same (coalesced) change-detection pass.
    if (form) {
      form.resetForm({ newBlockName: '' });
    } else {
      this.newBlockName = '';
    }
  }

  loadBlock(block: MetronomeBlock): void {
    if (this.loadDisabled) return;
    this.metronome.applySettings(block.settings);
    this.activeBlockId = block.id;
  }

  overwriteBlock(block: MetronomeBlock): void {
    this.store.updateSettings(block.id, this.metronome.getSettings());
    this.activeBlockId = block.id;
  }

  deleteBlock(block: MetronomeBlock): void {
    if (!window.confirm(`Delete block "${block.name}"?`)) return;
    this.store.remove(block.id);
    if (this.activeBlockId === block.id) this.activeBlockId = null;
    if (this.editingBlockId === block.id) this.cancelRename();
  }

  moveBlock(index: number, delta: number): void {
    this.store.move(index, index + delta);
  }

  onDrop(event: CdkDragDrop<readonly MetronomeBlock[]>): void {
    this.store.move(event.previousIndex, event.currentIndex);
  }

  startRename(block: MetronomeBlock): void {
    this.editingBlockId = block.id;
    this.editingName = block.name;
  }

  commitRename(): void {
    if (this.editingBlockId) {
      this.store.rename(this.editingBlockId, this.editingName);
    }
    this.cancelRename();
  }

  cancelRename(): void {
    this.editingBlockId = null;
    this.editingName = '';
  }

  trackById(_: number, block: MetronomeBlock): string {
    return block.id;
  }
}
