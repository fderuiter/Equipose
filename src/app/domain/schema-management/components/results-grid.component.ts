/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, computed, effect, signal, inject, ChangeDetectionStrategy, DestroyRef, QueryList, ViewChildren } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { AppTooltipDirective } from '../../../core/directives/tooltip.directive';
import { RandomizationEngineFacade } from '../../randomization-engine/randomization-engine.facade';
import { SchemaViewStateService } from '../services/schema-view-state.service';
import { GeneratedSchema } from '../../core/models/randomization.model';
import { ViewportService } from '../../../core/services/viewport.service';
import { ToastService } from '../../../core/services/toast.service';
import { MethodologySpecificationService } from '../services/methodology-specification.service';
import { APP_VERSION } from '../../../../environments/version';
import { DateUtil } from '../../../core/utils/date.util';
import { ExportService } from '../services/export.service';
import { DomainThemeService } from '../../core/theme/domain-theme.service';

import { FocusManagerDirective } from '../../../core/directives/focus-manager.directive';
import { ToggleComponent } from '../../../core/components/ui/toggle.component';

export type SortDirection = 'asc' | 'desc' | 'none';

export interface SortState {
  column: string;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// Grouped-view row types
// ---------------------------------------------------------------------------

export interface BlockHeader {
  type: 'header';
  groupKey: string;
  blockNumber: number;
  site: string;
  stratum: Record<string, string>;
  stratumLabel: string;
}

export interface DataRow {
  type: 'data';
  data: GeneratedSchema;
}

export interface BlockSummary {
  type: 'summary';
  blockSize: number;
  totalSubjects: number;
  tallies: Record<string, number>;
  isIncomplete: boolean;
}

export type GridRow = BlockHeader | DataRow | BlockSummary;

// ---------------------------------------------------------------------------

/**
 * ⚡ Bolt Performance Optimization:
 * Added ChangeDetectionStrategy.OnPush to minimize unnecessary re-renders.
 */
@Component({
  selector: 'app-results-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KeyValuePipe, AppTooltipDirective, FocusManagerDirective, ToggleComponent],
  templateUrl: './results-grid.component.html'
})
export class ResultsGridComponent {
  public state = inject(RandomizationEngineFacade);
  public viewState = inject(SchemaViewStateService);
  public readonly viewport = inject(ViewportService);
  public readonly domainTheme = inject(DomainThemeService);
  private readonly toast = inject(ToastService);
  private readonly methodologySpec = inject(MethodologySpecificationService);
  private readonly exportService = inject(ExportService);
  private readonly destroyRef = inject(DestroyRef);
  /**
   * Tracks the row whose kebab menu is currently open so the shared menu
   * template can reference the correct data payload.
   */
  activeMenuRow = signal<GeneratedSchema | null>(null);
  menuPosition = signal({ x: 0, y: 0 });
  filterPosition = signal({ x: 0, y: 0 });

  /**
   * Expose the shared `isUnblinded` signal directly so existing template
   * bindings and unit-test assertions (component.isUnblinded()) still work.
   */
  get isUnblinded() { return this.viewState.isUnblinded; }

  /** Toggle between flat (virtual-scroll) view and grouped-by-block view. */
  viewMode = signal<'flat' | 'grouped'>('flat');

  // ── Multi-column sort / filter state ────────────────────────────────────

  /** Active sort column and direction. */
  sortState = signal<SortState>({ column: '', direction: 'none' });

  /** Map of column key → active filter string. */
  filterState = signal<Record<string, string>>({});

  /** Which column's filter dropdown is currently open. */
  activeFilterColumn = signal<string | null>(null);

  isRowMenuOpen = signal<boolean>(false);
  isFilterMenuOpen = signal<boolean>(false);

