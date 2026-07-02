import { Directive, Input, HostListener, inject, ElementRef, Renderer2, effect, OnInit, OnDestroy, HostBinding } from '@angular/core';
import { SignalRouter } from './signal-router.service';

@Directive({
  selector: '[routerLink]',
  standalone: true
})
export class RouterLinkDirective {
  @Input() routerLink!: string;
  @Input() queryParams?: Record<string, string>;
  
  private router = inject(SignalRouter);
  
  @HostBinding('attr.href')
  get href() {
    return this.routerLink;
  }
  
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      this.router.navigate(this.routerLink, this.queryParams);
    }
  }
}

@Directive({
  selector: '[routerLinkActive]',
  standalone: true,
  exportAs: 'routerLinkActive'
})
export class RouterLinkActiveDirective {
  @Input() routerLinkActiveOptions: { exact: boolean } = { exact: false };
  
  private router = inject(SignalRouter);
  private routerLinkDirective = inject(RouterLinkDirective, { optional: true });
  
  isActive = false;

  constructor() {
    effect(() => {
      const currentPath = this.router.path();
      if (this.routerLinkDirective) {
        const linkPath = this.routerLinkDirective.routerLink;
        if (this.routerLinkActiveOptions.exact) {
          this.isActive = currentPath === linkPath || (currentPath === '/' && linkPath === '');
        } else {
          this.isActive = currentPath.startsWith(linkPath) && (linkPath !== '/' || currentPath === '/');
        }
      }
    });
  }
}
