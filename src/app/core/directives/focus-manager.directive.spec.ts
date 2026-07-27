import { Component, ElementRef, ViewChild } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FocusManagerDirective } from './focus-manager.directive';

@Component({
  template: `
    <button id="external-trigger">Trigger</button>
    <div #container id="menu-container" appFocusManager>
      <button id="btn1">Button 1</button>
      <button id="btn2">Button 2</button>
      <a href="#" id="link1">Link 1</a>
    </div>
    <button id="outside-btn">Outside Button</button>
  `,
  imports: [FocusManagerDirective],
  standalone: true
})
class TestHostComponent {
  @ViewChild('container') container!: ElementRef<HTMLDivElement>;
}

@Component({
  template: `
    <div #containerEmpty id="empty-container" appFocusManager></div>
  `,
  imports: [FocusManagerDirective],
  standalone: true
})
class TestHostEmptyComponent {
  @ViewChild('containerEmpty') containerEmpty!: ElementRef<HTMLDivElement>;
}

describe('FocusManagerDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TestHostEmptyComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    
    // Set initial focus to the external trigger so previousFocus is captured
    const trigger = document.getElementById('external-trigger') as HTMLElement;
    if (trigger) {
      trigger.focus();
    }
    
    fixture.detectChanges();
  });

  it('should auto-focus the first focusable element inside the container synchronously on init', () => {
    const btn1 = document.getElementById('btn1') as HTMLElement;
    expect(document.activeElement).toBe(btn1);
  });

  it('should wrap around focus with Tab and Shift+Tab', () => {
    const btn1 = document.getElementById('btn1') as HTMLElement;
    const link1 = document.getElementById('link1') as HTMLElement;

    // Initially at btn1. Press Shift+Tab. It should wrap to last element (link1).
    const eventShiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    btn1.dispatchEvent(eventShiftTab);
    expect(document.activeElement).toBe(link1);

    // Press Tab from link1. It should wrap to first element (btn1).
    const eventTab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    link1.dispatchEvent(eventTab);
    expect(document.activeElement).toBe(btn1);
  });

  it('should support arrow key navigation (ArrowDown and ArrowUp)', () => {
    const btn1 = document.getElementById('btn1') as HTMLElement;
    const btn2 = document.getElementById('btn2') as HTMLElement;
    const link1 = document.getElementById('link1') as HTMLElement;

    // Focus starts at btn1. Press ArrowDown.
    const eventDown1 = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    btn1.dispatchEvent(eventDown1);
    expect(document.activeElement).toBe(btn2);

    // Press ArrowDown again.
    const eventDown2 = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    btn2.dispatchEvent(eventDown2);
    expect(document.activeElement).toBe(link1);

    // Press ArrowDown again (wrap around).
    const eventDown3 = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    link1.dispatchEvent(eventDown3);
    expect(document.activeElement).toBe(btn1);

    // Press ArrowUp (wrap to last).
    const eventUp1 = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    btn1.dispatchEvent(eventUp1);
    expect(document.activeElement).toBe(link1);

    // Press ArrowUp again.
    const eventUp2 = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
    link1.dispatchEvent(eventUp2);
    expect(document.activeElement).toBe(btn2);
  });

  it('should restore focus to previousFocus on destroy if focus is still inside the host', () => {
    const trigger = document.getElementById('external-trigger') as HTMLElement;
    const btn1 = document.getElementById('btn1') as HTMLElement;

    // Focus is currently at btn1 (inside the container)
    btn1.focus();

    // Destroy the directive/host container by removing it or destroying the fixture
    fixture.destroy();

    // Since focus was inside, trigger should regain focus
    expect(document.activeElement).toBe(trigger);
  });

  it('should NOT restore focus to previousFocus on destroy if focus has moved outside the host', () => {
    const outsideBtn = document.getElementById('outside-btn') as HTMLElement;

    // Move focus outside
    outsideBtn.focus();

    // Destroy the fixture
    fixture.destroy();

    // Since focus was outside, focus should stay on outsideBtn
    expect(document.activeElement).toBe(outsideBtn);
  });

  it('should set tabindex="-1" dynamically and fallback focus on the host if no focusable children exist', () => {
    const fixtureEmpty = TestBed.createComponent(TestHostEmptyComponent);
    fixtureEmpty.detectChanges();

    const emptyContainer = document.getElementById('empty-container') as HTMLElement;
    expect(emptyContainer.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(emptyContainer);
  });
});
