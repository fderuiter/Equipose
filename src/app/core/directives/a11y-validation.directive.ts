import { Directive, ElementRef, AfterViewChecked, Renderer2, inject } from '@angular/core';

@Directive({
  selector: 'input:not([type="checkbox"]):not([type="radio"]), select, textarea',
  standalone: true
})
export class A11yValidationDirective implements AfterViewChecked {
  private linkedErrorId = '';

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);

  ngAfterViewChecked() {
    const el = this.el.nativeElement;
    
    // Check if the control is currently invalid based on ng-invalid or border-red-500 classes.
    const isInvalid = el.classList.contains('ng-invalid') || el.classList.contains('border-red-500');

    if (isInvalid) {
      this.renderer.setAttribute(el, 'aria-invalid', 'true');
      this.linkErrorMessage();
    } else {
      this.renderer.removeAttribute(el, 'aria-invalid');
      if (this.linkedErrorId) {
        this.renderer.removeAttribute(el, 'aria-describedby');
        this.linkedErrorId = '';
      }
    }
  }

  private linkErrorMessage() {
    let errorEl: Element | null = null;
    let current = this.el.nativeElement.parentElement;
    
    // Traverse up to find the closest error message. Limit traversal to avoid false positives.
    for (let i = 0; i < 4; i++) {
      if (!current) break;
      const err = current.querySelector('.text-red-600, .text-red-500');
      if (err) {
        errorEl = err;
        break;
      }
      current = current.parentElement;
    }

    if (errorEl) {
      if (!errorEl.id) {
        errorEl.id = 'a11y-err-' + Math.random().toString(36).substring(2, 9);
      }
      
      const el = this.el.nativeElement;
      const currentDescribedBy = el.getAttribute('aria-describedby');
      
      if (currentDescribedBy !== errorEl.id) {
        this.renderer.setAttribute(el, 'aria-describedby', errorEl.id);
        this.linkedErrorId = errorEl.id;
      }
    } else {
      if (this.linkedErrorId) {
        this.renderer.removeAttribute(this.el.nativeElement, 'aria-describedby');
        this.linkedErrorId = '';
      }
    }
  }
}
