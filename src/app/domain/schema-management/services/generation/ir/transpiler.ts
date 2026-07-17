import { RandomizationConfig, GeneratedSchema } from '../../../../core/models/randomization.model';

import { FormattingUtil } from '../formatting.util';
import { ReproducibilityUtil } from '../reproducibility.util';

import { LogicIR, LogicIRTask, SubjectIdToken } from './ir.model';



import { simplifyRatios } from '../../../../shared/statistical/ratio-simplification';
import { formatStratumCode } from '../../../../shared/statistical/stratum-format';
import { ALGORITHM_TEMPLATES } from '../../../../shared/templates/algorithm-templates';

export class CodeTranspiler {
  
  public static renderTemplate(template: string, data: Record<string, string | number>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result.trim() + '\n';
  }

  private static parseSubjectIdMask(mask: string): SubjectIdToken[] {
    if (/\[SiteID\]|\[StratumCode\]|\[0+1\]/.test(mask)) {
      console.warn(`Deprecated legacy bracket token found in mask: ${mask}. Please migrate to curly-brace tokens.`);
    }
    const tokens: SubjectIdToken[] = [];
    const regex = /(\{SITE\}|\{STRATUM\}|\{SEQ:\d+\}|\{RND:\d+\}|\{CHECKSUM\}|\[SiteID\]|\[StratumCode\]|\[0+1\])/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(mask)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'literal', value: mask.slice(lastIndex, match.index) });
      }
      const tokenStr = match[0];
      if (tokenStr === '{SITE}' || tokenStr === '[SiteID]') {
        tokens.push({ type: 'site' });
      } else if (tokenStr === '{STRATUM}' || tokenStr === '[StratumCode]') {
        tokens.push({ type: 'stratum' });
      } else if (tokenStr === '{CHECKSUM}') {
        tokens.push({ type: 'checksum' });
      } else if (tokenStr.startsWith('{SEQ:')) {
        const length = parseInt(tokenStr.slice(5, -1), 10);
        tokens.push({ type: 'seq', length });
      } else if (tokenStr.startsWith('{RND:')) {
        const length = parseInt(tokenStr.slice(5, -1), 10);
        tokens.push({ type: 'rnd', length });
      } else if (tokenStr.startsWith('[0') && tokenStr.endsWith('1]')) {
        const length = tokenStr.length - 2; // e.g. [01] -> length 4 - 2 = 2
        tokens.push({ type: 'seq', length });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < mask.length) {
      tokens.push({ type: 'literal', value: mask.slice(lastIndex) });
    }
    return tokens;
  }

  public static buildIR(config: RandomizationConfig, method: 'BLOCK' | 'MINIMIZATION'): LogicIR {
    const seedHash = ReproducibilityUtil.hashCode(config.seed);
    const simplifiedArms = simplifyRatios(config.arms);
    const totalRatio = simplifiedArms.reduce((sum, a) => sum + a.ratio, 0);

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
    for (const stratum of strataCombinations) {
      for (const site of config.sites || []) {
        const sortedKeys = Object.keys(stratum).sort();
        const comboKey = sortedKeys.map(k => `${k}:${stratum[k]}`).join('|');
        const cap = capsDict[comboKey] || 0;
        const stratumCode = formatStratumCode(config.strata || [], stratum);
        
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

    const subjectIdTokens = CodeTranspiler.parseSubjectIdMask(config.subjectIdMask || '[SiteID]-[StratumCode]-[0001]');

    return {
      seedHash,
      totalRatio,
      arms: simplifiedArms,
      blockSizes: config.blockSizes || [],
      tasks,
      method,
      minimizationP: config.minimizationConfig?.p || 0.8,
      subjectIdTokens,
      templates: ALGORITHM_TEMPLATES
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
      schemaRows += `schema = [\n`;
      for (const row of schema) {
         schemaRows += `  {"SubjectID": "${FormattingUtil.escapeString(row.subjectId)}", "Site": "${FormattingUtil.escapeString(row.site)}", "Treatment": "${FormattingUtil.escapeString(row.treatmentArm)}", "BlockNumber": ${row.blockNumber}, "BlockSize": ${row.blockSize}, "StratumCode": "${FormattingUtil.escapeString(row.stratumCode)}"`;
         for (const s of config.strata || []) {
             schemaRows += `, "${FormattingUtil.escapeString(s.id)}": "${FormattingUtil.escapeString(row.stratum[s.id])}"`;
         }
         schemaRows += `},\n`;
      }
      schemaRows += `]\n`;
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

  public static generateSubjectIdAndChecksumLogic(lang: 'R'|'Python'|'SAS'|'STATA', tokens: SubjectIdToken[], siteVar: string, stratumVar: string, seqVar: string): string {
    let code = '';
    
    // R implementation
    if (lang === 'R') {
       let baseBuilder = '';
       let hasChecksum = false;
       for (const token of tokens) {
         if (token.type === 'literal') {
           baseBuilder += `"${FormattingUtil.escapeString(token.value)}", `;
         } else if (token.type === 'site') {
           baseBuilder += `${siteVar}, `;
         } else if (token.type === 'stratum') {
           baseBuilder += `${stratumVar}, `;
         } else if (token.type === 'seq') {
           baseBuilder += `sprintf("%0${token.length}d", ${seqVar}), `;
         } else if (token.type === 'rnd') {
           baseBuilder += `paste0(ALPHANUMERIC[floor((random_int() / 4294967296) * 36) + 1][1:${token.length}], collapse=""), `;
         } else if (token.type === 'checksum') {
           hasChecksum = true;
           baseBuilder += `"{CHECKSUM}", `;
         }
       }
       baseBuilder = baseBuilder.slice(0, -2);
       code += `        subj_id <- paste0(${baseBuilder})\n`;
       if (hasChecksum) {
         code += `        base_for_luhn <- gsub("{CHECKSUM}", "", subj_id, fixed=TRUE)\n`;
         code += `        digits <- gsub("\\\\D", "", base_for_luhn)\n`;
         code += `        chk <- "0"\n`;
         code += `        if (nchar(digits) > 0) {\n`;
         code += `          s <- 0\n`;
         code += `          is_even <- FALSE\n`;
         code += `          for (i in seq(nchar(digits), 1, by=-1)) {\n`;
         code += `            d <- as.numeric(substr(digits, i, i))\n`;
         code += `            if (is_even) {\n`;
         code += `              d <- d * 2\n`;
         code += `              if (d > 9) d <- d - 9\n`;
         code += `            }\n`;
         code += `            s <- s + d\n`;
         code += `            is_even <- !is_even\n`;
         code += `          }\n`;
         code += `          chk <- as.character((10 - (s %% 10)) %% 10)\n`;
         code += `        }\n`;
         code += `        subj_id <- sub("{CHECKSUM}", chk, subj_id, fixed=TRUE)\n`;
       }
    }
    // Python implementation
    else if (lang === 'Python') {
       let baseBuilder = '';
       let hasChecksum = false;
       for (const token of tokens) {
         if (token.type === 'literal') {
           baseBuilder += `"${FormattingUtil.escapeString(token.value)}" + `;
         } else if (token.type === 'site') {
           baseBuilder += `${siteVar} + `;
         } else if (token.type === 'stratum') {
           baseBuilder += `${stratumVar} + `;
         } else if (token.type === 'seq') {
           baseBuilder += `str(${seqVar}).zfill(${token.length}) + `;
         } else if (token.type === 'rnd') {
           baseBuilder += `''.join(ALPHANUMERIC[int((rng.bit_generator.random_raw() / 4294967296) * 36)] for _ in range(${token.length})) + `;
         } else if (token.type === 'checksum') {
           hasChecksum = true;
           baseBuilder += `"{CHECKSUM}" + `;
         }
       }
       baseBuilder = baseBuilder.slice(0, -3) || '""';
       code += `                subj_id = ${baseBuilder}\n`;
       if (hasChecksum) {
         code += `                base_for_luhn = subj_id.replace("{CHECKSUM}", "")\n`;
         code += `                digits = re.sub(r'\\D', '', base_for_luhn)\n`;
         code += `                chk = "0"\n`;
         code += `                if digits:\n`;
         code += `                    s = 0\n`;
         code += `                    is_even = False\n`;
         code += `                    for i in range(len(digits) - 1, -1, -1):\n`;
         code += `                        d = int(digits[i])\n`;
         code += `                        if is_even:\n`;
         code += `                            d *= 2\n`;
         code += `                            if d > 9: d -= 9\n`;
         code += `                        s += d\n`;
         code += `                        is_even = not is_even\n`;
         code += `                    chk = str((10 - (s % 10)) % 10)\n`;
         code += `                subj_id = subj_id.replace("{CHECKSUM}", chk)\n`;
       }
    }
    // SAS implementation
    else if (lang === 'SAS') {
       let baseBuilder = '';
       let hasChecksum = false;
       let rndCounter = 1;
       for (const token of tokens) {
         if (token.type === 'literal') {
           baseBuilder += `"${FormattingUtil.escapeSasString(token.value)}" || `;
         } else if (token.type === 'site') {
           baseBuilder += `${siteVar} || `;
         } else if (token.type === 'stratum') {
           baseBuilder += `${stratumVar} || `;
         } else if (token.type === 'seq') {
           baseBuilder += `put(${seqVar}, z${token.length}.) || `;
         } else if (token.type === 'rnd') {
           code += `        length rnd_str_${rndCounter} $ ${token.length};\n`;
           code += `        rnd_str_${rndCounter} = "";\n`;
           code += `        do _k = 1 to ${token.length};\n`;
           code += `          link get_rand_int;\n`;
           code += `          char_idx = int((rand_int / 4294967296) * 36) + 1;\n`;
           code += `          rnd_str_${rndCounter} = trim(rnd_str_${rndCounter}) || substr(ALPHANUMERIC, char_idx, 1);\n`;
           code += `        end;\n`;
           baseBuilder += `trim(rnd_str_${rndCounter}) || `;
           rndCounter++;
         } else if (token.type === 'checksum') {
           hasChecksum = true;
           baseBuilder += `"{CHECKSUM}" || `;
         }
       }
       baseBuilder = baseBuilder.slice(0, -4) || '""';
       code += `        SubjectID = ${baseBuilder};\n`;
       if (hasChecksum) {
         code += `        if index(SubjectID, "{CHECKSUM}") > 0 then do;\n`;
         code += `          base_for_luhn = tranwrd(SubjectID, "{CHECKSUM}", "");\n`;
         code += `          digits = prxchange('s/\\D//', -1, trim(base_for_luhn));\n`;
         code += `          chk = "0";\n`;
         code += `          if length(trim(digits)) > 0 then do;\n`;
         code += `            s = 0;\n`;
         code += `            is_even = 0;\n`;
         code += `            do _i = length(trim(digits)) to 1 by -1;\n`;
         code += `              d = input(substr(trim(digits), _i, 1), 1.);\n`;
         code += `              if is_even then do;\n`;
         code += `                d = d * 2;\n`;
         code += `                if d > 9 then d = d - 9;\n`;
         code += `              end;\n`;
         code += `              s = s + d;\n`;
         code += `              if is_even = 1 then is_even = 0; else is_even = 1;\n`;
         code += `            end;\n`;
         code += `            chk = put(mod(10 - mod(s, 10), 10), 1.);\n`;
         code += `          end;\n`;
         code += `          SubjectID = tranwrd(SubjectID, "{CHECKSUM}", trim(left(chk)));\n`;
         code += `        end;\n`;
       }
    }
    // STATA implementation
    else if (lang === 'STATA') {
       let baseBuilder = '';
       let hasChecksum = false;
       for (const token of tokens) {
         if (token.type === 'literal') {
           baseBuilder += `"${FormattingUtil.escapeString(token.value)}" + `;
         } else if (token.type === 'site') {
           baseBuilder += `${siteVar} + `;
         } else if (token.type === 'stratum') {
           baseBuilder += `${stratumVar} + `;
         } else if (token.type === 'seq') {
           baseBuilder += `sprintf("%0${token.length}.0f", ${seqVar}) + `;
         } else if (token.type === 'rnd') {
           baseBuilder += `stata_rnd_str(${token.length}) + `;
         } else if (token.type === 'checksum') {
           hasChecksum = true;
           baseBuilder += `"{CHECKSUM}" + `;
         }
       }
       baseBuilder = baseBuilder.slice(0, -3) || '""';
       code += `        subj_id = ${baseBuilder}\n`;
       if (hasChecksum) {
         code += `        subj_id = luhn_checksum(subj_id)\n`;
       }
    }
    
    return code;
  }

}
