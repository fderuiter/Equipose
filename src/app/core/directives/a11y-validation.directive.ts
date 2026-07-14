import { Directive, ElementRef, AfterViewChecked, Renderer2, inject } from '@angular/core';

@Directive({
  selector: 'input:not([type="checkbox"]):not([type="radio"]), select, textarea, app-text-input, app-tag-input',
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

    let targetEl = el;
    if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA') {
      targetEl = el.querySelector('input:not([type="checkbox"]):not([type="radio"]), select, textarea') || el;
    }

    if (isInvalid) {
      this.renderer.setAttribute(targetEl, 'aria-invalid', 'true');
      this.linkErrorMessage(targetEl);
    } else {
      this.renderer.removeAttribute(targetEl, 'aria-invalid');
      if (this.linkedErrorId) {
        this.renderer.removeAttribute(targetEl, 'aria-describedby');
        this.linkedErrorId = '';
      }
    }
  }

  private linkErrorMessage(targetEl: HTMLElement) {
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
      
      const currentDescribedBy = targetEl.getAttribute('aria-describedby');
      
      if (currentDescribedBy !== errorEl.id) {
        this.renderer.setAttribute(targetEl, 'aria-describedby', errorEl.id);
        this.linkedErrorId = errorEl.id;
      }
    } else {
      if (this.linkedErrorId) {
        this.renderer.removeAttribute(targetEl, 'aria-describedby');
        this.linkedErrorId = '';
      }
    }
  }
}
