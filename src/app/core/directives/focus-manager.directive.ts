import { Directive, ElementRef, OnInit, OnDestroy, inject, Input } from '@angular/core';

@Directive({
  selector: '[appFocusManager]',
  standalone: true
})
export class FocusManagerDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private previousFocus!: HTMLElement | null;
  
  @Input() appFocusManager: boolean | string = true;

  ngOnInit() {
    if (this.appFocusManager === false || this.appFocusManager === 'false') return;
    
    // Fallback Focus (Requirement 5)
    if (!this.el.nativeElement.hasAttribute('tabindex')) {
      this.el.nativeElement.setAttribute('tabindex', '-1');
    }

    this.previousFocus = document.activeElement as HTMLElement;
    this.setupFocusTrap();
    
    // Focus the first focusable element or the host synchronously to avoid timing race conditions
    const elements = this.getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    } else {
      this.el.nativeElement.focus();
    }
  }

  ngOnDestroy() {
    this.removeFocusTrap();
    
    // Conditional Focus Restoration (Requirement 4)
    const active = document.activeElement as HTMLElement;
    const isInside = active && (this.el.nativeElement.contains(active) || this.el.nativeElement === active);
    const isAnchor = active && (active.tagName === 'A' || active.hasAttribute('routerLink'));
    
    if (isInside && !isAnchor && this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
  }

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
