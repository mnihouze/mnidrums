import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  menuOpen = false;

  navItems = [
    { label: 'Metronome', path: '/metronome' },
    { label: 'Sheets', path: '/sheets' },
    { label: 'Musics', path: '/musics' },
    { label: 'Lessons', path: '/lessons' },
    { label: 'Books', path: '/books' },
  ];
}
