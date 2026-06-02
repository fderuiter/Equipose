import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'app-regulatory-notice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 rounded-r-md" role="alert">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400 dark:text-yellow-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-yellow-700 dark:text-yellow-300">
            <strong>Important Notice:</strong> This tool utilizes a zero trust architecture and is <strong>not 21 CFR Part 11 compliant</strong>. For 21 CFR Part 11 compliance, users must maintain a record of their generated code for the study instead of using the sample generated schema. The generated schema provided by this application is <strong>not to be used in production for any study</strong>, despite its validity, due to the zero trust infrastructure of the program. A <strong>Script Export</strong> (R, SAS, Python, STATA) is the only validated method for production study execution.
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegulatoryNoticeComponent {}
