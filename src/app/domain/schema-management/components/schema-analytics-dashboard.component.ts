import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { SchemaViewStateService } from '../services/schema-view-state.service';
import { DomainThemeService } from '../../core/theme/domain-theme.service';

@Component({
  selector: 'app-schema-analytics-dashboard',
  standalone: true,
  imports: [],
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
                <button
                  (click)="viewState.clearFilter()"
                  class="ml-1 hover:text-indigo-600 dark:hover:text-indigo-200 leading-none rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Remove filter"
                  appTooltip="Remove filter"
                >✕</button>
              </span>
              <button
                (click)="viewState.clearFilter()"
                class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >Clear all filters</button>
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
                @if (chart.type === 'pie') {
                  <div 
                    class="relative w-48 h-48 rounded-full" 
                    [style.background]="chart.conicStyle"
                    [attr.aria-label]="'Donut chart for ' + chart.label"
                    role="graphics-document"
                  >
                    <!-- Inner circle for donut effect -->
                    <div class="absolute inset-0 m-auto w-3/4 h-3/4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                      @if (chart.isBlinded) {
                        <span class="text-sm font-bold text-muted">Blinded</span>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="w-full h-full flex flex-col justify-center gap-3 overflow-y-auto pr-2"
                       [attr.aria-label]="'Bar chart for ' + chart.label" role="graphics-document">
                    @for (item of chart.data; track item.name) {
                      <div class="flex flex-col gap-1 w-full cursor-pointer group"
                           role="button"
                           tabindex="0"
                           [attr.aria-label]="'Filter by ' + item.name"
                           (click)="chart.clickHandler({ name: item.name })"
                           (keydown)="handleKeydown($event, chart, item, 0)">
                        <div class="flex justify-between text-xs text-main group-hover:text-indigo-600 transition-colors">
                          <span>{{ item.name }}</span>
                          <span class="text-muted">{{ item.value }} ({{ item.percentageLabel }})</span>
                        </div>
                        <div class="w-full bg-gray-100 dark:bg-slate-800 h-4 rounded-sm overflow-hidden">
                          <div class="h-full transition-all duration-300" 
                               [style.width.%]="item.percentage" 
                               [style.background-color]="item.color"></div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Accessible Filter Legend -->
              @if (!chart.isBlinded && chart.data && chart.data.length > 0) {
                <ul
                  class="flex flex-wrap gap-2 mt-4"
                  role="listbox"
                  [attr.aria-label]="'Filter by ' + chart.label"
                >
                  @for (category of chart.data; track category.name; let idx = $index) {
                    <li
                      role="option"
                      [attr.aria-selected]="viewState.activeFilter()?.variableId === chart.id && viewState.activeFilter()?.value === category.name"
                      [tabindex]="getTabIndex(chart.id, category.name, idx)"
                      [id]="'legend-item-' + chart.id + '-' + idx"
                      (click)="chart.clickHandler({ name: category.name })"
                      (keydown)="handleKeydown($event, chart, category, idx)"
                      class="flex items-center gap-1.5 px-2 py-1 text-sm rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
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
  protected readonly domainTheme = inject(DomainThemeService);

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

  handleKeydown(event: KeyboardEvent, chart: { id: string; clickHandler: (p: { name: string }) => void; data: any[] }, category: { name: string }, idx: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chart.clickHandler({ name: category.name });
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusItem(chart.id, (idx + 1) % chart.data.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusItem(chart.id, (idx - 1 + chart.data.length) % chart.data.length);
    }
  }

  private focusItem(chartId: string, idx: number) {
    if (typeof document !== 'undefined') {
      const el = document.getElementById(`legend-item-${chartId}-${idx}`);
      el?.focus();
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
    const charts: any[] = [];

    for (let i = 0; i < categoricalVars.length; i++) {
      const v = categoricalVars[i];
      const isBlindedGroup = v.metadataTags.includes('Group') && !isUnblinded;

      // Calculate counts from filtered dataset
      const counts = new Map<string, number>();
      for (const row of filteredDataset.records) {
        const val = String(row[v.id]);
        counts.set(val, (counts.get(val) || 0) + 1);
      }

      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
      const names = Array.from(counts.keys()).sort();
      const type = (i % 2 === 0 || v.metadataTags.includes('Group')) ? 'pie' : 'bar';

      let data: any[] = [];
      let conicStyle = '';

      if (isBlindedGroup) {
        conicStyle = `conic-gradient(${blindedColour} 0% 100%)`;
      } else {
        let currentPercent = 0;
        data = names.map((name, idx) => {
          const value = counts.get(name) || 0;
          const color = palette[idx % palette.length];
          const percentage = total > 0 ? (value / total) * 100 : 0;
          const percentageLabel = percentage.toFixed(1) + '%';
          return { name, value, color, percentage, percentageLabel };
        });

        if (type === 'pie') {
          const slices = data.map(item => {
            const start = currentPercent;
            const end = currentPercent + item.percentage;
            currentPercent = end;
            return `${item.color} ${start}% ${end}%`;
          });
          if (slices.length > 0) {
            conicStyle = `conic-gradient(${slices.join(', ')})`;
          } else {
            conicStyle = 'conic-gradient(transparent 0% 100%)';
          }
        }
      }

      const clickHandler = (params: { name: string }) => {
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
        type,
        isBlinded: isBlindedGroup,
        conicStyle,
        data,
        clickHandler
      });
    }

    return charts;
  });
}

