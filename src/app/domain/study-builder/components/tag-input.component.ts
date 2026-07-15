import { Component, Input, OnInit, ViewChild, ChangeDetectionStrategy, inject, ChangeDetectorRef, effect, ElementRef } from '@angular/core';
import { AbstractControl } from '../../../core/forms/signal-forms';
import { AppTooltipDirective } from '../../../core/directives/tooltip.directive';
import { RovingTabindexDirective } from '../../../core/directives/roving-tabindex.directive';
import { ButtonComponent } from '../../../core/components/ui/button.component';
import { TextInputComponent } from '../../../core/components/ui/text-input.component';

/**
 * TagInputComponent – an interactive chip/tag input that reads and writes
 * a comma-separated string to an Angular SignalControl.
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppTooltipDirective, RovingTabindexDirective, ButtonComponent, TextInputComponent],
  template: `
    <div
      appRovingTabindex="button, input"
      class="flex flex-wrap gap-1.5 items-center min-h-[44px] border border-border-strong rounded-lg px-3 py-2 bg-white dark:bg-slate-700 focus-within:border-focus-ring focus-within:ring-2 focus-within:ring-focus-ring focus-within:ring-offset-2 focus-within:ring-offset-focus-offset cursor-text transition-colors"
      (click)="tagInput.focus()" (keydown.enter)="tagInput.focus()"
    >
      @if (tags.length > 0) {
        <ul role="list" class="flex flex-wrap gap-1.5 items-center list-none p-0 m-0">
          @for (tag of tags; track tag) {
            <li role="listitem" class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 select-none">
              {{ tag }}
              <app-button type="button"
                (click)="removeTag(tag); $event.stopPropagation()" customClass="ml-0.5 text-indigo-500 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 rounded-sm leading-none font-bold"[attr.aria-label]="'Remove ' + tag"
                [appTooltip]="'Remove ' + tag"
               variant="bare">×</app-button>
            </li>
          }
        </ul>
      }
      <app-text-input #tagInput type="text"
        [value]="inputValue"
        (input)="inputValue = $any($event.target).value"
        (keydown)="onKeydown($event)"
        (blur)="onBlur()"
        [placeholder]="tags.length === 0 ? placeholder : ''"
        [attr.aria-label]="ariaLabel || placeholder" customClass="flex-1 min-w-[80px] outline-none focus:ring-0 border-none text-sm bg-transparent py-0.5 text-main placeholder-disabled" variant="bare"></app-text-input>
    </div>
    <p class="text-xs text-muted mt-1">
      Press <kbd class="font-mono bg-gray-100 dark:bg-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-500 rounded px-1">Enter</kbd>
      or comma to add · Backspace removes last tag
    </p>
  `
})
export class TagInputComponent implements OnInit {
  @Input() control!: AbstractControl;
  @Input() placeholder = 'Type and press Enter…';
  @Input() ariaLabel?: string;

  @ViewChild('tagInput') tagInput!: any;
  @ViewChild(RovingTabindexDirective) rovingTabindex?: RovingTabindexDirective;

  tags: string[] = [];
  inputValue = '';

  // ChangeDetectorRef injected to support OnPush when external form updates occur.
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly elementRef = inject(ElementRef);

  constructor() {
    effect(() => {
      if (this.control) {
        const v = this.control.value;
        if (v !== this.toStr()) {
          this.tags = this.parseValue(v);
          this.cdr.markForCheck();
        }
      }
    });
  }

  ngOnInit(): void {
    this.tags = this.parseValue(this.control.value);
  }

  parseValue(v: string | null | undefined): string[] {
    if (!v) return [];
    return v.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  toStr(): string {
    return this.tags.join(', ');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitInput();
    } else if (event.key === 'Backspace' && !this.inputValue && this.tags.length > 0) {
      event.preventDefault();
      const buttons = this.elementRef.nativeElement.querySelectorAll('button');
      if (buttons.length > 0) {
        const lastButton = buttons[buttons.length - 1] as HTMLButtonElement;
        lastButton.focus();
        if (this.rovingTabindex) {
          (this.rovingTabindex as any).initItems();
        }
      }
    }
  }

  onBlur(): void {
    if (this.inputValue.trim()) {
      this.commitInput();
    }
  }

  commitInput(): void {
    const rawVal = this.inputValue.trim();
    if (rawVal) {
      const newTags = rawVal
        .split(/[,\n\r]+/)
        .map(t => t.trim())
        .filter((t, index, self) => t && !this.tags.includes(t) && self.indexOf(t) === index);
      if (newTags.length > 0) {
        this.tags = [...this.tags, ...newTags];
        this.update();
      }
    }
    this.inputValue = '';
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
    this.update();
  }

  private update(): void {
    this.control.setValue(this.toStr());
  }
}
