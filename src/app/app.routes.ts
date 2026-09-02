import { Routes } from '@angular/router';
import { MetronomeComponent } from './pages/metronome/metronome.component';
import { SheetsComponent } from './pages/sheets/sheets.component';
import { MusicsComponent } from './pages/musics/musics.component';
import { LessonsComponent } from './pages/lessons/lessons.component';
import { BooksComponent } from './pages/books/books.component';

export const routes: Routes = [
  { path: '', redirectTo: 'metronome', pathMatch: 'full' },
  { path: 'metronome', component: MetronomeComponent, title: 'Metronome · MniDrums' },
  { path: 'sheets', component: SheetsComponent, title: 'Sheets · MniDrums' },
  { path: 'musics', component: MusicsComponent, title: 'Musics · MniDrums' },
  { path: 'lessons', component: LessonsComponent, title: 'Lessons · MniDrums' },
  { path: 'books', component: BooksComponent, title: 'Books · MniDrums' },
  { path: '**', redirectTo: 'metronome' },
];
