import { DomSanitizer } from '@angular/platform-browser';
import { SafeUrlPipe } from './safe-url.pipe';

describe('SafeUrlPipe', () => {
  it('delegates to DomSanitizer.bypassSecurityTrustResourceUrl', () => {
    const trusted = { trusted: true };
    const sanitizer = {
      bypassSecurityTrustResourceUrl: vi.fn().mockReturnValue(trusted),
    } as unknown as DomSanitizer;

    const pipe = new SafeUrlPipe(sanitizer);
    const result = pipe.transform('https://www.youtube.com/embed/abc');

    expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('https://www.youtube.com/embed/abc');
    expect(result).toBe(trusted);
  });
});
