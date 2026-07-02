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
      algorithmicLogic += `        j = trunc((random_int() / 4294967296) * i) + 1\n`;
      algorithmicLogic += `        temp = block[i]; block[i] = block[j]; block[j] = temp\n`;
      algorithmicLogic += `    }\n`;
      algorithmicLogic += `    return(block)\n`;
      algorithmicLogic += `}\n\n`;

      algorithmicLogic += `string scalar stata_rnd_str(real scalar len) {\n`;
      algorithmicLogic += `    string scalar res; res = "";\n`;
      algorithmicLogic += `    real scalar k;\n`;
      algorithmicLogic += `    for (k=1; k<=len; k++) { res = res + substr("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", trunc((random_int() / 4294967296) * 36) + 1, 1); }\n`;
      algorithmicLogic += `    return(res);\n`;
      algorithmicLogic += `}\n\n`;
      
      algorithmicLogic += `string scalar luhn_checksum(string scalar val) {\n`;
      algorithmicLogic += `    string scalar base_for_luhn, digits, chk\n`;
      algorithmicLogic += `    real rowvector c_codes\n`;
      algorithmicLogic += `    real scalar _i, s, is_even, d\n`;
      algorithmicLogic += `    base_for_luhn = subinstr(val, "{CHECKSUM}", ""); digits = ""; c_codes = ascii(base_for_luhn);\n`;
      algorithmicLogic += `    for (_i=1; _i<=cols(c_codes); _i++) { if (c_codes[_i] >= 48 & c_codes[_i] <= 57) digits = digits + char(c_codes[_i]); }\n`;
      algorithmicLogic += `    chk = "0";\n`;
      algorithmicLogic += `    if (strlen(digits) > 0) { s = 0; is_even = 0;\n`;
      algorithmicLogic += `        for (_i=strlen(digits); _i>=1; _i--) { d = strtoreal(substr(digits, _i, 1)); if (is_even) { d = d * 2; if (d > 9) d = d - 9; } s = s + d; is_even = !is_even; }\n`;
      algorithmicLogic += `        chk = strofreal(mod(10 - mod(s, 10), 10)); }\n`;
      algorithmicLogic += `    return(subinstr(val, "{CHECKSUM}", chk));\n`;
      algorithmicLogic += `}\n\n`;

      algorithmicLogic += `schema_out = J(0, ${6 + (config.strata?.length || 0)}, "")\n`;
      
      const numTasks = ir.tasks.length;
      algorithmicLogic += `task_caps = (${ir.tasks.map((t: any) => t.cap).join(',')})\n`;
      algorithmicLogic += `task_counts = J(1, ${numTasks}, 0)\n`;
      algorithmicLogic += `task_block_nums = J(1, ${numTasks}, 1)\n`;
      algorithmicLogic += `site_counts = asarray_create("string")\n`;
      
      algorithmicLogic += `added_in_pass = 1\n`;
      algorithmicLogic += `while (added_in_pass) {\n`;
      algorithmicLogic += `    added_in_pass = 0\n`;
      algorithmicLogic += `    for (t_idx=1; t_idx<=${numTasks}; t_idx++) {\n`;
      algorithmicLogic += `        if (task_counts[t_idx] < task_caps[t_idx]) {\n`;
      algorithmicLogic += `            added_in_pass = 1\n`;
      
      algorithmicLogic += `            task_site = ""\n`;
      algorithmicLogic += `            task_stratum = ""\n`;
      algorithmicLogic += `            task_strata_arr = J(1, ${config.strata?.length || 0}, "")\n`;
      
      ir.tasks.forEach((task: any, i: number) => {
          const t = i + 1;
          let strataArrStr = '';
          (config.strata || []).forEach((s, sIdx) => {
              strataArrStr += `task_strata_arr[${sIdx + 1}] = "${FormattingUtil.escapeSasString(task.stratumDetails[s.id])}"; `;
          });
          if (i === 0) {
              algorithmicLogic += `            if (t_idx == ${t}) { task_site = "${FormattingUtil.escapeSasString(task.site)}"; task_stratum = "${FormattingUtil.escapeSasString(task.stratumCode)}"; ${strataArrStr} }\n`;
          } else {
              algorithmicLogic += `            else if (t_idx == ${t}) { task_site = "${FormattingUtil.escapeSasString(task.site)}"; task_stratum = "${FormattingUtil.escapeSasString(task.stratumCode)}"; ${strataArrStr} }\n`;
          }
      });
      
      algorithmicLogic += `            size = block_sizes[trunc((random_int() / 4294967296) * cols(block_sizes)) + 1]\n`;
      algorithmicLogic += `            block = build_block(size)\n`;
      algorithmicLogic += `            for (i=1; i<=cols(block); i++) {\n`;
      
      algorithmicLogic += `                if (asarray_contains(site_counts, task_site)) {\n`;
      algorithmicLogic += `                    seq_count = asarray(site_counts, task_site) + 1\n`;
      algorithmicLogic += `                } else {\n`;
      algorithmicLogic += `                    seq_count = 1\n`;
      algorithmicLogic += `                }\n`;
      algorithmicLogic += `                asarray(site_counts, task_site, seq_count)\n`;
      
      algorithmicLogic += CodeTranspiler.generateSubjectIdAndChecksumLogic('STATA', ir.subjectIdTokens, 'task_site', 'task_stratum', 'seq_count');
      
      algorithmicLogic += `                row_res = (subj_id, task_site, block[i], strofreal(task_block_nums[t_idx]), strofreal(size), task_stratum)\n`;
      if (config.strata && config.strata.length > 0) {
          algorithmicLogic += `                row_res = row_res, task_strata_arr\n`;
      }
      algorithmicLogic += `                schema_out = schema_out \\ row_res\n`;
      algorithmicLogic += `                task_counts[t_idx] = task_counts[t_idx] + 1\n`;
      algorithmicLogic += `                if (task_counts[t_idx] >= task_caps[t_idx]) break\n`;
      algorithmicLogic += `            }\n`;
      algorithmicLogic += `            task_block_nums[t_idx] = task_block_nums[t_idx] + 1\n`;
      algorithmicLogic += `        }\n`;
      algorithmicLogic += `    }\n`;
      algorithmicLogic += `}\n`;

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