  /**
   * Reactive data pipeline for the flat view:
   * 1. Start from the cross-filtered schema (chart clicks / service-level filter).
   * 2. Apply any per-column text filters from `filterState`.
   * 3. Apply the active sort from `sortState`.
   */
  processedData = computed<GeneratedSchema[]>(() => {
    let data = this.viewState.filteredSchema();

    // Step 2 – column-level text filters
    const filters = this.filterState();
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const lowerValue = value.toLowerCase();
      data = data.filter(row => {
        if (key === 'site') return row.site.toLowerCase().includes(lowerValue);
        if (key === 'treatmentArm') return row.treatmentArm.toLowerCase().includes(lowerValue);
        if (key.startsWith('stratum_')) {
          const stratumId = key.replace('stratum_', '');
          return (row.stratum[stratumId] || '').toLowerCase().includes(lowerValue);
        }
        return true;
      });
    }

    // Step 3 – sorting
    const sort = this.sortState();
    if (sort.direction !== 'none' && sort.column) {
      data = [...data].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        if (sort.column === 'subjectId') { aVal = a.subjectId; bVal = b.subjectId; }
        else if (sort.column === 'site') { aVal = a.site; bVal = b.site; }
        else if (sort.column === 'blockNumber') { aVal = a.blockNumber; bVal = b.blockNumber; }
        else if (sort.column === 'treatmentArm') { aVal = a.treatmentArm; bVal = b.treatmentArm; }
        else if (sort.column.startsWith('stratum_')) {
          const stratumId = sort.column.replace('stratum_', '');
          aVal = a.stratum[stratumId] || '';
          bVal = b.stratum[stratumId] || '';
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }

    return data;
  });

  /** Number of visible table columns (used for colspan in grouped view). */
  columnCount = computed(() => {
    /** Fixed columns: Subject ID, Site, Block, Treatment Arm, Actions. */
    const BASE_COLUMNS = 5;
    const data = this.state.results();
    return BASE_COLUMNS + (data?.metadata.strata?.length || 0);
  });

  /**
   * Flattened, heterogeneous array of BlockHeader / DataRow / BlockSummary
   * objects used to power the grouped-by-block view.
   *
   * Groups are formed by the compound key (site | stratumCode | blockNumber)
   * so that Block 1 for "Site A" and Block 1 for "Site B" are kept distinct.
   */
  groupedRows = computed<GridRow[]>(() => {
    const schema = this.viewState.filteredSchema();
    const result = this.state.results();
    const strataInfo = result?.metadata.strata || [];
    const strataNameMap = new Map(strataInfo.map(s => [s.id, s.name || s.id]));

    const rows: GridRow[] = [];

    // Use a Map to group rows and preserve insertion order.
    const groups = new Map<string, {
      header: BlockHeader;
      dataRows: GeneratedSchema[];
      blockSize: number;
    }>();

    for (const row of schema) {
      const key = `${row.site}|${row.stratumCode}|${row.blockNumber}`;

      if (!groups.has(key)) {
        const stratumLabel = Object.entries(row.stratum)
          .map(([k, v]) => `${strataNameMap.get(k) || k}: ${v}`)
          .join(' | ');

        groups.set(key, {
          header: {
            type: 'header',
            groupKey: key,
            blockNumber: row.blockNumber,
            site: row.site,
            stratum: row.stratum,
            stratumLabel,
          },
          dataRows: [],
          blockSize: row.blockSize,
        });
      }

      groups.get(key)!.dataRows.push(row);
    }

    for (const [, group] of groups) {
      rows.push(group.header);

      for (const row of group.dataRows) {
        rows.push({ type: 'data', data: row });
      }

      const tallies: Record<string, number> = {};
      for (const row of group.dataRows) {
        tallies[row.treatmentArm] = (tallies[row.treatmentArm] || 0) + 1;
      }

      rows.push({
        type: 'summary',
        blockSize: group.blockSize,
        totalSubjects: group.dataRows.length,
        tallies,
        isIncomplete: group.dataRows.length !== group.blockSize,
      });
    }

    return rows;
  });

  constructor() {
    // Keep the SchemaViewStateService in sync whenever new results arrive.
    effect(() => {
      this.viewState.syncResults(this.state.results());
    });
  }

