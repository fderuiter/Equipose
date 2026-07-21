import { Component, computed, Input, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { PRECISION_SCALE } from '@core/constants/precision.config';
import { DomainThemeService, ArmColorTokens } from 'src/app/domain/core/theme/domain-theme.service';

/** One arm's data passed from the parent. */
export interface ArmInput {
  id: string;
  name: string;
  ratio: number;
}

/** A single slot in the blister-pack grid. */
export interface BlockSlot {
  /** Tailwind background class (e.g. 'bg-indigo-500') – empty string for invalid slots. */
  bgClass: string;
  /** Whether this slot is a mathematically unallocatable remainder. */
  isInvalid: boolean;
  /** Tooltip text for the slot. */
  tooltip: string;
  /** Arm name for aria-label (undefined for invalid slots). */
  armName?: string;
}

/** Per-block-size preview data. */
export interface BlockPreview {
  blockSize: number;
  isValid: boolean;
  slots: BlockSlot[];
}

/** Calculate the total ratio from an array of arms. Returns at least 1. */
export function calcTotalRatio(arms: ArmInput[]): number {
  const sum = arms.reduce((acc, a) => acc + (a.ratio ?? 0), 0);
  return sum > 0 ? sum : 1;
}

/** Build the preview data for all given block sizes given arm definitions. */
export function buildPreviews(arms: ArmInput[], blockSizes: number[], getArmColor: (index: number) => ArmColorTokens): BlockPreview[] {
  if (arms.length === 0 || blockSizes.length === 0) return [];
  const totalRatio = calcTotalRatio(arms);

  return blockSizes
    .filter(bs => bs > 0 && Number.isFinite(bs))
    .map(blockSize => {
      const isValid = blockSize % totalRatio === 0;
      const slots: BlockSlot[] = [];

      if (isValid) {
        arms.forEach((arm, idx) => {
          const proportionScaled = Math.round((arm.ratio / totalRatio) * PRECISION_SCALE);
          const count = Math.round((proportionScaled * blockSize) / PRECISION_SCALE);
          for (let i = 0; i < count; i++) {
            slots.push({
              bgClass: getArmColor(idx).bgClass,
              isInvalid: false,
              tooltip: arm.name || arm.id,
              armName: arm.name || arm.id,
            });
          }
        });
      } else {
        const cleanCount = blockSize - (blockSize % totalRatio);
        let rendered = 0;
        arms.forEach((arm, idx) => {
          if (rendered >= cleanCount) return;
          const proportionScaled = Math.round((arm.ratio / totalRatio) * PRECISION_SCALE);
          const count = Math.round((proportionScaled * cleanCount) / PRECISION_SCALE);
          for (let i = 0; i < count && rendered < cleanCount; i++) {
            slots.push({
              bgClass: getArmColor(idx).bgClass,
              isInvalid: false,
              tooltip: arm.name || arm.id,
              armName: arm.name || arm.id,
            });
            rendered++;
          }
        });
        // Fill any remaining clean slots that weren't assigned due to rounding
        while (slots.length < cleanCount) {
          const armIdx = slots.length % arms.length;
          const arm = arms[armIdx];
          slots.push({
            bgClass: getArmColor(armIdx).bgClass,
            isInvalid: false,
            tooltip: arm.name || arm.id,
            armName: arm.name || arm.id,
          });
        }
        // Add invalid (remainder) slots
        const remainder = blockSize % totalRatio;
        for (let i = 0; i < remainder; i++) {
          slots.push({
            bgClass: '',
            isInvalid: true,
            tooltip: 'Unallocatable Subject – this slot cannot be assigned to any arm given the current ratio.',
          });
        }
      }

      return { blockSize, isValid, slots };
    });
}

/**
 * ⚡ Bolt Performance Optimization:
 * Added ChangeDetectionStrategy.OnPush to minimize unnecessary re-renders.
 */
@Component({
  selector: 'app-block-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="space-y-4">
      <h3 class="text-sm font-semibold text-muted flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm6-6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 8a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
        </svg>
        Block Preview
      </h3>

      <!-- Arm colour legend -->
      @if (arms.length > 0) {
        <div class="flex flex-wrap gap-2">
          @for (arm of arms; track arm.id; let i = $index) {
            <span class="inline-flex items-center gap-1 text-xs text-muted">
              <span class="inline-block h-3 w-3 rounded-sm {{ armColor(i) }}"></span>
              {{ arm.name || arm.id }}
            </span>
          }
          <span class="inline-flex items-center gap-1 text-xs text-muted">
            <span class="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/40"></span>
            Unallocatable
          </span>
        </div>
      }

      <!-- Per-block-size previews -->
      <!-- Shared tooltip popover -->
      <div id="block-preview-tooltip" popover="manual" class="app-tooltip fixed m-0 z-50 pointer-events-none" [style.top.px]="tooltipY()" [style.left.px]="tooltipX()">
        {{ tooltipText() }}
      </div>

      @if (previews().length === 0) {
        <!-- Empty state skeleton -->
        <div class="space-y-3">
          <div class="flex flex-wrap gap-2">
            @for (n of skeleton; track $index) {
              <div class="rounded-md h-8 w-8 bg-subtle border border-border-base"></div>
            }
          </div>
          <p class="text-xs text-muted italic">Enter block sizes above to see a preview.</p>
        </div>
      } @else {
        @for (preview of previews(); track preview.blockSize) {
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-muted">Block size {{ preview.blockSize }}</span>
              @if (preview.isValid) {
                <span class="inline-flex items-center gap-0.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                  Valid
                </span>
              } @else {
                <span class="inline-flex items-center gap-0.5 text-xs text-red-600 dark:text-rose-400 font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  Invalid – {{ preview.blockSize % totalRatio() }} leftover slot{{ (preview.blockSize % totalRatio()) !== 1 ? 's' : '' }}
                </span>
              }
            </div>
            <!-- Blister-pack grid -->
            <div
              class="grid gap-1.5 p-2 rounded-lg bg-subtle/50 border border-border-base"
              [style.grid-template-columns]="'repeat(' + gridCols(preview.blockSize) + ', minmax(0, 1fr))'"
              role="group"
              [attr.aria-label]="'Block of ' + preview.blockSize + ' subjects'"
            >
              @for (slot of preview.slots; track $index) {
                @if (slot.isInvalid) {
                  <div
                    class="rounded-md h-8 w-8 border-2 border-dashed border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/40"
                    (mouseenter)="showTooltip($event, slot.tooltip)" (mouseleave)="hideTooltip()"
                    role="img"
                    aria-label="Unallocatable subject slot"
                  ></div>
                } @else {
                  <div
                    class="rounded-md h-8 w-8 {{ slot.bgClass }}"
                    (mouseenter)="showTooltip($event, slot.tooltip)" (mouseleave)="hideTooltip()"
                    role="img"
                    [attr.aria-label]="slot.armName"
                  ></div>
                }
              }
            </div>
          </div>
        }
      }
    </div>
  `
})
export class BlockPreviewComponent {
  /** Treatment arms with id, name, ratio. */
  @Input() set arms(val: ArmInput[]) {
    this._arms.set(val);
  }
  get arms(): ArmInput[] {
    return this._arms();
  }
  private _arms = signal<ArmInput[]>([]);

  /** Parsed block sizes (integers). */
  @Input() set blockSizes(val: number[]) {
    this._blockSizes.set(val);
  }
  get blockSizes(): number[] {
    return this._blockSizes();
  }
  private _blockSizes = signal<number[]>([]);
  
  private readonly domainTheme = inject(DomainThemeService);

  /** Skeleton placeholder squares for empty state. */
  readonly skeleton = Array.from({ length: 6 });

  /** Sum of all arm ratios. */
  readonly totalRatio = computed(() => calcTotalRatio(this._arms()));

  /** Return the Tailwind bg class for an arm by index. */
  armColor(index: number): string {
    return this.domainTheme.getArmColor(index).bgClass;
  }

  /** How many columns to use for the grid (max 12, snap to blockSize). */
  gridCols(blockSize: number): number {
    return Math.min(blockSize, 12);
  }

  /** Computed per-block-size preview data. */
  readonly previews = computed<BlockPreview[]>(() =>
    buildPreviews(this._arms(), this._blockSizes(), (idx) => this.domainTheme.getArmColor(idx))
  );

  tooltipText = signal('');
  tooltipX = signal(0);
  tooltipY = signal(0);

  showTooltip(event: MouseEvent, text: string): void {
    this.tooltipText.set(text);
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.tooltipX.set(rect.left + rect.width / 2);
    this.tooltipY.set(rect.top - 30);
    const popover = document.getElementById('block-preview-tooltip') as any;
    if (popover && typeof popover.showPopover === 'function') {
      popover.showPopover();
    }
  }

  hideTooltip(): void {
    const popover = document.getElementById('block-preview-tooltip') as any;
    if (popover && typeof popover.hidePopover === 'function') {
      popover.hidePopover();
    }
  }
}
