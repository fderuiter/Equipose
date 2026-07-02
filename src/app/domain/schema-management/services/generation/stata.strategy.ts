import { FormattingUtil } from './formatting.util';
import { STATA_TEMPLATE } from './ir/templates';
import { LanguageConfig } from './framework/language-config';
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
    fisherYates: `string rowvector build_block(real scalar size) {\n    string rowvector block\n    real scalar multiplier, i, j, arm_idx, k\n    string scalar temp\n    block = J(1, 0, "")\n    multiplier = size / total_ratio\n    for (arm_idx=1; arm_idx<=cols(arms); arm_idx++) {\n        for (k=1; k<=arm_ratios[arm_idx] * multiplier; k++) {\n            block = block, arms[arm_idx]\n        }\n    }\n    for (i=cols(block); i>=2; i--) {\n        j = trunc((random_int() / 4294967296) * i) + 1\n        temp = block[i]; block[i] = block[j]; block[j] = temp\n    }\n    return(block)\n}\n`,
    luhn: `        base_for_luhn = subinstr(subj_id, "{CHECKSUM}", "")\n        digits = ""\n        c_codes = ascii(base_for_luhn)\n        for (_i=1; _i<=cols(c_codes); _i++) {\n            if (c_codes[_i] >= 48 & c_codes[_i] <= 57) digits = digits + char(c_codes[_i])\n        }\n        chk = "0"\n        if (strlen(digits) > 0) {\n            s = 0\n            is_even = 0\n            for (_i=strlen(digits); _i>=1; _i--) {\n                d = strtoreal(substr(digits, _i, 1))\n                if (is_even) {\n                    d = d * 2\n                    if (d > 9) d = d - 9\n                }\n                s = s + d\n                is_even = !is_even\n            }\n            chk = strofreal(mod(10 - mod(s, 10), 10))\n        }\n        subj_id = subinstr(subj_id, "{CHECKSUM}", chk)`,
    subjectIdBuilder: (tokens, task) => {
      let baseBuilder = '';
      let rndVarsSetup = '';
      let rndCounter = 1;

      for (const token of tokens) {
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
          rndVarsSetup += `            char_idx = trunc((random_int() / 4294967296) * 36) + 1\n`;
          rndVarsSetup += `            rnd_str_${rndCounter} = rnd_str_${rndCounter} + substr(ALPHANUMERIC, char_idx, 1)\n`;
          rndVarsSetup += `        }\n`;
          baseBuilder += `rnd_str_${rndCounter} + `;
          rndCounter++;
        } else if (token.type === 'checksum') {
          baseBuilder += `"{CHECKSUM}" + `;
        }
      }
      baseBuilder = baseBuilder.slice(0, -3) || `""`;
      return `${rndVarsSetup}        subj_id = ${baseBuilder}`;
    },
    recordAppend: (task, config) => {
      let formattedStrata = '';
      for (const s of config.strata || []) {
        formattedStrata += `, "${FormattingUtil.escapeSasString(task.stratumDetails[s.id])}"`;
      }
      return `        schema_out = schema_out \\ (subj_id, "${FormattingUtil.escapeSasString(task.site)}", block[i], strofreal(block_num), strofreal(size), "${FormattingUtil.escapeSasString(task.stratumCode)}"${formattedStrata})`;
    },
    taskLoop: (task, taskLogic, config) => {
      let logic = `count = 0\nblock_num = 1\nwhile (count < ${task.cap}) {\n`;
      logic += `    size = block_sizes[trunc((random_int() / 4294967296) * cols(block_sizes)) + 1]\n`;
      logic += `    block = build_block(size)\n`;
      logic += `    for (i=1; i<=cols(block); i++) {\n`;
      logic += `        seq_count = seq_count + 1\n`;
      logic += taskLogic;
      logic += `        count = count + 1\n`;
      logic += `        if (count >= ${task.cap}) break\n`;
      logic += `    }\n`;
      logic += `    block_num = block_num + 1\n`;
      logic += `}\n`;
      return logic;
    },
    postLoop: (ir, config) => {
      let logic = `st_addobs(rows(schema_out))\n`;
      logic += `st_addvar("str20", "SubjectID"); st_sstore(., "SubjectID", schema_out[., 1])\n`;
      logic += `st_addvar("str20", "Site"); st_sstore(., "Site", schema_out[., 2])\n`;
      logic += `st_addvar("str50", "Treatment"); st_sstore(., "Treatment", schema_out[., 3])\n`;
      logic += `st_addvar("double", "BlockNumber"); st_store(., "BlockNumber", strtoreal(schema_out[., 4]))\n`;
      logic += `st_addvar("double", "BlockSize"); st_store(., "BlockSize", strtoreal(schema_out[., 5]))\n`;
      logic += `st_addvar("str50", "StratumCode"); st_sstore(., "StratumCode", schema_out[., 6])\n`;

      (config.strata || []).forEach((s: any, idx: number) => {
          logic += `st_addvar("str50", "${FormattingUtil.sanitizeStataVarName(s.id)}"); st_sstore(., "${FormattingUtil.sanitizeStataVarName(s.id)}", schema_out[., ${7 + idx}])\n`;
      });
      return logic;
    }
  }
};
