import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterOutlet, RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header class="bg-indigo-700 text-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <a routerLink="/" class="text-2xl font-bold tracking-tight hover:text-indigo-100 transition-colors">Clinical Randomization Generator</a>
          </div>
          <nav class="flex items-center gap-6 text-indigo-100 text-sm font-medium">
            <a routerLink="/" routerLinkActive="text-white" [routerLinkActiveOptions]="{exact: true}" class="hover:text-white transition-colors">Home</a>
            <a routerLink="/generator" routerLinkActive="text-white" class="hover:text-white transition-colors">Generator</a>
            <a routerLink="/about" routerLinkActive="text-white" class="hover:text-white transition-colors">About</a>
          </nav>
        </div>
      </header>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class App {}
