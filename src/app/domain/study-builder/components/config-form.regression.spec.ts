import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '../../../core/forms/signal-forms';
import { ConfigFormComponent } from './config-form.component';
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';
import { StudyBuilderStore } from '../store/study-builder.store';
import { signal } from '@angular/core';
import { vi } from 'vitest';

describe('ConfigFormComponent Regression: Signal-Form Synchronization', () => {
  let component: ConfigFormComponent;
  let fixture: ComponentFixture<ConfigFormComponent>;
  let store: InstanceType<typeof StudyBuilderStore>;
  let mockFacade: any;

  beforeEach(async () => {
    mockFacade = {
      config: signal(null),
      results: signal(null),
      isGenerating: signal(false),
      error: signal(null),
      showCodeGenerator: signal(false),
      codeLanguage: signal('R'),
      generateSchema: vi.fn(),
      openCodeGenerator: vi.fn(),
      closeCodeGenerator: vi.fn(),
      clearResults: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, ConfigFormComponent],
      providers: [
        { provide: RandomizationEngineFacade, useValue: mockFacade },
        StudyBuilderStore
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfigFormComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(StudyBuilderStore);
    fixture.detectChanges();

    // Acknowledge regulatory notice to enable form interactions
    component.regulatoryGroup.get('isAcknowledged')?.setValue(true);
    fixture.detectChanges();
  });

  it('should synchronize store and internal signals when a new stratum is added', () => {
    // Initial state: 1 stratum ('age')
    expect(component.strata.length).toBe(1);
    expect(store.strata().length).toBe(1);
    expect(component.minimizationProbabilities()['age']).toBeDefined();

    // Add a new stratum
    component.addStratum();
    const newStratumIndex = component.strata.length - 1;
    const newStratum = component.strata.at(newStratumIndex);
    const newId = 'test_factor_' + Date.now();
    newStratum.get('id')?.setValue(newId);
    newStratum.get('levelsStr')?.setValue('Level1, Level2');

    fixture.detectChanges();

    // 1. Verify store.strata() is updated
    expect(store.strata().length).toBe(2);
    expect(store.strata().find(s => s.id === newId)).toBeDefined();

    // 2. Verify component signals are initialized for the new ID
    expect(component.minimizationProbabilities()[newId]).toBeDefined();
    expect(component.minimizationProbabilities()[newId]['Level1']).toBe(0);
    expect(component.proportionalPercentages()[newId]).toBeDefined();
    expect(component.marginalCaps()[newId]).toBeDefined();
  });

  it('should synchronize store and internal signals when a stratum is removed', () => {
    // Add a stratum first
    component.addStratum();
    const stratumId = 'to_be_removed';
    component.strata.at(1).get('id')?.setValue(stratumId);
    component.strata.at(1).get('levelsStr')?.setValue('L1');
    fixture.detectChanges();

    expect(component.minimizationProbabilities()[stratumId]).toBeDefined();

    // Remove it
    component.removeStratum(1);
    fixture.detectChanges();

    // 1. Verify store.strata() is updated
    expect(store.strata().length).toBe(1);
    expect(store.strata().find(s => s.id === stratumId)).toBeUndefined();

    // 2. Verify component signals are cleared for that ID
    expect(component.minimizationProbabilities()[stratumId]).toBeUndefined();
    expect(component.proportionalPercentages()[stratumId]).toBeUndefined();
    expect(component.marginalCaps()[stratumId]).toBeUndefined();
  });

  it('should update signal keys when a stratum ID is renamed', () => {
    const oldId = 'age';
    const newId = 'patient_age';

    // Rename the ID in the form
    component.strata.at(0).get('id')?.setValue(newId);
    fixture.detectChanges();

    // 1. Verify store.strata() reflects the new ID
    expect(store.strata()[0].id).toBe(newId);

    // 2. Verify component signals reflect the new ID and the old one is gone
    expect(component.minimizationProbabilities()[newId]).toBeDefined();
    expect(component.minimizationProbabilities()[oldId]).toBeUndefined();
  });

  it('should trigger form validation when minimization signals are updated', () => {
    // Switch to Minimization method
    component.designGroup.get('randomizationMethod')?.setValue('MINIMIZATION');

    // Set levels for 'age' stratum
    component.strata.at(0).get('levelsStr')?.setValue('Junior, Senior');
    fixture.detectChanges();

    // Initially invalid because probabilities (0, 0) don't sum to 100%
    expect(component.form.valid).toBe(false);
    expect(component.form.errors?.['minimizationProbabilitiesInvalid']).toBe(true);

    // Update probabilities via signal helper
    component.setMinimizationProbability('age', 'Junior', 50);
    component.setMinimizationProbability('age', 'Senior', 50);
    fixture.detectChanges();

    // Now it should be valid (50 + 50 = 100)
    expect(component.form.errors?.['minimizationProbabilitiesInvalid']).toBeUndefined();

    // Test invalidating it again
    component.setMinimizationProbability('age', 'Junior', 40);
    fixture.detectChanges();
    expect(component.form.errors?.['minimizationProbabilitiesInvalid']).toBe(true);
  });
});
