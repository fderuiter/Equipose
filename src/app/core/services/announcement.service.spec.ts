import { TestBed } from '@angular/core/testing';
import { AnnouncementService } from './announcement.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('AnnouncementService', () => {
  let service: AnnouncementService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnouncementService]
    });
    service = TestBed.inject(AnnouncementService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should create the live region and append it to the body', () => {
    const liveRegion = document.querySelector('.sr-only');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
  });

  it('should handle single announcement lifecycle', () => {
    service.announce('Hello World');
    TestBed.flushEffects();

    const liveRegion = document.querySelector('.sr-only') as HTMLElement;
    expect(liveRegion.textContent).toBe('Hello World');
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');

    vi.advanceTimersByTime(1500);
    TestBed.flushEffects();
    expect(liveRegion.textContent).toBe('Hello World');

    vi.advanceTimersByTime(1500);
    TestBed.flushEffects();
    expect(liveRegion.textContent).toBe('');
  });

  it('should reset the timer when multiple announcements are triggered rapidly', () => {
    service.announce('First Message');
    TestBed.flushEffects();

    const liveRegion = document.querySelector('.sr-only') as HTMLElement;
    expect(liveRegion.textContent).toBe('First Message');

    vi.advanceTimersByTime(500);
    TestBed.flushEffects();

    // Trigger second message
    service.announce('Second Message');
    TestBed.flushEffects();
    expect(liveRegion.textContent).toBe('Second Message');

    vi.advanceTimersByTime(2500); // 3000ms from First Message, 2500ms from Second Message
    TestBed.flushEffects();

    // Should still be visible because the timer was reset by the second message
    expect(liveRegion.textContent).toBe('Second Message');

    vi.advanceTimersByTime(500); // Now 3000ms from Second Message
    TestBed.flushEffects();

    // Now it should be cleared
    expect(liveRegion.textContent).toBe('');
  });

  it('should clean up the DOM on service destroy', () => {
    service.ngOnDestroy();
    const liveRegion = document.querySelector('.sr-only');
    expect(liveRegion).toBeNull();
  });
});
