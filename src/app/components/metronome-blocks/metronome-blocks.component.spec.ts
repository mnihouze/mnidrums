import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MetronomeBlocksComponent, describeAccents, describeSettings } from './metronome-blocks.component';
import { MetronomeComponent } from '../metronome/metronome.component';
import { MetronomeBlocksService } from '../../services/metronome-blocks.service';

@Component({
  standalone: true,
  imports: [MetronomeComponent, MetronomeBlocksComponent],
  template: `
    <app-metronome #m></app-metronome>
    <app-metronome-blocks [metronome]="m" [playingBlockId]="playingId" [loadDisabled]="loadDisabled"></app-metronome-blocks>
  `,
})
class HostComponent {
  @ViewChild(MetronomeComponent, { static: true }) metronome!: MetronomeComponent;
  @ViewChild(MetronomeBlocksComponent, { static: true }) blocks!: MetronomeBlocksComponent;
  playingId: string | null = null;
  loadDisabled = false;
}

describe('describeAccents', () => {
  it.each([
    [[], 'no accent'],
    [[0], 'accent on 1'],
    [[0, 2], 'accents on 1, 3'],
  ])('%j -> %s', (accents, label) => {
    expect(describeAccents(accents)).toBe(label);
  });
});

describe('describeSettings', () => {
  it('summarises timed blocks', () => {
    expect(
      describeSettings({ bpm: 140, beatsPerBar: 3, subdivision: 2, accents: [], bars: 5 }),
    ).toBe('140 BPM · 3 beats · ♫ · no accent · 5 bars');
  });

  it('uses ∞ for blocks without a time limit', () => {
    expect(
      describeSettings({ bpm: 90, beatsPerBar: 4, subdivision: 1, accents: [0], bars: 0 }),
    ).toBe('90 BPM · 4 beats · ♩ · accent on 1 · ∞');
  });
});

