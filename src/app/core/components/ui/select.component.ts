import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, ChangeDetectionStrategy, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-select',
  standalone: true,
  host: { class: 'contents' },
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      #selectEl
      [id]="inputId"
      [disabled]="disabled"
      [class]="computedClasses"
      (change)="onChange($event)"
      (blur)="onBlur.emit()"
    >
      <ng-content></ng-content>
    </select>
  `
})
export class SelectComponent {
  @Input() inputId = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input() customClass = '';
  @Input() hasError = false;

  @Output() onBlur = new EventEmitter<void>();

  @ViewChild('selectEl') selectEl!: ElementRef<HTMLSelectElement>;

  internalValue: any = '';

  get value(): any {
    return this.internalValue;
  }

  @Input() set value(val: any) {
    this.internalValue = val === null || val === undefined ? '' : val;
    if (this.selectEl) {
      this.selectEl.nativeElement.value = this.internalValue;
    }
  }

  get computedClasses(): string {
    const base = 'w-full px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-focus-offset transition-colors text-main bg-surface border rounded-lg disabled:opacity-50';
    let borderClass = 'border-border-strong';
    
    if (this.hasError) {
      borderClass = 'border-rose-500 dark:border-rose-400 focus-visible:border-rose-500';
    } else {
      borderClass += ' focus-visible:border-focus-ring';
    }

    return `${base} ${borderClass} ${this.customClass}`.trim();
  }

  onChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.internalValue = target.value;
    // Bubble the 'input' event so SignalFormControlDirective catches it and updates the control
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    target.dispatchEvent(inputEvent);
  }

  focus() {
    this.selectEl?.nativeElement.focus();
  }
}
