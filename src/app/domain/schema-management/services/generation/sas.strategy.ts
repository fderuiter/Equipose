import { FormattingUtil } from './formatting.util';
import { SAS_TEMPLATE } from './ir/templates';
import { LanguageConfig } from './framework/language-config';

export const SAS_CONFIG: LanguageConfig = {
  language: 'SAS',
  indexStart: 1,
  template: SAS_TEMPLATE,
  customizeDataSetup: (data, config, ir, method, schema) => {
    data['arms'] = config.arms.map((a: any) => `"${FormattingUtil.escapeSasString(a.name)}"`).join(' ');
    data['armsNames'] = data['arms'];
    data['strataFactors'] = (config.strata || []).map(s => `"${FormattingUtil.escapeSasString(s.id)}"`).join(' ');
    data['ratios'] = config.arms.map((a: any) => a.ratio).join(', ');
    
    let strataComments = '';
    (config.strata || []).forEach((s: any) => {
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
  },
  components: {
    initialization: (ir) => {
      let logic = `  array blk[1000] $50 _temporary_;\n`;
      logic += `  length ALPHANUMERIC $ 36;\n`;
      logic += `  ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";\n`;
      logic += `  seq_count = 0;\n`;
      return logic;
    },
    fisherYates: ``, // SAS Fisher-Yates is implemented inside the task loop due to macro constraints
    luhn: `        if index(SubjectID, "{CHECKSUM}") > 0 then do;\n          base_for_luhn = tranwrd(SubjectID, "{CHECKSUM}", "");\n          digits = prxchange('s/\\D//', -1, trim(base_for_luhn));\n          chk = "0";\n          if length(trim(digits)) > 0 then do;\n            s = 0;\n            is_even = 0;\n            do _i = length(trim(digits)) to 1 by -1;\n              d = input(substr(trim(digits), _i, 1), 1.);\n              if is_even then do;\n                d = d * 2;\n                if d > 9 then d = d - 9;\n              end;\n              s = s + d;\n              if is_even = 1 then is_even = 0; else is_even = 1;\n            end;\n            chk = put(mod(10 - mod(s, 10), 10), 1.);\n          end;\n          SubjectID = tranwrd(SubjectID, "{CHECKSUM}", trim(left(chk)));\n        end;`,
    subjectIdBuilder: (tokens, task) => {
      let baseBuilder = '';
      let rndVarsSetup = '';
      let rndCounter = 1;

      for (const token of tokens) {
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
          rndVarsSetup += `          char_idx = int((rand_int / 4294967296) * 36) + 1;\n`;
          rndVarsSetup += `          rnd_str_${rndCounter} = trim(rnd_str_${rndCounter}) || substr(ALPHANUMERIC, char_idx, 1);\n`;
          rndVarsSetup += `        end;\n`;
          baseBuilder += `trim(rnd_str_${rndCounter}) || `;
          rndCounter++;
        } else if (token.type === 'checksum') {
          baseBuilder += `"{CHECKSUM}" || `;
        }
      }
      if (baseBuilder.endsWith(' || ')) {
        baseBuilder = baseBuilder.slice(0, -4);
      }
      if (baseBuilder === '') {
        baseBuilder = `""`;
      }
      return `${rndVarsSetup}        SubjectID = ${baseBuilder};`;
    },
    recordAppend: (task, config) => {
      return `        output;`;
    },
    taskLoop: (task, taskLogic, config) => {
      let logic = `  /* Task: ${FormattingUtil.escapeSasString(task.site)} ${FormattingUtil.escapeSasString(task.stratumCode)} */\n`;
      logic += `  Site = "${FormattingUtil.escapeSasString(task.site)}"; StratumCode = "${FormattingUtil.escapeSasString(task.stratumCode)}";\n`;
      for (const s of config.strata || []) {
        logic += `  ${FormattingUtil.escapeSasString(s.id)}="${FormattingUtil.escapeSasString(task.stratumDetails[s.id])}";\n`;
      }
      logic += `  cap = ${task.cap};\n`;
      logic += `  count = 0; block_num = 1;\n`;
      logic += `  do while(count < cap);\n`;
      
      // We need block sizes from IR but config is not ir. Wait, ir is not passed here.
      // In SAS original code: ir.blockSizes.forEach(...)
      // Since blockSizes are in config, we can use config.blockSizes
      logic += `     link get_rand_int; size_idx = int((rand_int / 4294967296) * ${config.blockSizes.length});\n`;
      config.blockSizes.forEach((bs: any, i: number) => {
         if (i===0) logic += `     if size_idx=0 then size=${bs};\n`;
         else logic += `     else if size_idx=${i} then size=${bs};\n`;
      });
      logic += `     idx = 1;\n`;
      
      let totalRatio = config.arms.reduce((s: number, a: any) => s + a.ratio, 0);
      for (const arm of config.arms) {
         logic += `     do i = 1 to (size / ${totalRatio}) * ${arm.ratio}; blk[idx] = "${FormattingUtil.escapeSasString(arm.name)}"; idx=idx+1; end;\n`;
      }
      logic += `     do i = size to 2 by -1;\n`;
      logic += `        link get_rand_int; j = int((rand_int / 4294967296) * i) + 1;\n`;
      logic += `        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;\n`;
      logic += `     end;\n`;
      
      logic += `     do i = 1 to size;\n`;
      logic += `        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;\n`;
      logic += `        seq_count = seq_count + 1;\n`;
      
      logic += taskLogic;
      
      logic += `        count = count + 1;\n`;
      logic += `        if count >= cap then leave;\n`;
      logic += `     end;\n`;
      logic += `     block_num = block_num + 1;\n`;
      logic += `  end;\n`;
      return logic;
    }
  }
};
