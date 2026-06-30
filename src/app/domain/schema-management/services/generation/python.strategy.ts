import { Injectable } from '@angular/core';
import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';
import { CodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { PYTHON_TEMPLATE } from './ir/templates';
import { generateRandomizationSchema } from '../../../randomization-engine/core/randomization-algorithm';
import { APP_VERSION } from '../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../core/constants/precision.config';

@Injectable()
export class PythonStrategy implements CodeGenerationStrategy {
  readonly language = 'Python';

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

    let algorithmicLogic = '';

    if (isComplex) {
      algorithmicLogic = `schema = [\n${CodeTranspiler.formatStaticSchema(this.language, config, schema)}\n]\n`;
    } else {
      algorithmicLogic = `import re\nschema = []\nseq_count = 0\n`;
      algorithmicLogic += `block_sizes = [${ir.blockSizes.join(', ')}]\n`;
      algorithmicLogic += `total_ratio = ${ir.totalRatio}\n`;
      algorithmicLogic += `arms = [${ir.arms.map(a => `{"name": "${FormattingUtil.escapeString(a.name)}", "ratio": ${a.ratio}}`).join(', ')}]\n\n`;
      
      algorithmicLogic += `def build_block(size):\n`;
      algorithmicLogic += `    block = []\n`;
      algorithmicLogic += `    multiplier = size / total_ratio\n`;
      algorithmicLogic += `    for arm in arms:\n`;
      algorithmicLogic += `        block.extend([arm["name"]] * int(arm["ratio"] * multiplier))\n`;
      algorithmicLogic += `    for i in range(len(block) - 1, 0, -1):\n`;
      algorithmicLogic += `        rand_int = int(rng.bit_generator.random_raw())\n`;
      algorithmicLogic += `        j = rand_int % (i + 1)\n`;
      algorithmicLogic += `        block[i], block[j] = block[j], block[i]\n`;
      algorithmicLogic += `    return block\n\n`;

      algorithmicLogic += IrIterationHelper.generateForTasksAndStrata(
        config,
        ir.tasks,
        (stratumId, stratumValue) => `, "${FormattingUtil.escapeString(stratumId)}": "${FormattingUtil.escapeString(stratumValue)}"`,
        (task, formattedStrata) => {
          let taskLogic = `count = 0\n`;
          taskLogic += `block_num = 1\n`;
          taskLogic += `while count < ${task.cap}:\n`;
          taskLogic += `    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]\n`;
          taskLogic += `    block = build_block(size)\n`;
          taskLogic += `    for trt in block:\n`;
          taskLogic += `        seq_count += 1\n`;
          taskLogic += `        subj_id = "${FormattingUtil.escapeString(config.subjectIdMask)}".replace("{SITE}", "${FormattingUtil.escapeString(task.site)}").replace("{STRATUM}", "${FormattingUtil.escapeString(task.stratumCode)}")\n`;
          taskLogic += `        subj_id = re.sub(r'\\{SEQ:(\\d+)\\}', lambda m: str(seq_count).zfill(int(m.group(1))), subj_id)\n`;
          taskLogic += `        schema.append({"SubjectID": subj_id, "Site": "${FormattingUtil.escapeString(task.site)}", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": "${FormattingUtil.escapeString(task.stratumCode)}"${formattedStrata}})\n`;
          taskLogic += `        count += 1\n`;
          taskLogic += `        if count >= ${task.cap}: break\n`;
          taskLogic += `    block_num += 1\n`;
          return taskLogic;
        }
      );
    }
    data['algorithmicLogic'] = algorithmicLogic;
    data['arms'] = config.arms.map(a => FormattingUtil.escapeString(a.name)).join(', ');
    data['ratios'] = config.arms.map(a => a.ratio).join(', ');
    
    let strataComments = '';
    (config.strata || []).forEach(s => {
        strataComments += `# Stratum: ${FormattingUtil.escapeString(s.id)}, Levels: ${s.levels.map(l => FormattingUtil.escapeString(l)).join(', ')}\n`;
    });
    data['strataComments'] = strataComments.trimEnd();
    data['minimizationParam'] = method === 'MINIMIZATION' ? `p_minimization = ${config.minimizationConfig?.p || 0.8} # maintain precision parity` : '';

    return CodeTranspiler.renderTemplate(PYTHON_TEMPLATE, data);
  }
}
