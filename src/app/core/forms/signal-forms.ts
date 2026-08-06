import { signal, computed, WritableSignal, Signal, effect } from '@angular/core';

export type ValidationErrors = Record<string, any>;
export type ValidatorFn = (control: AbstractControl) => ValidationErrors | null;

export abstract class AbstractControl {
  abstract get value(): any;
  abstract setValue(value: any, options?: { emitEvent?: boolean }): void;
  abstract patchValue(value: any, options?: { emitEvent?: boolean }): void;
  abstract disable(options?: { emitEvent?: boolean }): void;
  abstract enable(options?: { emitEvent?: boolean }): void;
  abstract get valid(): boolean;
  abstract get errors(): ValidationErrors | null;
  abstract updateValueAndValidity(options?: { emitEvent?: boolean }): void;
  abstract get(path: string | (string | number)[]): AbstractControl | null;
  abstract setValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void;

  get invalid(): boolean {
    return !this.valid;
  }

  get error(): ValidationErrors | null {
    return this.errors;
  }

  public valueChanges = {
    subscribe: (fn: (val: any) => void) => {
      const eff = effect(() => fn(this.value));
      return { unsubscribe: () => eff.destroy() };
    },
    pipe: (..._args: any[]) => {
       throw new Error('Not implemented');
    }
  };
  
  // States
  protected _touched = signal(false);
  protected _dirty = signal(false);
  
  get touched(): boolean { return this._touched(); }
  get dirty(): boolean { return this._dirty(); }
  
  markAsTouched() { this._touched.set(true); }
  markAsDirty() { this._dirty.set(true); }
}

export class SignalControl<T = any> extends AbstractControl {
  private _value: WritableSignal<T>;
  private _validatorsSignal: WritableSignal<ValidatorFn[]>;
  private _disabled = signal(false);
  private _errorsSignal: Signal<ValidationErrors | null>;
  private _validSignal: Signal<boolean>;
  private _version = signal(0);

  constructor(initialValue: T, validators: ValidatorFn[] = []) {
    super();
    this._value = signal(initialValue);
    this._validatorsSignal = signal(validators);
    
    this._errorsSignal = computed(() => {
      this._version(); // Force re-evaluation on updateValueAndValidity
      if (this.disabled) return null;
      const errs: ValidationErrors = {};
      let hasError = false;
      const currentValidators = this._validatorsSignal();
      for (const v of currentValidators) {
        const err = v(this);
        if (err) {
          Object.assign(errs, err);
          hasError = true;
        }
      }
      return hasError ? errs : null;
    });

    this._validSignal = computed(() => {
      return this._errorsSignal() === null;
    });
  }

  get value(): T {
    return this._value();
  }

  setValue(value: T, _options?: { emitEvent?: boolean }) {
    this._value.set(value);
  }

  patchValue(value: T, options?: { emitEvent?: boolean }) {
    this.setValue(value, options);
  }

  get disabled(): boolean {
    return this._disabled();
  }

  disable(_options?: { emitEvent?: boolean }) {
    this._disabled.set(true);
  }
  
  enable(_options?: { emitEvent?: boolean }) {
    this._disabled.set(false);
  }

  get valid(): boolean {
    return this._validSignal();
  }

  get errors(): ValidationErrors | null {
    return this._errorsSignal();
  }

  updateValueAndValidity(_options?: { emitEvent?: boolean }) {
    this._version.update(v => v + 1);
  }

  get(_path: string | (string | number)[]): AbstractControl | null {
    return null;
  }

  setValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void {
    if (!newValidator) this._validatorsSignal.set([]);
    else if (Array.isArray(newValidator)) this._validatorsSignal.set(newValidator);
    else this._validatorsSignal.set([newValidator]);
  }
}

