import { Component } from '@angular/core';
import { FileListComponent } from '../../components/file-list/file-list.component';
import { LibraryItem } from '../../models/library-item';

@Component({
  selector: 'app-musics',
  standalone: true,
  imports: [FileListComponent],
  templateUrl: './musics.component.html',
  styleUrl: './musics.component.scss',
})
export class MusicsComponent {
  // Placeholder data — replace pdfPath/linkUrl with your real files and links.
  items: LibraryItem[] = [
    {
      title: 'Boulevard of Broken Dreams',
      description:
        'Transcrição da música Boulevard of Broken Dreams da banda Green Day para bateria.',
      pdfPath: 'assets/musics/song-one.pdf',
      linkUrl: 'https://www.youtube.com/embed/hBvJyi3fbtA?si=dXO4NSHTzuK_WtQD',
      linkLabel: 'Ouvir / Watch',
      embedded: true,
    },
    {
      title: 'Song Title Two',
      description: 'Drum transcription with reference recording.',
      pdfPath: 'assets/musics/song-two.pdf',
      linkUrl: 'https://www.youtube.com/',
      linkLabel: 'Listen / Watch',
      embedded: false,
    },
    {
      title: 'Song Title Three',
      description: 'Drum transcription with reference recording.',
      pdfPath: 'assets/musics/song-three.pdf',
      linkUrl: 'https://www.youtube.com/',
      linkLabel: 'Listen / Watch',
      embedded: false,
    },
  ];
}
