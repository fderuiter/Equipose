import { FormattingUtil } from './formatting.util';
import { PYTHON_TEMPLATE } from './ir/templates';
import { LanguageConfig } from './framework/language-config';

export const PYTHON_CONFIG: LanguageConfig = {
  language: 'Python',
  indexStart: 0,
  template: PYTHON_TEMPLATE,
  customizeDataSetup: (data, config, ir, method, schema) => {
    data['arms'] = config.arms.map((a: any) => FormattingUtil.escapeString(a.name)).join(', ');
    data['ratios'] = config.arms.map((a: any) => a.ratio).join(', ');
    
    let strataComments = '';
    (config.strata || []).forEach((s: any) => {
        strataComments += `# Stratum: ${FormattingUtil.escapeString(s.id)}, Levels: ${s.levels.map((l: any) => FormattingUtil.escapeString(l)).join(', ')}\n`;
    });
    data['strataComments'] = strataComments.trimEnd();
    data['minimizationParam'] = method === 'MINIMIZATION' ? `p_minimization = ${config.minimizationConfig?.p || 0.8} # maintain precision parity` : '';
  },
  components: {
    initialization: (ir) => {
      let logic = `import re\nschema = []\nseq_count = 0\n`;
      logic += `ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"\n`;
      logic += `block_sizes = [${ir.blockSizes.join(', ')}]\n`;
      logic += `total_ratio = ${ir.totalRatio}\n`;
      logic += `arms = [${ir.arms.map((a: any) => `{"name": "${FormattingUtil.escapeString(a.name)}", "ratio": ${a.ratio}}`).join(', ')}]\n\n`;
      return logic;
    },
    fisherYates: (ir) => ir.templates['Python'].fisherYates,
    buildBlock: (ir) => ir.templates['Python'].buildBlock,
    luhn: `        base_for_luhn = subj_id.replace("{CHECKSUM}", "")\n        digits = re.sub(r'\\D', '', base_for_luhn)\n        chk = "0"\n        if digits:\n            s = 0\n            is_even = False\n            for i in range(len(digits) - 1, -1, -1):\n                d = int(digits[i])\n                if is_even:\n                    d *= 2\n                    if d > 9: d -= 9\n                s += d\n                is_even = not is_even\n            chk = str((10 - (s % 10)) % 10)\n        subj_id = subj_id.replace("{CHECKSUM}", chk)`,
    subjectIdBuilder: (tokens, task) => {
      let baseBuilder = '';
      for (const token of tokens) {
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
          baseBuilder += `"{CHECKSUM}" + `;

        }
      }
      baseBuilder = baseBuilder.slice(0, -3) || '""';
      return `        subj_id = ${baseBuilder}`;
    },
    recordAppend: (task, config) => {
      let formattedStrata = '';
      for (const s of config.strata || []) {
        formattedStrata += `, "${FormattingUtil.escapeString(s.id)}": "${FormattingUtil.escapeString(task.stratumDetails[s.id])}"`;
      }
      return `        schema.append({"SubjectID": subj_id, "Site": "${FormattingUtil.escapeString(task.site)}", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": "${FormattingUtil.escapeString(task.stratumCode)}"${formattedStrata}})`;
    },
    taskLoop: (task, taskLogic, config) => {
      let logic = `count = 0\nblock_num = 1\nwhile count < ${task.cap}:\n`;
      logic += `    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]\n`;
      logic += `    block = build_block(size, total_ratio, arms)\n`;
      logic += `    for trt in block:\n`;
      logic += `        seq_count += 1\n`;
      logic += taskLogic;
      logic += `        count += 1\n`;
      logic += `        if count >= ${task.cap}: break\n`;
      logic += `    block_num += 1\n`;
      return logic;
    }
  }
};
