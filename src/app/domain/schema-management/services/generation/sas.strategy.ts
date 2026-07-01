import { Injectable } from '@angular/core';
import { RandomizationConfig, RandomizationResult } from '../../../core/models/randomization.model';
import { CodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { SAS_TEMPLATE } from './ir/templates';
import { generateRandomizationSchema } from '../../../randomization-engine/core/randomization-algorithm';
import { APP_VERSION } from '../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../core/constants/precision.config';

@Injectable()
export class SasStrategy implements CodeGenerationStrategy {
  readonly language = 'SAS';

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
          ir.blockSizes.forEach((bs, i) => {
             if (i===0) taskLogic += `     if size_idx=0 then size=${bs};\n`;
             else taskLogic += `     else if size_idx=${i} then size=${bs};\n`;
          });
          taskLogic += `     idx = 1;\n`;
          for (const arm of ir.arms) {
             taskLogic += `     do i = 1 to (size / ${ir.totalRatio}) * ${arm.ratio}; blk[idx] = "${FormattingUtil.escapeSasString(arm.name)}"; idx=idx+1; end;\n`;
          }
          taskLogic += `     do i = size to 2 by -1;\n`;
          taskLogic += `        link get_rand_int; j = mod(rand_int, i) + 1;\n`;
          taskLogic += `        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;\n`;
          taskLogic += `     end;\n`;
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
            taskLogic += `        if index(SubjectID, "{CHECKSUM}") > 0 then do;\n`;
            taskLogic += `          base_for_luhn = tranwrd(SubjectID, "{CHECKSUM}", "");\n`;
            taskLogic += `          digits = prxchange('s/\\D//', -1, trim(base_for_luhn));\n`;
            taskLogic += `          chk = "0";\n`;
            taskLogic += `          if length(trim(digits)) > 0 then do;\n`;
            taskLogic += `            s = 0;\n`;
            taskLogic += `            is_even = 0;\n`;
            taskLogic += `            do _i = length(trim(digits)) to 1 by -1;\n`;
            taskLogic += `              d = input(substr(trim(digits), _i, 1), 1.);\n`;
            taskLogic += `              if is_even then do;\n`;
            taskLogic += `                d = d * 2;\n`;
            taskLogic += `                if d > 9 then d = d - 9;\n`;
            taskLogic += `              end;\n`;
            taskLogic += `              s = s + d;\n`;
            taskLogic += `              if is_even = 1 then is_even = 0; else is_even = 1;\n`;
            taskLogic += `            end;\n`;
            taskLogic += `            chk = put(mod(10 - mod(s, 10), 10), 1.);\n`;
            taskLogic += `          end;\n`;
            taskLogic += `          SubjectID = tranwrd(SubjectID, "{CHECKSUM}", trim(left(chk)));\n`;
            taskLogic += `        end;\n`;
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
