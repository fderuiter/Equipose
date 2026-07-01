import { Injectable } from '@angular/core';
import { RandomizationConfig } from '../../../core/models/randomization.model';
import { AbstractCodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { STATA_TEMPLATE } from './ir/templates';
import { PRECISION_EPSILON } from '../../../../core/constants/precision.config';

@Injectable()
export class StataStrategy extends AbstractCodeGenerationStrategy {
  readonly language = 'STATA';

  constructor() {
    super();
  }

  protected override customizeDataSetup(data: Record<string, string | number>, config: RandomizationConfig, ir: any, method: 'BLOCK' | 'MINIMIZATION', schema: any[]): void {
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
      algorithmicLogic += `block_sizes = (${ir.blockSizes.join(',')})\n`;
      algorithmicLogic += `total_ratio = ${ir.totalRatio}\n`;
      algorithmicLogic += `arms = (${ir.arms.map((a: any) => `"${FormattingUtil.escapeSasString(a.name)}"`).join(',')})\n`;
      algorithmicLogic += `arm_ratios = (${ir.arms.map((a: any) => a.ratio).join(',')})\n\n`;
      algorithmicLogic += `ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"\n\n`;

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

          let baseBuilder = '';
          let hasChecksum = false;
          let rndVarsSetup = '';
          let rndCounter = 1;

          for (const token of ir.subjectIdTokens) {
            if (token.type === 'literal') {
              baseBuilder += `"${FormattingUtil.escapeSasString(token.value)}" + `;
            } else if (token.type === 'site') {
              baseBuilder += `"${FormattingUtil.escapeSasString(task.site)}" + `;
            } else if (token.type === 'stratum') {
              baseBuilder += `"${FormattingUtil.escapeSasString(task.stratumCode)}" + `;
            } else if (token.type === 'seq') {
              baseBuilder += `strofreal(seq_count, "%0${token.length}.0f") + `;
            } else if (token.type === 'rnd') {
              rndVarsSetup += `        rnd_str_${rndCounter} = ""\n`;
              rndVarsSetup += `        for (_k=1; _k<=${token.length}; _k++) {\n`;
              rndVarsSetup += `            char_idx = mod(random_int(), 36) + 1\n`;
              rndVarsSetup += `            rnd_str_${rndCounter} = rnd_str_${rndCounter} + substr(ALPHANUMERIC, char_idx, 1)\n`;
              rndVarsSetup += `        }\n`;
              baseBuilder += `rnd_str_${rndCounter} + `;
              rndCounter++;
            } else if (token.type === 'checksum') {
              hasChecksum = true;
              baseBuilder += `"{CHECKSUM}" + `;
            }
          }
          baseBuilder = baseBuilder.slice(0, -3) || `""`;

          taskLogic += rndVarsSetup;
          taskLogic += `        subj_id = ${baseBuilder}\n`;

          if (hasChecksum) {
            taskLogic += `        base_for_luhn = subinstr(subj_id, "{CHECKSUM}", "")\n`;
            taskLogic += `        digits = ""\n`;
            taskLogic += `        c_codes = ascii(base_for_luhn)\n`;
            taskLogic += `        for (_i=1; _i<=cols(c_codes); _i++) {\n`;
            taskLogic += `            if (c_codes[_i] >= 48 & c_codes[_i] <= 57) digits = digits + char(c_codes[_i])\n`;
            taskLogic += `        }\n`;
            taskLogic += `        chk = "0"\n`;
            taskLogic += `        if (strlen(digits) > 0) {\n`;
            taskLogic += `            s = 0\n`;
            taskLogic += `            is_even = 0\n`;
            taskLogic += `            for (_i=strlen(digits); _i>=1; _i--) {\n`;
            taskLogic += `                d = strtoreal(substr(digits, _i, 1))\n`;
            taskLogic += `                if (is_even) {\n`;
            taskLogic += `                    d = d * 2\n`;
            taskLogic += `                    if (d > 9) d = d - 9\n`;
            taskLogic += `                }\n`;
            taskLogic += `                s = s + d\n`;
            taskLogic += `                is_even = !is_even\n`;
            taskLogic += `            }\n`;
            taskLogic += `            chk = strofreal(mod(10 - mod(s, 10), 10))\n`;
            taskLogic += `        }\n`;
            taskLogic += `        subj_id = subinstr(subj_id, "{CHECKSUM}", chk)\n`;
          }

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
