import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SCHOOL_NAME, SITE_NAME } from '../../site-config';

@Component({
    selector: 'app-terms-and-conditions',
    imports: [],
    templateUrl: './terms-and-conditions.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './terms-and-conditions.component.scss'
})
export class TermsAndConditionsComponent {

  SCHOOL_NAME = SCHOOL_NAME;
  SITE_NAME = SITE_NAME;
}
