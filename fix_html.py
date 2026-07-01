import re

with open('src/app/domain/schema-management/components/results-grid.component.html', 'r') as f:
    content = f.read()

# 1. Remove virtual scroll
content = content.replace(
    '<cdk-virtual-scroll-viewport itemSize="48" class="h-[600px] w-full overflow-auto" (scroll)="closeOpenMenus()">',
    '<div class="h-[600px] w-full overflow-auto" (scroll)="closeOpenMenus()">'
)
content = content.replace('</cdk-virtual-scroll-viewport>', '</div>')

# 2. Fix *cdkVirtualFor to @for for the flat view ONLY
# The flat view tr is right after <tbody class="bg-surface divide-y divide-gray-200 dark:divide-slate-700">
# The first occurrence is flat view, second is grouped view.
# We can just target the exact string: *cdkVirtualFor="let row of processedData(); trackBy: trackBySubjectId"
content = re.sub(
    r'\*cdkVirtualFor="let row of processedData\(\); trackBy: trackBySubjectId"',
    '',
    content
)

# We need to wrap the flat view tr. Let's find:
#              <!-- Virtual rows: only visible rows are in the DOM -->
#              <tbody class="bg-surface divide-y divide-gray-200 dark:divide-slate-700">
#                <tr
idx_tbody = content.find('<!-- Virtual rows: only visible rows are in the DOM -->\n              <tbody class="bg-surface divide-y divide-gray-200 dark:divide-slate-700">')
idx_tr = content.find('<tr', idx_tbody)

# Insert @for before <tr
content = content[:idx_tr] + '@for (row of processedData(); track trackBySubjectId($index, row)) {\n                ' + content[idx_tr:]

# We need to close it before </tbody>
# The next </tbody> after idx_tr is the end of the flat view.
idx_tbody_end = content.find('</tbody>', idx_tr)
content = content[:idx_tbody_end] + '  }\n              ' + content[idx_tbody_end:]

# 3. Remove cdkMenu triggers
content = content.replace('[cdkMenuTriggerFor]="rowMenu"', 'popovertarget="shared-row-menu"')
content = content.replace('[cdkMenuTriggerFor]="columnFilterMenu"', 'popovertarget="shared-filter-menu"')

# Add $event to openRowMenu
content = content.replace('(click)="openRowMenu(row)"', '(click)="openRowMenu(row, $event)"')
content = content.replace('(click)="openRowMenu($any(item).data)"', '(click)="openRowMenu($any(item).data, $event)"')

# Add $event to openColumnFilter
content = content.replace("(click)=\"openColumnFilter('site')\"", "(click)=\"openColumnFilter('site', $event)\"")
content = re.sub(r"\(click\)=\"openColumnFilter\('stratum_' \+ stratum\.id\)\"", r"(click)=\"openColumnFilter('stratum_' + stratum.id, $event)\"", content)
content = content.replace("(click)=\"openColumnFilter('treatmentArm')\"", "(click)=\"openColumnFilter('treatmentArm', $event)\"")

# 4. Remove ng-template and replace with native popovers
# Find the start of <!-- ── Shared CDK context menu: row-level kebab actions ──────────────────── -->
# and replace everything to the end
idx = content.find('<!-- ── Shared CDK context menu: row-level kebab actions ──────────────────── -->')
if idx != -1:
    content = content[:idx] + """
<!-- ── Shared native context menu: row-level kebab actions ──────────────────── -->
<div
  id="shared-row-menu"
  popover="auto"
  [style.top.px]="menuPosition().y"
  [style.left.px]="menuPosition().x"
  class="fixed m-0 min-w-40 rounded-xl bg-surface shadow-lg ring-1 ring-black/5 dark:ring-white/10 border border-border-subtle py-1 backdrop-blur-sm z-50"
>
  <div role="menu">
    <button
      type="button"
      role="menuitem"
      class="w-full flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 focus:bg-gray-50 dark:focus:bg-slate-700 focus:outline-none transition-colors"
      (click)="viewStratumDetails(activeMenuRow())"
    >
      <svg class="h-4 w-4 text-gray-400 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
        <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
      </svg>
      View Stratum Details
    </button>

    <button
      type="button"
      role="menuitem"
      class="w-full flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 focus:bg-rose-50 dark:focus:bg-rose-900/20 focus:outline-none transition-colors"
      (click)="markAsDropped(activeMenuRow())"
    >
      <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
      </svg>
      Mark as Dropped
    </button>
  </div>
</div>

<!-- ── Shared native column-filter menu ─────────────────────────────────────── -->
<div id="shared-filter-menu"
     popover="auto"
     [style.top.px]="filterPosition().y"
     [style.left.px]="filterPosition().x"
     class="fixed m-0 min-w-52 rounded-xl bg-surface shadow-lg ring-1 ring-black/5 dark:ring-white/10 border border-border-subtle p-3 backdrop-blur-sm z-50">
  <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
    Filter: {{activeFilterColumn()}}
  </p>
  <input
    type="text"
    data-testid="column-filter-input"
    [value]="filterState()[activeFilterColumn() || ''] || ''"
    (input)="updateColumnFilter($any($event.target).value)"
    placeholder="Search…"
    class="w-full text-sm border border-border-strong rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-main placeholder-disabled focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
  />
  @if (hasActiveFilter(activeFilterColumn() || '')) {
    <button
      type="button"
      (click)="clearColumnFilter(activeFilterColumn() || '')"
      class="mt-2 w-full text-xs text-rose-600 dark:text-rose-400 hover:underline text-left px-1">
      Clear filter
    </button>
  }
</div>
"""

with open('src/app/domain/schema-management/components/results-grid.component.html', 'w') as f:
    f.write(content)
