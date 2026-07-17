import { TestBed, ComponentFixture } from '@angular/core/testing';
import { SkeletonGridComponent } from './skeleton-grid.component';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';

describe('SkeletonGridComponent', () => {
  let component: SkeletonGridComponent;
  let fixture: ComponentFixture<SkeletonGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonGridComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SkeletonGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have the animate-pulse class for shimmering effect', () => {
    const container = fixture.debugElement.query(By.css('[data-testid="skeleton-grid"]'));
    expect(container.nativeElement.classList.contains('animate-pulse')).toBe(true);
  });

  it('should have correct accessibility attributes', () => {
    const container = fixture.debugElement.query(By.css('[data-testid="skeleton-grid"]'));
    expect(container.nativeElement.getAttribute('aria-busy')).toBe('true');
    expect(container.nativeElement.getAttribute('aria-label')).toBe('Generating schema…');
  });

  it('should render the correct number of skeleton rows', () => {
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(12);
  });

  it('should render analytics placeholders', () => {
    // Donut chart placeholder
    const donut = fixture.debugElement.query(By.css('.rounded-full.bg-gray-200'));
    expect(donut).toBeTruthy();

    // Bar chart bars
    const bars = fixture.debugElement.queryAll(By.css('.flex-1.rounded-t-md'));
    expect(bars.length).toBe(5);
  });
});
