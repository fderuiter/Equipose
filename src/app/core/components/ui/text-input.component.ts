import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, ChangeDetectionStrategy, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-text-input',
  standalone: true,
  host: { class: 'contents' },
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #inputEl
      [type]="typeAttr"
      [id]="inputId"
      [min]="min"
      [max]="max"
      [step]="step"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [class]="computedClasses"
      (input)="onInput($event)"
      (blur)="onBlur.emit()"
    />
  `
})
export class TextInputComponent {
  @Input() variant: 'default' | 'bare' = 'default';
  @Input('type') typeAttr: 'text' | 'number' | 'range' = 'text';
  @Input() inputId = '';
  @Input() min?: number | string;
  @Input() max?: number | string;
  @Input() step?: number | string;
  @Input() placeholder = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() hasError = false;

  @Output() onBlur = new EventEmitter<void>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  internalValue: any = '';

  get type(): string {
    return this.typeAttr;
  }

  get value(): any {
    return this.internalValue;
  }

  @Input() set value(val: any) {
    this.internalValue = val === null || val === undefined ? '' : val;
    if (this.inputEl) {
      this.inputEl.nativeElement.value = this.internalValue;
    }
  }

  get computedClasses(): string {
    if (this.variant === 'bare') {
      return `outline-none focus:ring-0 border-none bg-transparent placeholder-disabled`.trim();
    }
    const base = 'w-full rounded-lg border px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-focus-offset transition-colors text-main bg-surface placeholder-disabled disabled:opacity-50';
    let borderClass = 'border-border-strong';
    
    if (this.hasError) {
      borderClass = 'border-rose-500 dark:border-rose-400 focus-visible:border-rose-500';
    } else {
      borderClass += ' focus-visible:border-focus-ring';
    }

    return `${base} ${borderClass}`.trim();
  }

  onInput(event: Event) {
    const target = event.target as HTMLInputElement;
    let val: any = target.value;
    
    if (this.typeAttr === 'number' || this.typeAttr === 'range') {
      val = val === '' ? null : Number(val);
    }
    
    this.internalValue = val;
    // Event naturally bubbles from the inner input to be caught by SignalFormControlDirective
  }

  focus() {
    this.inputEl?.nativeElement.focus();
  }
}
