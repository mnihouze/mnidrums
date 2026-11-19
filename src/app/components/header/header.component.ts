import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { SITE_NAME } from '../../site-config';

@Component({
    selector: 'app-header',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './header.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './header.component.scss'
})
export class HeaderComponent {
  siteName = SITE_NAME;
  menuOpen = false;

  navItems = [
    { label: 'Metronome', path: '/metronome' },
    { label: 'Metronome Plus', path: '/metronome-plus' },
    { label: 'Sheets', path: '/sheets' },
    { label: 'Musics', path: '/musics' },
    { label: 'Lessons', path: '/lessons' },
    { label: 'Books', path: '/books' },
    { label: 'Terms and Conditions', path:'/terms-and-conditions'}
  ];
}