  toggleBlinding() {
    this.viewState.toggleBlinding();
  }

  /** Opens the kebab context menu for a specific data row. */
  openRowMenu(row: GeneratedSchema, event: MouseEvent): void {
    this.activeMenuRow.set(row);
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.menuPosition.set({
      x: rect.right - 160,
      y: rect.bottom + 4
    });
    const popover = document.getElementById('shared-row-menu') as any;
    if (popover && typeof popover.showPopover === 'function') {
      popover.showPopover();
    }
  }

  closeRowMenu(): void {
    const popover = document.getElementById('shared-row-menu') as any;
    if (popover && typeof popover.hidePopover === 'function') {
      popover.hidePopover();
    }
  }

  onRowMenuToggle(event: Event): void {
    const toggleEvent = event as any;
    if (toggleEvent.newState === 'closed') {
      this.isRowMenuOpen.set(false);
    } else if (toggleEvent.newState === 'open') {
      this.isRowMenuOpen.set(true);
    }
  }

  /** Placeholder: marks a subject as dropped from the trial. */
  markAsDropped(row: GeneratedSchema | null): void {
    if (!row) return;
    console.info('[ResultsGrid] Mark as Dropped – Subject:', row.subjectId);
    this.closeRowMenu();
  }

  /** Placeholder: displays stratum detail for a subject. */
  viewStratumDetails(row: GeneratedSchema | null): void {
    if (!row) return;
    console.info('[ResultsGrid] View Stratum Details – Subject:', row.subjectId, 'Stratum:', row.stratum);
    this.closeRowMenu();
  }

  /**
   * Formats treatment-arm tallies for the unblinded summary row.
   * e.g. { Active: 2, Placebo: 2 } → "2 Active, 2 Placebo"
   */
  getSummaryBalanceText(tallies: Record<string, number>): string {
    return Object.entries(tallies)
      .map(([arm, count]) => `${count} ${arm}`)
      .join(', ');
  }

  /**
   * Splits a Subject ID string by hyphens so the template can render
   * each alphanumeric chunk with primary visual weight and the separators
   * with a demoted (gray) weight.
   */
  splitSubjectId(id: string): string[] {
    return id ? id.split('-') : [];
  }

  // ── Virtual-scroll trackBy ───────────────────────────────────────────────

  trackBySubjectId(_index: number, row: GeneratedSchema): string {
    return row.subjectId;
  }

  // ── Sort / Filter helpers ────────────────────────────────────────────────

  /**
   * Cycles the sort direction for a column: none → asc → desc → none.
   * Switching to a different column always resets to 'asc'.
   */
  toggleSort(column: string): void {
    this.sortState.update(current => {
      if (current.column !== column) return { column, direction: 'asc' };
      if (current.direction === 'asc') return { column, direction: 'desc' };
      if (current.direction === 'desc') return { column: '', direction: 'none' };
      return { column, direction: 'asc' };
    });
  }

  /** Records which column's filter panel is currently active. */
  openColumnFilter(column: string, event: MouseEvent): void {
    this.activeFilterColumn.set(column);
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.filterPosition.set({
      x: rect.left,
      y: rect.bottom + 4
    });
    const popover = document.getElementById('shared-filter-menu') as any;
    if (popover && typeof popover.showPopover === 'function') {
      popover.showPopover();
    }
  }

  closeColumnFilter(): void {
    const popover = document.getElementById('shared-filter-menu') as any;
    if (popover && typeof popover.hidePopover === 'function') {
      popover.hidePopover();
    }
  }

  onFilterMenuToggle(event: Event): void {
    const toggleEvent = event as any;
    if (toggleEvent.newState === 'closed') {
      this.isFilterMenuOpen.set(false);
    } else if (toggleEvent.newState === 'open') {
      this.isFilterMenuOpen.set(true);
    }
  }

