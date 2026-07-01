import re

with open('src/app/domain/schema-management/components/results-grid.component.ts', 'r') as f:
    content = f.read()

# Remove CdkMenuModule, CdkMenuTrigger, ScrollDispatcher, ScrollingModule
content = re.sub(r"import\s*\{\s*CdkMenuModule,\s*CdkMenuTrigger\s*\}\s*from\s*'@angular/cdk/menu';\n", "", content)
content = re.sub(r"import\s*\{\s*ScrollDispatcher,\s*ScrollingModule\s*\}\s*from\s*'@angular/cdk/scrolling';\n", "", content)
content = content.replace("imports: [CdkMenuModule, ScrollingModule, KeyValuePipe],", "imports: [KeyValuePipe],")
content = re.sub(r"\s*private readonly scrollDispatcher = inject\(ScrollDispatcher\);\n", "", content)
content = re.sub(r"\s*@ViewChildren\(CdkMenuTrigger\) private menuTriggers\?: QueryList<CdkMenuTrigger>;\n", "", content)

# Add native popover position properties
content = content.replace(
    "activeMenuRow = signal<GeneratedSchema | null>(null);",
    """activeMenuRow = signal<GeneratedSchema | null>(null);
  menuPosition = signal({ x: 0, y: 0 });
  filterPosition = signal({ x: 0, y: 0 });"""
)

# Remove scrollDispatcher subscription
content = re.sub(
    r"\s*this\.scrollDispatcher\n\s*\.scrolled\(\)\n\s*\.pipe\(takeUntilDestroyed\(this\.destroyRef\)\)\n\s*\.subscribe\(\(\) => this\.closeOpenMenus\(\)\);",
    "",
    content
)

# Update openRowMenu
content = re.sub(
    r"openRowMenu\(row: GeneratedSchema\): void \{\n\s*this\.activeMenuRow\.set\(row\);\n\s*\}",
    """openRowMenu(row: GeneratedSchema, event: MouseEvent): void {
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
  }""",
    content
)

# Call closeRowMenu in actions
content = content.replace(
    "console.info('[ResultsGrid] Mark as Dropped – Subject:', row.subjectId);",
    "console.info('[ResultsGrid] Mark as Dropped – Subject:', row.subjectId);\n    this.closeRowMenu();"
)
content = content.replace(
    "console.info('[ResultsGrid] View Stratum Details – Subject:', row.subjectId, 'Stratum:', row.stratum);",
    "console.info('[ResultsGrid] View Stratum Details – Subject:', row.subjectId, 'Stratum:', row.stratum);\n    this.closeRowMenu();"
)

# Update openColumnFilter
content = re.sub(
    r"openColumnFilter\(column: string\): void \{\n\s*this\.activeFilterColumn\.set\(column\);\n\s*\}",
    """openColumnFilter(column: string, event: MouseEvent): void {
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
  }""",
    content
)

# Call closeColumnFilter in clearColumnFilter
content = re.sub(
    r"clearColumnFilter\(column: string\): void \{([\s\S]*?)return next;\n\s*\}\);\n\s*\}",
    r"clearColumnFilter(column: string): void {\1return next;\n    });\n    this.closeColumnFilter();\n  }",
    content
)

# Update closeOpenMenus
content = re.sub(
    r"closeOpenMenus\(\): void \{\n\s*this\.menuTriggers\?\.forEach\(trigger => trigger\.close\(\)\);\n\s*\}",
    """closeOpenMenus(): void {
    this.closeRowMenu();
    this.closeColumnFilter();
  }""",
    content
)

# Add css styles
content = content.replace(
    "styles: [`\n    .dot { transition: transform 0.2s ease-in-out; }\n  `]",
    """styles: [`
    .dot { transition: transform 0.2s ease-in-out; }
    [popover] { margin: 0; border: none; padding: 0; background: transparent; overflow: visible; }
    [popover]:popover-open { display: block; }
  `]"""
)

with open('src/app/domain/schema-management/components/results-grid.component.ts', 'w') as f:
    f.write(content)
