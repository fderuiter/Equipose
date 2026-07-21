import { Injectable, computed, signal } from '@angular/core';

export interface ArmColorTokens {
  bgClass: string;
  textClass: string;
  hex: string;
}

export interface SemanticColorTokens {
  base: string;
  textClass: string;
  textLightClass: string;
  bgClass: string;
  bgLightClass: string;
  borderClass: string;
  hex: string;
}

export interface LayoutTokens {
  cardClasses: string;
  cardBase: string;
  cardPadding: string;
  borderRadius: string;
}

@Injectable({
  providedIn: 'root'
})
export class DomainThemeService {
  private readonly _armColors = signal<ArmColorTokens[]>([
    { bgClass: 'bg-indigo-500', textClass: 'text-indigo-500', hex: '#6366f1' },
    { bgClass: 'bg-emerald-500', textClass: 'text-emerald-500', hex: '#10b981' },
    { bgClass: 'bg-amber-500', textClass: 'text-amber-500', hex: '#f59e0b' },
    { bgClass: 'bg-rose-500', textClass: 'text-rose-500', hex: '#f43f5e' },
    { bgClass: 'bg-sky-500', textClass: 'text-sky-500', hex: '#0ea5e9' },
    { bgClass: 'bg-violet-500', textClass: 'text-violet-500', hex: '#8b5cf6' },
    { bgClass: 'bg-orange-500', textClass: 'text-orange-500', hex: '#f97316' },
    { bgClass: 'bg-teal-500', textClass: 'text-teal-500', hex: '#14b8a6' },
  ]);

  private readonly _semanticColors = signal<Record<string, SemanticColorTokens>>({
    success: { 
      base: 'emerald', textClass: 'text-emerald-700 dark:text-emerald-400', 
      textLightClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-500', 
      bgLightClass: 'bg-emerald-50 dark:bg-emerald-900/20',
      borderClass: 'border-emerald-200 dark:border-emerald-800',
      hex: '#10b981' 
    },
    warning: { 
      base: 'amber', textClass: 'text-amber-700 dark:text-amber-400', 
      textLightClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500', 
      bgLightClass: 'bg-amber-50 dark:bg-amber-900/20',
      borderClass: 'border-amber-200 dark:border-amber-800',
      hex: '#f59e0b' 
    },
    error: { 
      base: 'rose', textClass: 'text-rose-700 dark:text-rose-400', 
      textLightClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-500', 
      bgLightClass: 'bg-rose-50 dark:bg-rose-900/20',
      borderClass: 'border-rose-200 dark:border-rose-800',
      hex: '#f43f5e' 
    }
  });

  private readonly _layout = signal<LayoutTokens>({
    cardClasses: 'bg-surface rounded-xl shadow-sm border border-border-subtle p-6',
    cardBase: 'bg-surface shadow-sm border border-border-subtle',
    cardPadding: 'p-6',
    borderRadius: 'rounded-xl'
  });

  readonly layout = computed(() => this._layout());

  getArmColor(index: number): ArmColorTokens {
    const colors = this._armColors();
    return colors[index % colors.length];
  }
  
  getArmColorHexPalette(): string[] {
    return this._armColors().map(c => c.hex);
  }
  
  getSemanticColor(type: 'success' | 'warning' | 'error'): SemanticColorTokens {
    return this._semanticColors()[type];
  }
}
