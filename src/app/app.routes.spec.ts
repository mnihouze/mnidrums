import { routes } from './app.routes';
import { MetronomePageComponent } from './pages/metronome/metronome-page.component';

describe('app routes', () => {
  it('redirects the empty path to the metronome', () => {
    const root = routes.find((r) => r.path === '');
    expect(root).toMatchObject({ redirectTo: 'metronome', pathMatch: 'full' });
  });

  it('redirects unknown paths to the metronome', () => {
    expect(routes.find((r) => r.path === '**')?.redirectTo).toBe('metronome');
  });

  it('maps /metronome to MetronomePageComponent', () => {
    expect(routes.find((r) => r.path === 'metronome')?.component).toBe(MetronomePageComponent);
  });

  it.each(['metronome', 'metronome-plus', 'sheets', 'musics', 'lessons', 'books', 'terms-and-conditions'])(
    'route %s has a component and a MniDrums title',
    (path) => {
      const route = routes.find((r) => r.path === path);
      expect(route?.component).toBeDefined();
      expect(route?.title).toMatch(/· MniDrums$/);
    },
  );
});
