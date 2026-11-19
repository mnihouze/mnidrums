import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MetronomeChainsComponent } from './metronome-chains.component';
import { MetronomeBlocksService } from '../../services/metronome-blocks.service';
import { MetronomeChainsService } from '../../services/metronome-chains.service';
import { MetronomeChain, MetronomeSettings } from '../../models/metronome-settings';

const settings = (bpm: number, bars: number): MetronomeSettings => ({
  bpm,
  beatsPerBar: 4,
  subdivision: 1,
  accents: [0],
  bars,
});

describe('MetronomeChainsComponent', () => {
  let fixture: ComponentFixture<MetronomeChainsComponent>;
  let component: MetronomeChainsComponent;
  let blocks: MetronomeBlocksService;
  let chains: MetronomeChainsService;
  let el: HTMLElement;
  let ids: Record<string, string>;

  const render = () => fixture.detectChanges();
  const byLabel = (label: string, root: ParentNode = el) =>
    root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  const stepNames = () =>
    Array.from(el.querySelectorAll('.step-item .step-name')).map((n) => n.textContent?.trim());
  const chainItems = () => Array.from(el.querySelectorAll<HTMLElement>('.chain-item'));

  function addBlocks(): void {
    ['Warm-up', 'Groove', 'Cool-down'].forEach((n, i) => blocks.add(n, settings(80 + i * 20, i + 1)));
    ids = Object.fromEntries(blocks.blocks.map((b) => [b.name, b.id]));
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MetronomeChainsComponent, NoopAnimationsModule],
    }).compileComponents();

    blocks = TestBed.inject(MetronomeBlocksService);
    chains = TestBed.inject(MetronomeChainsService);
    fixture = TestBed.createComponent(MetronomeChainsComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks for blocks first and disables New chain when there are none', () => {
    render();
    expect(el.querySelector('.empty-msg')?.textContent).toContain('Save some blocks first');
    expect(el.querySelector<HTMLButtonElement>('.new-chain-btn')!.disabled).toBe(true);
  });

  it('builds and saves a new chain from the editor', () => {
    addBlocks();
    render();

    el.querySelector<HTMLButtonElement>('.new-chain-btn')!.click();
    render();
    expect(el.querySelector('.chain-editor')).not.toBeNull();
    expect(el.querySelector<HTMLButtonElement>('.save-chain-btn')!.disabled).toBe(true);

    const name = el.querySelector<HTMLInputElement>('input[name="chainName"]')!;
    name.value = 'Daily';
    name.dispatchEvent(new Event('input'));

    component.blockToAdd = ids['Groove'];
    el.querySelector<HTMLButtonElement>('.add-step-btn')!.click();
    component.blockToAdd = ids['Warm-up'];
    el.querySelector<HTMLButtonElement>('.add-step-btn')!.click();
    component.blockToAdd = ids['Groove'];
    el.querySelector<HTMLButtonElement>('.add-step-btn')!.click();
    render();

    expect(stepNames()).toEqual(['Groove', 'Warm-up', 'Groove']);

    el.querySelector<HTMLButtonElement>('.save-chain-btn')!.click();
    render();

    expect(el.querySelector('.chain-editor')).toBeNull();
    expect(chains.chains.map((c) => [c.name, c.blockIds])).toEqual([
      ['Daily', [ids['Groove'], ids['Warm-up'], ids['Groove']]],
    ]);
    expect(chainItems()[0].querySelector('.chain-summary')?.textContent).toBe('3 blocks · 5 bars · ≈ 0:13'); // 2 + 1 + 2 bars; 4.8 s + 3 s + 4.8 s
    expect(chainItems()[0].querySelector('.chain-steps')?.textContent).toBe('Groove → Warm-up → Groove');
  });

  it('adds all blocks, reorders and removes steps', () => {
    addBlocks();
    component.newChain();
    component.addAllBlocks();
    render();
    expect(stepNames()).toEqual(['Warm-up', 'Groove', 'Cool-down']);

    byLabel('Move step down', el.querySelectorAll('.step-item')[0]).click();
    render();
    expect(stepNames()).toEqual(['Groove', 'Warm-up', 'Cool-down']);

    byLabel('Remove step', el.querySelectorAll('.step-item')[2]).click();
    render();
    expect(stepNames()).toEqual(['Groove', 'Warm-up']);
  });

  it('uses a default name when none is given', () => {
    addBlocks();
    component.newChain();
    component.addAllBlocks();
    component.saveDraft();
    expect(chains.chains[0].name).toBe('Chain 1');
  });

  it('cancelling the editor saves nothing', () => {
    addBlocks();
    component.newChain();
    component.addAllBlocks();
    component.cancelEdit();
    expect(chains.chains.length).toBe(0);
    expect(component.draft).toBeNull();
  });

  it('edits an existing chain', () => {
    addBlocks();
    const chain = chains.add('Old', [ids['Warm-up']]);
    render();

    byLabel('Edit chain').click();
    render();
    expect(stepNames()).toEqual(['Warm-up']);

    component.draft!.name = 'New';
    component.blockToAdd = ids['Cool-down'];
    component.addStep();
    component.saveDraft();

    expect(chains.chains).toEqual([{ id: chain.id, name: 'New', blockIds: [ids['Warm-up'], ids['Cool-down']] }]);
  });

  it('drops deleted blocks from a chain when editing it', () => {
    addBlocks();
    chains.add('C', [ids['Warm-up'], ids['Groove']]);
    blocks.remove(ids['Groove']);
    render();

    expect(chainItems()[0].querySelector('.chain-summary')?.textContent).toBe('1 block · 1 bar · ≈ 0:03');

    component.editChain(chains.chains[0]);
    component.saveDraft();
    expect(chains.chains[0].blockIds).toEqual([ids['Warm-up']]);
  });

  it('emits play with the chain', () => {
    addBlocks();
    chains.add('Routine', [ids['Groove']]);
    render();

    const played: MetronomeChain[] = [];
    component.play.subscribe((c) => played.push(c));
    byLabel('Play Routine').click();

    expect(played.map((c) => c.name)).toEqual(['Routine']);
  });

  it('cannot play a chain whose blocks were all deleted', () => {
    addBlocks();
    chains.add('Empty', [ids['Groove']]);
    blocks.remove(ids['Groove']);
    render();

    expect(byLabel('Play Empty').disabled).toBe(true);
    expect(chainItems()[0].querySelector('.chain-steps')?.textContent).toBe('Its blocks were deleted');
  });

  it('highlights the playing chain', () => {
    addBlocks();
    const a = chains.add('A', [ids['Groove']]);
    chains.add('B', [ids['Groove']]);
    fixture.componentRef.setInput('playingChainId', a.id);
    render();

    expect(chainItems()[0].classList).toContain('playing');
    expect(chainItems()[1].classList).not.toContain('playing');
  });

  it('reorders and deletes chains', () => {
    addBlocks();
    chains.add('A', [ids['Groove']]);
    chains.add('B', [ids['Groove']]);
    render();

    byLabel('Move chain down', chainItems()[0]).click();
    render();
    expect(chains.chains.map((c) => c.name)).toEqual(['B', 'A']);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    byLabel('Delete chain', chainItems()[0]).click();
    render();
    expect(chains.chains.map((c) => c.name)).toEqual(['A']);
  });
});
