import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonteCarloModalComponent } from './monte-carlo-modal.component';
import { RandomizationEngineFacade } from '../randomization-engine.facade';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { By } from '@angular/platform-browser';

function buildMockFacade() {
  return {
    isMonteCarloRunning: signal(false),
    monteCarloProgress: signal(0),
    monteCarloResults: signal<any>(null),
    monteCarloError: signal<string | null>(null),
    lastMonteCarloConfig: signal<any>(null),
    codeLanguage: signal<'R' | 'SAS' | 'Python' | 'STATA'>('R'),
    openCodeGenerator: vi.fn(),
    closeMonteCarloModal: vi.fn(),
    cancelMonteCarlo: vi.fn()
  };
}

describe('MonteCarloModalComponent', () => {
  let fixture: ComponentFixture<MonteCarloModalComponent>;
  let component: MonteCarloModalComponent;
  let mockFacade: ReturnType<typeof buildMockFacade>;

  beforeEach(async () => {
    mockFacade = buildMockFacade();

    await TestBed.configureTestingModule({
      imports: [MonteCarloModalComponent],
      providers: [
        { provide: RandomizationEngineFacade, useValue: mockFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MonteCarloModalComponent);
    component = fixture.componentInstance;

    // Stub dialog methods before detectChanges() so they are available when effect() runs during initial render
    const dialogEl = fixture.nativeElement.querySelector('dialog');
    if (dialogEl) {
      dialogEl.showModal = vi.fn(() => { dialogEl.open = true; });
      dialogEl.close = vi.fn(() => { dialogEl.open = false; });
    }

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render redirect button when error state is active', () => {
    mockFacade.monteCarloError.set('Web Worker execution is blocked or unavailable in this environment.');
    fixture.detectChanges();

    const redirectBtn = fixture.debugElement.query(By.css('[data-testid="bridge-to-code-redirect-btn"]'));
    expect(redirectBtn).toBeTruthy();
    expect(redirectBtn.nativeElement.textContent).toContain('Bridge to Code');
  });

  it('should open code generator, close modal when openBridgeToCode is called', () => {
    const mockConfig = { protocolId: 'TEST-123' };
    mockFacade.lastMonteCarloConfig.set(mockConfig);
    mockFacade.monteCarloError.set('Web Worker execution is blocked or unavailable in this environment.');
    fixture.detectChanges();

    const closeSpy = vi.spyOn(component, 'closeModal');

    component.openBridgeToCode();

    expect(mockFacade.openCodeGenerator).toHaveBeenCalledWith(mockConfig);
    expect(closeSpy).toHaveBeenCalled();
  });
});
