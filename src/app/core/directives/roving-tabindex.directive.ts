import { Directive, ElementRef, HostListener, Input, AfterViewInit, OnDestroy, inject } from '@angular/core';

@Directive({
  selector: '[appRovingTabindex]',
  standalone: true
})
export class RovingTabindexDirective implements AfterViewInit, OnDestroy {
  @Input('appRovingTabindex') set setItemSelector(val: string) {
    if (val) {
      this.itemSelector = val;
    }
  }

  itemSelector = 'button, [role="radio"], [role="listitem"], input';

  private el = inject(ElementRef<HTMLElement>);
  private observer: MutationObserver | null = null;
  private items: HTMLElement[] = [];
  private activeIndex = 0;

  ngAfterViewInit() {
    this.initItems();

    this.observer = new MutationObserver(() => {
      this.initItems();
    });
    this.observer.observe(this.el.nativeElement, { childList: true, subtree: true });
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private initItems() {
    const rawItems = Array.from((this.el.nativeElement as HTMLElement).querySelectorAll(this.itemSelector)) as HTMLElement[];
    this.items = rawItems.filter(item => !item.hasAttribute('disabled'));

    if (this.items.length === 0) return;

    let currentActive = 0;
    const activeEl = document.activeElement as HTMLElement;
    const focusIndex = this.items.indexOf(activeEl);
    const wasFocusedBefore = this.el.nativeElement.contains(activeEl) || document.activeElement === document.body;

    if (focusIndex !== -1) {
      currentActive = focusIndex;
    } else {
       const checkedIndex = this.items.findIndex(item => item.getAttribute('aria-checked') === 'true');
       if (checkedIndex !== -1) {
           currentActive = checkedIndex;
       } else {
           currentActive = Math.min(this.activeIndex, this.items.length - 1);
       }
    }

    this.activeIndex = currentActive;
    this.updateTabIndices();

    // If focus was lost because an element was removed, restore it
    if (focusIndex === -1 && wasFocusedBefore && document.activeElement === document.body) {
      this.items[this.activeIndex]?.focus();
    }
  }

  private updateTabIndices() {
    this.items.forEach((item, index) => {
      if (index === this.activeIndex) {
        item.setAttribute('tabindex', '0');
      } else {
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  /**
   * Handles keyboard navigation for roving tabindex items.
   *
   * Simulates native radio group behavior for custom `<button role="radio">` elements.
   * Native radio groups update their value during arrow-key navigation. To seamlessly 
   * replicate this behavior for custom elements, a programmatic click is dispatched 
   * upon focus to ensure the underlying form control updates.
   *
   * @param event The KeyboardEvent triggered by the user.
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (this.items.length === 0) return;

    let nextIndex = this.activeIndex;
    let handled = false;

    // Do not interfere with text selection inside nested input fields
    const activeItem = this.items[this.activeIndex];
    if (activeItem instanceof HTMLInputElement && activeItem.type === 'text') {
      if (event.key === 'ArrowLeft') {
        if (activeItem.selectionStart !== 0 || activeItem.selectionEnd !== 0) {
          return; // Let native input handle it
        }
      } else if (event.key === 'ArrowRight') {
        if (activeItem.selectionStart !== activeItem.value.length || activeItem.selectionEnd !== activeItem.value.length) {
          return; // Let native input handle it
        }
      }
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (this.activeIndex + 1) % this.items.length;
        handled = true;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (this.activeIndex - 1 + this.items.length) % this.items.length;
        handled = true;
        break;
      case 'Home':
        nextIndex = 0;
        handled = true;
        break;
      case 'End':
        nextIndex = this.items.length - 1;
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      this.activeIndex = nextIndex;
      this.updateTabIndices();
      this.items[this.activeIndex].focus();
      
      const newActive = this.items[this.activeIndex];
      if (newActive.getAttribute('role') === 'radio') {
        newActive.click();
      }
    }
  }
}
