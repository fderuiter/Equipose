import { RandomizationConfig } from '../../core/models/randomization.model';

export class SubjectRegistry {
  private marginalCapMap = new Map<string, Map<string, number | undefined>>();
  private marginalCounts = new Map<string, Map<string, number>>();
  
  private capsDict: Record<string, number> = {};
  private intersectionCounts: Record<string, number> = {};

  public readonly isMarginal: boolean;

  constructor(private config: RandomizationConfig) {
    this.isMarginal = config.capStrategy === 'MARGINAL_ONLY';

    if (this.isMarginal) {
      for (const factor of config.strata) {
        const capMap = new Map<string, number | undefined>();
        const countMap = new Map<string, number>();
        const detailsMap = new Map<string, NonNullable<typeof factor.levelDetails>[number]>();
        if (factor.levelDetails) {
          for (const d of factor.levelDetails) {
            detailsMap.set(d.name, d);
          }
        }
        for (const level of factor.levels) {
          const details = detailsMap.get(level);
          capMap.set(level, details?.marginalCap);
          countMap.set(level, 0);
        }
        this.marginalCapMap.set(factor.id, capMap);
        this.marginalCounts.set(factor.id, countMap);
      }
    } else {
      (config.stratumCaps || []).forEach(c => {
        if (c.levelIds) {
          const key = Object.keys(c.levelIds).sort().map(k => `${k}:${c.levelIds[k]}`).join('|');
          this.capsDict[key] = c.cap;
        }
      });
    }
  }

  static computeStratumCode(strata: RandomizationConfig['strata'], stratum: Record<string, string>): string {
    return strata.map(s => (stratum[s.id] || '').substring(0, 3).toUpperCase()).join('-');
  }

  getStratumCode(stratum: Record<string, string>): string {
    return SubjectRegistry.computeStratumCode(this.config.strata, stratum);
  }

  static getIntersectionKey(stratum: Record<string, string>): string {
    return Object.keys(stratum).filter(k => k !== '_key').sort().map(k => `${k}:${stratum[k]}`).join('|');
  }

  canAddSubject(stratum: Record<string, string>): boolean {
    if (this.isMarginal) {
      for (const factor of this.config.strata) {
        const levelValue = stratum[factor.id] || '';
        if (!levelValue) continue;
        const cap = this.marginalCapMap.get(factor.id)?.get(levelValue);
        const currentCount = this.marginalCounts.get(factor.id)?.get(levelValue) ?? 0;
        if (cap !== undefined && currentCount >= cap) {
          return false;
        }
      }
      return true;
    } else {
      const key = SubjectRegistry.getIntersectionKey(stratum);
      const cap = this.capsDict[key] ?? 0;
      const currentCount = this.intersectionCounts[key] ?? 0;
      if (currentCount >= cap) {
        return false;
      }
      return true;
    }
  }

  registerSubject(stratum: Record<string, string>): void {
    if (this.isMarginal) {
      for (const factor of this.config.strata) {
        const levelValue = stratum[factor.id] || '';
        if (levelValue) {
          const countMap = this.marginalCounts.get(factor.id);
          if (countMap) {
            countMap.set(levelValue, (countMap.get(levelValue) ?? 0) + 1);
          }
        }
      }
    } else {
      const key = SubjectRegistry.getIntersectionKey(stratum);
      this.intersectionCounts[key] = (this.intersectionCounts[key] ?? 0) + 1;
    }
  }

  isMarginalExhausted(): boolean {
    if (!this.isMarginal) return false;
    return this.config.strata.some(factor => {
      return factor.levels.every(level => {
        const cap = this.marginalCapMap.get(factor.id)?.get(level);
        const count = this.marginalCounts.get(factor.id)?.get(level) ?? 0;
        return cap !== undefined && count >= cap;
      });
    });
  }

  getValidLevels(factorId: string): string[] {
    const factor = this.config.strata.find(f => f.id === factorId);
    if (!factor) return [];

    if (this.isMarginal) {
      return factor.levels.filter(level => {
        const cap = this.marginalCapMap.get(factorId)?.get(level);
        const count = this.marginalCounts.get(factorId)?.get(level) ?? 0;
        return cap === undefined || count < cap;
      });
    }

    return factor.levels;
  }

  getIntersectionCap(stratum: Record<string, string>): number | undefined {
    return this.capsDict[SubjectRegistry.getIntersectionKey(stratum)];
  }

  getIntersectionCount(stratum: Record<string, string>): number {
    return this.intersectionCounts[SubjectRegistry.getIntersectionKey(stratum)] ?? 0;
  }
}
