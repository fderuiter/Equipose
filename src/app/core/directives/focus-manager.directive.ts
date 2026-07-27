import { Directive, ElementRef, OnInit, OnDestroy, inject, Input } from '@angular/core';

@Directive({
  selector: '[appFocusManager]',
  standalone: true
})
export class FocusManagerDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private previousFocus!: HTMLElement | null;
  
  @Input() appFocusManager: boolean | string = true;

  private routingTriggered = false;
  private clickedOutside = false;
  private documentClickSubscription!: (e: MouseEvent) => void;

  ngOnInit() {
    if (this.appFocusManager === false || this.appFocusManager === 'false') return;
    
    // Fallback Focus (Requirement 5)
    if (!this.el.nativeElement.hasAttribute('tabindex')) {
      this.el.nativeElement.setAttribute('tabindex', '-1');
    }

    this.previousFocus = document.activeElement as HTMLElement;
    this.setupFocusTrap();
    
    // Focus the first focusable element synchronously if available on init
    const elements = this.getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    } else {
      this.el.nativeElement.focus();
      
      // Fallback for custom components (like <app-button>) that render asynchronously
      setTimeout(() => {
        // Only focus if the active element is still the host or body (ensures we don't disrupt user action)
        const active = document.activeElement;
        if (active === this.el.nativeElement || active === document.body) {
          const asyncElements = this.getFocusableElements();
          if (asyncElements.length > 0) {
            asyncElements[0].focus();
          }
        }
      }, 0);
    }

    // Monitor for clicks on the host to check if a navigation link was selected
    this.el.nativeElement.addEventListener('click', this.handleHostClick);

    // Monitor for document clicks to identify outside clicks
    this.documentClickSubscription = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && !this.el.nativeElement.contains(target)) {
        this.clickedOutside = true;
      }
    };
    document.addEventListener('click', this.documentClickSubscription, true);
  }

  ngOnDestroy() {
    if (this.appFocusManager === false || this.appFocusManager === 'false') return;

    this.removeFocusTrap();
    
    this.el.nativeElement.removeEventListener('click', this.handleHostClick);
    if (this.documentClickSubscription) {
      document.removeEventListener('click', this.documentClickSubscription, true);
    }

    // Focus Restoration: Only restore focus if focus was inside (or reset to body on deletion),
    // and we did not route or click outside
    const active = document.activeElement as HTMLElement;
    const isInside = active && (this.el.nativeElement.contains(active) || this.el.nativeElement === active);
    const wasRemoved = active === null || active === document.body;

    const shouldRestore = (isInside || wasRemoved) && !this.routingTriggered && !this.clickedOutside;

    if (shouldRestore) {
      if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
        this.previousFocus.focus();
      }
    }
  }

  private handleHostClick = (e: MouseEvent) => {
    let target = e.target as HTMLElement | null;
    while (target && target !== this.el.nativeElement) {
      if (target.tagName === 'A' || target.hasAttribute('routerLink')) {
        this.routingTriggered = true;
        break;
      }
      target = target.parentElement;
    }
  };

  private getFocusableElements(): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];
    return Array.from(
      this.el.nativeElement.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Dynamic Querying (Requirement 1)
    const elements = this.getFocusableElements();

    if (e.key === 'Tab') {
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Arrow-Key Navigation (Requirement 2)
      if (elements.length === 0) {
        e.preventDefault();
        return;
      }

      const activeIndex = elements.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') {
        if (activeIndex === -1) {
          elements[0].focus();
        } else {
          const nextIndex = (activeIndex + 1) % elements.length;
          elements[nextIndex].focus();
        }
      } else if (e.key === 'ArrowUp') {
        if (activeIndex === -1) {
          elements[elements.length - 1].focus();
        } else {
          const prevIndex = (activeIndex - 1 + elements.length) % elements.length;
          elements[prevIndex].focus();
        }
      }
      e.preventDefault();
    }
  };

  private setupFocusTrap() {
    this.el.nativeElement.addEventListener('keydown', this.handleKeyDown);
  }

  private removeFocusTrap() {
    this.el.nativeElement.removeEventListener('keydown', this.handleKeyDown);
  }
}