  /** Updates the filter value for `activeFilterColumn`. */
  updateColumnFilter(value: string): void {
    const column = this.activeFilterColumn();
    if (!column) return;
    this.filterState.update(state => ({ ...state, [column]: value }));
  }

  /** Removes the filter for the given column. */
  clearColumnFilter(column: string): void {
    this.filterState.update(state => {
      const next = { ...state };
      delete next[column];
      return next;
    });
    this.closeColumnFilter();
  }

  /** Clears all active column filters at once. */
  clearAllFilters(): void {
    this.filterState.set({});
  }

  /** Closes any currently-open CDK menus. */
  closeOpenMenus(): void {
    this.closeRowMenu();
    this.closeColumnFilter();
  }

  /** Middle-truncated display value for the audit hash banner (kept for test compatibility). */
  get truncatedAuditHash(): string {
    const hash = this.state.results()?.metadata?.auditHash ?? '';
    return hash.length > 24 ? `${hash.substring(0, 12)}...${hash.substring(hash.length - 12)}` : hash;
  }

  /** Returns true when the given column has a non-empty active filter. */
  hasActiveFilter(column: string): boolean {
    return !!(this.filterState()[column]);
  }

  /** Sanitizes a string for use in filenames by replacing invalid characters with underscores. */
  private sanitizeFilename(s: string): string {
    return s.replace(/[^A-Za-z0-9._-]/g, '_').trim();
  }

  /**
   * Sanitizes a value for CSV export to prevent Formula Injection (CSV Injection).
   * It escapes double quotes, wraps the value in double quotes, and prepends a single
   * quote if the value starts with an executable prefix.
   */
  private sanitizeCsvValue(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return '""';
    }
    const strValue = String(value);
    const escapedValue = strValue.replace(/"/g, '""');

    // Check for formula injection prefixes
    if (/^[=+\-@\t\r]/.test(escapedValue)) {
      return `"'${escapedValue}"`;
    }

    return `"${escapedValue}"`;
  }

  private isSimulationMode(protocolId: string): boolean {
    return protocolId === 'Simulation' || protocolId === 'Draft';
  }

  exportCsv() {
    const data = this.state.results();
    if (!data) return;

    if (this.isSimulationMode(data.metadata.protocolId)) {
      this.toast.showError('Exports are disabled in Simulation mode. Please promote to a formal study first.');
      return;
    }

    this.exportService.exportCsv(data, this.isUnblinded());
  }

  async exportXlsx(): Promise<void> {
    const data = this.state.results();
    if (!data) return;

    if (this.isSimulationMode(data.metadata.protocolId)) {
      this.toast.showError('Exports are disabled in Simulation mode. Please promote to a formal study first.');
      return;
    }

    try {
      await this.exportService.exportXlsx(data, this.isUnblinded());
    } catch {
      this.toast.showError('Failed to generate Excel file. Please try again.');
    }
  }

  exportJson() {
    const data = this.state.results();
    if (!data) return;

    if (this.isSimulationMode(data.metadata.protocolId)) {
      this.toast.showError('Exports are disabled in Simulation mode. Please promote to a formal study first.');
      return;
    }

    if (!this.isUnblinded()) {
      this.toast.showInfo(
        'JSON export is only available in unblinded mode. Please unblind the schema before exporting JSON.'
      );
      return;
    }

    const safeProtocol = this.sanitizeFilename(data.metadata.protocolId);
    const safeSeed = this.sanitizeFilename(data.metadata.seed);

    const exportPayload = {
      ...data,
      metadata: {
        ...data.metadata,
        methodologySpecification: this.methodologySpec.generateNarrative(data.metadata.config),
      }
    };

    const json = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `randomization_${safeProtocol}_${safeSeed}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  exportPdf() {
    const data = this.state.results();
    if (!data) return;

    if (this.isSimulationMode(data.metadata.protocolId)) {
      this.toast.showError('Exports are disabled in Simulation mode. Please promote to a formal study first.');
      return;
    }

    this.exportService.exportPdf(data, this.isUnblinded());
  }
}
