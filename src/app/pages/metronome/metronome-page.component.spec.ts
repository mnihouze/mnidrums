import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MetronomePageComponent } from './metronome-page.component';
import { MetronomeBlocksComponent } from '../../components/metronome-blocks/metronome-blocks.component';
import { MetronomeComponent } from '../../components/metronome/metronome.component';
import { By } from '@angular/platform-browser';

describe('MetronomePageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [MetronomePageComponent, NoopAnimationsModule],
    }).compileComponents();
  });

  it('shows the title, the metronome and the blocks below it, wired together', () => {
    const fixture = TestBed.createComponent(MetronomePageComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h1')?.textContent).toContain('Metronome');

    const metronomeEl = el.querySelector('app-metronome')!;
    const blocksEl = el.querySelector('app-metronome-blocks')!;
    expect(metronomeEl.compareDocumentPosition(blocksEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const metronome = fixture.debugElement.query(By.directive(MetronomeComponent)).componentInstance;
    const blocks = fixture.debugElement.query(By.directive(MetronomeBlocksComponent)).componentInstance;
    expect(blocks.metronome).toBe(metronome);
  });
});
