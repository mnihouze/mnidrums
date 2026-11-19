import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SITE_NAME } from '../../site-config';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  siteName = SITE_NAME;
  year = new Date().getFullYear();
}
