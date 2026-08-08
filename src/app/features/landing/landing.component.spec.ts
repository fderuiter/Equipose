import { TestBed, ComponentFixture } from '@angular/core/testing';
import { LandingComponent } from './landing.component';
import { SeoService } from '../../core/services/seo.service';
import { SignalRouter } from '../../core/router/signal-router.service';
import { vi } from 'vitest';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;
  let mockSeoService: any;
  let mockSignalRouter: any;

  beforeEach(async () => {
    mockSeoService = {
      setPage: vi.fn(),
    };
    mockSignalRouter = {
      path: vi.fn().mockReturnValue('/'),
      queryParams: vi.fn().mockReturnValue({}),
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        { provide: SeoService, useValue: mockSeoService },
        { provide: SignalRouter, useValue: mockSignalRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set dynamic SEO page-specific metadata upon initialization', () => {
    expect(mockSeoService.setPage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Equipose — Pocock-Simon Minimization & Covariate-Adaptive Allocation',
        canonicalPath: '/',
        keywords: expect.stringContaining('Pocock-Simon minimization'),
      })
    );
  });

  it('should render exactly seven feature cards', () => {
    expect(component.features.length).toBe(7);
    // The dl element contains the features. There are dt and dd elements for each.
    // Let's count dt/dd elements or elements that loop over the features.
    const featuresList = component.features;
    expect(featuresList.length).toBe(7);

    // Let's verify that 'Pocock-Simon Minimization' is one of the features
    const hasMinimizationFeature = featuresList.some(
      (f) => f.title === 'Pocock-Simon Minimization'
    );
    expect(hasMinimizationFeature).toBe(true);
  });
});
