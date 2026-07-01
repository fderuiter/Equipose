import { Injectable } from '@angular/core';
import { RandomizationConfig } from '../../../core/models/randomization.model';
import { AbstractCodeGenerationStrategy } from './base.strategy';
import { CodeTranspiler } from './ir/transpiler';
import { IrIterationHelper } from './ir/iteration.helper';
import { FormattingUtil } from './formatting.util';
import { PYTHON_TEMPLATE } from './ir/templates';

@Injectable()
export class PythonStrategy extends AbstractCodeGenerationStrategy {
  readonly language = 'Python';

  constructor() {
    super();
  }

  protected override customizeDataSetup(data: Record<string, string | number>, config: RandomizationConfig, ir: any, method: 'BLOCK' | 'MINIMIZATION', schema: any[]): void {
    data['arms'] = config.arms.map(a => FormattingUtil.escapeString(a.name)).join(', ');
    data['ratios'] = config.arms.map(a => a.ratio).join(', ');
    
    let strataComments = '';
    (config.strata || []).forEach(s => {
        strataComments += `# Stratum: ${FormattingUtil.escapeString(s.id)}, Levels: ${s.levels.map(l => FormattingUtil.escapeString(l)).join(', ')}\n`;
    });
    data['strataComments'] = strataComments.trimEnd();
    data['minimizationParam'] = method === 'MINIMIZATION' ? `p_minimization = ${config.minimizationConfig?.p || 0.8} # maintain precision parity` : '';
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
      algorithmicLogic = `schema = [\n${CodeTranspiler.formatStaticSchema(this.language, config, schema)}\n]\n`;
    } else {
      algorithmicLogic = `import re\nschema = []\nseq_count = 0\n`;
      algorithmicLogic += `ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"\n`;
      algorithmicLogic += `block_sizes = [${ir.blockSizes.join(', ')}]\n`;
      algorithmicLogic += `total_ratio = ${ir.totalRatio}\n`;
      algorithmicLogic += `arms = [${ir.arms.map((a: any) => `{"name": "${FormattingUtil.escapeString(a.name)}", "ratio": ${a.ratio}}`).join(', ')}]\n\n`;
      
      algorithmicLogic += `def build_block(size):\n`;
      algorithmicLogic += `    block = []\n`;
      algorithmicLogic += `    multiplier = size / total_ratio\n`;
      algorithmicLogic += `    for arm in arms:\n`;
      algorithmicLogic += `        block.extend([arm["name"]] * int(arm["ratio"] * multiplier))\n`;
      algorithmicLogic += `    for i in range(len(block) - 1, 0, -1):\n`;
      algorithmicLogic += `        rand_int = int(rng.bit_generator.random_raw())\n`;
      algorithmicLogic += `        j = rand_int % (i + 1)\n`;
      algorithmicLogic += `        block[i], block[j] = block[j], block[i]\n`;
      algorithmicLogic += `    return block\n\n`;

      algorithmicLogic += IrIterationHelper.generateForTasksAndStrata(
        config,
        ir.tasks,
        (stratumId, stratumValue) => `, "${FormattingUtil.escapeString(stratumId)}": "${FormattingUtil.escapeString(stratumValue)}"`,
        (task, formattedStrata) => {
          let taskLogic = `count = 0\n`;
          taskLogic += `block_num = 1\n`;
          taskLogic += `while count < ${task.cap}:\n`;
          taskLogic += `    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]\n`;
          taskLogic += `    block = build_block(size)\n`;
          taskLogic += `    for trt in block:\n`;
          taskLogic += `        seq_count += 1\n`;

          let baseBuilder = '';
          let hasChecksum = false;
          for (const token of ir.subjectIdTokens) {
            if (token.type === 'literal') {
              baseBuilder += `"${FormattingUtil.escapeString(token.value)}" + `;
            } else if (token.type === 'site') {
              baseBuilder += `"${FormattingUtil.escapeString(task.site)}" + `;
            } else if (token.type === 'stratum') {
              baseBuilder += `"${FormattingUtil.escapeString(task.stratumCode)}" + `;
            } else if (token.type === 'seq') {
              baseBuilder += `str(seq_count).zfill(${token.length}) + `;
            } else if (token.type === 'rnd') {
              baseBuilder += `''.join(ALPHANUMERIC[int(rng.bit_generator.random_raw()) % len(ALPHANUMERIC)] for _ in range(${token.length})) + `;
            } else if (token.type === 'checksum') {
              hasChecksum = true;
              baseBuilder += `"{CHECKSUM}" + `;
            }
          }
          baseBuilder = baseBuilder.slice(0, -3) || '""';

          taskLogic += `        subj_id = ${baseBuilder}\n`;
          if (hasChecksum) {
            taskLogic += `        base_for_luhn = subj_id.replace("{CHECKSUM}", "")\n`;
            taskLogic += `        digits = re.sub(r'\\D', '', base_for_luhn)\n`;
            taskLogic += `        chk = "0"\n`;
            taskLogic += `        if digits:\n`;
            taskLogic += `            s = 0\n`;
            taskLogic += `            is_even = False\n`;
            taskLogic += `            for i in range(len(digits) - 1, -1, -1):\n`;
            taskLogic += `                d = int(digits[i])\n`;
            taskLogic += `                if is_even:\n`;
            taskLogic += `                    d *= 2\n`;
            taskLogic += `                    if d > 9: d -= 9\n`;
            taskLogic += `                s += d\n`;
            taskLogic += `                is_even = not is_even\n`;
            taskLogic += `            chk = str((10 - (s % 10)) % 10)\n`;
            taskLogic += `        subj_id = subj_id.replace("{CHECKSUM}", chk)\n`;
          }

          taskLogic += `        schema.append({"SubjectID": subj_id, "Site": "${FormattingUtil.escapeString(task.site)}", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": "${FormattingUtil.escapeString(task.stratumCode)}"${formattedStrata}})\n`;
          taskLogic += `        count += 1\n`;
          taskLogic += `        if count >= ${task.cap}: break\n`;
          taskLogic += `    block_num += 1\n`;
          return taskLogic;
        }
      );
    }
    data['algorithmicLogic'] = algorithmicLogic;

    return CodeTranspiler.renderTemplate(PYTHON_TEMPLATE, data);
  }
}
