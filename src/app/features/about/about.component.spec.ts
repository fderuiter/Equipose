import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AboutComponent } from './about.component';
import { SeoService } from '../../core/services/seo.service';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;
  let mockSeoService: any;

  beforeEach(async () => {
    mockSeoService = {
      setPage: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AboutComponent],
      providers: [
        { provide: SeoService, useValue: mockSeoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set dynamic SEO page-specific metadata upon initialization', () => {
    expect(mockSeoService.setPage).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'About Equipose',
        canonicalPath: '/about',
        keywords: expect.stringContaining('Pocock-Simon minimization'),
      })
    );
    expect(mockSeoService.setPage).toHaveBeenCalledWith(
      expect.objectContaining({
        keywords: expect.stringContaining('covariate-adaptive allocation methodology'),
      })
    );
  });

  it('should render a styled H2 heading titled "Covariate-Adaptive Minimization" with supporting explanation paragraphs', () => {
    const h2Elements = fixture.debugElement.queryAll(By.css('h2'));
    const minimizationHeading = h2Elements.find(
      (el) => el.nativeElement.textContent.trim() === 'Covariate-Adaptive Minimization'
    );

    expect(minimizationHeading).toBeTruthy();
    expect(minimizationHeading?.nativeElement.className).toContain('text-2xl');
    expect(minimizationHeading?.nativeElement.className).toContain('font-bold');

    // Find the parent div or sibling paragraphs
    const parentContainer = minimizationHeading?.parent;
    expect(parentContainer).toBeTruthy();

    const paragraphs = parentContainer?.queryAll(By.css('p'));
    expect(paragraphs?.length).toBeGreaterThanOrEqual(2);

    const firstParagraphText = paragraphs?.[0].nativeElement.textContent;
    expect(firstParagraphText).toContain('Pocock-Simon algorithm');
    expect(firstParagraphText).toContain('dynamic treatment allocation');
  });
});
