import { Injectable } from '@angular/core';
import { RandomizationConfig } from '../../../core/models/randomization.model';
import { AbstractCodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { SAS_TEMPLATE } from './ir/templates';

@Injectable()
export class SasStrategy extends AbstractCodeGenerationStrategy {
  readonly language = 'SAS';

  constructor() {
    super();
  }

  protected override customizeDataSetup(data: Record<string, string | number>, config: RandomizationConfig, ir: any, method: 'BLOCK' | 'MINIMIZATION', schema: any[]): void {
    data['arms'] = config.arms.map(a => `"${FormattingUtil.escapeSasString(a.name)}"`).join(' ');
    data['armsNames'] = data['arms'];
    data['strataFactors'] = (config.strata || []).map(s => `"${FormattingUtil.escapeSasString(s.id)}"`).join(' ');
    data['ratios'] = config.arms.map(a => a.ratio).join(', ');
    
    let strataComments = '';
    (config.strata || []).forEach(s => {
        strataComments += `/* Levels for ${s.id}: ${s.levels.join(', ')} */\n`;
    });
    data['strataComments'] = strataComments.trim();

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
      
      const numTasks = ir.tasks.length;
      algorithmicLogic += `  array task_caps[${numTasks}] _temporary_ (${ir.tasks.map((t: any) => t.cap).join(' ')});\n`;
      algorithmicLogic += `  array task_counts[${numTasks}] _temporary_ (${ir.tasks.map(() => 0).join(' ')});\n`;
      algorithmicLogic += `  array task_block_num[${numTasks}] _temporary_ (${ir.tasks.map(() => 1).join(' ')});\n`;
      algorithmicLogic += `  array site_counts[1000] _temporary_;\n`;
      algorithmicLogic += `  do _init = 1 to 1000; site_counts[_init] = 0; end;\n`;
      
      algorithmicLogic += `  added_in_pass = 1;\n`;
      algorithmicLogic += `  do while(added_in_pass = 1);\n`;
      algorithmicLogic += `    added_in_pass = 0;\n`;
      algorithmicLogic += `    do t_idx = 1 to ${numTasks};\n`;
      algorithmicLogic += `      if task_counts[t_idx] < task_caps[t_idx] then do;\n`;
      algorithmicLogic += `        added_in_pass = 1;\n`;
      
      ir.tasks.forEach((task: any, i: number) => {
         const t = i + 1;
         let strataStr = '';
         for (const s of config.strata || []) {
             strataStr += `${FormattingUtil.escapeSasString(s.id)}="${FormattingUtil.escapeSasString(task.stratumDetails[s.id])}"; `;
         }
         if (i === 0) {
             algorithmicLogic += `        if t_idx = ${t} then do; Site = "${FormattingUtil.escapeSasString(task.site)}"; StratumCode = "${FormattingUtil.escapeSasString(task.stratumCode)}"; ${strataStr}site_idx = ${config.sites!.indexOf(task.site) + 1}; end;\n`;
         } else {
             algorithmicLogic += `        else if t_idx = ${t} then do; Site = "${FormattingUtil.escapeSasString(task.site)}"; StratumCode = "${FormattingUtil.escapeSasString(task.stratumCode)}"; ${strataStr}site_idx = ${config.sites!.indexOf(task.site) + 1}; end;\n`;
         }
      });
      
      algorithmicLogic += `        link get_rand_int; size_idx = int((rand_int / 4294967296) * ${ir.blockSizes.length});\n`;
      ir.blockSizes.forEach((bs: any, i: number) => {
         if (i===0) algorithmicLogic += `        if size_idx=0 then size=${bs};\n`;
         else algorithmicLogic += `        else if size_idx=${i} then size=${bs};\n`;
      });
      algorithmicLogic += `        idx = 1;\n`;
      for (const arm of ir.arms) {
         algorithmicLogic += `        do i = 1 to (size / ${ir.totalRatio}) * ${arm.ratio}; blk[idx] = "${FormattingUtil.escapeSasString(arm.name)}"; idx=idx+1; end;\n`;
      }
      algorithmicLogic += `        do i = size to 2 by -1;\n`;
      algorithmicLogic += `           link get_rand_int; j = int((rand_int / 4294967296) * i) + 1;\n`;
      algorithmicLogic += `           temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;\n`;
      algorithmicLogic += `        end;\n`;
      algorithmicLogic += `        do i = 1 to size;\n`;
      algorithmicLogic += `           Treatment = blk[i]; BlockNumber = task_block_num[t_idx]; BlockSize = size;\n`;
      algorithmicLogic += `           site_counts[site_idx] = site_counts[site_idx] + 1;\n`;
      algorithmicLogic += `           seq_count = site_counts[site_idx];\n`;
      
      algorithmicLogic += CodeTranspiler.generateSubjectIdAndChecksumLogic('SAS', ir.subjectIdTokens, 'Site', 'StratumCode', 'seq_count');
      
      algorithmicLogic += `           output;\n`;
      algorithmicLogic += `           task_counts[t_idx] = task_counts[t_idx] + 1;\n`;
      algorithmicLogic += `           if task_counts[t_idx] >= task_caps[t_idx] then leave;\n`;
      algorithmicLogic += `        end;\n`;
      algorithmicLogic += `        task_block_num[t_idx] = task_block_num[t_idx] + 1;\n`;
      algorithmicLogic += `      end;\n`;
      algorithmicLogic += `    end;\n`;
      algorithmicLogic += `  end;\n`;
    }
    data['algorithmicLogic'] = algorithmicLogic;
    return CodeTranspiler.renderTemplate(SAS_TEMPLATE, data);
  }
}
