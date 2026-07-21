import { RandomizationConfig } from 'src/app/domain/core/models/randomization.model';
import { ReportingStrategy } from './reporting-strategy.interface';

export abstract class BaseReportingStrategy implements ReportingStrategy {
  abstract generateNarrative(config: RandomizationConfig): string;

  protected buildStratificationNarrative(config: RandomizationConfig): string {
    const strata = config.strata || [];
    if (strata.length === 0) {
      return (
        'Stratification Factors: None. The trial is treated as a single ' +
        'unstratified population; all subjects share one allocation pool.'
      );
    }
    const factorDescriptions = strata.map(s => {
      const name   = s.name || s.id;
      const levels = (s.levels || []).join(', ');
      return `${name} [${levels}]`;
    });
    return (
      `Stratification Factors (${strata.length}): ` +
      factorDescriptions.join('; ') +
      '. Randomization is performed independently within each unique combination ' +
      'of these stratification factor levels, ensuring balanced allocation across all strata.'
    );
  }

  protected buildCapStrategyNarrative(config: RandomizationConfig): string {
    const strategy = config.capStrategy ?? 'MANUAL_MATRIX';
    const strata   = config.strata || [];

    if (strategy === 'PROPORTIONAL') {
      const globalCapPart = config.globalCap !== undefined
        ? ` The global enrollment cap per site is set to ${config.globalCap} subjects.`
        : '';
      const pctLines = strata.map(s => {
        const detailByName = new Map((s.levelDetails ?? []).map(d => [d.name, d]));
        const parts = s.levels
          .map(lvl => {
            const pct = detailByName.get(lvl)?.targetPercentage;
            return pct !== undefined ? `${lvl} = ${pct}%` : null;
          })
          .filter(Boolean) as string[];
        return parts.length ? `${s.name || s.id}: ${parts.join(', ')}` : null;
      }).filter(Boolean) as string[];
      const pctPart = pctLines.length
        ? ` Target level proportions - ${pctLines.join('; ')}.`
        : '';
      return (
        'Enrollment Cap Strategy: PROPORTIONAL. Per-stratum enrollment caps are ' +
        'computed automatically using the Largest Remainder Method (LRM) from ' +
        'user-supplied target percentages per factor level. Intersection caps are ' +
        `derived from these proportions and are not specified manually.${globalCapPart}${pctPart}`
      );
    }

    if (strategy === 'MARGINAL_ONLY') {
      const marginalLines = strata.map(s => {
        const detailByName = new Map((s.levelDetails ?? []).map(d => [d.name, d]));
        const parts = s.levels
          .map(lvl => {
            const cap = detailByName.get(lvl)?.marginalCap;
            return cap !== undefined ? `${lvl} = ${cap}` : null;
          })
          .filter(Boolean) as string[];
        return parts.length ? `${s.name || s.id}: ${parts.join(', ')}` : null;
      }).filter(Boolean) as string[];
      const capPart = marginalLines.length
        ? ` Per-level marginal caps - ${marginalLines.join('; ')}.`
        : '';
      return (
        'Enrollment Cap Strategy: MARGINAL_ONLY. Enrollment is controlled using ' +
        'per-factor, per-level marginal caps rather than explicit intersection caps. ' +
        'As each level cap is reached, affected stratum combinations are removed ' +
        `from the active allocation pool, allowing the algorithm to terminate naturally.${capPart}`
      );
    }

    // MANUAL_MATRIX (default)
    const capCount = (config.stratumCaps || []).length;
    return (
      'Enrollment Cap Strategy: MANUAL_MATRIX. Enrollment caps are defined ' +
      `explicitly for each stratum combination (${capCount} intersection ` +
      `cap${capCount !== 1 ? 's' : ''} configured). Each cap specifies the ` +
      'maximum number of subjects to be enrolled within that exact combination ' +
      'of stratification factor levels.'
    );
  }

  protected buildReproducibilityNarrative(config: RandomizationConfig): string {
    return (
      `Reproducibility: The PRNG seed "${config.seed || ''}" is used to initialize ` +
      'the random number generator. Executing the provided analysis scripts with this ' +
      'identical seed value will reproduce this exact RTSM randomization plan.'
    );
  }
}
