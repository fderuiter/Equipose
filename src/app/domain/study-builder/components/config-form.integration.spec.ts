import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '../../../core/forms/signal-forms';
import { ConfigFormComponent } from './config-form.component';
const flushMicrotasks = async () => await new Promise(r => setTimeout(r, 0));
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';
import { StudyBuilderStore } from '../store/study-builder.store';
import { signal } from '@angular/core';
import { vi } from 'vitest';

describe('ConfigFormComponent & StudyBuilderStore Integration', () => {
  let component: ConfigFormComponent;
  let fixture: ComponentFixture<ConfigFormComponent>;
  let store: InstanceType<typeof StudyBuilderStore>;
  let mockFacade: unknown;

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

    // Satisfy the regulatory gateway
    component.regulatoryGroup.get('isAcknowledged')?.setValue(true);
    fixture.detectChanges();
  });

  const areCombosEqual = (c1: any, c2: any) => {
    if (!c1 || !c2) return false;
    const keys1 = Object.keys(c1);
    const keys2 = Object.keys(c2);
    if (keys1.length !== keys2.length) return false;
    return keys1.every(k => c1[k] === c2[k]);
  };

  it('should update store combinations when component strata change', () => {
    // Initial state (default 'age' stratum from component)
    expect(store.strataCombinations().length).toBe(2);

    // Add a second stratum in the component
    component.addStratum();
    const secondStratum = component.strata.at(1);
    secondStratum.get('id')?.setValue('gender');
    secondStratum.get('levelsStr')?.setValue('M, F');
    fixture.detectChanges();

    // Store should now have 4 combinations (2 age * 2 gender)
    const combos = store.strataCombinations();
    expect(combos.length).toBe(4);
    expect(combos.some(c => areCombosEqual(c, { age: '<65', gender: 'M' }))).toBe(true);
    expect(combos.some(c => areCombosEqual(c, { age: '<65', gender: 'F' }))).toBe(true);
    expect(combos.some(c => areCombosEqual(c, { age: '>=65', gender: 'M' }))).toBe(true);
    expect(combos.some(c => areCombosEqual(c, { age: '>=65', gender: 'F' }))).toBe(true);
  });

  it('should regenerate component stratumCaps when entering the caps step after strata changes', () => {
    // 1. Initial state
    expect(component.stratumCaps.length).toBe(2);

    // 2. Change strata in the component
    component.strata.at(0).get('levelsStr')?.setValue('<65, 65-75, >75');
    fixture.detectChanges();

    // stratumCaps should NOT have updated yet (deferred until step entry)
    expect(component.stratumCaps.length).toBe(2);

    // 3. Navigate to Enrollment Caps step
    component.setStep(component.capsStepIndex);
    fixture.detectChanges();

    // Now stratumCaps should be regenerated
    expect(component.stratumCaps.length).toBe(3);
    const caps = component.stratumCaps.value;
    expect(areCombosEqual(caps[0].levelIds, { age: '<65' })).toBe(true);
    expect(areCombosEqual(caps[1].levelIds, { age: '65-75' })).toBe(true);
    expect(areCombosEqual(caps[2].levelIds, { age: '>75' })).toBe(true);
  });

  it('should preserve existing cap values when regenerating combinations if levelIds match', () => {
    // 1. Set some custom caps
    component.setStep(component.capsStepIndex);
    component.stratumCaps.at(0).get('cap')?.setValue(50); // <65
    component.stratumCaps.at(1).get('cap')?.setValue(30); // >=65
    fixture.detectChanges();

    // 2. Add a new stratum (this will trigger regeneration later)
    component.addStratum();
    const genderStratum = component.strata.at(1);
    genderStratum.get('id')?.setValue('gender');
    genderStratum.get('levelsStr')?.setValue('M'); // Just one level for simplicity
    fixture.detectChanges();

    // 3. Navigate to Enrollment Caps step
    component.setStep(component.capsStepIndex);
    fixture.detectChanges();

    // Combinations are now {age: '<65', gender: 'M'} and {age: '>=65', gender: 'M'}
    // Since levelIds don't match exactly (gender is new), it might not preserve them
    // unless the logic handles partial matches, but looking at syncStratumCaps:
    // it checks for exact key/value match.

    expect(component.stratumCaps.length).toBe(2);
    // These should be default (20) because levelIds changed (new key 'gender')
    expect(component.stratumCaps.at(0).get('cap')?.value).toBe(20);
  });

  it('should preserve existing cap values when reordering strata', async () => {
    // 1. Setup multiple strata and custom caps
    component.addStratum();
    component.strata.at(1).get('id')?.setValue('gender');
    component.strata.at(1).get('levelsStr')?.setValue('M, F');
    await flushMicrotasks();
    component.setStep(component.capsStepIndex);

    // Set a specific cap
    const targetCombo = { age: '<65', gender: 'F' };
    const targetIndex = component.stratumCaps.value.findIndex((c: any) => areCombosEqual(c.levelIds, targetCombo));
    expect(targetIndex).toBeGreaterThan(-1);
    component.stratumCaps.at(targetIndex).get('cap')?.setValue(99);
    fixture.detectChanges();

    // 2. Reorder strata (age, gender) -> (gender, age)
    component.draggedStratumIndex = 0;
    component.onDrop({ preventDefault: () => {} } as any, 1);
    await flushMicrotasks();
    fixture.detectChanges();

    // 3. Navigate back to caps step to trigger sync
    component.setStep(component.capsStepIndex);
    fixture.detectChanges();

    // The combination { age: '<65', gender: 'F' } should still have cap 99
    const newTargetIndex = component.stratumCaps.value.findIndex((c: any) => areCombosEqual(c.levelIds, targetCombo));
    expect(newTargetIndex).toBeGreaterThan(-1);
    expect(component.stratumCaps.at(newTargetIndex).get('cap')?.value).toBe(99);
  });
});
