import { Component, inject, computed } from '@angular/core';
import { SignalRouter } from './signal-router.service';
import { routes } from '../../app.routes';
import { NgComponentOutlet } from '@angular/common';

@Component({
  selector: 'router-outlet',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `<ng-container *ngComponentOutlet="currentComponent()"></ng-container>`
})
export class RouterOutletComponent {
  private router = inject(SignalRouter);
  
  currentComponent = computed(() => {
    let currentPath = this.router.path().replace(/^\//, '') || '';
    if (currentPath.length > 0 && currentPath.endsWith('/')) {
      currentPath = currentPath.slice(0, -1);
    }
    
    // Exact match
    let match = routes.find(r => r.path === currentPath);
    
    // Catch-all
    if (!match) {
      match = routes.find(r => r.path === '**');
    }
    
    if (match && match.redirectTo !== undefined) {
      // Very simple redirect handling
      setTimeout(() => this.router.navigate('/' + match!.redirectTo));
      return null;
    }
    
    return match?.component || null;
  });
}
