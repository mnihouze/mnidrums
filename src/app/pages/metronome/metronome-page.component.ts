import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MetronomeComponent } from '../../components/metronome/metronome.component';
import { MetronomeBlocksComponent } from '../../components/metronome-blocks/metronome-blocks.component';

@Component({
    selector: 'app-metronome-page',
    imports: [MetronomeComponent, MetronomeBlocksComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    templateUrl: './metronome-page.component.html'
})
export class MetronomePageComponent {}
