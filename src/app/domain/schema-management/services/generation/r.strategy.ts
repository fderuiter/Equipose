import { Injectable } from '@angular/core';
import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';
import { CodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { R_TEMPLATE } from './ir/templates';
import { generateRandomizationSchema } from '../../../randomization-engine/core/randomization-algorithm';
import { APP_VERSION } from '../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../core/constants/precision.config';

@Injectable()
export class RStrategy implements CodeGenerationStrategy {
  readonly language = 'R';

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
      algorithmicLogic = CodeTranspiler.formatStaticSchema(this.language, config, schema);
    } else {
      algorithmicLogic += `block_sizes <- c(${ir.blockSizes.join(', ')})\n`;
      algorithmicLogic += `total_ratio <- ${ir.totalRatio}\n`;
      
      let armsR = ir.arms.map(a => `list(name="${FormattingUtil.escapeString(a.name)}", ratio=${a.ratio})`).join(', ');
      algorithmicLogic += `arms <- list(${armsR})\n\n`;

      algorithmicLogic += `build_block <- function(size) {\n`;
      algorithmicLogic += `  block <- character(0)\n`;
      algorithmicLogic += `  multiplier <- size / total_ratio\n`;
      algorithmicLogic += `  for (arm in arms) {\n`;
      algorithmicLogic += `    block <- c(block, rep(arm$name, as.integer(arm$ratio * multiplier)))\n`;
      algorithmicLogic += `  }\n`;
      algorithmicLogic += `  if (length(block) > 1) {\n`;
      algorithmicLogic += `    for (i in length(block):2) {\n`;
      algorithmicLogic += `      j <- (random_int() %% i) + 1\n`;
      algorithmicLogic += `      temp <- block[i]; block[i] <- block[j]; block[j] <- temp\n`;
      algorithmicLogic += `    }\n`;
      algorithmicLogic += `  }\n`;
      algorithmicLogic += `  return(block)\n`;
      algorithmicLogic += `}\n\n`;

      algorithmicLogic += `seq_count <- 0\n`;
      
      algorithmicLogic += IrIterationHelper.generateForTasksAndStrata(
        config,
        ir.tasks,
        (stratumId, stratumValue) => `, "${FormattingUtil.escapeString(stratumId)}"="${FormattingUtil.escapeString(stratumValue)}"`,
        (task, formattedStrata) => {
          let taskLogic = `count <- 0\n`;
          taskLogic += `block_num <- 1\n`;
          taskLogic += `while (count < ${task.cap}) {\n`;
          taskLogic += `  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]\n`;
          taskLogic += `  block <- build_block(size)\n`;
          taskLogic += `  for (trt in block) {\n`;
          taskLogic += `    seq_count <- seq_count + 1\n`;
          taskLogic += `    subj_id <- "${FormattingUtil.escapeString(config.subjectIdMask)}"\n`;
          taskLogic += `    subj_id <- gsub("{SITE}", "${FormattingUtil.escapeString(task.site)}", subj_id, fixed=TRUE)\n`;
          taskLogic += `    subj_id <- gsub("{STRATUM}", "${FormattingUtil.escapeString(task.stratumCode)}", subj_id, fixed=TRUE)\n`;
          taskLogic += `    subj_id <- sub("\\\\{SEQ:[0-9]+\\\\}", sprintf("%03d", seq_count), subj_id)\n`;
          taskLogic += `    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="${FormattingUtil.escapeString(task.site)}", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode="${FormattingUtil.escapeString(task.stratumCode)}"${formattedStrata}, stringsAsFactors=FALSE)\n`;
          taskLogic += `    count <- count + 1\n`;
          taskLogic += `    if (count >= ${task.cap}) break\n`;
          taskLogic += `  }\n`;
          taskLogic += `  block_num <- block_num + 1\n`;
          taskLogic += `}\n`;
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
    data['minimizationParam'] = method === 'MINIMIZATION' ? `p_minimization <- ${config.minimizationConfig?.p || 0.8} # maintain precision parity` : '';

    return CodeTranspiler.renderTemplate(R_TEMPLATE, data);
  }
}
