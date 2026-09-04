import { Component } from '@angular/core';
import { FileListComponent } from '../../components/file-list/file-list.component';
import { LibraryItem } from '../../models/library-item';

@Component({
  selector: 'app-lessons',
  standalone: true,
  imports: [FileListComponent],
  templateUrl: './lessons.component.html',
  styleUrl: './lessons.component.scss'
})
export class LessonsComponent {
  // Placeholder data — drop matching files into src/assets/lessons/ and update the paths.
  items: LibraryItem[] = [
    {
      title: 'Lesson 1 — Basic Rock Beat',
      description: 'Hands and feet coordination exercise.',
      imagePath: 'assets/lessons/lesson-1.png',
      pdfPath: 'assets/lessons/lesson-1.pdf',
    },
    {
      title: 'Lesson 2 — Paradiddles',
      description: 'Sticking pattern warm-up.',
      imagePath: 'assets/lessons/lesson-2.png',
      pdfPath: 'assets/lessons/lesson-2.pdf',
    },
    {
      title: 'Lesson 3 — Groove Variations',
      description: 'Combining hi-hat patterns with fills.',
      imagePath: 'assets/lessons/lesson-3.png',
      pdfPath: 'assets/lessons/lesson-3.pdf',
    },
  ];
}
