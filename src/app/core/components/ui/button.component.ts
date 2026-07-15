import { Component, Input, Output, EventEmitter, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'segmented' | 'bare';

@Component({
  selector: 'app-button',
  standalone: true,
  host: { class: 'contents' },
  
  
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled"
      [class]="computedClasses"
      [attr.role]="role"
      [attr.aria-checked]="ariaChecked"
      [attr.aria-label]="ariaLabel"
      (click)="clicked.emit($event)">
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input({ transform: booleanAttribute }) disabled = false;
  
  @Input() customClass = '';
  @Input() segmentedActive = false;
  @Input() segmentedPosition: 'first' | 'middle' | 'last' | 'none' = 'none';

  @Input() role?: string;
  @Input() ariaChecked?: string | null;
  @Input() ariaLabel?: string | null;

  @Output() clicked = new EventEmitter<MouseEvent>();

  get computedClasses(): string {
    const base = 'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-focus-offset';
    
    let variantClass = '';
    switch(this.variant) {
      case 'primary':
        variantClass = 'bg-brand-600 text-white hover:bg-brand-500 shadow-sm disabled:opacity-50 border border-transparent';
        break;
      case 'secondary':
        variantClass = 'bg-surface text-main border border-border-strong hover:bg-hover disabled:opacity-50';
        break;
      case 'outline':
        variantClass = 'bg-transparent text-brand-600 border border-brand-600 hover:bg-brand-50 disabled:opacity-50';
        break;
      case 'segmented':
        variantClass = 'flex-1 text-sm disabled:opacity-50 border-border-strong';
        if (this.segmentedActive) {
          variantClass += ' bg-brand-600 text-white';
        } else {
          variantClass += ' bg-surface text-main hover:bg-hover';
        }
        if (this.segmentedPosition !== 'first') {
          variantClass += ' border-l';
        }
        break;
    }

    if (this.variant === 'segmented') {
      variantClass += ' px-3 py-2';
    }

    return `${base} ${variantClass} ${this.customClass}`.trim();
  }
}
