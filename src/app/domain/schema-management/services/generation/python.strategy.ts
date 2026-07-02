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
      algorithmicLogic += `        j = int((rand_int / 4294967296) * (i + 1))\n`;
      algorithmicLogic += `        block[i], block[j] = block[j], block[i]\n`;
      algorithmicLogic += `    return block\n\n`;

      algorithmicLogic += `tasks = [\n`;
      for (const t of ir.tasks) {
         let strataStr = '';
         for (const s of config.strata || []) {
             strataStr += `"${FormattingUtil.escapeString(s.id)}": "${FormattingUtil.escapeString(t.stratumDetails[s.id])}", `;
         }
         algorithmicLogic += `  {"site": "${FormattingUtil.escapeString(t.site)}", "stratumCode": "${FormattingUtil.escapeString(t.stratumCode)}", "cap": ${t.cap}, "count": 0, "block_num": 1, "strata_dict": {${strataStr}}},\n`;
      }
      algorithmicLogic += `]\n\n`;

      algorithmicLogic += `site_counts = {}\n`;
      algorithmicLogic += `added_in_pass = True\n`;
      algorithmicLogic += `while added_in_pass:\n`;
      algorithmicLogic += `    added_in_pass = False\n`;
      algorithmicLogic += `    for task in tasks:\n`;
      algorithmicLogic += `        if task["count"] < task["cap"]:\n`;
      algorithmicLogic += `            added_in_pass = True\n`;
      algorithmicLogic += `            rand_int = int(rng.bit_generator.random_raw())\n`;
      algorithmicLogic += `            size = block_sizes[int((rand_int / 4294967296) * len(block_sizes))]\n`;
      algorithmicLogic += `            block = build_block(size)\n`;
      algorithmicLogic += `            for trt in block:\n`;
      algorithmicLogic += `                site = task["site"]\n`;
      algorithmicLogic += `                site_counts[site] = site_counts.get(site, 0) + 1\n`;
      algorithmicLogic += `                seq_count = site_counts[site]\n`;
      
      algorithmicLogic += CodeTranspiler.generateSubjectIdAndChecksumLogic('Python', ir.subjectIdTokens, 'task["site"]', 'task["stratumCode"]', 'seq_count');
      
      algorithmicLogic += `                row = {"SubjectID": subj_id, "Site": task["site"], "Treatment": trt, "BlockNumber": task["block_num"], "BlockSize": size, "StratumCode": task["stratumCode"]}\n`;
      algorithmicLogic += `                row.update(task["strata_dict"])\n`;
      algorithmicLogic += `                schema.append(row)\n`;
      algorithmicLogic += `                task["count"] += 1\n`;
      algorithmicLogic += `                if task["count"] >= task["cap"]: break\n`;
      algorithmicLogic += `            task["block_num"] += 1\n`;
    }
    data['algorithmicLogic'] = algorithmicLogic;

    return CodeTranspiler.renderTemplate(PYTHON_TEMPLATE, data);
  }
}