export class FormGroup<T extends Record<string, AbstractControl> = any> extends AbstractControl {
  private _disabled = signal(false);
  private _validatorsSignal: WritableSignal<ValidatorFn[]>;
  private _errorsSignal: Signal<ValidationErrors | null>;
  private _validSignal: Signal<boolean>;
  private _version = signal(0);
  
  constructor(public controls: T, _validators: ValidatorFn[] = []) {
    super();
    this._validatorsSignal = signal(_validators);
    
    this._errorsSignal = computed(() => {
      this._version();
      const errs: ValidationErrors = {};
      let hasError = false;
      const currentValidators = this._validatorsSignal();
      for (const v of currentValidators) {
        const err = v(this);
        if (err) {
          Object.assign(errs, err);
          hasError = true;
        }
      }
      return hasError ? errs : null;
    });

    this._validSignal = computed(() => {
      this._version();
      for (const key in this.controls) {
        if (!this.controls[key].valid) return false;
      }
      return this._errorsSignal() === null;
    });
  }

  get value(): any {
    const result: any = {};
    for (const key in this.controls) {
      result[key] = this.controls[key].value;
    }
    return result;
  }

  get valid(): boolean {
    return this._validSignal();
  }

  get errors(): ValidationErrors | null {
    return this._errorsSignal();
  }

  patchValue(value: any, options?: { emitEvent?: boolean }) {
    for (const key in value) {
      if (this.controls[key]) {
        this.controls[key].patchValue(value[key], options);
      }
    }
  }

  setValue(value: any, options?: { emitEvent?: boolean }) {
    this.patchValue(value, options);
  }

  getRawValue(): any {
    return this.value; // Simplification
  }

  disable(options?: { emitEvent?: boolean }) {
    this._disabled.set(true);
    for (const key in this.controls) {
      this.controls[key].disable(options);
    }
  }

  enable(options?: { emitEvent?: boolean }) {
    this._disabled.set(false);
    for (const key in this.controls) {
      this.controls[key].enable(options);
    }
  }

  updateValueAndValidity(options?: { emitEvent?: boolean }) {
    this._version.update(v => v + 1);
    for (const key in this.controls) {
      this.controls[key].updateValueAndValidity(options);
    }
  }

  get(path: string | (string | number)[]): AbstractControl | null {
    if (!path) return null;
    const pathArray = Array.isArray(path) ? path : path.split('.');
    let current: any = this;
    for (const p of pathArray) {
      if (!current || !current.controls) return null;
      current = current.controls[p] || (current.at ? current.at(p as number) : null);
    }
    return current;
  }

  setValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void {
    if (!newValidator) this._validatorsSignal.set([]);
    else if (Array.isArray(newValidator)) this._validatorsSignal.set(newValidator);
    else this._validatorsSignal.set([newValidator]);
  }
}

export class FormArray<T extends AbstractControl = any> extends AbstractControl {
  private _controls = signal<T[]>([]);
  private _validSignal: Signal<boolean>;

  constructor(initialControls: T[] = []) {
    super();
    this._controls.set(initialControls);
    this._validSignal = computed(() => {
      const controls = this._controls();
      for (const c of controls) {
        if (!c.valid) return false;
      }
      return true;
    });
  }

  get controls(): T[] {
    return this._controls();
  }

  get value(): any[] {
    return this._controls().map(c => c.value);
  }

  push(control: T, _options?: { emitEvent?: boolean }) {
    this._controls.update(arr => [...arr, control]);
  }

  removeAt(index: number, _options?: { emitEvent?: boolean }) {
    this._controls.update(arr => {
      const newArr = [...arr];
      newArr.splice(index, 1);
      return newArr;
    });
  }

  clear(_options?: { emitEvent?: boolean }) {
    this._controls.set([]);
  }

  insert(index: number, control: T, _options?: { emitEvent?: boolean }) {
    this._controls.update(arr => {
      const newArr = [...arr];
      newArr.splice(index, 0, control);
      return newArr;
    });
  }

