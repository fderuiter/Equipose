import { Injectable } from '@angular/core';
import { RandomizationConfig } from '../../../core/models/randomization.model';
import { AbstractCodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { SAS_TEMPLATE, FISHER_YATES_TEMPLATE, LUHN_TEMPLATE } from './ir/templates';

@Injectable()
export class SasStrategy extends AbstractCodeGenerationStrategy {
  readonly language = 'SAS';

  constructor() {
    super();
  }

  protected override customizeDataSetup(data: Record<string, string | number>, config: RandomizationConfig, ir: any, method: 'BLOCK' | 'MINIMIZATION', schema: any[]): void {
    super.customizeDataSetup(data, config, ir, method, schema);
    data['minimizationParam'] = method === 'MINIMIZATION' ? `%let p_minimization = ${config.minimizationConfig?.p || 0.8}; /* maintain precision parity */\n/* specific rounding or comparison functions injected for SAS */` : '';
    data['blockSizesParam'] = method === 'BLOCK' ? `%let block_sizes = ${(config.blockSizes || []).join(' ')};` : '';

    let strataLength = '';
    for (const s of config.strata || []) {
        strataLength += ` ${FormattingUtil.escapeSasString(s.id)} $50`;
    }
    data['strataLength'] = strataLength;
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
      algorithmicLogic += `  array blk[1000] $50 _temporary_;\n`;
      algorithmicLogic += `  length ALPHANUMERIC $ 36;\n`;
      algorithmicLogic += `  ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";\n`;
      algorithmicLogic += `  seq_count = 0;\n`;
      
      algorithmicLogic += IrIterationHelper.generateForTasksAndStrata(
        config,
        ir.tasks,
        (stratumId, stratumValue) => `  ${FormattingUtil.escapeSasString(stratumId)}="${FormattingUtil.escapeSasString(stratumValue)}";\n`,
        (task, formattedStrata) => {
          let taskLogic = `  /* Task: ${FormattingUtil.escapeSasString(task.site)} ${FormattingUtil.escapeSasString(task.stratumCode)} */\n`;
          taskLogic += `  Site = "${FormattingUtil.escapeSasString(task.site)}"; StratumCode = "${FormattingUtil.escapeSasString(task.stratumCode)}";\n`;
          taskLogic += formattedStrata;
          taskLogic += `  cap = ${task.cap};\n`;
          taskLogic += `  count = 0; block_num = 1;\n`;
          taskLogic += `  do while(count < cap);\n`;
          taskLogic += `     link get_rand_int; size_idx = mod(rand_int, ${ir.blockSizes.length});\n`;
          ir.blockSizes.forEach((bs: any, i: number) => {
             if (i===0) taskLogic += `     if size_idx=0 then size=${bs};\n`;
             else taskLogic += `     else if size_idx=${i} then size=${bs};\n`;
          });
          taskLogic += `     idx = 1;\n`;
          for (const arm of ir.arms) {
             taskLogic += `     do i = 1 to (size / ${ir.totalRatio}) * ${arm.ratio}; blk[idx] = "${FormattingUtil.escapeSasString(arm.name)}"; idx=idx+1; end;\n`;
          }
          taskLogic += CodeTranspiler.renderTemplate(FISHER_YATES_TEMPLATE[this.language], { indexOffset: 1 });
          taskLogic += `     do i = 1 to size;\n`;
          taskLogic += `        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;\n`;
          taskLogic += `        seq_count = seq_count + 1;\n`;

          let baseBuilder = '';
          let hasChecksum = false;
          let rndVarsSetup = '';
          let rndCounter = 1;

          for (const token of ir.subjectIdTokens) {
            if (token.type === 'literal') {
              baseBuilder += `"${FormattingUtil.escapeSasString(token.value)}" || `;
            } else if (token.type === 'site') {
              baseBuilder += `"${FormattingUtil.escapeSasString(task.site)}" || `;
            } else if (token.type === 'stratum') {
              baseBuilder += `"${FormattingUtil.escapeSasString(task.stratumCode)}" || `;
            } else if (token.type === 'seq') {
              baseBuilder += `put(seq_count, z${token.length}.) || `;
            } else if (token.type === 'rnd') {
              rndVarsSetup += `        length rnd_str_${rndCounter} $ ${token.length};\n`;
              rndVarsSetup += `        rnd_str_${rndCounter} = "";\n`;
              rndVarsSetup += `        do _k = 1 to ${token.length};\n`;
              rndVarsSetup += `          link get_rand_int;\n`;
              rndVarsSetup += `          char_idx = mod(rand_int, 36) + 1;\n`;
              rndVarsSetup += `          rnd_str_${rndCounter} = trim(rnd_str_${rndCounter}) || substr(ALPHANUMERIC, char_idx, 1);\n`;
              rndVarsSetup += `        end;\n`;
              baseBuilder += `trim(rnd_str_${rndCounter}) || `;
              rndCounter++;
            } else if (token.type === 'checksum') {
              hasChecksum = true;
              baseBuilder += `"{CHECKSUM}" || `;
            }
          }
          if (baseBuilder.endsWith(' || ')) {
            baseBuilder = baseBuilder.slice(0, -4);
          }
          if (baseBuilder === '') {
            baseBuilder = `""`;
          }

          taskLogic += rndVarsSetup;
          taskLogic += `        SubjectID = ${baseBuilder};\n`;
          if (hasChecksum) {
            taskLogic += CodeTranspiler.renderTemplate(LUHN_TEMPLATE[this.language], {});
          }

          taskLogic += `        output;\n`;
          taskLogic += `        count = count + 1;\n`;
          taskLogic += `        if count >= cap then leave;\n`;
          taskLogic += `     end;\n`;
          taskLogic += `     block_num = block_num + 1;\n`;
          taskLogic += `  end;\n`;
          return taskLogic;
        }
      );
    }
    data['algorithmicLogic'] = algorithmicLogic;
    return CodeTranspiler.renderTemplate(SAS_TEMPLATE, data);
  }
}
