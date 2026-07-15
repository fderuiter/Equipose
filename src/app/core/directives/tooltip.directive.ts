import { Directive, ElementRef, HostListener, Input, OnDestroy, inject, Renderer2, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class AppTooltipDirective implements OnInit, OnDestroy, OnChanges {
  @Input('appTooltip') tooltipText = '';
  
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  
  private static tooltipElement: HTMLElement | null = null;
  private isVisible = false;

  ngOnInit() {
    // Add tabindex="0" if not natively focusable and no tabindex is set
    const nativeEl = this.el.nativeElement;
    const tagName = nativeEl.tagName.toLowerCase();
    if (!['button', 'input', 'select', 'textarea', 'a'].includes(tagName) && !nativeEl.hasAttribute('tabindex')) {
      this.renderer.setAttribute(nativeEl, 'tabindex', '0');
    }
    this.updateAriaLabel();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tooltipText']) {
      this.updateAriaLabel();
      if (this.isVisible) {
        this.updateTooltipContent();
      }
    }
  }

  private updateAriaLabel() {
    if (this.tooltipText) {
      this.renderer.setAttribute(this.el.nativeElement, 'aria-label', this.tooltipText);
    } else {
      this.renderer.removeAttribute(this.el.nativeElement, 'aria-label');
    }
  }

  private updateTooltipContent() {
    if (AppTooltipDirective.tooltipElement) {
      AppTooltipDirective.tooltipElement.textContent = this.tooltipText;
      this.updatePosition();
    }
  }

  @HostListener('mouseenter')
  @HostListener('focusin')
  show() {
    if (!this.tooltipText) return;
    this.isVisible = true;
    this.createTooltip();
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  hide() {
    this.isVisible = false;
    this.removeTooltip();
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.isVisible) {
      this.hide();
    }
  }

  private createTooltip() {
    if (!AppTooltipDirective.tooltipElement) {
      AppTooltipDirective.tooltipElement = this.renderer.createElement('div');
      const tooltip = AppTooltipDirective.tooltipElement!;
      this.renderer.addClass(tooltip, 'app-tooltip');
      this.renderer.addClass(tooltip, 'fixed');
      this.renderer.addClass(tooltip, 'z-[9999]');
      this.renderer.addClass(tooltip, 'pointer-events-none');
      // ARIA role for tooltip
      this.renderer.setAttribute(tooltip, 'role', 'tooltip');
      this.renderer.appendChild(document.body, tooltip);
    }
    this.updateTooltipContent();
  }

  private updatePosition() {
    if (!AppTooltipDirective.tooltipElement || !this.isVisible) return;
    
    const tooltip = AppTooltipDirective.tooltipElement;
    const hostRect = this.el.nativeElement.getBoundingClientRect();
    
    // Temporarily reset positioning to get natural size
    this.renderer.setStyle(tooltip, 'top', '0px');
    this.renderer.setStyle(tooltip, 'left', '0px');
    
    const tooltipRect = tooltip.getBoundingClientRect();
    const spacing = 8;
    
    // Default to bottom
    let top = hostRect.bottom + spacing;
    let left = hostRect.left + (hostRect.width / 2) - (tooltipRect.width / 2);
    
    // Prevent clipping on right
    if (left + tooltipRect.width > window.innerWidth - spacing) {
      left = window.innerWidth - tooltipRect.width - spacing;
    }
    
    // Prevent clipping on left
    if (left < spacing) {
      left = spacing;
    }
    
    // Prevent clipping on bottom, flip to top if needed
    if (top + tooltipRect.height > window.innerHeight - spacing) {
      top = hostRect.top - tooltipRect.height - spacing;
    }
    
    this.renderer.setStyle(tooltip, 'top', `${top}px`);
    this.renderer.setStyle(tooltip, 'left', `${left}px`);
  }

  private removeTooltip() {
    if (AppTooltipDirective.tooltipElement) {
      this.renderer.removeChild(document.body, AppTooltipDirective.tooltipElement);
      AppTooltipDirective.tooltipElement = null;
    }
  }

  ngOnDestroy() {
    this.hide();
  }
}