  at(index: number): T {
    return this.controls[index];
  }

  get length(): number {
    return this.controls.length;
  }

  get valid(): boolean {
    return this._validSignal();
  }

  get errors(): ValidationErrors | null {
    return null;
  }

  setValue(value: any[], options?: { emitEvent?: boolean }) {
    if (!Array.isArray(value)) return;
    this.controls.forEach((control, index) => {
      if (index < value.length) {
        control.setValue(value[index], options);
      }
    });
  }
  
  patchValue(value: any[], options?: { emitEvent?: boolean }) {
    if (!Array.isArray(value)) return;
    this.controls.forEach((control, index) => {
      if (index < value.length && value[index] !== undefined) {
        control.patchValue(value[index], options);
      }
    });
  }
  disable(options?: { emitEvent?: boolean }) {
    for (const c of this.controls) c.disable(options);
  }
  enable(options?: { emitEvent?: boolean }) {
    for (const c of this.controls) c.enable(options);
  }
  updateValueAndValidity(options?: { emitEvent?: boolean }) {
    for (const c of this.controls) c.updateValueAndValidity(options);
  }
  get(path: string | (string | number)[]): AbstractControl | null {
    if (!path) return null;
    const pathArray = Array.isArray(path) ? path : path.split('.');
    let current: any = this;
    for (const p of pathArray) {
      if (current instanceof FormArray) {
        current = current.at(p as number);
      } else if (current instanceof FormGroup) {
        current = current.controls[p];
      } else {
        return null;
      }
    }
    return current;
  }
  setValidators(_newValidator: ValidatorFn | ValidatorFn[] | null): void {}
}

export const Validators = {
  required: (c: AbstractControl) => {
    const val = c.value;
    return val === null || val === undefined || val === '' ? { required: true } : null;
  },
  requiredTrue: (c: AbstractControl) => (c.value === true ? null : { required: true }),
  min: (min: number) => (c: AbstractControl) => (c.value < min ? { min: { min, actual: c.value } } : null),
  max: (max: number) => (c: AbstractControl) => (c.value > max ? { max: { max, actual: c.value } } : null),
  minLength: (minLen: number) => (c: AbstractControl) => {
    const val = c.value;
    if (val === null || val === undefined || val === '') return null;
    return val.length < minLen ? { minlength: { requiredLength: minLen, actualLength: val.length } } : null;
  },
  pattern: (pattern: RegExp) => (c: AbstractControl) => {
    const val = c.value;
    if (val === null || val === undefined || val === '') return null;
    return pattern.test(val) ? null : { pattern: { requiredPattern: pattern.toString(), actualValue: val } };
  }
};

import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class FormBuilder {
  group(controls: Record<string, any>, options?: { validators?: ValidatorFn[] }): FormGroup {
    const processedControls: any = {};
    for (const key in controls) {
      const config = controls[key];
      if (config instanceof AbstractControl) {
        processedControls[key] = config;
      } else if (Array.isArray(config)) {
        const value = typeof config[0] === 'object' && config[0] !== null && 'value' in config[0] ? config[0].value : config[0];
        const disabled = typeof config[0] === 'object' && config[0] !== null && 'disabled' in config[0] ? config[0].disabled : false;
        const validators = config[1] || [];
        const ctrl = new SignalControl(value, Array.isArray(validators) ? validators : [validators]);
        if (disabled) ctrl.disable();
        processedControls[key] = ctrl;
      } else {
        processedControls[key] = new SignalControl(config);
      }
    }
    return new FormGroup(processedControls, options?.validators);
  }

  array(controls: any[]): FormArray {
    return new FormArray(controls);
  }

  control(value: any, validators?: ValidatorFn[]): SignalControl {
    return new SignalControl(value, validators || []);
  }
}
import { NgModule } from "@angular/core";
@NgModule({})
export class ReactiveFormsModule {}
export { SignalControl as FormControl };
