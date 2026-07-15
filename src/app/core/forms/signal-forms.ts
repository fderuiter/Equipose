import { signal, WritableSignal } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type ValidationErrors = Record<string, unknown>;
export type ValidatorFn = (control: AbstractControl) => ValidationErrors | null;

export abstract class AbstractControl {
  abstract get value(): unknown;
  abstract get valueChanges(): Observable<unknown>;
  abstract setValue(value: unknown, options?: { emitEvent?: boolean }): void;
  abstract patchValue(value: unknown, options?: { emitEvent?: boolean }): void;
  abstract disable(options?: { emitEvent?: boolean }): void;
  abstract enable(options?: { emitEvent?: boolean }): void;
  abstract get valid(): boolean;
  abstract get invalid(): boolean;
  abstract get error(): ValidationErrors | null;
  abstract get errors(): ValidationErrors | null;
  abstract updateValueAndValidity(options?: { emitEvent?: boolean }): void;
  abstract get(path: string | (string | number)[]): AbstractControl | null;
  abstract setValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void;
  
  // States
  protected _touched = signal(false);
  protected _dirty = signal(false);
  
  get touched(): boolean { return this._touched(); }
  get dirty(): boolean { return this._dirty(); }
  
  markAsTouched(): void { this._touched.set(true); }
  markAsDirty(): void { this._dirty.set(true); }
}

export class SignalControl<T = unknown> extends AbstractControl {
  private _value: WritableSignal<T>;
  private _validators: ValidatorFn[];
  private _disabled = signal(false);
  private _valueChanges = new Subject<T>();

  get valueChanges(): Observable<T> {
    return this._valueChanges.asObservable();
  }

  constructor(initialValue: T, validators: ValidatorFn[] = []) {
    super();
    this._value = signal(initialValue);
    this._validators = validators;
  }

  get value(): T {
    return this._value();
  }

  setValue(value: T, options?: { emitEvent?: boolean }): void {
    this._value.set(value);
    if (options?.emitEvent !== false) {
      this._valueChanges.next(value);
    }
  }

  patchValue(value: T, options?: { emitEvent?: boolean }): void {
    this.setValue(value, options);
  }

  get disabled(): boolean {
    return this._disabled();
  }

  disable(options?: { emitEvent?: boolean }): void {
    void options;
    this._disabled.set(true);
  }
  
  enable(options?: { emitEvent?: boolean }): void {
    void options;
    this._disabled.set(false);
  }

  get valid(): boolean {
    return this.errors === null;
  }

  get invalid(): boolean {
    return !this.valid;
  }

  get error(): ValidationErrors | null {
    return this.errors;
  }
  
  get errors(): ValidationErrors | null {
    if (this.disabled) return null;
    const errs: ValidationErrors = {};
    let hasError = false;
    for (const v of this._validators) {
      const err = v(this);
      if (err) {
        Object.assign(errs, err);
        hasError = true;
      }
    }
    return hasError ? errs : null;
  }

  updateValueAndValidity(options?: { emitEvent?: boolean }): void {
    void options;
    // Re-evaluates inherently with signals, but we can trigger if needed.
    this._value.set(this._value());
  }

  get(path: string | (string | number)[]): AbstractControl | null {
    void path;
    return null;
  }

  setValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void {
    if (!newValidator) this._validators = [];
    else if (Array.isArray(newValidator)) this._validators = newValidator;
    else this._validators = [newValidator];
  }
}

export class FormGroup<T extends Record<string, AbstractControl> = Record<string, AbstractControl>> extends AbstractControl {
  private _disabled = signal(false);
  private _valueChanges = new Subject<unknown>();

  get valueChanges(): Observable<unknown> {
    return this._valueChanges.asObservable();
  }
  
  constructor(public controls: T, private _validators: ValidatorFn[] = []) {
    super();
    for (const key in this.controls) {
      this.controls[key].valueChanges.subscribe(() => {
        this._valueChanges.next(this.value);
      });
    }
  }

  get value(): unknown {
    const result: Record<string, unknown> = {};
    for (const key in this.controls) {
      result[key] = this.controls[key].value;
    }
    return result;
  }

