import { Component } from '@angular/core';
import { FileListComponent } from '../../components/file-list/file-list.component';
import { LibraryItem } from '../../models/library-item';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [FileListComponent],
  templateUrl: './books.component.html',
  styleUrl: './books.component.scss'
})
export class BooksComponent {
  // Placeholder data — drop matching files into src/assets/books/ and update the paths.
  items: LibraryItem[] = [
    {
      title: 'Stick Control',
      description: 'Classic technique book — cover and sample page.',
      imagePath: 'assets/books/stick-control.png',
      pdfPath: 'assets/books/Stick Control_ For the Snare Drummer -- George Lawrence Stone.pdf',
    }
  ];
}
