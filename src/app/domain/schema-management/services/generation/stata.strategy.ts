import { Injectable } from '@angular/core';
import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';
import { CodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { STATA_TEMPLATE } from './ir/templates';
import { generateRandomizationSchema } from '../../../randomization-engine/core/randomization-algorithm';
import { APP_VERSION } from '../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../core/constants/precision.config';

@Injectable()
export class StataStrategy implements CodeGenerationStrategy {
  readonly language = 'STATA';

  constructor() {}

  generate(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.transpile(config, 'BLOCK');
  }

  generateMinimization(config: RandomizationConfig, metadata?: RandomizationResult['metadata']): string {
    return this.transpile(config, 'MINIMIZATION');
  }

  private transpile(config: RandomizationConfig, method: 'BLOCK' | 'MINIMIZATION'): string {
    const isComplex = method === 'MINIMIZATION' || 
                      config.capStrategy === 'MARGINAL_ONLY' || 
                      (config.globalBlockStrategy && config.globalBlockStrategy.selectionType !== 'RANDOM_POOL') ||
                      (config.globalBlockStrategy && config.globalBlockStrategy.limits && Object.keys(config.globalBlockStrategy.limits).length > 0) ||
                      (config.siteBlockOverrides && Object.keys(config.siteBlockOverrides).length > 0) || 
                      (config.stratumBlockOverrides && Object.keys(config.stratumBlockOverrides).length > 0);
    
    const result = generateRandomizationSchema(config);
    const schema = result.schema;
    const resolvedConfig = { ...config, seed: result.metadata.seed };
    const ir = CodeTranspiler.buildIR(resolvedConfig, method);

    const dateStr = new Date().toISOString();
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

    let armsVars = '';
    config.arms.forEach((a, i) => {
      armsVars += `local arm_name_${i + 1} ${FormattingUtil.stataLabelQuote(a.name)}\n`;
    });
    data['armsVars'] = armsVars.trim();

    let strataComments = '';
    (config.strata || []).forEach((s, i) => {
        strataComments += `local strata_${i+1} ${FormattingUtil.stataLabelQuote(FormattingUtil.sanitizeStataVarName(s.id))}\n`;
        s.levels.forEach(l => {
            strataComments += `* Level: ${FormattingUtil.stataLabelQuote(l)}\n`;
        });
    });
    data['strataComments'] = strataComments.trim();
    data['ratios'] = config.arms.map(a => a.ratio).join(', ');

    data['minimizationParam'] = method === 'MINIMIZATION' ? `local p_minimization = round(${config.minimizationConfig?.p || 0.8}, ${PRECISION_EPSILON}) // Stata ${PRECISION_EPSILON} precision handled` : '';
    
    let blockSizesParam = '';
    if (method === 'BLOCK') {
        config.blockSizes.forEach((b, i) => blockSizesParam += `local block_${i+1} ${b}\n`);
        blockSizesParam += `local cap = 0`;
    }
    data['blockSizesParam'] = blockSizesParam.trim();

    data['schemaLength'] = schema.length || 1;

    let strataLength = '';
    (config.strata || []).forEach(s => strataLength += `gen str50 ${FormattingUtil.sanitizeStataVarName(s.id)} = ""\n`);
    data['strataLength'] = strataLength.trimEnd();

    let algorithmicLogic = '';

    if (isComplex) {
      algorithmicLogic = CodeTranspiler.formatStaticSchema(this.language, config, schema);
    } else {
      algorithmicLogic += `block_sizes = (${ir.blockSizes.join(',')})\n`;
      algorithmicLogic += `total_ratio = ${ir.totalRatio}\n`;
      algorithmicLogic += `arms = (${ir.arms.map(a => `"${FormattingUtil.escapeSasString(a.name)}"`).join(',')})\n`;
      algorithmicLogic += `arm_ratios = (${ir.arms.map(a => a.ratio).join(',')})\n\n`;

      algorithmicLogic += `string rowvector build_block(real scalar size) {\n`;
      algorithmicLogic += `    string rowvector block\n`;
      algorithmicLogic += `    real scalar multiplier, i, j, arm_idx, k\n`;
      algorithmicLogic += `    string scalar temp\n`;
      algorithmicLogic += `    block = J(1, 0, "")\n`;
      algorithmicLogic += `    multiplier = size / total_ratio\n`;
      algorithmicLogic += `    for (arm_idx=1; arm_idx<=cols(arms); arm_idx++) {\n`;
      algorithmicLogic += `        for (k=1; k<=arm_ratios[arm_idx] * multiplier; k++) {\n`;
      algorithmicLogic += `            block = block, arms[arm_idx]\n`;
      algorithmicLogic += `        }\n`;
      algorithmicLogic += `    }\n`;
      algorithmicLogic += `    for (i=cols(block); i>=2; i--) {\n`;
      algorithmicLogic += `        j = mod(random_int(), i) + 1\n`;
      algorithmicLogic += `        temp = block[i]; block[i] = block[j]; block[j] = temp\n`;
      algorithmicLogic += `    }\n`;
      algorithmicLogic += `    return(block)\n`;
      algorithmicLogic += `}\n\n`;

      algorithmicLogic += `schema_out = J(0, ${6 + (config.strata?.length || 0)}, "")\n`;
      algorithmicLogic += `seq_count = 0\n`;

      algorithmicLogic += IrIterationHelper.generateForTasksAndStrata(
        config,
        ir.tasks,
        (stratumId, stratumValue) => `, "${FormattingUtil.escapeSasString(stratumValue)}"`,
        (task, formattedStrata) => {
          let taskLogic = `count = 0\n`;
          taskLogic += `block_num = 1\n`;
          taskLogic += `while (count < ${task.cap}) {\n`;
          taskLogic += `    size = block_sizes[mod(random_int(), cols(block_sizes)) + 1]\n`;
          taskLogic += `    block = build_block(size)\n`;
          taskLogic += `    for (i=1; i<=cols(block); i++) {\n`;
          taskLogic += `        seq_count = seq_count + 1\n`;
          taskLogic += `        subj_id = "${FormattingUtil.escapeSasString(task.site)}-${FormattingUtil.escapeSasString(task.stratumCode)}-" + strofreal(seq_count, "%03.0f")\n`;
          taskLogic += `        schema_out = schema_out \\ (subj_id, "${FormattingUtil.escapeSasString(task.site)}", block[i], strofreal(block_num), strofreal(size), "${FormattingUtil.escapeSasString(task.stratumCode)}"${formattedStrata})\n`;
          taskLogic += `        count = count + 1\n`;
          taskLogic += `        if (count >= ${task.cap}) break\n`;
          taskLogic += `    }\n`;
          taskLogic += `    block_num = block_num + 1\n`;
          taskLogic += `}\n`;
          return taskLogic;
        }
      );

      // Export from Mata to Stata
      algorithmicLogic += `st_addobs(rows(schema_out))\n`;
      algorithmicLogic += `st_addvar("str20", "SubjectID"); st_sstore(., "SubjectID", schema_out[., 1])\n`;
      algorithmicLogic += `st_addvar("str20", "Site"); st_sstore(., "Site", schema_out[., 2])\n`;
      algorithmicLogic += `st_addvar("str50", "Treatment"); st_sstore(., "Treatment", schema_out[., 3])\n`;
      algorithmicLogic += `st_addvar("double", "BlockNumber"); st_store(., "BlockNumber", strtoreal(schema_out[., 4]))\n`;
      algorithmicLogic += `st_addvar("double", "BlockSize"); st_store(., "BlockSize", strtoreal(schema_out[., 5]))\n`;
      algorithmicLogic += `st_addvar("str50", "StratumCode"); st_sstore(., "StratumCode", schema_out[., 6])\n`;

      (config.strata || []).forEach((s, idx) => {
          algorithmicLogic += `st_addvar("str50", "${FormattingUtil.sanitizeStataVarName(s.id)}"); st_sstore(., "${FormattingUtil.sanitizeStataVarName(s.id)}", schema_out[., ${7 + idx}])\n`;
      });
    }
    data['algorithmicLogic'] = algorithmicLogic;
    return CodeTranspiler.renderTemplate(STATA_TEMPLATE, data);
  }
}
