import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileListComponent } from './file-list.component';
import { LibraryItem } from '../../models/library-item';

describe('FileListComponent', () => {
  let fixture: ComponentFixture<FileListComponent>;
  let component: FileListComponent;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FileListComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
  });

  describe('hasWorkingImage', () => {
    it('is false when the item has no imagePath', () => {
      expect(component.hasWorkingImage({ title: 'x' })).toBe(false);
    });

    it('is true when the item has an imagePath that has not failed', () => {
      expect(component.hasWorkingImage({ title: 'x', imagePath: 'a.png' })).toBe(true);
    });

    it('is false once the image has been reported as broken', () => {
      component.onImageError('a.png');
      expect(component.hasWorkingImage({ title: 'x', imagePath: 'a.png' })).toBe(false);
    });

    it('is false for embedded items even with an imagePath', () => {
      expect(component.hasWorkingImage({ title: 'x', imagePath: 'a.png', embedded: true })).toBe(false);
    });
  });

  it('onImageError records the broken path', () => {
    component.onImageError('b.png');
    expect(component.brokenImages.has('b.png')).toBe(true);
  });

  describe('rendering', () => {
    it('shows the default empty message when there are no items', () => {
      fixture.detectChanges();
      expect(el.querySelector('.empty-msg')?.textContent).toContain('Nothing here yet');
      expect(el.querySelector('.file-grid')).toBeNull();
    });

    it('shows a custom empty message', () => {
      fixture.componentRef.setInput('emptyMessage', 'Vazio');
      fixture.detectChanges();
      expect(el.querySelector('.empty-msg')?.textContent).toContain('Vazio');
    });

    it('renders one card per item with title, description and actions', () => {
      const items: LibraryItem[] = [
        {
          title: 'Lesson 1',
          description: 'Desc 1',
          imagePath: 'assets/l1.png',
          pdfPath: 'assets/l1.pdf',
          linkUrl: 'https://example.com',
          linkLabel: 'Watch',
        },
        { title: 'Lesson 2' },
      ];
      fixture.componentRef.setInput('items', items);
      fixture.detectChanges();

      const cards = el.querySelectorAll('.file-card');
      expect(cards.length).toBe(2);

      const first = cards[0];
      expect(first.querySelector('h3')?.textContent).toContain('Lesson 1');
      expect(first.querySelector('p')?.textContent).toContain('Desc 1');
      expect(first.querySelector('img')?.getAttribute('src')).toBe('assets/l1.png');
      expect(first.querySelector('a.brass-btn')?.getAttribute('href')).toBe('assets/l1.pdf');
      expect(first.querySelector('a.link-btn')?.textContent).toContain('Watch');

      const second = cards[1];
      expect(second.querySelector('img')).toBeNull();
      expect(second.querySelector('.thumb-fallback')).not.toBeNull();
      expect(second.querySelector('a.brass-btn')).toBeNull();
      expect(second.querySelector('a.link-btn')).toBeNull();
    });

    it('uses "Open link" when no linkLabel is provided', () => {
      fixture.componentRef.setInput('items', [{ title: 'T', linkUrl: 'https://example.com' }]);
      fixture.detectChanges();
      expect(el.querySelector('a.link-btn')?.textContent).toContain('Open link');
    });

    it('renders an iframe and hides links for embedded items', () => {
      fixture.componentRef.setInput('items', [
        { title: 'Video', linkUrl: 'https://www.youtube.com/embed/x', pdfPath: 'a.pdf', embedded: true },
      ]);
      fixture.detectChanges();

      const iframe = el.querySelector('iframe');
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute('src')).toBe('https://www.youtube.com/embed/x');
      expect(el.querySelector('a.brass-btn')).toBeNull();
      expect(el.querySelector('a.link-btn')).toBeNull();
    });

    it('swaps the image for the fallback when it fails to load', () => {
      fixture.componentRef.setInput('items', [{ title: 'T', imagePath: 'broken.png' }]);
      fixture.detectChanges();

      el.querySelector('img')!.dispatchEvent(new Event('error'));
      fixture.detectChanges();

      expect(el.querySelector('img')).toBeNull();
      expect(el.querySelector('.thumb-fallback')).not.toBeNull();
    });
  });
});
