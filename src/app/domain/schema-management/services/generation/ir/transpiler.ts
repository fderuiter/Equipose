import { RandomizationConfig, GeneratedSchema } from '../../../../core/models/randomization.model';
import { generateRandomizationSchema } from '../../../../randomization-engine/core/randomization-algorithm';
import { FormattingUtil } from '../formatting.util';
import { ReproducibilityUtil } from '../reproducibility.util';
import { R_TEMPLATE, SAS_TEMPLATE, PYTHON_TEMPLATE, STATA_TEMPLATE } from './templates';
import { LogicIR, LogicIRTask } from './ir.model';
import { APP_VERSION } from '../../../../../../environments/version';
import { PRECISION_EPSILON, PRECISION_SCALE } from '../../../../../core/constants/precision.config';

export class CodeTranspiler {
  
  private static renderTemplate(template: string, data: Record<string, string | number>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result.trim() + '\n';
  }

  private static buildIR(config: RandomizationConfig, method: 'BLOCK' | 'MINIMIZATION'): LogicIR {
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

  private static formatStaticSchema(lang: 'R'|'Python'|'SAS'|'STATA', config: RandomizationConfig, schema: GeneratedSchema[]): string {
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
         schemaRows += `  {"SubjectID": "${FormattingUtil.escapePythonString(row.subjectId)}", "Site": "${FormattingUtil.escapePythonString(row.site)}", "Treatment": "${FormattingUtil.escapePythonString(row.treatmentArm)}", "BlockNumber": ${row.blockNumber}, "BlockSize": ${row.blockSize}, "StratumCode": "${FormattingUtil.escapePythonString(row.stratumCode)}"`;
         for (const s of config.strata || []) {
             schemaRows += `, "${FormattingUtil.escapePythonString(s.id)}": "${FormattingUtil.escapePythonString(row.stratum[s.id])}"`;
         }
         schemaRows += `},\n`;
      }
    } else if (lang === 'R') {
      schema.forEach((row, i) => {
         schemaRows += `schema_list[[${i+1}]] <- data.frame("SubjectID"="${FormattingUtil.escapeRString(row.subjectId)}", "Site"="${FormattingUtil.escapeRString(row.site)}", "Treatment"="${FormattingUtil.escapeRString(row.treatmentArm)}", "BlockNumber"=${row.blockNumber}, "BlockSize"=${row.blockSize}, "StratumCode"="${FormattingUtil.escapeRString(row.stratumCode)}"`;
         for (const s of config.strata || []) {
             schemaRows += `, "${FormattingUtil.escapeRString(s.id)}"="${FormattingUtil.escapeRString(row.stratum[s.id])}"`;
         }
         schemaRows += `, stringsAsFactors=FALSE)\n`;
      });
    }
    return schemaRows.trimEnd();
  }

  static transpile(lang: 'R'|'Python'|'SAS'|'STATA', config: RandomizationConfig, method: 'BLOCK' | 'MINIMIZATION'): string {
    const isComplex = method === 'MINIMIZATION' || 
                      config.capStrategy === 'MARGINAL_ONLY' || 
                      (config.globalBlockStrategy && config.globalBlockStrategy.selectionType !== 'RANDOM_POOL') ||
                      (config.globalBlockStrategy && config.globalBlockStrategy.limits && Object.keys(config.globalBlockStrategy.limits).length > 0) ||
                      (config.siteBlockOverrides && Object.keys(config.siteBlockOverrides).length > 0) || 
                      (config.stratumBlockOverrides && Object.keys(config.stratumBlockOverrides).length > 0);
    
    const result = generateRandomizationSchema(config);
    const schema = result.schema;
    const resolvedConfig = { ...config, seed: result.metadata.seed };
    const ir = this.buildIR(resolvedConfig, method);

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

    let algorithmicLogic = '';

    if (lang === 'Python') {
      if (isComplex) {
        algorithmicLogic = `schema = [\n${this.formatStaticSchema(lang, config, schema)}\n]\n`;
      } else {
        // Python logical block generation
        algorithmicLogic = `import re\nschema = []\nseq_count = 0\n`;
        algorithmicLogic += `block_sizes = [${ir.blockSizes.join(', ')}]\n`;
        algorithmicLogic += `total_ratio = ${ir.totalRatio}\n`;
        algorithmicLogic += `arms = [${ir.arms.map(a => `{"name": "${FormattingUtil.escapePythonString(a.name)}", "ratio": ${a.ratio}}`).join(', ')}]\n\n`;
        
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

        for (const task of ir.tasks) {
          let extraStrata = '';
          for (const s of config.strata || []) {
            extraStrata += `, "${FormattingUtil.escapePythonString(s.id)}": "${FormattingUtil.escapePythonString(task.stratumDetails[s.id])}"`;
          }

          algorithmicLogic += `count = 0\n`;
          algorithmicLogic += `block_num = 1\n`;
          algorithmicLogic += `while count < ${task.cap}:\n`;
          algorithmicLogic += `    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]\n`;
          algorithmicLogic += `    block = build_block(size)\n`;
          algorithmicLogic += `    for trt in block:\n`;
          algorithmicLogic += `        seq_count += 1\n`;
          algorithmicLogic += `        subj_id = "${FormattingUtil.escapePythonString(config.subjectIdMask)}".replace("{SITE}", "${FormattingUtil.escapePythonString(task.site)}").replace("{STRATUM}", "${FormattingUtil.escapePythonString(task.stratumCode)}")\n`;
          algorithmicLogic += `        subj_id = re.sub(r'\\{SEQ:(\\d+)\\}', lambda m: str(seq_count).zfill(int(m.group(1))), subj_id)\n`;
          algorithmicLogic += `        schema.append({"SubjectID": subj_id, "Site": "${FormattingUtil.escapePythonString(task.site)}", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": "${FormattingUtil.escapePythonString(task.stratumCode)}"${extraStrata}})\n`;
          algorithmicLogic += `        count += 1\n`;
          algorithmicLogic += `        if count >= ${task.cap}: break\n`;
          algorithmicLogic += `    block_num += 1\n`;
        }
      }
      data['algorithmicLogic'] = algorithmicLogic;
      data['arms'] = config.arms.map(a => FormattingUtil.escapePythonString(a.name)).join(', ');
      data['ratios'] = config.arms.map(a => a.ratio).join(', ');
      
      let strataComments = '';
      (config.strata || []).forEach(s => {
          strataComments += `# Stratum: ${FormattingUtil.escapePythonString(s.id)}, Levels: ${s.levels.map(l => FormattingUtil.escapePythonString(l)).join(', ')}\n`;
      });
      data['strataComments'] = strataComments.trimEnd();
      data['minimizationParam'] = method === 'MINIMIZATION' ? `p_minimization = ${config.minimizationConfig?.p || 0.8} # maintain precision parity` : '';

      return this.renderTemplate(PYTHON_TEMPLATE, data);
    } else if (lang === 'SAS') {
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

      if (isComplex) {
        algorithmicLogic = this.formatStaticSchema(lang, config, schema);
      } else {
        algorithmicLogic += `  array blk[1000] $50 _temporary_;\n`;
        algorithmicLogic += `  seq_count = 0;\n`;
        for (const task of ir.tasks) {
          algorithmicLogic += `  /* Task: ${FormattingUtil.escapeSasString(task.site)} ${FormattingUtil.escapeSasString(task.stratumCode)} */\n`;
          algorithmicLogic += `  Site = "${FormattingUtil.escapeSasString(task.site)}"; StratumCode = "${FormattingUtil.escapeSasString(task.stratumCode)}";\n`;
          for (const s of config.strata || []) {
             algorithmicLogic += `  ${FormattingUtil.escapeSasString(s.id)}="${FormattingUtil.escapeSasString(task.stratumDetails[s.id])}";\n`;
          }
          algorithmicLogic += `  cap = ${task.cap};\n`;
          algorithmicLogic += `  count = 0; block_num = 1;\n`;
          algorithmicLogic += `  do while(count < cap);\n`;
          algorithmicLogic += `     link get_rand_int; size_idx = mod(rand_int, ${ir.blockSizes.length});\n`;
          ir.blockSizes.forEach((bs, i) => {
             if (i===0) algorithmicLogic += `     if size_idx=0 then size=${bs};\n`;
             else algorithmicLogic += `     else if size_idx=${i} then size=${bs};\n`;
          });
          algorithmicLogic += `     idx = 1;\n`;
          for (const arm of ir.arms) {
             algorithmicLogic += `     do i = 1 to (size / ${ir.totalRatio}) * ${arm.ratio}; blk[idx] = "${FormattingUtil.escapeSasString(arm.name)}"; idx=idx+1; end;\n`;
          }
          algorithmicLogic += `     do i = size to 2 by -1;\n`;
          algorithmicLogic += `        link get_rand_int; j = mod(rand_int, i) + 1;\n`;
          algorithmicLogic += `        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;\n`;
          algorithmicLogic += `     end;\n`;
          algorithmicLogic += `     do i = 1 to size;\n`;
          algorithmicLogic += `        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;\n`;
          algorithmicLogic += `        seq_count = seq_count + 1;\n`;
          algorithmicLogic += `        SubjectID = "${FormattingUtil.escapeSasString(config.subjectIdMask)}";\n`;
          algorithmicLogic += `        SubjectID = tranwrd(SubjectID, "{SITE}", "${FormattingUtil.escapeSasString(task.site)}");\n`;
          algorithmicLogic += `        SubjectID = tranwrd(SubjectID, "{STRATUM}", "${FormattingUtil.escapeSasString(task.stratumCode)}");\n`;
          algorithmicLogic += `        SubjectID = prxchange('s/\{SEQ:(\d+)\}/' || put(seq_count, z3.) || '/', -1, SubjectID);\n`; // Naive replace for sas
          algorithmicLogic += `        output;\n`;
          algorithmicLogic += `        count = count + 1;\n`;
          algorithmicLogic += `        if count >= cap then leave;\n`;
          algorithmicLogic += `     end;\n`;
          algorithmicLogic += `     block_num = block_num + 1;\n`;
          algorithmicLogic += `  end;\n`;
        }
      }
      data['algorithmicLogic'] = algorithmicLogic;
      return this.renderTemplate(SAS_TEMPLATE, data);
    } else if (lang === 'STATA') {
      let armsVars = '';
      config.arms.forEach((a, i) => {
        armsVars += `local arm_name_${i + 1} ${FormattingUtil.stataLabelQuote(a.name)}\n`;
      });
      data['armsVars'] = armsVars.trim();

      let strataComments = '';
      (config.strata || []).forEach((s, i) => {
         strataComments += `local strata_${i+1} ${FormattingUtil.stataLabelQuote(FormattingUtil.sanitizeStataVarName(s.id))}\n`;
         s.levels.forEach(l => {
             strataComments += `* Level: ${FormattingUtil.stataLabelQuote(l)}\n`;
         });
      });
      data['strataComments'] = strataComments.trim();
      data['ratios'] = config.arms.map(a => a.ratio).join(', ');

      data['minimizationParam'] = method === 'MINIMIZATION' ? `local p_minimization = round(${config.minimizationConfig?.p || 0.8}, ${PRECISION_EPSILON}) // Stata ${PRECISION_EPSILON} precision handled` : '';
      
      let blockSizesParam = '';
      if (method === 'BLOCK') {
         config.blockSizes.forEach((b, i) => blockSizesParam += `local block_${i+1} ${b}\n`);
         blockSizesParam += `local cap = 0`;
      }
      data['blockSizesParam'] = blockSizesParam.trim();

      data['schemaLength'] = schema.length || 1;

      let strataLength = '';
      (config.strata || []).forEach(s => strataLength += `gen str50 ${FormattingUtil.sanitizeStataVarName(s.id)} = ""\n`);
      data['strataLength'] = strataLength.trimEnd();

      if (isComplex) {
        algorithmicLogic = this.formatStaticSchema(lang, config, schema);
      } else {
        algorithmicLogic += `block_sizes = (${ir.blockSizes.join(',')})\n`;
        algorithmicLogic += `total_ratio = ${ir.totalRatio}\n`;
        algorithmicLogic += `arms = (${ir.arms.map(a => `"${FormattingUtil.escapeSasString(a.name)}"`).join(',')})\n`;
        algorithmicLogic += `arm_ratios = (${ir.arms.map(a => a.ratio).join(',')})\n\n`;

        algorithmicLogic += `string rowvector build_block(real scalar size) {\n`;
        algorithmicLogic += `    string rowvector block\n`;
        algorithmicLogic += `    real scalar multiplier, i, j, arm_idx, k\n`;
        algorithmicLogic += `    string scalar temp\n`;
        algorithmicLogic += `    block = J(1, 0, "")\n`;
        algorithmicLogic += `    multiplier = size / total_ratio\n`;
        algorithmicLogic += `    for (arm_idx=1; arm_idx<=cols(arms); arm_idx++) {\n`;
        algorithmicLogic += `        for (k=1; k<=arm_ratios[arm_idx] * multiplier; k++) {\n`;
        algorithmicLogic += `            block = block, arms[arm_idx]\n`;
        algorithmicLogic += `        }\n`;
        algorithmicLogic += `    }\n`;
        algorithmicLogic += `    for (i=cols(block); i>=2; i--) {\n`;
        algorithmicLogic += `        j = mod(random_int(), i) + 1\n`;
        algorithmicLogic += `        temp = block[i]; block[i] = block[j]; block[j] = temp\n`;
        algorithmicLogic += `    }\n`;
        algorithmicLogic += `    return(block)\n`;
        algorithmicLogic += `}\n\n`;

        algorithmicLogic += `schema_out = J(0, ${6 + (config.strata?.length || 0)}, "")\n`;
        algorithmicLogic += `seq_count = 0\n`;

        for (const task of ir.tasks) {
          algorithmicLogic += `count = 0\n`;
          algorithmicLogic += `block_num = 1\n`;
          algorithmicLogic += `while (count < ${task.cap}) {\n`;
          algorithmicLogic += `    size = block_sizes[mod(random_int(), cols(block_sizes)) + 1]\n`;
          algorithmicLogic += `    block = build_block(size)\n`;
          algorithmicLogic += `    for (i=1; i<=cols(block); i++) {\n`;
          algorithmicLogic += `        seq_count = seq_count + 1\n`;
          // Basic ID mockup for Stata testing since string replace in Mata is limited
          algorithmicLogic += `        subj_id = "${FormattingUtil.escapeSasString(task.site)}-${FormattingUtil.escapeSasString(task.stratumCode)}-" + strofreal(seq_count, "%03.0f")\n`;
          
          let extraStrata = '';
          for (const s of config.strata || []) {
              extraStrata += `, "${FormattingUtil.escapeSasString(task.stratumDetails[s.id])}"`;
          }

          algorithmicLogic += `        schema_out = schema_out \\ (subj_id, "${FormattingUtil.escapeSasString(task.site)}", block[i], strofreal(block_num), strofreal(size), "${FormattingUtil.escapeSasString(task.stratumCode)}"${extraStrata})\n`;
          algorithmicLogic += `        count = count + 1\n`;
          algorithmicLogic += `        if (count >= ${task.cap}) break\n`;
          algorithmicLogic += `    }\n`;
          algorithmicLogic += `    block_num = block_num + 1\n`;
          algorithmicLogic += `}\n`;
        }

        // Export from Mata to Stata
        algorithmicLogic += `st_addobs(rows(schema_out))\n`;
        algorithmicLogic += `st_addvar("str20", "SubjectID"); st_sstore(., "SubjectID", schema_out[., 1])\n`;
        algorithmicLogic += `st_addvar("str20", "Site"); st_sstore(., "Site", schema_out[., 2])\n`;
        algorithmicLogic += `st_addvar("str50", "Treatment"); st_sstore(., "Treatment", schema_out[., 3])\n`;
        algorithmicLogic += `st_addvar("double", "BlockNumber"); st_store(., "BlockNumber", strtoreal(schema_out[., 4]))\n`;
        algorithmicLogic += `st_addvar("double", "BlockSize"); st_store(., "BlockSize", strtoreal(schema_out[., 5]))\n`;
        algorithmicLogic += `st_addvar("str50", "StratumCode"); st_sstore(., "StratumCode", schema_out[., 6])\n`;

        (config.strata || []).forEach((s, idx) => {
            algorithmicLogic += `st_addvar("str50", "${FormattingUtil.sanitizeStataVarName(s.id)}"); st_sstore(., "${FormattingUtil.sanitizeStataVarName(s.id)}", schema_out[., ${7 + idx}])\n`;
        });
      }
      data['algorithmicLogic'] = algorithmicLogic;
      return this.renderTemplate(STATA_TEMPLATE, data);
    } else if (lang === 'R') {
      data['arms'] = config.arms.map(a => FormattingUtil.escapeRString(a.name)).join(', ');
      data['ratios'] = config.arms.map(a => a.ratio).join(', ');
      
      let strataComments = '';
      (config.strata || []).forEach(s => {
          strataComments += `# Stratum: ${FormattingUtil.escapeRString(s.id)}, Levels: ${s.levels.map(l => FormattingUtil.escapeRString(l)).join(', ')}\n`;
      });
      data['strataComments'] = strataComments.trimEnd();
      data['minimizationParam'] = method === 'MINIMIZATION' ? `p_minimization <- ${config.minimizationConfig?.p || 0.8} # maintain precision parity` : '';

      if (isComplex) {
        algorithmicLogic = this.formatStaticSchema(lang, config, schema);
      } else {
        algorithmicLogic += `block_sizes <- c(${ir.blockSizes.join(', ')})\n`;
        algorithmicLogic += `total_ratio <- ${ir.totalRatio}\n`;
        
        let armsR = ir.arms.map(a => `list(name="${FormattingUtil.escapeRString(a.name)}", ratio=${a.ratio})`).join(', ');
        algorithmicLogic += `arms <- list(${armsR})\n\n`;

        algorithmicLogic += `build_block <- function(size) {\n`;
        algorithmicLogic += `  block <- character(0)\n`;
        algorithmicLogic += `  multiplier <- size / total_ratio\n`;
        algorithmicLogic += `  for (arm in arms) {\n`;
        algorithmicLogic += `    block <- c(block, rep(arm$name, as.integer(arm$ratio * multiplier)))\n`;
        algorithmicLogic += `  }\n`;
        algorithmicLogic += `  if (length(block) > 1) {\n`;
        algorithmicLogic += `    for (i in length(block):2) {\n`;
        algorithmicLogic += `      j <- (random_int() %% i) + 1\n`;
        algorithmicLogic += `      temp <- block[i]; block[i] <- block[j]; block[j] <- temp\n`;
        algorithmicLogic += `    }\n`;
        algorithmicLogic += `  }\n`;
        algorithmicLogic += `  return(block)\n`;
        algorithmicLogic += `}\n\n`;

        algorithmicLogic += `seq_count <- 0\n`;
        for (const task of ir.tasks) {
          algorithmicLogic += `count <- 0\n`;
          algorithmicLogic += `block_num <- 1\n`;
          algorithmicLogic += `while (count < ${task.cap}) {\n`;
          algorithmicLogic += `  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]\n`;
          algorithmicLogic += `  block <- build_block(size)\n`;
          algorithmicLogic += `  for (trt in block) {\n`;
          algorithmicLogic += `    seq_count <- seq_count + 1\n`;
          // R naive replace for subject ID
          algorithmicLogic += `    subj_id <- "${FormattingUtil.escapeRString(config.subjectIdMask)}"\n`;
          algorithmicLogic += `    subj_id <- gsub("{SITE}", "${FormattingUtil.escapeRString(task.site)}", subj_id, fixed=TRUE)\n`;
          algorithmicLogic += `    subj_id <- gsub("{STRATUM}", "${FormattingUtil.escapeRString(task.stratumCode)}", subj_id, fixed=TRUE)\n`;
          algorithmicLogic += `    subj_id <- sub("\\\\{SEQ:[0-9]+\\\\}", sprintf("%03d", seq_count), subj_id)\n`;
          
          let extraStrata = '';
          for (const s of config.strata || []) {
              extraStrata += `, "${FormattingUtil.escapeRString(s.id)}"="${FormattingUtil.escapeRString(task.stratumDetails[s.id])}"`;
          }

          algorithmicLogic += `    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="${FormattingUtil.escapeRString(task.site)}", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode="${FormattingUtil.escapeRString(task.stratumCode)}"${extraStrata}, stringsAsFactors=FALSE)\n`;
          algorithmicLogic += `    count <- count + 1\n`;
          algorithmicLogic += `    if (count >= ${task.cap}) break\n`;
          algorithmicLogic += `  }\n`;
          algorithmicLogic += `  block_num <- block_num + 1\n`;
          algorithmicLogic += `}\n`;
        }
      }
      data['algorithmicLogic'] = algorithmicLogic;
      return this.renderTemplate(R_TEMPLATE, data);
    }
    
    return '';
  }
}

