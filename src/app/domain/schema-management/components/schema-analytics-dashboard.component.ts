import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SchemaViewStateService } from '../services/schema-view-state.service';
import { ThemeService, ArmColorTokens } from '../../../core/services/theme.service';
import { AppTooltipDirective } from '../../../core/directives/tooltip.directive';
import { ButtonComponent } from '../../../core/components/ui/button.component';

@Component({
  selector: 'app-schema-analytics-dashboard',
  standalone: true,
  imports: [DecimalPipe, AppTooltipDirective, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (viewState.adamDataset()) {
      <div data-testid="schema-analytics-dashboard" [class]="domainTheme.layout().cardClasses + ' space-y-4'">

        <!-- Header -->
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-main">Schema Analytics</h3>

          <!-- Active filter HUD -->
          @if (viewState.activeFilter()) {
            <div class="flex items-center gap-2 text-sm">
              <span class="text-muted">Active filter:</span>
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-medium text-xs">
                {{ getVariableLabel(viewState.activeFilter()!.variableId || viewState.activeFilter()!.type || '') }}:
                {{ viewState.activeFilter()!.value }}
                <app-button
                  variant="bare"
                  (onClick)="viewState.clearFilter()"
                  customClass="ml-1 hover:text-indigo-600 dark:hover:text-indigo-200 leading-none rounded"
                  ariaLabel="Remove filter"
                  appTooltip="Remove filter"
                >✕</app-button>
              </span>
              <app-button
                variant="bare"
                (onClick)="viewState.clearFilter()"
                customClass="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >Clear all filters</app-button>
            </div>
          }
        </div>

        <!-- Charts grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          @for (chart of chartConfigs(); track chart.id) {
            <div>
              <p class="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                Distribution by {{ chart.label }}
                @if (chart.isBlinded) {
                  <span class="ml-1 text-amber-700 dark:text-amber-400">(blinded)</span>
                }
              </p>
              <div class="h-56 w-full flex items-center justify-center">
                @if (chart.isBlinded) {
                  <div class="relative w-40 h-40 rounded-full flex items-center justify-center shadow-inner" style="background: {{chart.conicGradient}};">
                    <div class="absolute inset-0 m-auto w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                      <span class="font-bold text-muted text-sm">Blinded</span>
                    </div>
                  </div>
                } @else if (chart.type === 'pie') {
                  <div 
                    class="relative w-40 h-40 rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-shadow" 
                    [style.background]="chart.conicGradient"
                    (click)="onDonutClick($event, chart)"
                    role="img"
                    [attr.aria-label]="'Donut chart for ' + chart.label"
                  >
                    <div class="absolute inset-0 m-auto w-24 h-24 bg-white dark:bg-slate-900 rounded-full"></div>
                  </div>
                } @else {
                  <div class="w-full flex flex-col justify-center h-full gap-3 overflow-y-auto pr-2" role="list" [attr.aria-label]="'Bar chart for ' + chart.label">
                    @for (category of chart.categories; track category.name) {
                      <div class="w-full" role="listitem">
                        <div class="flex justify-between text-xs mb-1">
                          <span class="truncate max-w-[70%] font-medium" [title]="category.name">{{ category.name }}</span>
                          <span class="text-muted">{{ category.value }} ({{ category.percentage | number:'1.0-0' }}%)</span>
                        </div>
                        <div 
                          class="h-4 bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          (click)="chart.clickHandler({ name: category.name })"
                          role="button"
                          [attr.aria-label]="'Filter by ' + category.name"
                        >
                          <div class="h-full rounded-sm" [style.width.%]="category.percentage" [style.background-color]="category.color"></div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Accessible Filter Legend -->
              @if (!chart.isBlinded && chart.categories && chart.categories.length > 0) {
                <ul
                  class="flex flex-wrap gap-2 mt-4"
                  role="listbox"
                  [attr.aria-label]="'Filter by ' + chart.label"
                >
                  @for (category of chart.categories; track category.name; let idx = $index) {
                    <li
                      role="option"
                      [attr.aria-selected]="viewState.activeFilter()?.variableId === chart.id && viewState.activeFilter()?.value === category.name"
                      [tabindex]="getTabIndex(chart.id, category.name, idx)"
                      [id]="'legend-item-' + chart.id + '-' + idx"
                      (click)="chart.clickHandler({ name: category.name })"
                      (keydown)="handleKeydown($event, chart, category, idx)"
                      class="flex items-center gap-1.5 px-2 py-1 text-sm rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:ring-offset-focus-offset transition-colors"
                      [class]="viewState.activeFilter()?.variableId === chart.id && viewState.activeFilter()?.value === category.name
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'"
                    >
                      <span class="w-3 h-3 rounded-full inline-block" [style.background-color]="category.color"></span>
                      {{ category.name }}
                    </li>
                  }
                </ul>
              }
            </div>
          }
        </div>

        <p class="text-xs text-muted">
          Click a chart segment or bar to cross-filter the results grid below.
        </p>
      </div>
    }
  `,
})
export class SchemaAnalyticsDashboardComponent {
  protected readonly viewState = inject(SchemaViewStateService);
  protected readonly domainTheme = inject(ThemeService);

  private getCssColor(token: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    return value || fallback;
  }

  getVariableLabel(id: string): string {
    if (id === 'treatment') id = 'treatmentArm';
    const ds = this.viewState.adamDataset();
    if (!ds) return id;
    const v = ds.variables.find(v => v.id === id);
    return v ? v.label : id;
  }

  getTabIndex(chartId: string, categoryName: string, idx: number): number {
    const activeFilter = this.viewState.activeFilter();
    if (activeFilter?.variableId === chartId) {
      return activeFilter.value === categoryName ? 0 : -1;
    }
    return idx === 0 ? 0 : -1;
  }

  handleKeydown(event: KeyboardEvent, chart: { id: string; clickHandler: (p: { name: string }) => void; categories: any[] }, category: { name: string }, idx: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chart.clickHandler({ name: category.name });
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusItem(chart.id, (idx + 1) % chart.categories.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusItem(chart.id, (idx - 1 + chart.categories.length) % chart.categories.length);
    }
  }

  private focusItem(chartId: string, idx: number) {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(`legend-item-${chartId}-${idx}`);
      el?.focus();
    }
  }

  onDonutClick(event: MouseEvent, chart: any) {
    if (chart.isBlinded) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    
    // Calculate angle in radians, then convert to degrees
    const angle = Math.atan2(y, x) * 180 / Math.PI;
    // Offset so 0 degrees is at the top (12 o'clock) moving clockwise
    const degrees = (angle + 90 + 360) % 360;
    const clickPercent = (degrees / 360) * 100;

    let cumulative = 0;
    for (const cat of chart.categories) {
      const nextCumulative = cumulative + cat.percentage;
      if (clickPercent >= cumulative && clickPercent <= nextCumulative) {
        chart.clickHandler({ name: cat.name });
        break;
      }
      cumulative = nextCumulative;
    }
  }

  readonly chartConfigs = computed(() => {
    const dataset = this.viewState.adamDataset();
    const filteredDataset = this.viewState.filteredAdamDataset();
    if (!dataset || !filteredDataset) return [];

    const isUnblinded = this.viewState.isUnblinded();
    const blindedColour = this.getCssColor('--text-muted', '#94a3b8');
    const palette = this.domainTheme.getArmColorHexPalette();

    const categoricalVars = dataset.variables.filter(v => v.type === 'categorical');
    const charts = [];

    for (let i = 0; i < categoricalVars.length; i++) {
      const v = categoricalVars[i];
      const isBlindedGroup = v.metadataTags.includes('Group') && !isUnblinded;

      // Calculate counts from filtered dataset
      const counts = new Map<string, number>();
      for (const row of filteredDataset.records) {
        const val = String(row[v.id]);
        counts.set(val, (counts.get(val) || 0) + 1);
      }

      const total = Array.from(counts.values()).reduce((sum, val) => sum + val, 0);

      const type: 'pie' | 'bar' = (i % 2 === 0 || v.metadataTags.includes('Group')) ? 'pie' : 'bar';
      const categories: { name: string, color: string, value: number, percentage: number }[] = [];
      let conicGradient = '';

      if (isBlindedGroup) {
        categories.push({ name: 'Blinded', color: blindedColour, value: 1, percentage: 100 });
        conicGradient = `${blindedColour} 0% 100%`;
      } else {
        const names = Array.from(counts.keys()).sort();
        let cumulativePercent = 0;
        const gradientStops: string[] = [];

        names.forEach((name, idx) => {
          const value = counts.get(name) || 0;
          const percentage = total > 0 ? (value / total) * 100 : 0;
          const color = palette[idx % palette.length];
          
          categories.push({ name, color, value, percentage });

          if (type === 'pie') {
            const nextCumulative = cumulativePercent + percentage;
            gradientStops.push(`${color} ${cumulativePercent}% ${nextCumulative}%`);
            cumulativePercent = nextCumulative;
          }
        });

        if (type === 'pie') {
          conicGradient = gradientStops.length > 0 ? `conic-gradient(${gradientStops.join(', ')})` : '';
        }
      }

      const clickHandler = (params: any) => {
        if (isBlindedGroup) return;
        const current = this.viewState.activeFilter();
        const clickedValue = String(params.name);
        if (current?.variableId === v.id && current.value === clickedValue) {
          this.viewState.clearFilter();
        } else {
          this.viewState.setFilter({ variableId: v.id, type: v.id, value: clickedValue });
        }
      };

      charts.push({
        id: v.id,
        label: v.label,
        isBlinded: isBlindedGroup,
        type,
        conicGradient,
        clickHandler,
        categories
      });
    }

    return charts;
  });
}

