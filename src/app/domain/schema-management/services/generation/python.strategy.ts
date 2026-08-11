import { FormattingUtil } from './formatting.util';
import { PYTHON_TEMPLATE } from './ir/templates';
import { LanguageConfig } from './framework/language-config';
import { CodeTranspiler } from './ir/transpiler';

export const PYTHON_CONFIG: LanguageConfig = {
  language: 'Python',
  indexStart: 0,
  template: PYTHON_TEMPLATE,
  customizeDataSetup: (data, config, _ir, method, _schema) => {
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
      let logic = `import re\nimport threading\n\n# Global thread synchronization lock to prevent race conditions in multi-user environments\nlock = threading.Lock()\n\nschema = []\nseq_count = 0\n`;
      const hasRnd = ir.subjectIdTokens.some(t => t.type === 'rnd');
      if (hasRnd) {
        logic += `ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"\n`;
      }
      logic += `block_sizes = [${ir.blockSizes.join(', ')}]\n`;
      logic += `total_ratio = ${ir.totalRatio}\n`;
      logic += `arms = [${ir.arms.map((a: any) => `{"name": "${FormattingUtil.escapeString(a.name)}", "ratio": ${a.ratio}}`).join(', ')}]\n\n`;
      return logic;
    },
    fisherYates: (ir) => ir.templates!['Python'].fisherYates,
    buildBlock: (ir) => ir.templates!['Python'].buildBlock,
    roundRobinLoop: (ir, config) => {
      let algorithmicLogic = `tasks = [\n`;
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
      algorithmicLogic += `            rand_int = rng.random_int()\n`;
      algorithmicLogic += `            size = block_sizes[int((rand_int / 4294967296) * len(block_sizes))]\n`;
      algorithmicLogic += `            block = build_block(size, total_ratio, arms)\n`;
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
      return algorithmicLogic;
    }
  }
};
