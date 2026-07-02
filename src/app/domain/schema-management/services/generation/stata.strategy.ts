import { FormattingUtil } from './formatting.util';
import { STATA_TEMPLATE } from './ir/templates';
import { LanguageConfig } from './framework/language-config';
import { CodeTranspiler } from './ir/transpiler';
import { PRECISION_EPSILON } from '../../../../core/constants/precision.config';

export const STATA_CONFIG: LanguageConfig = {
  language: 'STATA',
  indexStart: 1,
  template: STATA_TEMPLATE,
  customizeDataSetup: (data, config, ir, method, schema) => {
    let armsVars = '';
    config.arms.forEach((a: any, i: number) => {
      armsVars += `local arm_name_${i + 1} ${FormattingUtil.stataLabelQuote(a.name)}\n`;
    });
    data['armsVars'] = armsVars.trim();

    let strataComments = '';
    (config.strata || []).forEach((s: any, i: number) => {
        strataComments += `local strata_${i+1} ${FormattingUtil.stataLabelQuote(FormattingUtil.sanitizeStataVarName(s.id))}\n`;
        s.levels.forEach((l: any) => {
            strataComments += `* Level: ${FormattingUtil.stataLabelQuote(l)}\n`;
        });
    });
    data['strataComments'] = strataComments.trim();
    data['ratios'] = config.arms.map((a: any) => a.ratio).join(', ');

    data['minimizationParam'] = method === 'MINIMIZATION' ? `local p_minimization = round(${config.minimizationConfig?.p || 0.8}, ${PRECISION_EPSILON}) // Stata ${PRECISION_EPSILON} precision handled` : '';
    
    let blockSizesParam = '';
    if (method === 'BLOCK') {
        config.blockSizes.forEach((b: any, i: number) => blockSizesParam += `local block_${i+1} ${b}\n`);
        blockSizesParam += `local cap = 0`;
    }
    data['blockSizesParam'] = blockSizesParam.trim();

    data['schemaLength'] = schema.length || 1;

    let strataLength = '';
    (config.strata || []).forEach((s: any) => strataLength += `gen str50 ${FormattingUtil.sanitizeStataVarName(s.id)} = ""\n`);
    data['strataLength'] = strataLength.trimEnd();
  },
  components: {
    initialization: (ir) => {
      let logic = `block_sizes = (${ir.blockSizes.join(',')})\n`;
      logic += `total_ratio = ${ir.totalRatio}\n`;
      logic += `arms = (${ir.arms.map((a: any) => `"${FormattingUtil.escapeSasString(a.name)}"`).join(',')})\n`;
      logic += `arm_ratios = (${ir.arms.map((a: any) => a.ratio).join(',')})\n\n`;
      logic += `ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"\n\n`;
      logic += `schema_out = J(0, ${6 + (ir.tasks[0] ? Object.keys(ir.tasks[0].stratumDetails).length : 0)}, "")\n`;
      logic += `seq_count = 0\n`;
      return logic;
    },
    fisherYates: () => `string rowvector build_block(real scalar size) {\n    string rowvector block\n    real scalar multiplier, i, j, arm_idx, k\n    string scalar temp\n    block = J(1, 0, "")\n    multiplier = size / total_ratio\n    for (arm_idx=1; arm_idx<=cols(arms); arm_idx++) {\n        for (k=1; k<=arm_ratios[arm_idx] * multiplier; k++) {\n            block = block, arms[arm_idx]\n        }\n    }\n    for (i=cols(block); i>=2; i--) {\n        j = trunc((random_int() / 4294967296) * i) + 1\n        temp = block[i]; block[i] = block[j]; block[j] = temp\n    }\n    return(block)\n}\n`,
    roundRobinLoop: (ir, config) => {
      let algorithmicLogic = '';
      algorithmicLogic += `block_sizes = (${ir.blockSizes.join(',')})
`;
      algorithmicLogic += `total_ratio = ${ir.totalRatio}
`;
      algorithmicLogic += `arms = (${ir.arms.map((a: any) => `"${FormattingUtil.escapeSasString(a.name)}"`).join(',')})
`;
      algorithmicLogic += `arm_ratios = (${ir.arms.map((a: any) => a.ratio).join(',')})

`;
      algorithmicLogic += `ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

`;

      algorithmicLogic += `string rowvector build_block(real scalar size) {
`;
      algorithmicLogic += `    string rowvector block
`;
      algorithmicLogic += `    real scalar multiplier, i, j, arm_idx, k
`;
      algorithmicLogic += `    string scalar temp
`;
      algorithmicLogic += `    block = J(1, 0, "")
`;
      algorithmicLogic += `    multiplier = size / total_ratio
`;
      algorithmicLogic += `    for (arm_idx=1; arm_idx<=cols(arms); arm_idx++) {
`;
      algorithmicLogic += `        for (k=1; k<=arm_ratios[arm_idx] * multiplier; k++) {
`;
      algorithmicLogic += `            block = block, arms[arm_idx]
`;
      algorithmicLogic += `        }
`;
      algorithmicLogic += `    }
`;
      algorithmicLogic += `    for (i=cols(block); i>=2; i--) {
`;
      algorithmicLogic += `        j = trunc((random_int() / 4294967296) * i) + 1
`;
      algorithmicLogic += `        temp = block[i]; block[i] = block[j]; block[j] = temp
`;
      algorithmicLogic += `    }
`;
      algorithmicLogic += `    return(block)
`;
      algorithmicLogic += `}

`;

      algorithmicLogic += `string scalar stata_rnd_str(real scalar len) {
`;
      algorithmicLogic += `    string scalar res; res = "";
`;
      algorithmicLogic += `    real scalar k;
`;
      algorithmicLogic += `    for (k=1; k<=len; k++) { res = res + substr("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", trunc((random_int() / 4294967296) * 36) + 1, 1); }
`;
      algorithmicLogic += `    return(res);
`;
      algorithmicLogic += `}

`;
      
      algorithmicLogic += `string scalar luhn_checksum(string scalar val) {
`;
      algorithmicLogic += `    string scalar base_for_luhn, digits, chk
`;
      algorithmicLogic += `    real rowvector c_codes
`;
      algorithmicLogic += `    real scalar _i, s, is_even, d
`;
      algorithmicLogic += `    base_for_luhn = subinstr(val, "{CHECKSUM}", ""); digits = ""; c_codes = ascii(base_for_luhn);
`;
      algorithmicLogic += `    for (_i=1; _i<=cols(c_codes); _i++) { if (c_codes[_i] >= 48 & c_codes[_i] <= 57) digits = digits + char(c_codes[_i]); }
`;
      algorithmicLogic += `    chk = "0";
`;
      algorithmicLogic += `    if (strlen(digits) > 0) { s = 0; is_even = 0;
`;
      algorithmicLogic += `        for (_i=strlen(digits); _i>=1; _i--) { d = strtoreal(substr(digits, _i, 1)); if (is_even) { d = d * 2; if (d > 9) d = d - 9; } s = s + d; is_even = !is_even; }
`;
      algorithmicLogic += `        chk = strofreal(mod(10 - mod(s, 10), 10)); }
`;
      algorithmicLogic += `    return(subinstr(val, "{CHECKSUM}", chk));
`;
      algorithmicLogic += `}

`;

      algorithmicLogic += `schema_out = J(0, ${6 + (config.strata?.length || 0)}, "")
`;
      
      const numTasks = ir.tasks.length;
      algorithmicLogic += `task_caps = (${ir.tasks.map((t: any) => t.cap).join(',')})
`;
      algorithmicLogic += `task_counts = J(1, ${numTasks}, 0)
`;
      algorithmicLogic += `task_block_nums = J(1, ${numTasks}, 1)
`;
      algorithmicLogic += `site_counts = asarray_create("string")
`;
      
      algorithmicLogic += `added_in_pass = 1
`;
      algorithmicLogic += `while (added_in_pass) {
`;
      algorithmicLogic += `    added_in_pass = 0
`;
      algorithmicLogic += `    for (t_idx=1; t_idx<=${numTasks}; t_idx++) {
`;
      algorithmicLogic += `        if (task_counts[t_idx] < task_caps[t_idx]) {
`;
      algorithmicLogic += `            added_in_pass = 1
`;
      
      algorithmicLogic += `            task_site = ""
`;
      algorithmicLogic += `            task_stratum = ""
`;
      algorithmicLogic += `            task_strata_arr = J(1, ${config.strata?.length || 0}, "")
`;
      
      ir.tasks.forEach((task: any, i: number) => {
          const t = i + 1;
          let strataArrStr = '';
          (config.strata || []).forEach((s, sIdx) => {
              strataArrStr += `task_strata_arr[${sIdx + 1}] = "${FormattingUtil.escapeSasString(task.stratumDetails[s.id])}"; `;
          });
          if (i === 0) {
              algorithmicLogic += `            if (t_idx == ${t}) { task_site = "${FormattingUtil.escapeSasString(task.site)}"; task_stratum = "${FormattingUtil.escapeSasString(task.stratumCode)}"; ${strataArrStr} }
`;
          } else {
              algorithmicLogic += `            else if (t_idx == ${t}) { task_site = "${FormattingUtil.escapeSasString(task.site)}"; task_stratum = "${FormattingUtil.escapeSasString(task.stratumCode)}"; ${strataArrStr} }
`;
          }
      });
      
      algorithmicLogic += `            size = block_sizes[trunc((random_int() / 4294967296) * cols(block_sizes)) + 1]
`;
      algorithmicLogic += `            block = build_block(size)
`;
      algorithmicLogic += `            for (i=1; i<=cols(block); i++) {
`;
      
      algorithmicLogic += `                if (asarray_contains(site_counts, task_site)) {
`;
      algorithmicLogic += `                    seq_count = asarray(site_counts, task_site) + 1
`;
      algorithmicLogic += `                } else {
`;
      algorithmicLogic += `                    seq_count = 1
`;
      algorithmicLogic += `                }
`;
      algorithmicLogic += `                asarray(site_counts, task_site, seq_count)
`;
      
      algorithmicLogic += CodeTranspiler.generateSubjectIdAndChecksumLogic('STATA', ir.subjectIdTokens, 'task_site', 'task_stratum', 'seq_count');
      
      algorithmicLogic += `                row_res = (subj_id, task_site, block[i], strofreal(task_block_nums[t_idx]), strofreal(size), task_stratum)
`;
      if (config.strata && config.strata.length > 0) {
          algorithmicLogic += `                row_res = row_res, task_strata_arr
`;
      }
      algorithmicLogic += `                schema_out = schema_out \ row_res
`;
      algorithmicLogic += `                task_counts[t_idx] = task_counts[t_idx] + 1
`;
      algorithmicLogic += `                if (task_counts[t_idx] >= task_caps[t_idx]) break
`;
      algorithmicLogic += `            }
`;
      algorithmicLogic += `            task_block_nums[t_idx] = task_block_nums[t_idx] + 1
`;
      algorithmicLogic += `        }
`;
      algorithmicLogic += `    }
`;
      algorithmicLogic += `}
`;
      return algorithmicLogic;
    },
    postLoop: (ir, config) => {
      let logic = ``;
      (config.strata || []).forEach((s: any, idx: number) => {
          logic += `st_addvar("str50", "${FormattingUtil.sanitizeStataVarName(s.id)}"); st_sstore(., "${FormattingUtil.sanitizeStataVarName(s.id)}", schema_out[., ${7 + idx}])\n`;
      });
      return logic;
    }
  }
};
