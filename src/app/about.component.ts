import {Component} from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <div class="bg-white py-24 sm:py-32">
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="mx-auto max-w-2xl lg:mx-0">
          <h2 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">About the Generator</h2>
          <p class="mt-6 text-lg leading-8 text-gray-600">
            The Clinical Randomization Generator is a tool designed to help researchers and clinical trial managers create statistically sound, reproducible, and balanced treatment allocation schemas.
          </p>
        </div>
        <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div class="flex flex-col">
              <dt class="text-base font-semibold leading-7 text-gray-900">
                <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                  <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Custom Ratios
              </dt>
              <dd class="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p class="flex-auto">Define custom ratios for treatment arms, allowing for complex trial designs such as 2:1 or 3:1:1 randomization schemas.</p>
              </dd>
            </div>
            <div class="flex flex-col">
              <dt class="text-base font-semibold leading-7 text-gray-900">
                <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                  <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                Stratified Block Randomization
              </dt>
              <dd class="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p class="flex-auto">Ensure balance across multiple sites and stratification factors using a seeded Fisher-Yates shuffle algorithm.</p>
              </dd>
            </div>
            <div class="flex flex-col">
              <dt class="text-base font-semibold leading-7 text-gray-900">
                <div class="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                  <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                </div>
                Code Generation
              </dt>
              <dd class="mt-1 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p class="flex-auto">Export your randomization schema logic to R, SAS, or Python scripts for validation and integration into your statistical analysis plan.</p>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  `
})
export class AboutComponent {}