  get valid(): boolean {
    for (const key in this.controls) {
      if (!this.controls[key].valid) return false;
    }
    return this.errors === null;
  }

  get invalid(): boolean {
    return !this.valid;
  }

  get error(): ValidationErrors | null {
    return this.errors;
  }

  get errors(): ValidationErrors | null {
    const errs: ValidationErrors = {};
    let hasError = false;
    for (const v of this._validators) {
      const err = v(this);
      if (err) {
        Object.assign(errs, err);
        hasError = true;
      }
    }
    return hasError ? errs : null;
  }

  patchValue(value: unknown, options?: { emitEvent?: boolean }): void {
    if (value && typeof value === 'object') {
      const val = value as Record<string, unknown>;
      for (const key in val) {
        if (this.controls[key]) {
          this.controls[key].patchValue(val[key], options);
        }
      }
      if (options?.emitEvent !== false) {
        this._valueChanges.next(this.value);
      }
    }
  }

  setValue(value: unknown, options?: { emitEvent?: boolean }): void {
    this.patchValue(value, options);
  }

  getRawValue(): unknown {
    return this.value; // Simplification
  }

  disable(options?: { emitEvent?: boolean }): void {
    this._disabled.set(true);
    for (const key in this.controls) {
      this.controls[key].disable(options);
    }
  }

  enable(options?: { emitEvent?: boolean }): void {
    this._disabled.set(false);
    for (const key in this.controls) {
      this.controls[key].enable(options);
    }
  }

  updateValueAndValidity(options?: { emitEvent?: boolean }): void {
    for (const key in this.controls) {
      this.controls[key].updateValueAndValidity(options);
    }
  }

  get(path: string | (string | number)[]): AbstractControl | null {
    if (!path) return null;
    const pathArray = Array.isArray(path) ? path : path.split('.');

    return pathArray.reduce((acc: AbstractControl | null, key) => {
      if (!acc) return null;
      if (acc instanceof FormGroup) {
        return acc.controls[key as string] || null;
      }
      if (acc instanceof FormArray) {
        return acc.at(key as number);
      }
      return null;
    }, this as AbstractControl);
  }

  setValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void {
    if (!newValidator) this._validators = [];
    else if (Array.isArray(newValidator)) this._validators = newValidator;
    else this._validators = [newValidator];
  }
}

export class FormArray<T extends AbstractControl = AbstractControl> extends AbstractControl {
  private _controls = signal<T[]>([]);
  private _valueChanges = new Subject<unknown[]>();

  get valueChanges(): Observable<unknown[]> {
    return this._valueChanges.asObservable();
  }

  constructor(initialControls: T[] = []) {
    super();
    this._controls.set(initialControls);
    initialControls.forEach(c => this._subscribeToControl(c));
  }

  private _subscribeToControl(control: T) {
    control.valueChanges.subscribe(() => {
      this._valueChanges.next(this.value);
    });
  }

  get controls(): T[] {
    return this._controls();
  }

  get value(): unknown[] {
    return this._controls().map(c => c.value);
  }

  push(control: T, options?: { emitEvent?: boolean }): void {
    this._controls.update(arr => [...arr, control]);
    this._subscribeToControl(control);
    if (options?.emitEvent !== false) {
      this._valueChanges.next(this.value);
    }
  }

  removeAt(index: number, options?: { emitEvent?: boolean }): void {
    this._controls.update(arr => {
      const newArr = [...arr];
      newArr.splice(index, 1);
      return newArr;
    });
    if (options?.emitEvent !== false) {
      this._valueChanges.next(this.value);
    }
  }

  clear(options?: { emitEvent?: boolean }): void {
    this._controls.set([]);
    if (options?.emitEvent !== false) {
      this._valueChanges.next(this.value);
    }
  }

  insert(index: number, control: T, options?: { emitEvent?: boolean }): void {
    this._controls.update(arr => {
      const newArr = [...arr];
      newArr.splice(index, 0, control);
      return newArr;
    });
    this._subscribeToControl(control);
    if (options?.emitEvent !== false) {
      this._valueChanges.next(this.value);
    }
  }

