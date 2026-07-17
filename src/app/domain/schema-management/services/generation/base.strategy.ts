import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';
import { generateRandomizationSchema } from '../../../randomization-engine/core/randomization-algorithm';
import { MT19937 } from '../../../randomization-engine/core/mt19937';
import { DateUtil } from '../../../../core/utils/date.util';
import { CodeTranspiler } from './ir/transpiler';
import { APP_VERSION } from '../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../core/constants/precision.config';
import { LogicIR, LogicIRTask, SubjectIdToken } from './ir/ir.model';
import { AlgorithmRegistry } from './framework/algorithm-registry';
import { LanguageConfig } from './framework/language-config';
import { CodeGenerationError } from '../../errors/code-generation-errors';

export interface CodeGenerationStrategy {
  readonly language: 'R' | 'SAS' | 'Python' | 'STATA';
  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode?: 'STATIC' | 'DYNAMIC'): string;
  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode?: 'STATIC' | 'DYNAMIC'): string;
}

export class BaseOrchestrator implements CodeGenerationStrategy {
  readonly language: 'R' | 'SAS' | 'Python' | 'STATA';
  private configObject: LanguageConfig;

  constructor(configObject: LanguageConfig) {
    this.language = configObject.language;
    this.configObject = configObject;
  }

  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode: 'STATIC' | 'DYNAMIC' = 'STATIC'): string {
    return this.transpile(config, 'BLOCK', mode);
  }

  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode: 'STATIC' | 'DYNAMIC' = 'STATIC'): string {
    return this.transpile(config, 'MINIMIZATION', mode);
  }

  protected transpile(config: RandomizationConfig, method: 'BLOCK' | 'MINIMIZATION', mode: 'STATIC' | 'DYNAMIC' = 'STATIC'): string {
    if (mode === 'DYNAMIC' && method === 'MINIMIZATION') {
      throw new CodeGenerationError("Dynamic simulation engine is not supported for Pocock-Simon Minimization. Please use Static Manifest mode.", config);
    }
    if (mode === 'DYNAMIC') {
      if (config.capStrategy === 'MARGINAL_ONLY') {
        throw new CodeGenerationError("Dynamic simulation engine is not supported for MARGINAL_ONLY cap strategy. Please use Static Manifest mode.", config);
      }
      if (config.globalBlockStrategy && config.globalBlockStrategy.selectionType !== 'RANDOM_POOL') {
        throw new CodeGenerationError("Dynamic simulation engine is not supported for non-RANDOM_POOL block selection. Please use Static Manifest mode.", config);
      }
      if (config.globalBlockStrategy && config.globalBlockStrategy.limits && Object.keys(config.globalBlockStrategy.limits).length > 0) {
        throw new CodeGenerationError("Dynamic simulation engine is not supported for block size usage limits. Please use Static Manifest mode.", config);
      }
      if ((config.siteBlockOverrides && Object.keys(config.siteBlockOverrides).length > 0) ||
          (config.stratumBlockOverrides && Object.keys(config.stratumBlockOverrides).length > 0)) {
        throw new CodeGenerationError("Dynamic simulation engine is not supported for site or stratum block size overrides. Please use Static Manifest mode.", config);
      }
    }

    const result = generateRandomizationSchema(config);
    const schema = result.schema;
    const resolvedConfig = { ...config, seed: result.metadata.seed };
    const ir = CodeTranspiler.buildIR(resolvedConfig, method);

    const prng = new MT19937(ir.seedHash);
    const valVec = [];
    for (let i = 0; i < 100; i++) {
        valVec.push(prng.random_int());
    }

    const dateStr = DateUtil.getIsoTimestamp();
    const algorithm = method === 'MINIMIZATION' ? 'Pocock-Simon Minimization' : 'PRNG Algorithm: MT19937';

    const data: Record<string, string | number> = {
      protocolId: config.protocolId,
      appVersion: APP_VERSION,
      dateStr,
      algorithm,
      seedHash: ir.seedHash,
      validationVector: valVec.join(', '),
      validationVectorSpace: valVec.join(' '),
      precisionScale: PRECISION_SCALE,
      precisionEpsilon: PRECISION_EPSILON
    };

    if (this.configObject.customizeDataSetup) {
      this.configObject.customizeDataSetup(data, config, ir, method, schema);
    }

    let algorithmicLogic = '';
    if (mode === 'STATIC') {
      algorithmicLogic = CodeTranspiler.formatStaticSchema(this.language, config, schema);
    } else {
      algorithmicLogic = AlgorithmRegistry.buildDynamicLogic(this.configObject, config, ir);
    }
    
    data['algorithmicLogic'] = algorithmicLogic;
    return CodeTranspiler.renderTemplate(this.configObject.template, data);
  }
}
