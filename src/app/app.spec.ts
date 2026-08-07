import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { UpdateNotificationService } from './core/services/update-notification.service';
import { signal, computed } from '@angular/core';
import { vi } from 'vitest';

describe('App', () => {
  let mockUpdateService: any;

  beforeEach(async () => {
    mockUpdateService = {
      isMockUpdate: false,
      updateAvailable: signal(false),
      bannerDismissed: signal(false),
      isChecking: signal(false),
      showBanner: computed(() => mockUpdateService.updateAvailable() && !mockUpdateService.bannerDismissed()),
      isDeferred: signal(false),
      checkForUpdates: vi.fn().mockResolvedValue(undefined),
      activateUpdate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: UpdateNotificationService, useValue: mockUpdateService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render top update banner when showBanner is true', () => {
    mockUpdateService.updateAvailable.set(true);
    mockUpdateService.bannerDismissed.set(false);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const bannerElement = fixture.nativeElement.querySelector('app-update-banner');
    expect(bannerElement).toBeTruthy();
  });

  it('should NOT render top update banner when showBanner is false', () => {
    mockUpdateService.updateAvailable.set(true);
    mockUpdateService.bannerDismissed.set(true); // Dismissed!

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const bannerElement = fixture.nativeElement.querySelector('app-update-banner');
    expect(bannerElement).toBeFalsy();
  });

  it('should show "System is up to date" when no update is available, and click check updates', () => {
    mockUpdateService.updateAvailable.set(false);
    mockUpdateService.isChecking.set(false);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('System is up to date');

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const checkBtn = buttons.find(b => b.textContent?.trim() === 'Check for updates');
    expect(checkBtn).toBeTruthy();

    checkBtn?.click();
    expect(mockUpdateService.checkForUpdates).toHaveBeenCalled();
  });

  it('should show "Checking..." when isChecking is true', () => {
    mockUpdateService.isChecking.set(true);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Checking...');
  });

  it('should show "Update available" when update is available, even if top banner is dismissed, and click restart to update', () => {
    mockUpdateService.updateAvailable.set(true);
    mockUpdateService.bannerDismissed.set(true); // Banner dismissed, but update remains available!

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const textContent = fixture.nativeElement.textContent;
    expect(textContent).toContain('Update available');

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const restartBtn = buttons.find(b => b.textContent?.trim() === 'Restart to update');
    expect(restartBtn).toBeTruthy();

    restartBtn?.click();
    expect(mockUpdateService.activateUpdate).toHaveBeenCalled();
  });
});
