import { ChangeDetectorRef, Component, computed, DestroyRef, ElementRef, HostListener, inject, OnInit, signal, Signal, ViewChild, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import { NgTemplateOutlet } from '@angular/common';
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';
import { StudyBuilderStore, StratumFormValue } from '../store/study-builder.store';
import { TagInputComponent } from './tag-input.component';
import { previewSubjectIdMask, validateSubjectIdMask } from '../../randomization-engine/core/subject-id-engine';
import { BlockPreviewComponent, ArmInput } from './block-preview.component';
import { computeProportionalCaps, validateProportionalPercentages } from '../../randomization-engine/core/cap-strategy';
import { CapStrategy } from '../../core/models/randomization.model';
import { ToastService } from '../../../core/services/toast.service';
import { RegulatoryNoticeComponent } from '../../../core/components/regulatory-notice/regulatory-notice.component';
import { UnifiedValidationAuthority } from '../../core/validation/unified-validator';
import { A11yValidationDirective } from '../../../core/directives/a11y-validation.directive';
import { FocusManagerDirective } from '../../../core/directives/focus-manager.directive';
import { DomainThemeService } from '../../core/theme/domain-theme.service';

@Component({
  selector: 'app-config-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgTemplateOutlet, TagInputComponent, BlockPreviewComponent, RegulatoryNoticeComponent, A11yValidationDirective, FocusManagerDirective],
  templateUrl: './config-form.component.html'
})
export class ConfigFormComponent implements OnInit {