describe('MetronomeBlocksComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let component: MetronomeBlocksComponent;
  let el: HTMLElement;

  const blockItems = () => Array.from(el.querySelectorAll<HTMLElement>('.block-item'));
  const blockNames = () => blockItems().map((li) => li.querySelector('.block-name')?.textContent?.trim());
  const button = (li: HTMLElement, label: string) =>
    li.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;

  function saveBlock(name: string, bpm: number): void {
    host.metronome.bpm = bpm;
    component.newBlockName = name;
    component.saveCurrent();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HostComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    component = host.blocks;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an empty message when there are no blocks', () => {
    expect(el.querySelector('.empty-msg')).not.toBeNull();
    expect(blockItems().length).toBe(0);
  });

  it('saves the current metronome settings as a named block', () => {
    host.metronome.bpm = 140;
    host.metronome.beatsPerBar = 3;
    host.metronome.subdivision = 2;
    host.metronome.accents = [];
    host.metronome.barsToPlay = 5;

    const input = el.querySelector<HTMLInputElement>('input[name="newBlockName"]')!;
    input.value = 'Waltz';
    input.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('form.save-row')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(blockNames()).toEqual(['Waltz']);
    expect(blockItems()[0].querySelector('.block-summary')?.textContent).toBe(
      '140 BPM · 3 beats · ♫ · no accent · 5 bars',
    );
    expect(component.newBlockName).toBe('');
    expect(blockItems()[0].classList).toContain('active');
  });

  it('clears the name field even when typing and submitting happen in one change-detection pass', async () => {
    const input = el.querySelector<HTMLInputElement>('input[name="newBlockName"]')!;
    const form = el.querySelector<HTMLFormElement>('form.save-row')!;

    // No detectChanges between typing and submitting.
    input.value = 'First';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(input.value).toBe('');

    input.value = 'Second';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(blockNames()).toEqual(['First', 'Second']);
  });

  it('loads a block back into the metronome', () => {
    saveBlock('Slow', 60);
    saveBlock('Fast', 180);
    host.metronome.bpm = 100;

    blockItems()[0].querySelector<HTMLButtonElement>('.load-btn')!.click();
    fixture.detectChanges();

    expect(host.metronome.bpm).toBe(60);
    expect(component.activeBlockId).toBe(TestBed.inject(MetronomeBlocksService).blocks[0].id);
    expect(blockItems()[0].classList).toContain('active');
    expect(blockItems()[1].classList).not.toContain('active');
  });

  it('disables loading when loadDisabled is set', () => {
    saveBlock('Slow', 60);
    host.loadDisabled = true;
    fixture.detectChanges();
    host.metronome.bpm = 100;

    const load = blockItems()[0].querySelector<HTMLButtonElement>('.load-btn')!;
    expect(load.disabled).toBe(true);
    component.loadBlock(component.blocks[0]);
    expect(host.metronome.bpm).toBe(100);
  });

  it('highlights the playing block', () => {
    saveBlock('A', 80);
    saveBlock('B', 90);
    host.playingId = component.blocks[1].id;
    fixture.detectChanges();

    expect(blockItems()[0].classList).not.toContain('playing');
    expect(blockItems()[1].classList).toContain('playing');
    expect(blockItems()[1].querySelector('.playing-icon')).not.toBeNull();
  });

  it('replaces a block with the current settings', () => {
    saveBlock('A', 80);
    host.metronome.bpm = 95;

    button(blockItems()[0], 'Replace with current settings').click();
    fixture.detectChanges();

    expect(blockItems()[0].querySelector('.block-summary')?.textContent).toContain('95 BPM');
  });

  it('reorders blocks with the move buttons', () => {
    saveBlock('A', 80);
    saveBlock('B', 90);
    saveBlock('C', 100);

    expect(button(blockItems()[0], 'Move up').disabled).toBe(true);
    expect(button(blockItems()[2], 'Move down').disabled).toBe(true);

    button(blockItems()[0], 'Move down').click();
    fixture.detectChanges();
    expect(blockNames()).toEqual(['B', 'A', 'C']);

    button(blockItems()[2], 'Move up').click();
    fixture.detectChanges();
    expect(blockNames()).toEqual(['B', 'C', 'A']);
  });

  it('reorders blocks on drag and drop', () => {
    saveBlock('A', 80);
    saveBlock('B', 90);
    saveBlock('C', 100);

    component.onDrop({ previousIndex: 2, currentIndex: 0 } as never);
    fixture.detectChanges();

    expect(blockNames()).toEqual(['C', 'A', 'B']);
  });

  it('renames a block inline with Enter', async () => {
    saveBlock('Old', 80);

    button(blockItems()[0], 'Rename').click();
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));

    const input = el.querySelector<HTMLInputElement>('.rename-input')!;
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Old');
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 3]);

    input.value = 'New name';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(el.querySelector('.rename-input')).toBeNull();
    expect(blockNames()).toEqual(['New name']);
  });

  it('cancels a rename with Escape', () => {
    saveBlock('Keep', 80);
    component.startRename(component.blocks[0]);
    fixture.detectChanges();

    const input = el.querySelector<HTMLInputElement>('.rename-input')!;
    input.value = 'Discard';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(blockNames()).toEqual(['Keep']);
  });

  it('deletes a block after confirmation', () => {
    saveBlock('A', 80);
    saveBlock('B', 90);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    button(blockItems()[1], 'Delete').click();
    fixture.detectChanges();

    expect(confirm).toHaveBeenCalledWith('Delete block "B"?');
    expect(blockNames()).toEqual(['A']);
    expect(component.activeBlockId).toBeNull();
  });

  it('keeps the block when deletion is cancelled', () => {
    saveBlock('A', 80);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    button(blockItems()[0], 'Delete').click();
    fixture.detectChanges();

    expect(blockNames()).toEqual(['A']);
  });

  it('shows blocks saved in a previous visit', () => {
    saveBlock('Persisted', 110);

    const second = TestBed.createComponent(HostComponent);
    second.detectChanges();

    const names = Array.from((second.nativeElement as HTMLElement).querySelectorAll('.block-name')).map((n) =>
      n.textContent?.trim(),
    );
    expect(names).toEqual(['Persisted']);
  });
});
