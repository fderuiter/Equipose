import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ZeroStateComponent } from './zero-state.component';
import { By } from '@angular/platform-browser';

describe('ZeroStateComponent', () => {
  let component: ZeroStateComponent;
  let fixture: ComponentFixture<ZeroStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZeroStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ZeroStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the illustrative SVG', () => {
    const svg = fixture.debugElement.query(By.css('svg[aria-hidden="true"]'));
    expect(svg).toBeTruthy();
  });

  it('should render the correct heading', () => {
    const heading = fixture.debugElement.query(By.css('h3'));
    expect(heading.nativeElement.textContent).toContain('No schema generated yet');
  });

  it('should render the description', () => {
    const description = fixture.debugElement.query(By.css('p'));
    expect(description.nativeElement.textContent).toContain('Configure your trial parameters in the form above');
  });

  it('should emit loadPreset when CTA button is clicked', () => {
    let emitted = false;
    component.loadPreset.subscribe(() => (emitted = true));

    const appButton = fixture.debugElement.query(By.css('[data-testid="load-preset-btn"]'));
    const innerButton = appButton.query(By.css('button'));
    innerButton.nativeElement.click();

    expect(emitted).toBe(true);
  });
});
