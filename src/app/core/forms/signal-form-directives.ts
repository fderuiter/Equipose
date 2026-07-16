import { Directive, Input, HostListener, ElementRef, inject, effect, OnInit, Injector, Renderer2 } from '@angular/core';
import { SignalControl, FormGroup, FormArray } from './signal-forms';

@Directive({
  selector: '[formGroup]',
  standalone: true
})
export class SignalFormGroupDirective {
  @HostListener("submit", ["$event"])
  onSubmit(event: Event) {
    event.preventDefault();
  }
  @Input() formGroup!: FormGroup;
}

@Directive({
  selector: '[formArrayName]',
  standalone: true
})
export class SignalFormArrayNameDirective {
  @Input() formArrayName!: string | number;
  private parent = inject(SignalFormGroupDirective, { optional: true });

  get array(): FormArray {
    return this.parent?.formGroup.controls[this.formArrayName];
  }
}

@Directive({
  selector: '[formGroupName]',
  standalone: true
})
export class SignalFormGroupNameDirective {
  @Input() formGroupName!: string | number;
  private parent = inject(SignalFormGroupDirective, { optional: true });
  private arrayParent = inject(SignalFormArrayNameDirective, { optional: true });

  get group(): FormGroup {
    if (this.arrayParent) {
      return this.arrayParent.array.at(Number(this.formGroupName));
    }
    return this.parent?.formGroup.controls[this.formGroupName];
  }
}

@Directive({
  selector: '[formControlName], [formControl]',
  standalone: true
})
export class SignalFormControlDirective implements OnInit {
  @Input() formControlName?: string | number;
  @Input() formControl?: any;
  
  private groupParent = inject(SignalFormGroupDirective, { optional: true });
  private groupNameParent = inject(SignalFormGroupNameDirective, { optional: true });
  private elementRef = inject(ElementRef);
  private injector = inject(Injector);
  private renderer = inject(Renderer2);
  private linkedErrorId = '';

  get control(): SignalControl {
    if (this.formControl) return this.formControl;
    if (this.groupNameParent) {
      return this.groupNameParent.group.controls[this.formControlName as string];
    }
    return this.groupParent?.formGroup.controls[this.formControlName as string];
  }

  ngOnInit() {
    effect(() => {
      if (!this.control) return;
      
      const val = this.control.value;
      const hostEl = this.elementRef.nativeElement;
      
      // Setup a retry loop since custom components might not render their inner inputs immediately
      let retries = 0;
      const syncValue = () => {
        let targetEl = hostEl;
        
        // If the host is a custom element (has a tag name containing a dash),
        // try to find the actual input element inside it.
        if (hostEl.tagName.includes('-')) {
          targetEl = hostEl.querySelector('input, select, textarea');
        }
        
        if (!targetEl) {
          if (retries < 5) {
            retries++;
            setTimeout(syncValue, 10);
          }
          return;
        }
        
        if (targetEl.type === 'checkbox') {
          targetEl.checked = !!val;
        } else {
          if (targetEl.value !== val) {
            targetEl.value = val === undefined || val === null ? '' : val;
          }
        }
      };
      
      syncValue();

      // Accessibility Synchronization
      if (hostEl.type !== 'checkbox' && hostEl.type !== 'radio') {
        let a11yTargetEl = hostEl;
        if (hostEl.tagName !== 'INPUT' && hostEl.tagName !== 'SELECT' && hostEl.tagName !== 'TEXTAREA') {
          a11yTargetEl = hostEl.querySelector('input:not([type="checkbox"]):not([type="radio"]), select, textarea') || hostEl;
        }

        // Wait for DOM to update with error elements if any
        setTimeout(() => {
          if (!a11yTargetEl) return;
          const isInvalid = this.control.invalid;

          if (isInvalid) {
            this.renderer.setAttribute(a11yTargetEl, 'aria-invalid', 'true');
            this.linkErrorMessage(a11yTargetEl);
          } else {
            this.renderer.removeAttribute(a11yTargetEl, 'aria-invalid');
            if (this.linkedErrorId) {
              this.renderer.removeAttribute(a11yTargetEl, 'aria-describedby');
              this.linkedErrorId = '';
            }
          }
        });
      }
    }, { injector: this.injector });
  }

  private linkErrorMessage(targetEl: HTMLElement) {
    let errorEl: Element | null = null;
    let current = this.elementRef.nativeElement.parentElement;
    
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

  @HostListener('input', ['$event.target'])
  onInput(target: any) {
    if (!this.control) return;
    if (target.type === 'checkbox') {
      this.control.setValue(target.checked);
    } else if (target.type === 'number') {
      this.control.setValue(target.value === '' ? null : Number(target.value));
    } else {
      this.control.setValue(target.value);
    }
  }

  @HostListener('blur')
  onBlur() {
    if (this.control && this.control.markAsTouched) {
      this.control.markAsTouched();
    }
  }
}

export const SIGNAL_FORM_DIRECTIVES = [
  SignalFormGroupDirective,
  SignalFormArrayNameDirective,
  SignalFormGroupNameDirective,
  SignalFormControlDirective
];
