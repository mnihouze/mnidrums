import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { LibraryItem } from '../../models/library-item';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
    selector: 'app-file-list',
    imports: [SafeUrlPipe],
    templateUrl: './file-list.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './file-list.component.scss'
})
export class FileListComponent {
  @Input() items: LibraryItem[] = [];
  @Input() emptyMessage = 'Nothing here yet — check back soon.';

  brokenImages = new Set<string>();

  onImageError(path: string): void {
    this.brokenImages.add(path);
  }

  hasWorkingImage(item: LibraryItem): boolean {
    return !!item.imagePath && !this.brokenImages.has(item.imagePath) && !item.embedded;
  }
}
