import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AnnouncerService } from '../services/announcer.service';

@Component({
  selector: 'app-announcer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sr-only" aria-live="polite">
      {{ announcer.announcement() }}
    </div>
  `,
})
export class AnnouncerComponent {
  protected announcer = inject(AnnouncerService);
}
