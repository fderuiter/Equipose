import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, booleanAttribute, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-toggle',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <button
      type="button"
      [id]="inputId"
      role="switch"
      [attr.aria-label]="ariaLabel"
      [attr.aria-checked]="internalValue"
      [disabled]="disabled"
      [class]="computedClasses"
      (click)="toggle()">
      <span
        aria-hidden="true"
        [class]="thumbClasses">
      </span>
    </button>
  `
})
export class ToggleComponent implements OnChanges {
  @Input() inputId = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() customClass = '';
  @Input() ariaLabel?: string;
  
  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  internalValue = false;

  ngOnChanges() {
    this.internalValue = this.checked;
  }

  get computedClasses(): string {
    const base = 'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-focus-offset disabled:opacity-50 disabled:cursor-not-allowed';
    const activeClass = this.internalValue ? 'bg-brand-600' : 'bg-border-strong';
    return `${base} ${activeClass} ${this.customClass}`.trim();
  }

  get thumbClasses(): string {
    const base = 'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out';
    const translateClass = this.internalValue ? 'translate-x-5' : 'translate-x-0';
    return `${base} ${translateClass}`;
  }

  toggle() {
    if (this.disabled) return;
    this.internalValue = !this.internalValue;
    this.checkedChange.emit(this.internalValue);
  }
}