  at(index: number): T {
    return this.controls[index];
  }

  get length(): number {
    return this.controls.length;
  }

  get valid(): boolean {
    for (const c of this.controls) {
      if (!c.valid) return false;
    }
    return true;
  }

  get invalid(): boolean {
    return !this.valid;
  }

  get error(): ValidationErrors | null {
    return this.errors;
  }

  get errors(): ValidationErrors | null {
    return null;
  }

  setValue(value: unknown[], options?: { emitEvent?: boolean }): void {
    value.forEach((v, i) => {
      if (this.controls[i]) {
        this.controls[i].setValue(v, { emitEvent: false });
      }
    });
    if (options?.emitEvent !== false) {
      this._valueChanges.next(this.value);
    }
  }
  patchValue(value: unknown[], options?: { emitEvent?: boolean }): void {
    value.forEach((v, i) => {
      if (this.controls[i]) {
        this.controls[i].patchValue(v, { emitEvent: false });
      }
    });
    if (options?.emitEvent !== false) {
      this._valueChanges.next(this.value);
    }
  }
  disable(options?: { emitEvent?: boolean }): void {
    for (const c of this.controls) c.disable(options);
  }
  enable(options?: { emitEvent?: boolean }): void {
    for (const c of this.controls) c.enable(options);
  }
  updateValueAndValidity(options?: { emitEvent?: boolean }): void {
    for (const c of this.controls) c.updateValueAndValidity(options);
  }
  get(path: string | (string | number)[]): AbstractControl | null {
    if (!path) return null;
    const pathArray = Array.isArray(path) ? path : path.split('.');

    return pathArray.reduce((acc: AbstractControl | null, key) => {
      if (!acc) return null;
      if (acc instanceof FormArray) {
        return acc.at(key as number);
      }
      if (acc instanceof FormGroup) {
        return acc.controls[key as string];
      }
      return null;
    }, this as AbstractControl);
  }
  setValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void {
    void newValidator;
    /* No-op */
  }

  get type(): string {
    return 'array';
  }
}

export const Validators = {
  required: (c: AbstractControl): ValidationErrors | null => {
    const val = c.value;
    return val === null || val === undefined || val === '' ? { required: true } : null;
  },
  requiredTrue: (c: AbstractControl): ValidationErrors | null => (c.value === true ? null : { required: true }),
  min: (min: number) => (c: AbstractControl): ValidationErrors | null => (typeof c.value === 'number' && c.value < min ? { min: { min, actual: c.value } } : null),
  max: (max: number) => (c: AbstractControl): ValidationErrors | null => (typeof c.value === 'number' && c.value > max ? { max: { max, actual: c.value } } : null)
};

import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class FormBuilder {
  group(controls: Record<string, unknown>, options?: { validators?: ValidatorFn[] }): FormGroup {
    const processedControls: Record<string, AbstractControl> = {};
    for (const key in controls) {
      const config = controls[key];
      if (config instanceof AbstractControl) {
        processedControls[key] = config;
      } else if (Array.isArray(config)) {
        const value = typeof config[0] === 'object' && config[0] !== null && 'value' in config[0] ? (config[0] as {value: unknown}).value : config[0];
        const disabled = typeof config[0] === 'object' && config[0] !== null && 'disabled' in config[0] ? (config[0] as {disabled: boolean}).disabled : false;
        const validators = config[1] as (ValidatorFn | ValidatorFn[]) || [];
        const ctrl = new SignalControl(value, Array.isArray(validators) ? validators : [validators]);
        if (disabled) ctrl.disable();
        processedControls[key] = ctrl;
      } else {
        processedControls[key] = new SignalControl(config);
      }
    }
    return new FormGroup(processedControls, options?.validators);
  }

  array(controls: AbstractControl[]): FormArray {
    return new FormArray(controls);
  }

  control(value: unknown, validators?: ValidatorFn[]): SignalControl {
    return new SignalControl(value, validators || []);
  }
}
import { NgModule } from "@angular/core";
@NgModule({})
export class ReactiveFormsModule {}
export { SignalControl as FormControl };
