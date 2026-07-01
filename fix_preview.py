import re

with open('src/app/domain/study-builder/components/block-preview.component.ts', 'r') as f:
    content = f.read()

# 1. Remove MatTooltipModule import
content = re.sub(r"import\s*\{\s*MatTooltipModule\s*\}\s*from\s*'@angular/material/tooltip';\n", "", content)

# 2. Remove MatTooltipModule from imports array
content = content.replace("imports: [MatTooltipModule],", "imports: [],")

# 3. Add tooltip popover div at the end of the template
template_end = """
      @if (previews().length === 0) {"""
content = content.replace(template_end, """
      <!-- Shared tooltip popover -->
      <div id="block-preview-tooltip" popover="manual" class="fixed m-0 z-50 bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none" [style.top.px]="tooltipY()" [style.left.px]="tooltipX()">
        {{ tooltipText() }}
      </div>
""" + template_end)

# 4. Replace matTooltip with mouse events
content = re.sub(
    r'\[matTooltip\]="slot\.tooltip"\s*matTooltipClass="app-tooltip"',
    r'(mouseenter)="showTooltip($event, slot.tooltip)" (mouseleave)="hideTooltip()"',
    content
)

# 5. Add tooltip properties and methods to the class
class_end = """
  /** Computed per-block-size preview data. */
  readonly previews = computed<BlockPreview[]>(() =>
    buildPreviews(this._arms(), this._blockSizes(), (idx) => this.domainTheme.getArmColor(idx))
  );
}"""

tooltip_methods = """
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
}"""

content = content.replace(class_end, tooltip_methods)

with open('src/app/domain/study-builder/components/block-preview.component.ts', 'w') as f:
    f.write(content)
