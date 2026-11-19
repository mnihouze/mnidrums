import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MetronomePlusComponent } from './metronome-plus.component';
import { MetronomeBlocksService } from '../../services/metronome-blocks.service';
import { MetronomeChainsService } from '../../services/metronome-chains.service';
import { MetronomeSettings } from '../../models/metronome-settings';
import { stubAudioContext } from '../../../testing/fake-audio-context';



const settings = (bpm: number, bars: number, beatsPerBar = 4): MetronomeSettings => ({
  bpm,
  beatsPerBar,
  subdivision: 1,
  accents: [0],
  bars,
});

describe('MetronomePlusComponent', () => {
  let fixture: ComponentFixture<MetronomePlusComponent>;
  let component: MetronomePlusComponent;
  let store: MetronomeBlocksService;
  let el: HTMLElement;

  const playingName = () => component.currentBlock?.name ?? null;
  const chainButton = () => el.querySelector<HTMLButtonElement>('.chain-btn')!;
  const render = () => fixture.detectChanges();

  /** Advances fake time a little past `seconds`, so a block that long has finished. */
  const elapse = (seconds: number) => vi.advanceTimersByTime(seconds * 1000 + 150);

  beforeEach(async () => {
    vi.useFakeTimers();
    localStorage.clear();
    stubAudioContext();

    await TestBed.configureTestingModule({
      imports: [MetronomePlusComponent, NoopAnimationsModule],
    }).compileComponents();

    store = TestBed.inject(MetronomeBlocksService);
    fixture = TestBed.createComponent(MetronomePlusComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    render();
  });

  afterEach(() => {
    component.metronome.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function addBlocks(): void {
    store.add('Warm-up', settings(60, 1)); // 1 bar of 4 beats at 60 BPM = 4 s
    store.add('Groove', settings(120, 4, 3)); // 4 bars of 3 beats at 120 BPM = 6 s
    store.add('Cool-down', settings(60, 1)); // 4 s
    render();
  }

  it('shows the metronome, then the chain controls, then the blocks', () => {
    const order = ['app-metronome', '.chain', 'app-metronome-blocks'].map((s) => el.querySelector(s)!);
    expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('disables Start chain when there are no blocks', () => {
    expect(chainButton().disabled).toBe(true);
    expect(el.querySelector('.chain-status')?.textContent).toContain('Save at least one block');
  });

  it('shows the number of blocks and total length', () => {
    addBlocks();
    expect(el.querySelector('.chain-total')?.textContent?.trim()).toBe('3 blocks · 6 bars · ≈ 0:14');
  });

  it('plays each block for its bars, then the next, then stops', () => {
    addBlocks();
    chainButton().click();
    render();

    expect(component.chainRunning).toBe(true);
    expect(playingName()).toBe('Warm-up');
    expect(component.metronome.isPlaying).toBe(true);
    expect(component.metronome.bpm).toBe(60);
    expect(el.querySelector('.now-playing')?.textContent).toContain('1/3 · Warm-up');
    expect(el.querySelector('.up-next')?.textContent).toContain('Groove');

    elapse(4);
    render();
    expect(playingName()).toBe('Groove');
    expect(component.metronome.isPlaying).toBe(true);
    expect(component.metronome.bpm).toBe(120);
    expect(component.metronome.beatsPerBar).toBe(3);
    expect(component.metronome.barsTarget).toBe(4);

    elapse(3);
    expect(playingName()).toBe('Groove'); // 6-second block still running

    elapse(3);
    render();
    expect(playingName()).toBe('Cool-down');
    expect(el.querySelector('.up-next')?.textContent).toContain('End of chain');

    elapse(4);
    render();
    expect(component.chainRunning).toBe(false);
    expect(component.chainFinished).toBe(true);
    expect(component.metronome.isPlaying).toBe(false);
    expect(el.querySelector('.finished')).not.toBeNull();
  });

  it('highlights the playing block in the list and locks loading', () => {
    addBlocks();
    component.startChain();
    render();

    const items = el.querySelectorAll('.block-item');
    expect(items[0].classList).toContain('playing');
    expect(items[1].classList).not.toContain('playing');
    expect(items[0].querySelector<HTMLButtonElement>('.load-btn')!.disabled).toBe(true);
  });

  it('loops back to the first block when Repeat chain is on', () => {
    addBlocks();
    component.repeatChain = true;
    component.startChain();

    elapse(14.5);
    render();
    expect(component.chainRunning).toBe(true);
    expect(playingName()).toBe('Warm-up');
  });

  it('Stop chain stops the metronome and the chain', () => {
    addBlocks();
    component.startChain();
    render();

    chainButton().click();
    render();

    expect(component.chainRunning).toBe(false);
    expect(component.metronome.isPlaying).toBe(false);
    elapse(60);
    expect(component.metronome.isPlaying).toBe(false);
  });

  it('stopping the metronome itself also ends the chain', () => {
    addBlocks();
    component.startChain();

    component.metronome.toggle();

    expect(component.chainRunning).toBe(false);
    expect(component.chainFinished).toBe(false);
    elapse(60);
    expect(component.metronome.isPlaying).toBe(false);
  });

  it('skips to the next and previous block', () => {
    addBlocks();
    component.startChain();

    component.skipNext();
    expect(playingName()).toBe('Groove');
    expect(component.metronome.barsTarget).toBe(4);

    component.skipNext();
    expect(playingName()).toBe('Cool-down');

    component.skipPrevious();
    expect(playingName()).toBe('Groove');
    expect(component.chainRunning).toBe(true);
  });

  it('keeps playing a block without a bar count until Next is pressed', () => {
    store.add('Free', settings(100, 0));
    store.add('Timed', settings(90, 1));
    render();

    component.startChain();
    render();
    expect(el.querySelector('.untimed-hint')).not.toBeNull();

    elapse(120);
    expect(playingName()).toBe('Free');
    expect(component.metronome.isPlaying).toBe(true);

    component.skipNext();
    expect(playingName()).toBe('Timed');
  });

  it('follows the new order when blocks are reordered mid-chain', () => {
    addBlocks();
    component.startChain(); // Warm-up
    store.move(2, 1); // Warm-up, Cool-down, Groove

    elapse(4);
    expect(playingName()).toBe('Cool-down');
  });

  it('continues with the next block if the playing one is deleted', () => {
    addBlocks();
    component.startChain();
    component.skipNext(); // Groove
    store.remove(component.currentBlockId!);

    elapse(6);
    expect(playingName()).toBe('Cool-down');
  });

  describe('saved chains', () => {
    let chains: MetronomeChainsService;
    let ids: Record<string, string>;

    beforeEach(() => {
      chains = TestBed.inject(MetronomeChainsService);
      addBlocks();
      ids = Object.fromEntries(store.blocks.map((b) => [b.name, b.id]));
    });

    it('places the saved chains between the player and the blocks', () => {
      const order = ['.chain', 'app-metronome-chains', 'app-metronome-blocks'].map((s) => el.querySelector(s)!);
      expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('plays a saved chain in its own order, repeating blocks as needed', () => {
      const chain = chains.add('Routine', [ids['Cool-down'], ids['Warm-up'], ids['Cool-down']]);
      render();

      el.querySelector<HTMLButtonElement>('button[aria-label="Play Routine"]')!.click();
      render();

      expect(component.source).toBe(chain.id);
      expect(component.playingChainId).toBe(chain.id);
      expect(el.querySelector('.chain-item')?.classList).toContain('playing');
      expect(el.querySelector('.playing-source')?.textContent).toContain('Routine');
      expect(el.querySelector('.now-playing')?.textContent).toContain('1/3 · Cool-down');
      expect(el.querySelector('.chain-total')?.textContent?.trim()).toBe('3 blocks · 3 bars · ≈ 0:12');

      elapse(4);
      expect(playingName()).toBe('Warm-up');

      elapse(4);
      expect(playingName()).toBe('Cool-down');
      expect(component.currentPosition).toBe(2);

      elapse(4);
      expect(component.chainRunning).toBe(false);
      expect(component.chainFinished).toBe(true);
    });

    it('starts the chain picked in the Play selector', () => {
      const chain = chains.add('Just groove', [ids['Groove']]);
      component.source = chain.id;
      chainButton().click();

      expect(playingName()).toBe('Groove');
      elapse(6);
      expect(component.chainFinished).toBe(true);
    });

    it('skips steps whose block was deleted', () => {
      const chain = chains.add('Routine', [ids['Warm-up'], ids['Groove'], ids['Cool-down']]);
      store.remove(ids['Groove']);

      component.playSavedChain(chain);
      elapse(4);
      expect(playingName()).toBe('Cool-down');
    });

    it('follows edits made to the chain while it plays', () => {
      const chain = chains.add('Routine', [ids['Warm-up'], ids['Groove']]);
      component.playSavedChain(chain);
      chains.updateSteps(chain.id, [ids['Warm-up'], ids['Cool-down']]);

      elapse(4);
      expect(playingName()).toBe('Cool-down');
    });

    it('locks the Play selector while a chain plays', () => {
      component.startChain();
      render();
      expect(el.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('falls back to all blocks when asked to play an unknown chain', () => {
      component.startChain('missing');
      expect(component.source).toBe('all');
      expect(playingName()).toBe('Warm-up');
    });
  });

  it('marks blocks without a bar count in the total', () => {
    store.add('Free', settings(100, 0));
    render();
    expect(el.querySelector('.chain-total')?.textContent).toContain('no fixed length');
    expect(el.querySelector('.chain-status .hint')?.textContent).toContain('play until you press');
  });
});
