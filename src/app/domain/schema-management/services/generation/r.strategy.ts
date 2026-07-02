import { Injectable } from '@angular/core';
import { RandomizationConfig } from '../../../core/models/randomization.model';
import { AbstractCodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { R_TEMPLATE, FISHER_YATES_TEMPLATE, LUHN_TEMPLATE } from './ir/templates';

@Injectable()
export class RStrategy extends AbstractCodeGenerationStrategy {
  readonly language = 'R';

  constructor() {
    super();
  }

  protected override customizeDataSetup(data: Record<string, string | number>, config: RandomizationConfig, ir: any, method: 'BLOCK' | 'MINIMIZATION', schema: any[]): void {
    super.customizeDataSetup(data, config, ir, method, schema);
    data['minimizationParam'] = method === 'MINIMIZATION' ? `p_minimization <- ${config.minimizationConfig?.p || 0.8} # maintain precision parity` : '';
  }

  protected generateLanguageScript(
    config: RandomizationConfig,
    ir: any,
    method: 'BLOCK' | 'MINIMIZATION',
    isComplex: boolean,
    schema: any[],
    data: Record<string, string | number>
  ): string {
    let algorithmicLogic = '';

    if (isComplex) {
      algorithmicLogic = CodeTranspiler.formatStaticSchema(this.language, config, schema);
    } else {
      algorithmicLogic += `block_sizes <- c(${ir.blockSizes.join(', ')})\n`;
      algorithmicLogic += `total_ratio <- ${ir.totalRatio}\n`;
      algorithmicLogic += `ALPHANUMERIC <- c("A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9")\n`;
      
      let armsR = ir.arms.map((a: any) => `list(name="${FormattingUtil.escapeString(a.name)}", ratio=${a.ratio})`).join(', ');
      algorithmicLogic += `arms <- list(${armsR})\n\n`;

      algorithmicLogic += `build_block <- function(size) {\n`;
      algorithmicLogic += `  block <- character(0)\n`;
      algorithmicLogic += `  multiplier <- size / total_ratio\n`;
      algorithmicLogic += `  for (arm in arms) {\n`;
      algorithmicLogic += `    block <- c(block, rep(arm$name, as.integer(arm$ratio * multiplier)))\n`;
      algorithmicLogic += `  }\n`;
      algorithmicLogic += `  if (length(block) > 1) {\n`;
      algorithmicLogic += CodeTranspiler.renderTemplate(FISHER_YATES_TEMPLATE[this.language], { indexOffset: 1 });
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

          let baseBuilder = 'paste0(';
          let hasChecksum = false;
          const args = [];
          for (const token of ir.subjectIdTokens) {
            if (token.type === 'literal') {
              args.push(`"${FormattingUtil.escapeString(token.value)}"`);
            } else if (token.type === 'site') {
              args.push(`"${FormattingUtil.escapeString(task.site)}"`);
            } else if (token.type === 'stratum') {
              args.push(`"${FormattingUtil.escapeString(task.stratumCode)}"`);
            } else if (token.type === 'seq') {
              args.push(`sprintf("%0${token.length}d", seq_count)`);
            } else if (token.type === 'rnd') {
              args.push(`paste0(ALPHANUMERIC[(replicate(${token.length}, random_int()) %% length(ALPHANUMERIC)) + 1], collapse="")`);
            } else if (token.type === 'checksum') {
              hasChecksum = true;
              args.push(`"{CHECKSUM}"`);
            }
          }
          baseBuilder += args.join(', ') + ')';

          taskLogic += `    subj_id <- ${baseBuilder}\n`;
          if (hasChecksum) {
            taskLogic += CodeTranspiler.renderTemplate(LUHN_TEMPLATE[this.language], {});
          }

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

    return CodeTranspiler.renderTemplate(R_TEMPLATE, data);
  }
}
