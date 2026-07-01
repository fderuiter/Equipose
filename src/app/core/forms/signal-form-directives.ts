import { Directive, Input, HostListener, ElementRef, inject, effect, forwardRef, OnInit, Optional, SkipSelf, Injector } from '@angular/core';
import { SignalControl, FormGroup, FormArray } from './signal-forms';

@Directive({
  selector: '[formGroup]',
  standalone: true
})
export class SignalFormGroupDirective {
  @Input('formGroup') formGroup!: FormGroup;
}

@Directive({
  selector: '[formArrayName]',
  standalone: true
})
export class SignalFormArrayNameDirective {
  @Input('formArrayName') formArrayName!: string | number;
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
  @Input('formGroupName') formGroupName!: string | number;
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
  @Input('formControlName') formControlName?: string | number;
  @Input('formControl') formControl?: any;
  
  private groupParent = inject(SignalFormGroupDirective, { optional: true });
  private groupNameParent = inject(SignalFormGroupNameDirective, { optional: true });
  private elementRef = inject(ElementRef);
  private injector = inject(Injector);

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
      const el = this.elementRef.nativeElement;
      if (el.type === 'checkbox') {
        el.checked = !!val;
      } else {
        if (el.value !== val) {
          el.value = val === undefined || val === null ? '' : val;
        }
      }
    }, { injector: this.injector });
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
