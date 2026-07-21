import { ChangeDetectorRef, Component, computed, DestroyRef, ElementRef, HostListener, inject, OnInit, OnDestroy, signal, Signal, ViewChild, ChangeDetectionStrategy, Input, Output, EventEmitter, effect, untracked, PLATFORM_ID } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators, SignalControl } from '@core/forms/signal-forms';
import { SIGNAL_FORM_DIRECTIVES } from '@core/forms/signal-form-directives';
import { ButtonComponent } from '@core/components/ui/button.component';
import { TextInputComponent } from '@core/components/ui/text-input.component';
import { SelectComponent } from '@core/components/ui/select.component';
import { CheckboxComponent } from '@core/components/ui/checkbox.component';
import { DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';
import { StudyBuilderStore, StratumFormValue } from '../store/study-builder.store';
import { TagInputComponent } from './tag-input.component';
import { previewSubjectIdMask, validateSubjectIdMask } from 'src/app/domain/randomization-engine/core/subject-id-engine';
import { BlockPreviewComponent, ArmInput } from './block-preview.component';
import { computeProportionalCaps, validateProportionalPercentages } from '../../shared/statistical/largest-remainder';
import { CapStrategy } from 'src/app/domain/core/models/randomization.model';
import { ToastService } from '@core/services/toast.service';
import { RegulatoryNoticeComponent } from '@core/components/regulatory-notice/regulatory-notice.component';
import { UnifiedValidationAuthority } from 'src/app/domain/core/validation/unified-validator';
import { FocusManagerDirective } from '@core/directives/focus-manager.directive';
import { DomainThemeService } from 'src/app/domain/core/theme/domain-theme.service';
import { AppTooltipDirective } from '@core/directives/tooltip.directive';
import { AnnouncementService } from '@core/services/announcement.service';
import { RovingTabindexDirective } from '@core/directives/roving-tabindex.directive';
import { createStepper, StepperState, StepConfig } from '@core/utils/stepper.util';

/**
 * ⚡ Bolt Performance Optimization:
 * Added ChangeDetectionStrategy.OnPush to minimize unnecessary re-renders.
 */
@Component({
  selector: 'app-config-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SIGNAL_FORM_DIRECTIVES, ButtonComponent, TextInputComponent, SelectComponent, CheckboxComponent, TagInputComponent, BlockPreviewComponent, RegulatoryNoticeComponent, FocusManagerDirective, AppTooltipDirective, RovingTabindexDirective],
  templateUrl: './config-form.component.html'
})
export class ConfigFormComponent implements OnInit, OnDestroy {
  @Input() isSimulationMode = false;
  @Output() promoteToStudy = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  readonly facade = inject(RandomizationEngineFacade);
  readonly store = inject(StudyBuilderStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);
  public readonly domainTheme = inject(DomainThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly announcementService = inject(AnnouncementService);
  private readonly platformId = inject(PLATFORM_ID);

  private autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  private draftCleared = false;
  private readonly DRAFT_KEY = 'draft-trial-config';
  private readonly SCHEMA_VERSION = 'v1';

  ngOnDestroy(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  }

  dropdownOpen = false;
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;

  /** Live preview text for the subject ID mask input. Reactive via RxJS → Signal. */
  readonly subjectIdPreview: Signal<string>;
  /** True when the current mask has a syntax error. */
  readonly subjectIdMaskInvalid: Signal<boolean>;

  /** Live signal of the arms FormArray values for BlockPreviewComponent. */
  readonly armsSignal: Signal<ArmInput[]>;
  /** Live signal of the parsed block sizes for BlockPreviewComponent. */
  readonly blockSizesSignal: Signal<number[]>;

  /**
   * Reactive signal tracking per-factor per-level percentages for the
   * Proportional strategy. Shape: { [factorId]: { [levelName]: number } }
   */
  readonly proportionalPercentages = signal<Record<string, Record<string, number>>>({});

  /**
   * Reactive signal tracking per-factor per-level marginal caps for the
   * Marginal Only strategy. Shape: { [factorId]: { [levelName]: number } }
   */
  readonly marginalCaps = signal<Record<string, Record<string, number | undefined>>>({});

  /**
   * Reactive signal tracking per-factor per-level probabilities for minimization.
   * Shape: { [factorId]: { [levelName]: number } }
   */
  readonly minimizationProbabilities = signal<Record<string, Record<string, number>>>({});

  /**
   * Tracks whether the minimization probability inputs for a given factor have been touched (blurred).
   */
  readonly minimizationTouched = signal<Record<string, boolean>>({});

  /** Whether the computed proportional matrix has been generated and is ready to display. */
  readonly matrixComputed = signal(false);

  /** Expected attrition/dropout rate for the Monte Carlo simulation (0–50 %). */
  readonly attritionRate = signal(0);
  private lastCapsValueStr = '';

  readonly stepLabels = [
    'Regulatory Disclaimer',
    'Setup & Metadata',
    'Algorithm & Arms',
    'Sites & Stratification',
    'Allocation Mechanics',
    'Enrollment Caps',
    'Review & Generate'
  ] as const;
  readonly capsStepIndex = this.stepLabels.indexOf('Enrollment Caps');
  readonly capsResetWarning = signal(false);
  private readonly capsDirtyFromStrata = signal(true);
  private readonly hasVisitedCapsStep = signal(false);

  private buildStepperConfigs(): Record<number, StepConfig> {
    const configs: Record<number, StepConfig> = {};
    for (let i = 0; i < this.stepLabels.length; i++) {
      configs[i] = {
        onEnter: () => {
          this.announcementService.announce(this.stepLabels[i]);
          this.capsResetWarning.set(false);
          if (i === this.capsStepIndex) {
            const capsWereDirty = this.capsDirtyFromStrata();
            const shouldWarn = this.hasVisitedCapsStep() && capsWereDirty;
            if (capsWereDirty) {
              this.syncStratumCaps();
              this.resetCapLevelInputs();
              this.matrixComputed.set(false);
            }
            this.capsDirtyFromStrata.set(false);
            this.hasVisitedCapsStep.set(true);
            if (shouldWarn) {
              this.capsResetWarning.set(true);
            }
          }
          this.cdr.markForCheck();
          
          const stepHeader = this.document.getElementById(`step-header-${i}`);
          if (stepHeader) {
            stepHeader.focus();
          }
        }
      };
    }
    return configs;
  }

  readonly stepper = createStepper(this.stepLabels.length, this.buildStepperConfigs());
  readonly currentStepIndex = this.stepper.currentStepIndex;
  draggedStratumIndex: number | null = null;


  form: FormGroup = this.fb.group(
    {
      regulatoryGroup: this.fb.group({
        isAcknowledged: [false, Validators.requiredTrue]
      }),
      metadataGroup: this.fb.group({
        protocolId: ['PRT-001', Validators.required],
        studyName: ['Demo Study', Validators.required],
        phase: ['III', Validators.required],
        subjectIdMask: ['{SITE}-{STRATUM}-{SEQ:3}', Validators.required],
        seed: ['']
      }),
      designGroup: this.fb.group({
        randomizationMethod: ['BLOCK'],
        arms: this.fb.array([
          this.fb.group({ id: ['A'], name: ['Active'], ratio: [1, [Validators.required, Validators.min(1)]] }),
          this.fb.group({ id: ['B'], name: ['Placebo'], ratio: [1, [Validators.required, Validators.min(1)]] })
        ])
      }),
      strataGroup: this.fb.group({
        sitesStr: ['101, 102, 103', Validators.required],
        strata: this.fb.array([
          this.fb.group({ id: ['age'], name: ['Age Group'], levelsStr: ['<65, >=65', Validators.required] })
        ])
      }),
      allocationGroup: this.fb.group({
        blockSizesStr: ['4, 6', Validators.required],
        blockSelectionType: ['RANDOM_POOL'],
        blockOverrides: this.fb.array([]),
        minimizationP: [{ value: 0.8, disabled: true }, [Validators.required, Validators.min(0.5), Validators.max(1.0)]],
        totalSampleSize: [{ value: 120, disabled: true }, [Validators.required, Validators.min(1)]]
      }),
      capsGroup: this.fb.group({
        capStrategy: ['MANUAL_MATRIX'],
        globalCap: [100, [Validators.required, Validators.min(1)]],
        stratumCaps: this.fb.array([])
      })
    },
    { validators: [this.blockSizesValidator.bind(this), this.minimizationProbabilitiesValidator.bind(this)] }
  );

  constructor() {
    
    this.subjectIdPreview = computed(() => {
      const maskCtrl = this.form.get('metadataGroup.subjectIdMask');
      return previewSubjectIdMask(maskCtrl ? maskCtrl.value ?? '' : '');
    });
    
    this.subjectIdMaskInvalid = computed(() => {
      const maskCtrl = this.form.get('metadataGroup.subjectIdMask');
      return !validateSubjectIdMask(maskCtrl ? maskCtrl.value ?? '' : '').valid;
    });

    this.armsSignal = computed(() => {
      const armsCtrl = this.form.get('designGroup.arms');
      return armsCtrl ? armsCtrl.value as ArmInput[] : [];
    });

    this.blockSizesSignal = computed(() => {
      const blockSizesCtrl = this.form.get('allocationGroup.blockSizesStr');
      const val = blockSizesCtrl ? blockSizesCtrl.value as string : '';
      const parsed = this.parseBlockSizesStr(val ?? '');
      if (parsed === null || parsed.length === 0) return [];
      
      const method = this.form.get('designGroup.randomizationMethod')?.value as string;
      if (method === 'MINIMIZATION') return [];
      
      const armsCtrl = this.form.get('designGroup.arms');
      const arms = armsCtrl ? armsCtrl.value as ArmInput[] : [];
      
      const partialConfig = {
        randomizationMethod: method as any,
        arms,
        blockSizes: parsed,
        siteBlockOverrides: {},
        stratumBlockOverrides: {}
      };

      const errors = UnifiedValidationAuthority.validate(partialConfig as any);
      const hasBlockError = errors.some(e => e.code === 'ERR_BLOCK_SIZE_MULTIPLE' || e.code === 'ERR_BLOCK_SIZE_POSITIVE');
      
      if (hasBlockError) return [];
      return parsed;
    });
    
    if (isPlatformBrowser(this.platformId)) {
      this.hydrateDraft();
    }

    // Wire effects for value changes instead of RxJS
    let lastStrataValueStr = JSON.stringify(this.form.get('strataGroup.strata')?.value);
    effect(() => {
      const s = this.form.get('strataGroup.strata')?.value as StratumFormValue[];
      if (s) {
        untracked(() => {
          const sStr = JSON.stringify(s);
          if (lastStrataValueStr === sStr) return;
          lastStrataValueStr = sStr;

          this.store.setStrata(s);
          this.syncLevelDetails(s);
          this.markCapsStale();
        });
      }
    });
    
    effect(() => {
      const val = this.form.value;
      untracked(() => {
        this.facade.clearResults();
      });
    });
    
    this.lastCapsValueStr = JSON.stringify(this.form.get('capsGroup.stratumCaps')?.value);
    effect(() => {
      const caps = this.form.get('capsGroup.stratumCaps')?.value;
      untracked(() => {
        const capsStr = JSON.stringify(caps);
        if (this.lastCapsValueStr === capsStr) return;
        this.lastCapsValueStr = capsStr;

        if (this.matrixComputed()) {
          this.form.get('capsGroup.capStrategy')?.setValue('MANUAL_MATRIX', { emitEvent: false });
          this.form.get('capsGroup.globalCap')?.disable({ emitEvent: false });
          this.matrixComputed.set(false);
        }
      });
    });
    
    let lastGlobalCap: any = this.form.get('capsGroup.globalCap')?.value;
    effect(() => {
      const globalCap = this.form.get('capsGroup.globalCap')?.value;
      untracked(() => {
        if (lastGlobalCap === globalCap) return;
        lastGlobalCap = globalCap;
        this.matrixComputed.set(false);
      });
    });
    
    effect(() => {
      const strategy = this.form.get('capsGroup.capStrategy')?.value as string;
      untracked(() => {
        const globalCapCtrl = this.form.get('capsGroup.globalCap');
        if (strategy === 'PROPORTIONAL') {
          globalCapCtrl?.enable();
        } else {
          globalCapCtrl?.disable();
        }
      });
    });
    
    effect(() => {
      const method = this.form.get('designGroup.randomizationMethod')?.value as string;
      untracked(() => {
        const minimizationP = this.form.get('allocationGroup.minimizationP');
        const totalSampleSize = this.form.get('allocationGroup.totalSampleSize');
        const blockSizesStr = this.form.get('allocationGroup.blockSizesStr');
        const blockSelectionType = this.form.get('allocationGroup.blockSelectionType');
        const blockOverrides = this.form.get('allocationGroup.blockOverrides');
        if (method === 'MINIMIZATION') {
          minimizationP?.enable();
          totalSampleSize?.enable();
          blockSizesStr?.disable();
          blockSelectionType?.disable();
          blockOverrides?.disable();
        } else {
          minimizationP?.disable();
          totalSampleSize?.disable();
          blockSizesStr?.enable();
          blockSelectionType?.enable();
          blockOverrides?.enable();
        }
        this.form.updateValueAndValidity();
      });
    });

    effect(() => {
      this.proportionalPercentages();
      this.marginalCaps();
      this.minimizationProbabilities();
      this.minimizationTouched();
      this.matrixComputed();
      this.attritionRate();
      untracked(() => {
        this.triggerAutoSave();
      });
    });

    effect(() => {
      // Track whole form value changes
      const _val = this.form.value;
      untracked(() => {
        this.triggerAutoSave();
      });
    });
  }

  ngOnInit(): void {
    this.store.setStrata(this.strata.value as StratumFormValue[]);
    this.syncLevelDetails(this.strata.value as StratumFormValue[]);
    this.syncStratumCaps();
    
    if (this.capStrategy !== 'PROPORTIONAL') {
      this.form.get('capsGroup.globalCap')?.disable();
    }
    
    if (this.randomizationMethod === 'MINIMIZATION') {
      this.form.get('allocationGroup.blockSizesStr')?.disable();
      this.form.get('allocationGroup.blockSelectionType')?.disable();
      this.form.get('allocationGroup.blockOverrides')?.disable();
    } else {
      this.form.get('allocationGroup.minimizationP')?.disable();
      this.form.get('allocationGroup.totalSampleSize')?.disable();
    }
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event): void {
    if (this.dropdownOpen && this.dropdownContainer && !this.dropdownContainer.nativeElement.contains(event.target))
      this.dropdownOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dropdownOpen) {
      this.dropdownOpen = false;
    }
  }

  get regulatoryGroup(): FormGroup { return this.form.get('regulatoryGroup') as FormGroup; }
  get metadataGroup(): FormGroup { return this.form.get('metadataGroup') as FormGroup; }
  get designGroup(): FormGroup { return this.form.get('designGroup') as FormGroup; }
  get strataGroup(): FormGroup { return this.form.get('strataGroup') as FormGroup; }
  get allocationGroup(): FormGroup { return this.form.get('allocationGroup') as FormGroup; }
  get capsGroup(): FormGroup { return this.form.get('capsGroup') as FormGroup; }
  get arms(): FormArray { return this.form.get('designGroup.arms') as FormArray; }
  get strata(): FormArray { return this.form.get('strataGroup.strata') as FormArray; }
  get stratumCaps(): FormArray { return this.form.get('capsGroup.stratumCaps') as FormArray; }
  get blockOverrides(): FormArray { return this.form.get('allocationGroup.blockOverrides') as FormArray; }
  get totalRatio(): number { return this.arms.controls.reduce((s, c) => s + (c.get('ratio')?.value || 0), 0); }
  get isStrataStepNextDisabled(): boolean {
    return this.strataGroup.invalid || !!this.form.errors?.['minimizationProbabilitiesInvalid'];
  }

  /** Current block selection type for the global strategy. */
  get blockSelectionType(): 'RANDOM_POOL' | 'FIXED_SEQUENCE' {
    return (this.form.get('allocationGroup.blockSelectionType')?.value as 'RANDOM_POOL' | 'FIXED_SEQUENCE') ?? 'RANDOM_POOL';
  }

  /** Current randomization method. */
  get randomizationMethod(): 'BLOCK' | 'MINIMIZATION' {
    return (this.form.get('designGroup.randomizationMethod')?.value as 'BLOCK' | 'MINIMIZATION') ?? 'BLOCK';
  }

  /** Current cap strategy value. */
  get capStrategy(): CapStrategy { return (this.form.get('capsGroup.capStrategy')?.value as CapStrategy) ?? 'MANUAL_MATRIX'; }

  /** Parsed list of strata with their levels for the cap strategy UI. */
  get strataWithLevels(): { id: string; name: string; levels: string[] }[] {
    return (this.strata.value as StratumFormValue[]).map(s => ({
      id: s.id,
      name: s.name,
      levels: s.levelsStr.split(',').map(l => l.trim()).filter(l => l)
    }));
  }

  /** Percentage validation: per factor, indicates if its levels sum to 100%. */
  readonly proportionalFactorErrors = computed(() => {
    const percentages = this.proportionalPercentages();
    const strataList = this.strataWithLevels;
    const strata = strataList.map(s => ({ ...s, levelDetails: undefined as undefined }));
    return validateProportionalPercentages(strata, percentages);
  });

  /** True when the global cap control is valid and its value is an integer. */
  private get isGlobalCapValidForCompute(): boolean {
    const globalCapControl = this.form.get('capsGroup.globalCap');
    if (!globalCapControl?.valid) return false;
    return Number.isInteger(Number(globalCapControl.value));
  }

  /** True when all factor percentages sum to 100, there is at least one factor, and the global cap is valid. */
  get canComputeMatrix(): boolean {
    const errors = this.proportionalFactorErrors();
    const strataList = this.strataWithLevels;
    if (strataList.length === 0) return false;
    if (!this.isGlobalCapValidForCompute) return false;
    return Object.keys(errors).length === 0;
  }

  /** Retrieve a percentage value for a factor/level. */
  getPercentage(factorId: string, level: string): number {
    return this.proportionalPercentages()[factorId]?.[level] ?? 0;
  }

  /** Retrieve the running total of percentages for a factor. */
  getFactorPercentageTotal(factorId: string, levels: string[]): number {
    const percentages = this.proportionalPercentages();
    return levels.reduce((sum, l) => sum + (percentages[factorId]?.[l] ?? 0), 0);
  }

  /** True if the factor's percentage total is invalid (not 100). */
  isFactorPercentageInvalid(factorId: string): boolean {
    return this.proportionalFactorErrors()[factorId] === true;
  }

  /** Update a percentage value for a given factor level (called from the template). */
  setPercentage(factorId: string, level: string, value: number): void {
    this.proportionalPercentages.update(prev => ({
      ...prev,
      [factorId]: { ...(prev[factorId] ?? {}), [level]: value }
    }));
    this.matrixComputed.set(false);
  }

  /** Retrieve a marginal cap for a factor/level; returns undefined when not set (uncapped). */
  getMarginalCap(factorId: string, level: string): number | undefined {
    return this.marginalCaps()[factorId]?.[level];
  }

  /** Update a marginal cap for a given factor level (called from the template).
   *  Passing undefined removes the cap (level becomes uncapped). */
  setMarginalCap(factorId: string, level: string, value: number | undefined): void {
    this.marginalCaps.update(prev => {
      const factorCaps = { ...(prev[factorId] ?? {}) };
      if (value === undefined) {
        delete factorCaps[level];
      } else {
        factorCaps[level] = value;
      }
      return { ...prev, [factorId]: factorCaps };
    });
  }

  /** Parse a raw input string into a marginal cap number or undefined (uncapped). */
  parseMarginalCapInput(raw: string | number | null | undefined): number | undefined {
    if (typeof raw === 'number') return isNaN(raw) || raw < 0 ? undefined : Math.floor(raw);
    if (raw === null || raw === undefined) return undefined;
    const trimmed = String(raw).trim();
    if (trimmed === '') return undefined;
    const n = Number(trimmed);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  }

  /**
   * Run the Largest Remainder Method and populate `stratumCaps` with the computed values.
   * Switches the effective strategy to render the hybrid editable matrix.
   */
  computeMatrix(): void {
    const strata = this.strataWithLevels;
    if (!strata.length) return;
    const globalCap = this.form.get('capsGroup.globalCap')?.value as number ?? 100;
    const percentages = this.proportionalPercentages();

    const caps = computeProportionalCaps(
      strata.map(s => ({ id: s.id, name: s.name, levels: s.levels })),
      globalCap,
      percentages
    );

    // Repopulate stratumCaps with the computed values.
    this.stratumCaps.clear();
    for (const cap of caps) {
      this.stratumCaps.push(
        this.fb.group({ levelIds: [cap.levelIds], cap: [cap.cap, [Validators.required, Validators.min(0)]] })
      );
    }
    this.lastCapsValueStr = JSON.stringify(this.stratumCaps.value);
    this.matrixComputed.set(true);
  }

  /** Rebuild stratumCaps from the store's reactive `strataCombinations` computed signal. */
  syncStratumCaps(): void {
    const combinations = this.store.strataCombinations();
    const currentCaps = this.stratumCaps.value as { levelIds: Record<string, string>; cap: number }[];
    this.stratumCaps.clear({ emitEvent: false });
    for (const combo of combinations) {
      const existing = currentCaps.find(c => {
        if (!c.levelIds) return false;
        const keys1 = Object.keys(combo);
        const keys2 = Object.keys(c.levelIds);
        if (keys1.length !== keys2.length) return false;
        return keys1.every(k => combo[k] === c.levelIds[k]);
      });
      this.stratumCaps.push(
        this.fb.group({ levelIds: [combo], cap: [existing?.cap ?? 20, [Validators.required, Validators.min(0)]] }),
        { emitEvent: false }
      );
    }
  }

  /**
   * Synchronise the proportional percentages, marginal caps, and minimization
   * probabilities signals whenever strata levels change, preserving existing
   * values where level names match.
   */
  private syncLevelDetails(strataVals: StratumFormValue[]): void {
    this.proportionalPercentages.update(prev => {
      const next: Record<string, Record<string, number>> = {};
      for (const s of strataVals) {
        const levels = s.levelsStr.split(',').map(l => l.trim()).filter(l => l);
        next[s.id] = {};
        for (const level of levels) {
          next[s.id][level] = prev[s.id]?.[level] ?? 0;
        }
      }
      return next;
    });

    this.marginalCaps.update(prev => {
      const next: Record<string, Record<string, number | undefined>> = {};
      for (const s of strataVals) {
        const levels = s.levelsStr.split(',').map(l => l.trim()).filter(l => l);
        next[s.id] = {};
        for (const level of levels) {
          const existingCap = prev[s.id]?.[level];
          if (existingCap !== undefined) {
            next[s.id][level] = existingCap;
          }
        }
      }
      return next;
    });

    this.minimizationProbabilities.update(prev => {
      const next: Record<string, Record<string, number>> = {};
      for (const s of strataVals) {
        const levels = s.levelsStr.split(',').map(l => l.trim()).filter(l => l);
        next[s.id] = {};
        for (const level of levels) {
          next[s.id][level] = prev[s.id]?.[level] ?? 0;
        }
      }
      return next;
    });

    // Re-run form validators after signal-backed level details are synchronized.
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  onPromoteToStudy(): void {
    this.promoteToStudy.emit();
  }

  private markCapsStale(): void {
    this.capsDirtyFromStrata.set(true);
    this.capsResetWarning.set(false);
    this.matrixComputed.set(false);
  }

  private resetCapLevelInputs(): void {
    const zeroedPercentages: Record<string, Record<string, number>> = {};
    const emptiedMarginalCaps: Record<string, Record<string, number | undefined>> = {};
    for (const s of this.strataWithLevels) {
      zeroedPercentages[s.id] = {};
      emptiedMarginalCaps[s.id] = {};
      for (const level of s.levels) {
        zeroedPercentages[s.id][level] = 0;
      }
    }
    this.proportionalPercentages.set(zeroedPercentages);
    this.marginalCaps.set(emptiedMarginalCaps);
  }

  loadPreset(type: 'simple' | 'standard' | 'complex'): void {
    const { protocolId, studyName, phase, sitesStr, blockSizesStr, subjectIdMask, arms, strata } =
      this.store.getPreset(type);
    this.metadataGroup.patchValue({ protocolId, studyName, phase, subjectIdMask, seed: '' }, { emitEvent: false });
    this.strataGroup.patchValue({ sitesStr }, { emitEvent: false });
    this.allocationGroup.patchValue({ blockSizesStr }, { emitEvent: false });
    this.arms.clear({ emitEvent: false });
    arms.forEach(a => this.arms.push(
      this.fb.group({ id: [a.id], name: [a.name], ratio: [a.ratio, [Validators.required, Validators.min(1)]] }),
      { emitEvent: false }
    ));
    this.strata.clear({ emitEvent: false });
    strata.forEach(s => this.strata.push(
      this.fb.group({ id: [s.id], name: [s.name], levelsStr: [s.levelsStr, Validators.required] }),
      { emitEvent: false }
    ));
    this.form.updateValueAndValidity();
    this.store.setStrata(this.strata.value as StratumFormValue[]);
    this.syncStratumCaps();
    this.syncLevelDetails(this.strata.value as StratumFormValue[]);
    this.markCapsStale();
  }

  parseCommaSeparated(value: string | null | undefined): string[] {
    if (!value) return [];
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  private parseBlockSizesStr(val: string): number[] | null {
    if (!val) return [];
    const tokens = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (tokens.length === 0) return [];
    const sizes: number[] = [];
    for (const token of tokens) {
      if (!/^\d+$/.test(token)) return null;
      const num = parseInt(token, 10);
      if (isNaN(num) || num <= 0) return null;
      sizes.push(num);
    }
    return sizes;
  }

  addArm(): void {
    this.arms.push(this.fb.group({
      id: [String.fromCharCode(65 + this.arms.length)], name: [''], ratio: [1, [Validators.required, Validators.min(1)]]
    }));
    this.form.updateValueAndValidity();
  }

  removeArm(index: number): void {
    if (this.arms.length > 2) { this.arms.removeAt(index); this.form.updateValueAndValidity(); }
  }

  incrementRatio(index: number): void {
    const ctrl = this.arms.at(index).get('ratio');
    if (ctrl) { ctrl.setValue((ctrl.value || 0) + 1); }
    this.form.updateValueAndValidity();
  }

  decrementRatio(index: number): void {
    const ctrl = this.arms.at(index).get('ratio');
    if (ctrl && ctrl.value > 1) { ctrl.setValue(ctrl.value - 1); }
    this.form.updateValueAndValidity();
  }

  addStratum(): void {
    this.strata.push(this.fb.group({ id: ['stratum_' + Date.now()], name: [''], levelsStr: ['', Validators.required] }));
  }

  removeStratum(index: number): void { this.strata.removeAt(index); }

  /** Add a new block override card. */
  addBlockOverride(): void {
    this.blockOverrides.push(this.fb.group({
      targetType: ['site'],
      targetId: [''],
      sizesStr: [this.form.get('allocationGroup.blockSizesStr')?.value ?? '4, 6'],
      selectionType: ['RANDOM_POOL']
    }));
  }

  /** Remove a block override card by index. */
  removeBlockOverride(index: number): void {
    this.blockOverrides.removeAt(index);
  }

  /**
   * Returns the dynamically-populated options for the Target ID dropdown
   * of a block override card, based on the selected target type.
   */
  getBlockOverrideTargetOptions(index: number): string[] {
    return this.getBlockOverrideTargetOptionItems(index).map(option => option.value);
  }

  getBlockOverrideTargetOptionItems(index: number): { value: string; label: string }[] {
    const targetType = this.blockOverrides.at(index)?.get('targetType')?.value as string;
    if (targetType === 'site') {
      return ((this.form.get('strataGroup.sitesStr')?.value as string ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(s => s))
        .map(site => ({ value: site, label: site }));
    }
    return this.computedStratumOptions();
  }

  /**
   * Computes all stratum values from the current strata configuration.
   */
  private computedStratumOptions(): { value: string; label: string }[] {
    const strataVals = this.strata.value as StratumFormValue[];
    const validStrata = strataVals.filter(s => s.levelsStr?.trim());
    if (validStrata.length === 0) return [];

    const levelsList = validStrata.map(s =>
      s.levelsStr.split(',').map(l => l.trim()).filter(l => l)
    );

    let combos: string[][] = [[]];
    for (const levels of levelsList) {
      combos = combos.flatMap(c => levels.map(l => [...c, l]));
    }

    return combos.map(combo => ({
      value: combo.map(l => l.substring(0, 3).toUpperCase()).join('-'),
      label: combo.join(' | ')
    }));
  }

  /**
   * Computes all stratum codes from the current strata configuration.
   * These codes are used as keys in `stratumBlockOverrides`.
   */
  computedStratumCodes(): string[] {
    return this.computedStratumOptions().map(option => option.value);
  }

  onStratumKeyDown(event: KeyboardEvent, index: number): void {
    // Arrow up/down to reorder
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const newIndex = event.key === 'ArrowUp' ? index - 1 : index + 1;
      
      if (newIndex >= 0 && newIndex < this.strata.length) {
        const control = this.strata.at(index);
        this.strata.removeAt(index, { emitEvent: false });
        this.strata.insert(newIndex, control, { emitEvent: false });
        
        const reorderedStrata = this.strata.value as StratumFormValue[];
        this.store.setStrata(reorderedStrata);
        this.syncLevelDetails(reorderedStrata);
        this.markCapsStale();
        
        const stratumName = control.get('name')?.value || 'Unnamed Factor';
        this.announcementService.announce(`${stratumName} moved to position ${newIndex + 1} of ${this.strata.length}`, 'polite');

        // Set focus back to the moved element
        setTimeout(() => {
          const handles = this.document.querySelectorAll('.stratum-drag-handle');
          if (handles[newIndex]) {
            (handles[newIndex] as HTMLElement).focus();
          }
        }, 50);
      }
    }
  }

  onGenerateCode(language: 'R' | 'SAS' | 'Python' | 'STATA'): void {
    if (this.form.valid) {
      try { 
        this.dropdownContainer?.nativeElement.querySelector('button')?.focus();
        this.facade.openCodeGenerator(this.store.buildConfig(this.buildFormValue()), language); 
        this.dropdownOpen = false; 
      }
      catch (e) { console.error('Error generating code config:', e); this.toastService.showError('Error generating code. Please check your configuration.'); }
    }
  }

  onRunMonteCarlo(): void {
    if (this.form.valid) {
      try { this.facade.runMonteCarlo(this.store.buildConfig(this.buildFormValue()), this.attritionRate()); }
      catch (e) { console.error('Error starting Monte Carlo simulation:', e); this.toastService.showError('Error starting simulation. Please check your configuration.'); }
    }
  }

  clampAttritionRate(value: number): number {
    const normalizedValue = Number.isFinite(value) ? value : 0;
    return Math.min(50, Math.max(0, normalizedValue));
  }

  onSubmit(): void {
    if (this.form.valid) {
      try { 
        this.draftCleared = true;
        this.facade.generateSchema(this.store.buildConfig(this.buildFormValue())); 
        this.clearDraft();
      }
      catch (e) { console.error('Error generating schema config:', e); this.toastService.showError('Error generating schema. Please check your configuration.'); }
    }
  }

  /** Build the full form value including levelDetails from signals. */
  private buildFormValue() {
    // getRawValue() includes disabled controls (e.g., globalCap when strategy ≠ PROPORTIONAL).
    const base = this.form.getRawValue();
    const levelDetails: Record<string, { name: string; targetPercentage: number; marginalCap?: number; expectedProbability?: number }[]> = {};
    const percentages = this.proportionalPercentages();
    const caps = this.marginalCaps();
    const minimizationProbs = this.minimizationProbabilities();
    for (const s of (this.strata.value as StratumFormValue[])) {
      const levels = s.levelsStr.split(',').map((l: string) => l.trim()).filter((l: string) => l);
      levelDetails[s.id] = levels.map(level => {
        const marginalCap = caps[s.id]?.[level];
        const minimizationExpectedProbability = minimizationProbs[s.id]?.[level];
        return {
          name: level,
          targetPercentage: percentages[s.id]?.[level] ?? 0,
          ...(marginalCap !== undefined ? { marginalCap } : {}),
          ...(minimizationExpectedProbability !== undefined ? { expectedProbability: minimizationExpectedProbability / 100 } : {})
        };
      });
    }

    const randomizationMethod = base.designGroup.randomizationMethod as 'BLOCK' | 'MINIMIZATION';
    // Build block overrides data from the blockOverrides form array.
    const blockOverrides = randomizationMethod === 'BLOCK'
      ? (this.blockOverrides.value as {
          targetType: 'site' | 'stratum';
          targetId: string;
          sizesStr: string;
          selectionType: 'RANDOM_POOL' | 'FIXED_SEQUENCE';
        }[]).filter(ov => ov.targetId?.trim())
      : undefined;

    return {
      protocolId: base.metadataGroup.protocolId,
      studyName: base.metadataGroup.studyName,
      phase: base.metadataGroup.phase,
      arms: base.designGroup.arms,
      strata: base.strataGroup.strata,
      sitesStr: base.strataGroup.sitesStr,
      ...(randomizationMethod === 'BLOCK' ? {
        blockSizesStr: base.allocationGroup.blockSizesStr,
        blockSelectionType: base.allocationGroup.blockSelectionType,
        blockOverrides
      } : {
        minimizationP: base.allocationGroup.minimizationP,
        totalSampleSize: base.allocationGroup.totalSampleSize
      }),
      stratumCaps: base.capsGroup.stratumCaps,
      seed: base.metadataGroup.seed,
      subjectIdMask: base.metadataGroup.subjectIdMask,
      capStrategy: base.capsGroup.capStrategy,
      globalCap: base.capsGroup.globalCap,
      randomizationMethod,
      levelDetails
    };
  }

  private blockSizesValidator(group: AbstractControl): ValidationErrors | null {
    if (!(group instanceof FormGroup)) return null;
    const method = group.get('designGroup.randomizationMethod')?.value as string;
    if (method === 'MINIMIZATION') return null;
    const arms = (group.get('designGroup.arms') as FormArray)?.value || [];
    const blockSizesStr = group.get('allocationGroup.blockSizesStr')?.value as string || '';
    const overridesArr = (group.get('allocationGroup.blockOverrides') as FormArray)?.value || [];

    const parsedBlockSizes = this.parseBlockSizesStr(blockSizesStr);
    if (parsedBlockSizes === null) {
      return { invalidBlockSize: true, message: 'Block sizes must be positive integers.' };
    }

    const blockSizes = parsedBlockSizes;

    const siteBlockOverrides: Record<string, any> = {};
    const stratumBlockOverrides: Record<string, any> = {};

    for (const ov of overridesArr) {
      if (!ov.targetId?.trim()) continue;
      const ovSizes = (ov.sizesStr || '').split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));
      if (ov.targetType === 'site') {
        siteBlockOverrides[ov.targetId] = { sizes: ovSizes };
      } else {
        stratumBlockOverrides[ov.targetId] = { sizes: ovSizes };
      }
    }

    const partialConfig = {
      randomizationMethod: method as any,
      arms,
      blockSizes,
      siteBlockOverrides,
      stratumBlockOverrides
    };

    const errors = UnifiedValidationAuthority.validate(partialConfig);
    if (errors.length > 0) {
      const blockError = errors.find(e => e.code === 'ERR_BLOCK_SIZE_MULTIPLE' || e.code === 'ERR_BLOCK_SIZE_POSITIVE');
      if (blockError) {
        return { invalidBlockSize: true, message: blockError.message };
      }
    }
    return null;
  }

  /**
   * Form-level validator that checks per-factor probability totals when
   * Minimization is the active method. Each factor's levels must sum to 100%,
   * and every individual probability must be finite and within [0, 100].
   */
  private minimizationProbabilitiesValidator(group: AbstractControl): { minimizationProbabilitiesInvalid: true } | null {
    if (!(group instanceof FormGroup)) return null;
    const method = group.get('designGroup.randomizationMethod')?.value as string;
    if (method !== 'MINIMIZATION') return null;
    const strata = (group.get('strataGroup.strata') as FormArray).value as StratumFormValue[];
    const probs = this.minimizationProbabilities();
    for (const s of strata) {
      const levels = s.levelsStr.split(',').map(l => l.trim()).filter(l => l);
      if (levels.length === 0) continue;
      let total = 0;
      for (const l of levels) {
        const v = probs[s.id]?.[l] ?? 0;
        if (!Number.isFinite(v) || v < 0 || v > 100) return { minimizationProbabilitiesInvalid: true };
        total += v;
      }
      if (Math.abs(total - 100) > 0.01) return { minimizationProbabilitiesInvalid: true };
    }
    return null;
  }

  // ── Auto-Save and Hydration Helpers ────────────────────────────────────────

  private triggerAutoSave(): void {
    if (this.draftCleared) return;
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.autoSaveTimeout = setTimeout(() => this.saveDraft(), 750);
  }

  private saveDraft(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const state = {
      form: this.form.getRawValue(),
      signals: {
        proportionalPercentages: this.proportionalPercentages(),
        marginalCaps: this.marginalCaps(),
        minimizationProbabilities: this.minimizationProbabilities(),
        minimizationTouched: this.minimizationTouched(),
        matrixComputed: this.matrixComputed(),
        attritionRate: this.attritionRate(),
        currentStepIndex: this.currentStepIndex()
      }
    };
    
    const draft = {
      schemaVersion: this.SCHEMA_VERSION,
      state
    };
    
    try {
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save draft config', e);
    }
  }

  private hydrateDraft(): void {
    try {
      const draftStr = localStorage.getItem(this.DRAFT_KEY);
      if (!draftStr) return;
      
      const draft = JSON.parse(draftStr);
      if (draft.schemaVersion !== this.SCHEMA_VERSION) {
        this.clearDraft();
        return;
      }
      
      const state = draft.state;
      if (!state) return;

      // Restore signals first so that any synced computed/effects behave correctly
      if (state.signals) {
        if (state.signals.proportionalPercentages) this.proportionalPercentages.set(state.signals.proportionalPercentages);
        if (state.signals.marginalCaps) this.marginalCaps.set(state.signals.marginalCaps);
        if (state.signals.minimizationProbabilities) this.minimizationProbabilities.set(state.signals.minimizationProbabilities);
        if (state.signals.minimizationTouched) this.minimizationTouched.set(state.signals.minimizationTouched);
        if (state.signals.matrixComputed !== undefined) this.matrixComputed.set(state.signals.matrixComputed);
        if (state.signals.attritionRate !== undefined) this.attritionRate.set(state.signals.attritionRate);
        if (state.signals.currentStepIndex !== undefined) this.stepper.goTo(state.signals.currentStepIndex);
      }
      
      // Restore dynamic arrays
      if (state.form) {
        this.arms.clear({ emitEvent: false });
        if (state.form.designGroup?.arms) {
          state.form.designGroup.arms.forEach((a: any) => {
            this.arms.push(
              this.fb.group({ id: [a.id], name: [a.name], ratio: [a.ratio, [Validators.required, Validators.min(1)]] }),
              { emitEvent: false }
            );
          });
        }
        
        this.strata.clear({ emitEvent: false });
        if (state.form.strataGroup?.strata) {
          state.form.strataGroup.strata.forEach((s: any) => {
            this.strata.push(
              this.fb.group({ id: [s.id], name: [s.name], levelsStr: [s.levelsStr, Validators.required] }),
              { emitEvent: false }
            );
          });
        }
        
        this.blockOverrides.clear({ emitEvent: false });
        if (state.form.allocationGroup?.blockOverrides) {
          state.form.allocationGroup.blockOverrides.forEach((ov: any) => {
            this.blockOverrides.push(
              this.fb.group({
                targetType: [ov.targetType],
                targetId: [ov.targetId],
                sizesStr: [ov.sizesStr],
                selectionType: [ov.selectionType]
              }),
              { emitEvent: false }
            );
          });
        }
        
        this.stratumCaps.clear({ emitEvent: false });
        if (state.form.capsGroup?.stratumCaps) {
          state.form.capsGroup.stratumCaps.forEach((c: any) => {
            this.stratumCaps.push(
              this.fb.group({ levelIds: [c.levelIds], cap: [c.cap, [Validators.required, Validators.min(0)]] }),
              { emitEvent: false }
            );
          });
        }
        
        this.form.patchValue(state.form, { emitEvent: false });
      }
      
      // After patching, trigger a validity check
      this.form.updateValueAndValidity({ emitEvent: false });
      
    } catch (e) {
      console.warn('Failed to hydrate draft config, clearing it.', e);
      this.clearDraft();
    }
  }

  private clearDraft(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem(this.DRAFT_KEY);
  }

  // ── Minimization helpers ──────────────────────────────────────────────────

  getStrataId(index: number): string {
    return (this.strata.at(index).get('id')?.value as string) ?? '';
  }

  getStrataLevels(index: number): string[] {
    const levelsStr = this.strata.at(index).get('levelsStr')?.value as string ?? '';
    return levelsStr.split(',').map(l => l.trim()).filter(l => l);
  }

  getMinimizationProbability(factorId: string, level: string): number {
    return this.minimizationProbabilities()[factorId]?.[level] ?? 0;
  }

  getMinimizationProbabilityTotal(factorId: string, levels: string[]): number {
    const probs = this.minimizationProbabilities();
    return levels.reduce((sum, l) => sum + (probs[factorId]?.[l] ?? 0), 0);
  }

  isMinimizationProbabilityTouched(factorId: string): boolean {
    return !!this.minimizationTouched()[factorId];
  }

  markMinimizationProbabilityTouched(factorId: string): void {
    this.minimizationTouched.update(prev => ({ ...prev, [factorId]: true }));
  }

  isMinimizationProbabilityInvalid(factorId: string): boolean {
    const levels = this.strataWithLevels.find(s => s.id === factorId)?.levels ?? [];
    if (levels.length === 0) return false;
    const total = this.getMinimizationProbabilityTotal(factorId, levels);
    return Math.abs(total - 100) > 0.01;
  }

  getCapLabel(levelIds: Record<string, string> | null | undefined): string {
    if (!levelIds) return 'Overall / Default';
    const values = Object.values(levelIds);
    return values.length > 0 ? values.join(' | ') : 'Overall / Default';
  }

  setMinimizationProbability(factorId: string, level: string, value: number): void {
    // Clamp to [0, 100] and treat non-finite inputs as 0.
    const sanitized = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    this.minimizationProbabilities.update(prev => ({
      ...prev,
      [factorId]: { ...(prev[factorId] ?? {}), [level]: sanitized }
    }));
    // Re-run form-level validator since probability data lives outside the FormGroup.
    this.form.updateValueAndValidity();
  }

  get reviewConfigJson(): string {
    try {
      return JSON.stringify(this.store.buildConfig(this.buildFormValue()), null, 2);
    } catch {
      return '{}';
    }
  }

  nextStep(): void {
    this.stepper.next();
  }

  previousStep(): void {
    this.stepper.previous();
  }

  setStep(index: number): void {
    this.stepper.goTo(index);
  }

  // --- HTML5 Drag and Drop Handlers ---
  
  onDragStart(event: DragEvent, index: number): void {
    this.draggedStratumIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.dropEffect = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    const previousIndex = this.draggedStratumIndex;
    if (previousIndex !== null && previousIndex !== index) {
      const control = this.strata.at(previousIndex);
      this.strata.removeAt(previousIndex, { emitEvent: false });
      this.strata.insert(index, control, { emitEvent: false });
      
      const reorderedStrata = this.strata.value as StratumFormValue[];
      this.store.setStrata(reorderedStrata);
      this.syncLevelDetails(reorderedStrata);
      this.markCapsStale();
    }
    this.draggedStratumIndex = null;
  }

  onDragEnd(): void {
    this.draggedStratumIndex = null;
  }
}
