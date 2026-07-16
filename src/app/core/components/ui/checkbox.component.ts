import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ElementRef, ViewChild, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  host: { class: 'contents' },
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #inputEl
      type="checkbox"
      [id]="inputId"
      [disabled]="disabled"
      [class]="computedClasses"
      (change)="onChange($event)"
      (blur)="onBlur.emit()"
    />
  `
})
export class CheckboxComponent {
  @Input() inputId = '';
  @Input({ transform: booleanAttribute }) disabled = false;

  @Output() onBlur = new EventEmitter<void>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  internalValue = false;

  get type(): string {
    return 'checkbox';
  }

  get checked(): boolean {
    return this.internalValue;
  }

  @Input() set checked(val: boolean) {
    this.internalValue = val;
    if (this.inputEl) {
      this.inputEl.nativeElement.checked = val;
    }
  }

  get computedClasses(): string {
    const base = 'w-4 h-4 rounded border-border-strong text-brand-600 focus:ring-focus-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-focus-offset transition-colors disabled:opacity-50 cursor-pointer bg-surface';
    return `${base}`.trim();
  }

  onChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.internalValue = target.checked;
    // Event naturally bubbles from the inner input to be caught by SignalFormControlDirective
  }
}
