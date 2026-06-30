import { Directive, ElementRef, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { FocusTrapFactory, FocusTrap } from '@angular/cdk/a11y';

@Directive({
  selector: '[appFocusManager]',
  standalone: true
})
export class FocusManagerDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private focusTrapFactory = inject(FocusTrapFactory);
  private focusTrap!: FocusTrap;
  private previousFocus!: HTMLElement | null;

  @Input() appFocusManager: boolean | string = true;

  ngOnInit() {
    if (this.appFocusManager === false || this.appFocusManager === 'false') return;
    
    this.previousFocus = document.activeElement as HTMLElement;

    this.focusTrap = this.focusTrapFactory.create(this.el.nativeElement);
    this.focusTrap.enabled = true;
    
    this.focusTrap.focusInitialElementWhenReady().then(focused => {
      if (!focused) {
        this.el.nativeElement.focus();
      }
    });
  }

  ngOnDestroy() {
    if (this.focusTrap) {
      this.focusTrap.destroy();
    }
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
  }
}
