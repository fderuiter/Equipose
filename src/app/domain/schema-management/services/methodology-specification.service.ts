import { Injectable } from '@angular/core';
import { RandomizationConfig } from '../../core/models/randomization.model';
import { ReportingStrategy } from './reporting/reporting-strategy.interface';
import { BlockReportingStrategy } from './reporting/block-reporting.strategy';
import { MinimizationReportingStrategy } from './reporting/minimization-reporting.strategy';

/**
 * Generates a formal, human-readable "Randomization Plan & Specifications"
 * narrative from a {@link RandomizationConfig}.  The narrative is language-
 * agnostic; helper methods provide formatted versions suitable for embedding
 * in CSV comments, JSON metadata, PDF documents, and R/Python/SAS scripts.
 */
@Injectable({ providedIn: 'root' })
export class MethodologySpecificationService {

  // ---------------------------------------------------------------------------
  // Narrative generation
  // ---------------------------------------------------------------------------

  /**
   * Builds the full methodology narrative as a plain string with paragraphs
   * separated by a single blank line (`\n\n`).
   */
  generateNarrative(config: RandomizationConfig): string {
    let strategy: ReportingStrategy;

    if (config.randomizationMethod === 'MINIMIZATION') {
      strategy = new MinimizationReportingStrategy();
    } else {
      strategy = new BlockReportingStrategy();
    }

    return strategy.generateNarrative(config);
  }

  // ---------------------------------------------------------------------------
  // Format helpers
  // ---------------------------------------------------------------------------

  /**
   * Wraps the narrative in a labelled section and prefixes every line with
   * the given single-character line-comment marker (e.g. `#` for R/Python).
   * The result is ready to embed directly in an R or Python source file.
   */
  formatAsLineComments(narrative: string, prefix = '#'): string {
    const divider = `${prefix} ${'─'.repeat(65)}`;
    const header  = `${prefix} RANDOMIZATION PLAN & SPECIFICATIONS`;
    const lines   = narrative
      .split('\n')
      .map(line => (line.trim() === '' ? prefix : `${prefix} ${line}`));
    return [divider, header, divider, ...lines, divider].join('\n');
  }

  /**
   * Wraps the narrative in a slash-star block comment suitable for SAS.
   * Each line is wrapped individually to keep line lengths manageable.
   */
  formatAsSasComment(narrative: string): string {
    const divider = '/* ' + '─'.repeat(63) + ' */';
    const header  = '/* RANDOMIZATION PLAN & SPECIFICATIONS */';
    const lines   = narrative
      .split('\n')
      .map(line => (line.trim() === '' ? '/*' + ' */'.padStart(65) : `/* ${line} */`));
    return [divider, header, divider, ...lines, divider].join('\n');
  }

  /**
   * Prefixes every line (and paragraph) of the narrative with `# ` so it can
   * be embedded as commented-out rows at the top of a CSV file.
   * A labelled section header is prepended.
   */
  formatForCsv(narrative: string): string {
    const lines = [
      '# --- RANDOMIZATION PLAN & SPECIFICATIONS ---',
      ...narrative.split('\n').map(line => (line.trim() === '' ? '#' : `# ${line}`)),
      '# --------------------------------------------',
    ];
    return lines.join('\n');
  }
}

