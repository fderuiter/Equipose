import { RandomizationConfig, GeneratedSchema } from '../../../../core/models/randomization.model';
import { generateRandomizationSchema } from '../../../../randomization-engine/core/randomization-algorithm';
import { FormattingUtil } from '../formatting.util';
import { ReproducibilityUtil } from '../reproducibility.util';
import { R_TEMPLATE, SAS_TEMPLATE, PYTHON_TEMPLATE, STATA_TEMPLATE } from './templates';
import { LogicIR, LogicIRTask } from './ir.model';
import { APP_VERSION } from '../../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../../core/constants/precision.config';

export class CodeTranspiler {
  
  public static renderTemplate(template: string, data: Record<string, string | number>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result.trim() + '\n';
  }

  public static buildIR(config: RandomizationConfig, method: 'BLOCK' | 'MINIMIZATION'): LogicIR {
    const seedHash = ReproducibilityUtil.hashCode(config.seed);
    const totalRatio = config.arms.reduce((sum, a) => sum + a.ratio, 0);

    const capsDict: Record<string, number> = {};
    if (config.stratumCaps) {
      config.stratumCaps.forEach(c => {
        const comboKey = Object.keys(c.levelIds || {}).sort().map(k => `${k}:${c.levelIds[k]}`).join('|');
        capsDict[comboKey] = c.cap;
      });
    }

    let strataCombinations: Record<string, string>[] = [{}];
    for (const factor of config.strata || []) {
      const newCombinations: Record<string, string>[] = [];
      for (const combo of strataCombinations) {
        for (const level of factor.levels) {
          newCombinations.push({ ...combo, [factor.id]: level });
        }
      }
      strataCombinations = newCombinations;
    }

    const tasks: LogicIRTask[] = [];
    for (const site of config.sites || []) {
      for (const stratum of strataCombinations) {
        const sortedKeys = Object.keys(stratum).sort();
        const comboKey = sortedKeys.map(k => `${k}:${stratum[k]}`).join('|');
        const cap = capsDict[comboKey] || 0;
        const stratumCode = (config.strata || []).map(s => (stratum[s.id] || '').substring(0, 3).toUpperCase()).join('-');
        
        if (cap > 0) {
          tasks.push({
            site,
            stratumCode,
            stratumDetails: stratum,
            cap
          });
        }
      }
    }

    return {
      seedHash,
      totalRatio,
      arms: config.arms,
      blockSizes: config.blockSizes || [],
      tasks,
      method,
      minimizationP: config.minimizationConfig?.p || 0.8
    };
  }

  public static formatStaticSchema(lang: 'R'|'Python'|'SAS'|'STATA', config: RandomizationConfig, schema: GeneratedSchema[]): string {
    let schemaRows = '';
    if (lang === 'SAS') {
      for (const row of schema) {
         schemaRows += `  SubjectID="${FormattingUtil.escapeSasString(row.subjectId)}"; ` +
                `Site="${FormattingUtil.escapeSasString(row.site)}"; ` +
                `Treatment="${FormattingUtil.escapeSasString(row.treatmentArm)}"; ` +
                `BlockNumber=${row.blockNumber}; ` +
                `BlockSize=${row.blockSize}; ` +
                `StratumCode="${FormattingUtil.escapeSasString(row.stratumCode)}"; `;
         for (const s of config.strata || []) {
             schemaRows += `  ${FormattingUtil.escapeSasString(s.id)}="${FormattingUtil.escapeSasString(row.stratum[s.id])}"; `;
         }
         schemaRows += `output;\n`;
      }
    } else if (lang === 'STATA') {
      schema.forEach((row, i) => {
         schemaRows += `replace SubjectID=${FormattingUtil.stataLabelQuote(row.subjectId)} in ${i+1}\n`;
         schemaRows += `replace Site=${FormattingUtil.stataLabelQuote(row.site)} in ${i+1}\n`;
         const armName = config.arms.find(a => a.id === row.treatmentArmId)?.name || row.treatmentArmId;
         schemaRows += `replace Treatment=${FormattingUtil.stataLabelQuote(armName)} in ${i+1}\n`;
         schemaRows += `replace BlockNumber=${row.blockNumber} in ${i+1}\n`;
         schemaRows += `replace BlockSize=${row.blockSize} in ${i+1}\n`;
         schemaRows += `replace StratumCode=${FormattingUtil.stataLabelQuote(row.stratumCode)} in ${i+1}\n`;
         (config.strata || []).forEach(s => {
             schemaRows += `replace ${FormattingUtil.sanitizeStataVarName(s.id)}=${FormattingUtil.stataLabelQuote(row.stratum[s.id])} in ${i+1}\n`;
         });
      });
    } else if (lang === 'Python') {
      for (const row of schema) {
         schemaRows += `  {"SubjectID": "${FormattingUtil.escapeString(row.subjectId)}", "Site": "${FormattingUtil.escapeString(row.site)}", "Treatment": "${FormattingUtil.escapeString(row.treatmentArm)}", "BlockNumber": ${row.blockNumber}, "BlockSize": ${row.blockSize}, "StratumCode": "${FormattingUtil.escapeString(row.stratumCode)}"`;
         for (const s of config.strata || []) {
             schemaRows += `, "${FormattingUtil.escapeString(s.id)}": "${FormattingUtil.escapeString(row.stratum[s.id])}"`;
         }
         schemaRows += `},\n`;
      }
    } else if (lang === 'R') {
      schema.forEach((row, i) => {
         schemaRows += `schema_list[[${i+1}]] <- data.frame("SubjectID"="${FormattingUtil.escapeString(row.subjectId)}", "Site"="${FormattingUtil.escapeString(row.site)}", "Treatment"="${FormattingUtil.escapeString(row.treatmentArm)}", "BlockNumber"=${row.blockNumber}, "BlockSize"=${row.blockSize}, "StratumCode"="${FormattingUtil.escapeString(row.stratumCode)}"`;
         for (const s of config.strata || []) {
             schemaRows += `, "${FormattingUtil.escapeString(s.id)}"="${FormattingUtil.escapeString(row.stratum[s.id])}"`;
         }
         schemaRows += `, stringsAsFactors=FALSE)\n`;
      });
    }
    return schemaRows.trimEnd();
  }

}
