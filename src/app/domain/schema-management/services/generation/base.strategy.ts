import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';
import { generateRandomizationSchema, generateCryptoSeed } from '../../../randomization-engine/core/randomization-algorithm';
import { MT19937 } from '../../../randomization-engine/core/mt19937';
import { DateUtil } from '../../../../core/utils/date.util';
import { CodeTranspiler } from './ir/transpiler';
import { APP_VERSION } from '../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../core/constants/precision.config';
import { LogicIR, LogicIRTask, SubjectIdToken } from './ir/ir.model';
import { AlgorithmRegistry } from './framework/algorithm-registry';
import { LanguageConfig } from './framework/language-config';
import { CodeGenerationError, StrataParsingError, TemplateCompilationError } from '../../errors/code-generation-errors';

/**
 * Strategy interface for code generation.
 */
export interface CodeGenerationStrategy {
  readonly language: 'R' | 'SAS' | 'Python' | 'STATA';
  /**
   * Generates randomization code for BLOCK mode.
   */
  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode?: 'STATIC' | 'DYNAMIC'): string;
  /**
   * Generates randomization code for MINIMIZATION mode.
   */
  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode?: 'STATIC' | 'DYNAMIC'): string;
}

/**
 * Orchestrator coordinating single-source transpilation across target languages.
 */
export class BaseOrchestrator implements CodeGenerationStrategy {
  readonly language: 'R' | 'SAS' | 'Python' | 'STATA';
  private configObject: LanguageConfig;

  constructor(configObject: LanguageConfig) {
    this.language = configObject.language;
    this.configObject = configObject;
  }

  /**
   * Generates block randomization code in the target language.
   */
  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode: 'STATIC' | 'DYNAMIC' = 'STATIC'): string {
    return this.transpile(config, 'BLOCK', mode);
  }

  /**
   * Generates minimization randomization code in the target language.
   */
  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata'], mode: 'STATIC' | 'DYNAMIC' = 'STATIC'): string {
    return this.transpile(config, 'MINIMIZATION', mode);
  }

  /**
   * Performs the core transpilation process, bypassing full static schema generation in dynamic mode.
   */
  protected transpile(config: RandomizationConfig, method: 'BLOCK' | 'MINIMIZATION', mode: 'STATIC' | 'DYNAMIC' = 'STATIC'): string {
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

    const seed = config.seed || generateCryptoSeed();
    const resolvedConfig = { ...config, seed };
    
    let ir: LogicIR;
    try {
      ir = CodeTranspiler.buildIR(resolvedConfig, method);
    } catch (e) {
      throw new StrataParsingError(this.language, e, resolvedConfig);
    }

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

    let schema: any[] = [];
    if (mode === 'STATIC') {
      const result = generateRandomizationSchema(resolvedConfig);
      schema = result.schema;
    }

    if (this.configObject.customizeDataSetup) {
      this.configObject.customizeDataSetup(data, resolvedConfig, ir, method, schema);
    }

    let algorithmicLogic = '';
    if (mode === 'STATIC') {
      algorithmicLogic = CodeTranspiler.formatStaticSchema(this.language, resolvedConfig, schema);
    } else {
      if (method === 'MINIMIZATION') {
        algorithmicLogic = AlgorithmRegistry.buildDynamicMinimizationLogic(this.language, resolvedConfig, ir);
      } else {
        algorithmicLogic = AlgorithmRegistry.buildDynamicLogic(this.configObject, resolvedConfig, ir);
      }
    }
    
    data['algorithmicLogic'] = algorithmicLogic;
    try {
      return CodeTranspiler.renderTemplate(this.configObject.template, data);
    } catch (e) {
      throw new TemplateCompilationError(this.language, e, resolvedConfig);
    }
  }
}
