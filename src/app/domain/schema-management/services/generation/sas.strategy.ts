import { FormattingUtil } from './formatting.util';
import { SAS_TEMPLATE } from './ir/templates';
import { LanguageConfig } from './framework/language-config';
import { CodeTranspiler } from './ir/transpiler';

export const SAS_CONFIG: LanguageConfig = {
  language: 'SAS',
  indexStart: 1,
  template: SAS_TEMPLATE,
  customizeDataSetup: (data, config, ir, method, schema) => { void ir; void schema;
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
      const hasRnd = ir.subjectIdTokens.some(t => t.type === 'rnd');
      if (hasRnd) {
        logic += `  length ALPHANUMERIC $ 36;\n`;
        logic += `  ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";\n`;
      }
      logic += `  seq_count = 0;\n`;
      return logic;
    },
    utilityBlocks: (ir) => {
      let utils = `  goto skip_utilities;\n`;
      utils += `  build_block:\n`;
      utils += `    idx = 1;\n`;
      for (const arm of ir.arms) {
         utils += `    do i = 1 to (size / ${ir.totalRatio}) * ${arm.ratio}; blk[idx] = "${FormattingUtil.escapeSasString(arm.name)}"; idx=idx+1; end;\n`;
      }
      utils += `    do i = size to 2 by -1;\n`;
      utils += `       link get_rand_int; j = int((rand_int / 4294967296) * i) + 1;\n`;
      utils += `       temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;\n`;
      utils += `    end;\n`;
      utils += `  return;\n`;
      utils += `  skip_utilities:\n`;
      return utils;
    },
    fisherYates: (ir) => (void ir, ``),
    roundRobinLoop: (ir, config) => {
      let algorithmicLogic = '';
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
         const siteIdx = config.sites!.indexOf(task.site) + 1;
         if (i === 0) {
             algorithmicLogic += `        if t_idx = ${t} then do; Site = "${FormattingUtil.escapeSasString(task.site)}"; StratumCode = "${FormattingUtil.escapeSasString(task.stratumCode)}"; ${strataStr}site_idx = ${siteIdx}; end;\n`;
         } else {
             algorithmicLogic += `        else if t_idx = ${t} then do; Site = "${FormattingUtil.escapeSasString(task.site)}"; StratumCode = "${FormattingUtil.escapeSasString(task.stratumCode)}"; ${strataStr}site_idx = ${siteIdx}; end;\n`;
         }
      });
      
      algorithmicLogic += `        link get_rand_int; size_idx = int((rand_int / 4294967296) * ${ir.blockSizes.length});\n`;
      ir.blockSizes.forEach((bs: any, i: number) => {
         if (i===0) algorithmicLogic += `        if size_idx=0 then size=${bs};\n`;
         else algorithmicLogic += `        else if size_idx=${i} then size=${bs};\n`;
      });
      
      algorithmicLogic += `        link build_block;\n`;
      
      algorithmicLogic += `        do i = 1 to size;\n`;
      algorithmicLogic += `           Treatment = blk[i]; BlockNumber = task_block_num[t_idx]; BlockSize = size;
`;
      algorithmicLogic += `           site_counts[site_idx] = site_counts[site_idx] + 1;
`;
      algorithmicLogic += `           seq_count = site_counts[site_idx];
`;
      
      algorithmicLogic += CodeTranspiler.generateSubjectIdAndChecksumLogic('SAS', ir.subjectIdTokens, 'Site', 'StratumCode', 'seq_count');
      
      algorithmicLogic += `           output;
`;
      algorithmicLogic += `           task_counts[t_idx] = task_counts[t_idx] + 1;
`;
      algorithmicLogic += `           if task_counts[t_idx] >= task_caps[t_idx] then leave;
`;
      algorithmicLogic += `        end;
`;
      algorithmicLogic += `        task_block_num[t_idx] = task_block_num[t_idx] + 1;
`;
      algorithmicLogic += `      end;
`;
      algorithmicLogic += `    end;
`;
      algorithmicLogic += `  end;
`;
      
      return algorithmicLogic;
    }
  }
};
