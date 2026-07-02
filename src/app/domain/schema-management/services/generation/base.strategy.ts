import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';
import { generateRandomizationSchema } from '../../../randomization-engine/core/randomization-algorithm';
import { DateUtil } from '../../../../core/utils/date.util';
import { CodeTranspiler } from './ir/transpiler';
import { APP_VERSION } from '../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../core/constants/precision.config';
import { FormattingUtil } from './formatting.util';
import { MANIFEST_TEMPLATE } from './ir/templates';

export interface CodeGenerationStrategy {
  readonly language: 'R' | 'SAS' | 'Python' | 'STATA';
  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string;
  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string;
}

export abstract class AbstractCodeGenerationStrategy implements CodeGenerationStrategy {
  abstract readonly language: 'R' | 'SAS' | 'Python' | 'STATA';

  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.transpile(config, 'BLOCK');
  }

  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.transpile(config, 'MINIMIZATION');
  }

  protected transpile(config: RandomizationConfig, method: 'BLOCK' | 'MINIMIZATION'): string {
    const isComplex = Boolean(method === 'MINIMIZATION' || 
                      config.capStrategy === 'MARGINAL_ONLY' || 
                      (config.globalBlockStrategy && config.globalBlockStrategy.selectionType !== 'RANDOM_POOL') ||
                      (config.globalBlockStrategy && config.globalBlockStrategy.limits && Object.keys(config.globalBlockStrategy.limits).length > 0) ||
                      (config.siteBlockOverrides && Object.keys(config.siteBlockOverrides).length > 0) || 
                      (config.stratumBlockOverrides && Object.keys(config.stratumBlockOverrides).length > 0));
    
    const result = generateRandomizationSchema(config);
    const schema = result.schema;
    const resolvedConfig = { ...config, seed: result.metadata.seed };
    const ir = CodeTranspiler.buildIR(resolvedConfig, method);

    const dateStr = DateUtil.getIsoTimestamp();
    const algorithm = method === 'MINIMIZATION' ? 'Pocock-Simon Minimization' : 'PRNG Algorithm: MT19937';

    const data: Record<string, string | number> = {
      protocolId: config.protocolId,
      appVersion: APP_VERSION,
      dateStr,
      algorithm,
      seedHash: ir.seedHash,
      precisionScale: PRECISION_SCALE,
      precisionEpsilon: PRECISION_EPSILON
    };

    this.customizeDataSetup(data, config, ir, method, schema);

    return this.generateLanguageScript(config, ir, method, isComplex, schema, data);
  }

  protected customizeDataSetup(
    data: Record<string, string | number>, 
    config: RandomizationConfig, 
    ir: any, 
    method: 'BLOCK' | 'MINIMIZATION', 
    schema: any[]
  ): void {
    const isSas = this.language === 'SAS';
    const isStata = this.language === 'STATA';
    const cStart = isSas ? '/*' : (isStata ? '*' : '#');
    const cEnd = isSas ? ' */' : '';

    let strataComments = '';
    (config.strata || []).forEach(s => {
        strataComments += `${cStart} Stratum: ${FormattingUtil.escapeString(s.id)}, Levels: ${s.levels.map(l => FormattingUtil.escapeString(l)).join(', ')}${cEnd}\n`;
    });

    const manifest = CodeTranspiler.renderTemplate(MANIFEST_TEMPLATE, {
        cStart,
        cEnd,
        protocolId: config.protocolId,
        appVersion: APP_VERSION,
        dateStr: String(data['dateStr']),
        algorithm: String(data['algorithm']),
        seedHash: String(data['seedHash']),
        arms: config.arms.map(a => FormattingUtil.escapeString(a.name)).join(', '),
        ratios: config.arms.map(a => a.ratio).join(', '),
        strataComments: strataComments.trimEnd()
    });

    data['manifest'] = manifest;
  }

  protected abstract generateLanguageScript(
    config: RandomizationConfig, 
    ir: any, 
    method: 'BLOCK' | 'MINIMIZATION', 
    isComplex: boolean, 
    schema: any[],
    data: Record<string, string | number>
  ): string;
}
