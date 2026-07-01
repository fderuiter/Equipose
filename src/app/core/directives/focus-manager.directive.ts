import { Directive, ElementRef, OnInit, OnDestroy, inject, Input } from '@angular/core';

@Directive({
  selector: '[appFocusManager]',
  standalone: true
})
export class FocusManagerDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private previousFocus!: HTMLElement | null;
  private focusableElements: HTMLElement[] = [];
  
  @Input() appFocusManager: boolean | string = true;

  ngOnInit() {
    if (this.appFocusManager === false || this.appFocusManager === 'false') return;
    
    this.previousFocus = document.activeElement as HTMLElement;
    this.setupFocusTrap();
    
    setTimeout(() => {
      if (this.focusableElements.length > 0) {
        this.focusableElements[0].focus();
      } else {
        this.el.nativeElement.focus();
      }
    });
  }

  ngOnDestroy() {
    this.removeFocusTrap();
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (this.focusableElements.length === 0) {
      e.preventDefault();
      return;
    }

    const first = this.focusableElements[0];
    const last = this.focusableElements[this.focusableElements.length - 1];

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
  };

  private setupFocusTrap() {
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
      'input[type="text"]:not([disabled])', 'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])', 'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];
    this.focusableElements = Array.from(
      this.el.nativeElement.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];
    
    this.el.nativeElement.addEventListener('keydown', this.handleKeyDown);
  }

  private removeFocusTrap() {
    this.el.nativeElement.removeEventListener('keydown', this.handleKeyDown);
  }
}
