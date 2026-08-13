import { RandomizationConfig } from '../../../core/models/randomization.model';
import { MappingMismatchError } from '../../errors/code-generation-errors';
import { ReproducibilityUtil } from './reproducibility.util';
import { FormattingUtil } from './formatting.util';
import { ASTValidator } from './ast-validator';

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createDynamicRegExp(pattern: string, flags?: string): RegExp {
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  return new RegExp(pattern, flags);
}

export class StaticMappingGuard {
  static verify(language: 'R' | 'SAS' | 'Python' | 'STATA', config: RandomizationConfig, output: string): void {
    // 1. Verify Seed
    const expectedSeed = ReproducibilityUtil.hashCode(config.seed).toString();
    let seedRegex: RegExp;
    if (language === 'R') {
      seedRegex = createDynamicRegExp(`init_mt\\s*\\(\\s*${expectedSeed}\\s*\\)`);
    } else if (language === 'Python') {
      seedRegex = createDynamicRegExp(`MT19937\\s*\\(\\s*${expectedSeed}\\s*\\)`);
    } else if (language === 'SAS') {
      seedRegex = createDynamicRegExp(`%let\\s+seed\\s*=\\s*${expectedSeed}\\s*;`, 'i');
    } else { // STATA
      seedRegex = createDynamicRegExp(`(?:init_mt\\s*\\(\\s*${expectedSeed}\\s*\\)|set seed\\s+${expectedSeed}\\b|local\\s+seed\\s+${expectedSeed}\\b)`);
    }

    if (!seedRegex.test(output)) {
      throw new MappingMismatchError(language, `Seed hash ${expectedSeed} not found in logic.`, config);
    }

    const isStaticMode = (language === 'R' && (output.includes('schema_list[[1]] <- data.frame(') || !output.includes('build_block'))) ||
                         (language === 'Python' && (output.includes('schema = {') || output.includes('schema = []'))) ||
                         (language === 'SAS' && (output.includes('array arr_SubjectID') || !output.includes('link build_block;'))) ||
                         (language === 'STATA' && (output.includes('schema_out = J(') && !output.includes('build_block')));

    const isStaticEmpty = isStaticMode && (
      (language === 'R' && !output.includes('schema_list[[1]] <- data.frame(')) ||
      (language === 'Python' && output.includes('schema = []')) ||
      (language === 'SAS' && !output.includes('array arr_SubjectID')) ||
      (language === 'STATA' && output.includes('schema_out = J(0,'))
    );

    if (isStaticEmpty) {
      return;
    }

    // 2. Verify Arms & Ratios
    for (const arm of config.arms || []) {
      let armNameStr = arm.name;
      if (language === 'R') armNameStr = FormattingUtil.escapeString(arm.name);
      else if (language === 'Python') armNameStr = FormattingUtil.escapeString(arm.name);
      else if (language === 'SAS') armNameStr = FormattingUtil.escapeSasString(arm.name);
      else if (language === 'STATA') armNameStr = FormattingUtil.stataLabelQuote(arm.name);

      const escapedArmName = escapeRegExp(armNameStr);
      const sasArmName = escapeRegExp(FormattingUtil.escapeSasString(arm.name));

      let armRegex: RegExp;
      let ratioRegex: RegExp;

      if (language === 'R') {
        armRegex = createDynamicRegExp(`(?:name\\s*=\\s*["']${escapedArmName}["']|"Treatment"\\s*=\\s*c\\([\\s\\S]*?"${escapedArmName}")`);
        ratioRegex = createDynamicRegExp(`(?:name\\s*=\\s*["']${escapedArmName}["']\\s*,\\s*ratio\\s*=\\s*${arm.ratio}\\b|#\\s*Ratios:\\s*[^\\r\\n]*?\\b${arm.ratio}\\b)`);
      } else if (language === 'Python') {
        armRegex = createDynamicRegExp(`(?:["']name["']\\s*:\\s*["']${escapedArmName}["']|"Treatment"\\s*:\\s*\\[[\\s\\S]*?"${escapedArmName}")`);
        ratioRegex = createDynamicRegExp(`(?:["']name["']\\s*:\\s*["']${escapedArmName}["']\\s*,\\s*["']ratio["']\\s*:\\s*${arm.ratio}\\b|#\\s*Ratios:\\s*[^\\r\\n]*?\\b${arm.ratio}\\b)`);
      } else if (language === 'SAS') {
        armRegex = createDynamicRegExp(`(?:%let\\s+arms(?:_names)?\\s*=\\s*[^;]*?["']${sasArmName}["']|blk\\[idx\\]\\s*=\\s*["']${sasArmName}["']|array\\s+arr_Treatment\\[[^;]*?"${sasArmName}")`, 'i');
        ratioRegex = createDynamicRegExp(`(?:do\\s+i\\s*=\\s*1\\s+to\\s*\\(\\s*size\\s*/\\s*\\d+\\s*\\)\\s*\\*\\s*${arm.ratio}\\s*;|/\\*\\s*Ratios:\\s*[^]*?\\b${arm.ratio}\\b)`, 'i');
      } else { // STATA
        armRegex = createDynamicRegExp(`(?:local\\s+arm_name_\\d+\\s*(?:=\\s*)?(?:\\x60"|")?${escapedArmName}(?:"'|")?|arms\\s*=\\s*\\([^)]*?["']${sasArmName}["']|schema_out\\[\\d+,\\s*\\.\\]\\s*=\\s*\\([\\s\\S]*?${escapedArmName})`);
        ratioRegex = createDynamicRegExp(`(?:arm_ratios\\s*=\\s*\\([^)]*?\\b${arm.ratio}\\b|\\*\\s*Ratios:\\s*[^\\r\\n]*?\\b${arm.ratio}\\b)`);
      }

      if (!armRegex.test(output)) {
        throw new MappingMismatchError(language, `Treatment arm "${arm.name}" not found in logic.`, config);
      }
      if (!ratioRegex.test(output)) {
        throw new MappingMismatchError(language, `Treatment ratio ${arm.ratio} not found in logic.`, config);
      }
    }

    // 3. Verify Strata Factors & Levels
    for (const stratum of config.strata || []) {
      let stratumId = stratum.id;
      if (language === 'STATA') stratumId = FormattingUtil.sanitizeStataVarName(stratum.id);

      const escapedStratumId = escapeRegExp(stratumId);
      let stratumRegex: RegExp;

      if (language === 'R') {
        stratumRegex = createDynamicRegExp(`(?:["']${escapedStratumId}["']\\s*=|#\\s*Stratum:\\s*${escapedStratumId}\\b)`);
      } else if (language === 'Python') {
        stratumRegex = createDynamicRegExp(`(?:["']${escapedStratumId}["']\\s*:|#\\s*Stratum:\\s*${escapedStratumId}\\b)`);
      } else if (language === 'SAS') {
        stratumRegex = createDynamicRegExp(`(?:%let\\s+strata_factors\\s*=\\s*[^;]*?["']${escapedStratumId}["']|${escapedStratumId}\\s*=|array\\s+arr_${escapedStratumId}\\[)`, 'i');
      } else { // STATA
        stratumRegex = createDynamicRegExp(`(?:local\\s+strata_\\d+\\s*(?:=\\s*)?(?:\\x60"|")?${escapedStratumId}(?:"'|")?|st_addvar\\s*\\(\\s*["']str50["']\\s*,\\s*["']${escapedStratumId}["']\\s*\\)|st_addvar\\s*\\(\\s*["']str100["']\\s*,\\s*["']${escapedStratumId}["']\\s*\\))`);
      }

      if (!stratumRegex.test(output)) {
        throw new MappingMismatchError(language, `Stratum factor "${stratum.id}" not found in logic.`, config);
      }

      for (const level of stratum.levels || []) {
        let levelStr = level;
        if (language === 'R') levelStr = FormattingUtil.escapeString(level);
        else if (language === 'Python') levelStr = FormattingUtil.escapeString(level);
        else if (language === 'SAS') levelStr = FormattingUtil.escapeSasString(level);
        else if (language === 'STATA') levelStr = FormattingUtil.stataLabelQuote(level);

        const escapedLevelStr = escapeRegExp(levelStr);
        let levelRegex: RegExp;

        if (language === 'R') {
          levelRegex = createDynamicRegExp(`(?:["']${escapedStratumId}["']\\s*=\\s*["']${escapedLevelStr}["']|["']${escapedStratumId}["']\\s*=\\s*c\\([\\s\\S]*?["']${escapedLevelStr}["']|#\\s*Stratum:\\s*${escapedStratumId}[^\\r\\n]*?${escapedLevelStr})`);
        } else if (language === 'Python') {
          levelRegex = createDynamicRegExp(`(?:["']${escapedStratumId}["']\\s*:\\s*["']${escapedLevelStr}["']|["']${escapedStratumId}["']\\s*:\\s*\\[[\\s\\S]*?["']${escapedLevelStr}["']|#\\s*Stratum:\\s*${escapedStratumId}[^\\r\\n]*?${escapedLevelStr})`);
        } else if (language === 'SAS') {
          levelRegex = createDynamicRegExp(`(?:${escapedStratumId}\\s*=\\s*["']${escapedLevelStr}["']|array\\s+arr_${escapedStratumId}\\[\\d+\\]\\s+[^;]*?"${escapedLevelStr}"|/\\*\\s*Levels for ${escapedStratumId}:[\\s\\S]*?${escapedLevelStr})`, 'i');
        } else { // STATA
          levelRegex = createDynamicRegExp(`(?:task_strata_arr\\[\\d+\\]\\s*=\\s*["']${escapedLevelStr}["']|schema_out\\[\\d+,\\s*\\.\\]\\s*=\\s*\\([\\s\\S]*?${escapedLevelStr}|\\*\\s*Level:\\s*${escapedLevelStr})`);
        }

        if (!levelRegex.test(output)) {
          throw new MappingMismatchError(language, `Stratum level "${level}" not found in logic.`, config);
        }
      }
    }

    // 4. Identify orphaned variables (variables in script that do not exist in schema)
    if (language === 'SAS') {
      const armsMatch = output.match(/%let arms\s*=\s*(.*?);/i);
      if (armsMatch) {
        const definedArms = armsMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/(^"|"$)/g, '').replace(/""/g, '"')) || [];
        const schemaArms = config.arms.map(a => a.name);
        for (const da of definedArms) {
          if (!schemaArms.includes(da)) {
            throw new MappingMismatchError(language, `Orphaned variable: Treatment arm "${da}" found in script but not in schema.`, config);
          }
        }
      }
      const armsNamesMatch = output.match(/%let arms_names\s*=\s*(.*?);/i);
      if (armsNamesMatch) {
        const definedArms = armsNamesMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/(^"|"$)/g, '').replace(/""/g, '"')) || [];
        const schemaArms = config.arms.map(a => a.name);
        for (const da of definedArms) {
          if (!schemaArms.includes(da)) {
            throw new MappingMismatchError(language, `Orphaned variable: Treatment arm "${da}" found in script but not in schema.`, config);
          }
        }
      }
      
      const strataFactorsMatch = output.match(/%let strata_factors\s*=\s*(.*?);/i);
      if (strataFactorsMatch) {
        const definedStrata = strataFactorsMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/(^"|"$)/g, '').replace(/""/g, '"')) || [];
        const schemaStrata = (config.strata || []).map(s => s.id);
        for (const ds of definedStrata) {
          if (!schemaStrata.includes(ds)) {
             throw new MappingMismatchError(language, `Orphaned variable: Stratum "${ds}" found in script but not in schema.`, config);
          }
        }
      }
    } else if (language === 'STATA') {
      const macroRegex = /local\s+(\w+)\s*(?:=\s*)?(?:\x60\"([^]*?)\"\'|\"([^]*?)\"|([^\s\x60"][^\r\n]*))/g;
      const armDefs: string[] = [];
      const strataDefs: string[] = [];

      for (const match of output.matchAll(macroRegex)) {
        const name = match[1];
        const val = match[2] || match[3] || match[4];
        if (name.startsWith('arm_name_')) {
          armDefs.push(val);
        } else if (name.startsWith('strata_')) {
          strataDefs.push(val);
        }
      }

      const schemaArms = config.arms.map(a => a.name);
      for (const da of armDefs) {
        if (!schemaArms.includes(da)) {
          throw new MappingMismatchError(language, `Orphaned variable: Treatment arm "${da}" found in script but not in schema.`, config);
        }
      }

      const schemaStrata = (config.strata || []).map(s => s.id);
      for (const ds of strataDefs) {
        // Stata ID may be sanitized in the generated output, so we need to sanitize schemaStrata to compare
        const sanitizedSchemaStrata = schemaStrata.map(id => FormattingUtil.sanitizeStataVarName(id));
        if (!schemaStrata.includes(ds) && !sanitizedSchemaStrata.includes(ds)) {
          throw new MappingMismatchError(language, `Orphaned variable: Stratum "${ds}" found in script but not in schema.`, config);
        }
      }
    } else if (language === 'R') {
      // Extract arms from list structures
      const armRegex = /list\s*\(\s*name\s*=\s*["']([^"']+)["']\s*,\s*ratio\s*=\s*\d+\s*\)/g;
      const definedArms = [...output.matchAll(armRegex)].map(m => m[1]);
      const schemaArms = config.arms.map(a => a.name);
      for (const da of definedArms) {
        if (!schemaArms.includes(da)) {
          throw new MappingMismatchError(language, `Orphaned variable: Treatment arm "${da}" found in script but not in schema.`, config);
        }
      }

      // Extract strata from list structures
      const strataListRegex = /strata\s*=\s*list\(([^)]*)\)/g;
      const schemaStrata = (config.strata || []).map(s => s.id);
      for (const match of output.matchAll(strataListRegex)) {
        const inner = match[1];
        const keyRegex = /["']([^"']+)["']\s*=/g;
        for (const kMatch of inner.matchAll(keyRegex)) {
          const ds = kMatch[1];
          if (!schemaStrata.includes(ds)) {
            throw new MappingMismatchError(language, `Orphaned variable: Stratum "${ds}" found in script but not in schema.`, config);
          }
        }
      }
    } else if (language === 'Python') {
      // Extract arms from dictionary / array structures
      const armRegex = /\{\s*["']name["']\s*:\s*["']([^"']+)["']\s*,\s*["']ratio["']\s*:\s*\d+\s*\}/g;
      const definedArms = [...output.matchAll(armRegex)].map(m => m[1]);
      const schemaArms = config.arms.map(a => a.name);
      for (const da of definedArms) {
        if (!schemaArms.includes(da)) {
          throw new MappingMismatchError(language, `Orphaned variable: Treatment arm "${da}" found in script but not in schema.`, config);
        }
      }

      // Extract strata from dictionary structures
      const strataDictRegex = /"strata_dict"\s*:\s*\{([^}]*)\}/g;
      const schemaStrata = (config.strata || []).map(s => s.id);
      for (const match of output.matchAll(strataDictRegex)) {
        const inner = match[1];
        const keyRegex = /["']([^"']+)["']\s*:/g;
        for (const kMatch of inner.matchAll(keyRegex)) {
          const ds = kMatch[1];
          if (!schemaStrata.includes(ds)) {
            throw new MappingMismatchError(language, `Orphaned variable: Stratum "${ds}" found in script but not in schema.`, config);
          }
        }
      }
    }

    // 5. AST-based validations
    if (language === 'SAS') {
      const sasErrors = ASTValidator.validateSAS(output, (config.strata || []).map(s => s.id));
      if (sasErrors.length > 0) {
        throw new MappingMismatchError(language, `SAS AST validation failed: ${sasErrors.join('; ')}`, config);
      }
    } else if (language === 'STATA') {
      const stataErrors = ASTValidator.validateStata(output, (config.strata || []).map(s => s.id));
      if (stataErrors.length > 0) {
        throw new MappingMismatchError(language, `STATA AST validation failed: ${stataErrors.join('; ')}`, config);
      }
    }
  }
}
