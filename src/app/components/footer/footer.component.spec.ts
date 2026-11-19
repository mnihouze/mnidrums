import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { SITE_NAME } from '../../site-config';

describe('FooterComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the current year and the site name', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2031-05-10T12:00:00Z'));

    await TestBed.configureTestingModule({ imports: [FooterComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(fixture.componentInstance.year).toBe(2031);
    expect(text).toContain('© 2031');
    expect(text).toContain(SITE_NAME);
  });
});
