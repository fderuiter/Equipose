import { Component, ElementRef, ViewChild } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { KeyboardScrollDirective } from './keyboard-scroll.directive';

@Component({
  template: `
    <div #scrollContainer id="scroll-container" appKeyboardScroll style="height: 100px; overflow: scroll;">
      <div style="height: 500px; width: 500px;">
        <input id="range-slider" type="range" min="0" max="100" />
        <select id="select-dropdown">
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </select>
        <input id="normal-input" type="text" />
      </div>
    </div>
  `,
  imports: [KeyboardScrollDirective],
  standalone: true
})
class TestScrollHostComponent {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
}

describe('KeyboardScrollDirective', () => {
  let fixture: ComponentFixture<TestScrollHostComponent>;
  let component: TestScrollHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestScrollHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestScrollHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should trigger scrolling with arrow keys on a normal scrollable div when standard elements are focused', () => {
    const container = component.scrollContainer.nativeElement;
    container.scrollTop = 100;
    container.scrollLeft = 100;

    const normalInput = document.getElementById('normal-input') as HTMLInputElement;
    normalInput.focus();
    expect(document.activeElement).toBe(normalInput);

    // Dispatched keydown on normal element or on the container itself
    const eventDown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    normalInput.dispatchEvent(eventDown);
    // Standard event scroll amount adds 40px
    expect(container.scrollTop).toBe(140);
    expect(eventDown.defaultPrevented).toBe(true);

    const eventUp = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    normalInput.dispatchEvent(eventUp);
    expect(container.scrollTop).toBe(100);
    expect(eventUp.defaultPrevented).toBe(true);

    const eventRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    normalInput.dispatchEvent(eventRight);
    expect(container.scrollLeft).toBe(140);
    expect(eventRight.defaultPrevented).toBe(true);

    const eventLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    normalInput.dispatchEvent(eventLeft);
    expect(container.scrollLeft).toBe(100);
    expect(eventLeft.defaultPrevented).toBe(true);
  });

  it('should ignore arrow keys when focused on input[type="range"] (no container scroll, no preventDefault)', () => {
    const container = component.scrollContainer.nativeElement;
    container.scrollTop = 100;
    container.scrollLeft = 100;

    const slider = document.getElementById('range-slider') as HTMLInputElement;
    slider.focus();
    expect(document.activeElement).toBe(slider);

    const eventRight = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    const spyPreventDefault = vi.spyOn(eventRight, 'preventDefault');
    slider.dispatchEvent(eventRight);

    // Scroll container should not have moved
    expect(container.scrollLeft).toBe(100);
    expect(spyPreventDefault).not.toHaveBeenCalled();
  });

  it('should ignore arrow keys when focused on a select dropdown (no container scroll, no preventDefault)', () => {
    const container = component.scrollContainer.nativeElement;
    container.scrollTop = 100;

    const select = document.getElementById('select-dropdown') as HTMLSelectElement;
    select.focus();
    expect(document.activeElement).toBe(select);

    const eventDown = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    const spyPreventDefault = vi.spyOn(eventDown, 'preventDefault');
    select.dispatchEvent(eventDown);

    // Scroll container should not have moved
    expect(container.scrollTop).toBe(100);
    expect(spyPreventDefault).not.toHaveBeenCalled();
  });
});
