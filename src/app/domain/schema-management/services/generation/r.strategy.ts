import { FormattingUtil } from './formatting.util';
import { R_TEMPLATE } from './ir/templates';
import { LanguageConfig } from './framework/language-config';

export const R_CONFIG: LanguageConfig = {
  language: 'R',
  indexStart: 1,
  template: R_TEMPLATE,
  customizeDataSetup: (data, config, ir, method, schema) => {
    data['arms'] = config.arms.map((a: any) => FormattingUtil.escapeString(a.name)).join(', ');
    data['ratios'] = config.arms.map((a: any) => a.ratio).join(', ');
    
    let strataComments = '';
    (config.strata || []).forEach((s: any) => {
        strataComments += `# Stratum: ${FormattingUtil.escapeString(s.id)}, Levels: ${s.levels.map((l: any) => FormattingUtil.escapeString(l)).join(', ')}\n`;
    });
    data['strataComments'] = strataComments.trimEnd();
    data['minimizationParam'] = method === 'MINIMIZATION' ? `p_minimization <- ${config.minimizationConfig?.p || 0.8} # maintain precision parity` : '';
  },
  components: {
    initialization: (ir) => {
      let logic = `block_sizes <- c(${ir.blockSizes.join(', ')})\ntotal_ratio <- ${ir.totalRatio}\n`;
      logic += `ALPHANUMERIC <- c("A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9")\n`;
      let armsR = ir.arms.map((a: any) => `list(name="${FormattingUtil.escapeString(a.name)}", ratio=${a.ratio})`).join(', ');
      logic += `arms <- list(${armsR})\n\nseq_count <- 0\n`;
      return logic;
    },
    fisherYates: `build_block <- function(size) {\n  block <- character(0)\n  multiplier <- size / total_ratio\n  for (arm in arms) {\n    block <- c(block, rep(arm$name, as.integer(arm$ratio * multiplier)))\n  }\n  if (length(block) > 1) {\n    for (i in length(block):2) {\n      j <- (random_int() %% i) + 1\n      temp <- block[i]; block[i] <- block[j]; block[j] <- temp\n    }\n  }\n  return(block)\n}\n`,
    luhn: `    if (grepl("{CHECKSUM}", subj_id, fixed=TRUE)) {\n      base_for_luhn <- gsub("{CHECKSUM}", "", subj_id, fixed=TRUE)\n      digits <- gsub("\\\\D", "", base_for_luhn)\n      chk <- "0"\n      if (nchar(digits) > 0) {\n        s <- 0\n        is_even <- FALSE\n        chars <- strsplit(digits, "")[[1]]\n        for (i in length(chars):1) {\n          d <- as.integer(chars[i])\n          if (is_even) {\n            d <- d * 2\n            if (d > 9) d <- d - 9\n          }\n          s <- s + d\n          is_even <- !is_even\n        }\n        chk <- as.character((10 - (s %% 10)) %% 10)\n      }\n      subj_id <- sub("{CHECKSUM}", chk, subj_id, fixed=TRUE)\n    }`,
    subjectIdBuilder: (tokens, task) => {
      let baseBuilder = 'paste0(';
      const args = [];
      for (const token of tokens) {
        if (token.type === 'literal') {
          args.push(`"${FormattingUtil.escapeString(token.value)}"`);
        } else if (token.type === 'site') {
          args.push(`"${FormattingUtil.escapeString(task.site)}"`);
        } else if (token.type === 'stratum') {
          args.push(`"${FormattingUtil.escapeString(task.stratumCode)}"`);
        } else if (token.type === 'seq') {
          args.push(`sprintf("%0${token.length}d", seq_count)`);
        } else if (token.type === 'rnd') {
          args.push(`paste0(ALPHANUMERIC[(replicate(${token.length}, random_int()) %% length(ALPHANUMERIC)) + 1], collapse="")`);
        } else if (token.type === 'checksum') {
          args.push(`"{CHECKSUM}"`);
        }
      }
      baseBuilder += args.join(', ') + ')';
      return `    subj_id <- ${baseBuilder}`;
    },
    recordAppend: (task, config) => {
      let formattedStrata = '';
      for (const s of config.strata || []) {
        formattedStrata += `, "${FormattingUtil.escapeString(s.id)}"="${FormattingUtil.escapeString(task.stratumDetails[s.id])}"`;
      }
      return `    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="${FormattingUtil.escapeString(task.site)}", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode="${FormattingUtil.escapeString(task.stratumCode)}"${formattedStrata}, stringsAsFactors=FALSE)`;
    },
    taskLoop: (task, taskLogic, config) => {
      let logic = `count <- 0\nblock_num <- 1\nwhile (count < ${task.cap}) {\n`;
      logic += `  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]\n`;
      logic += `  block <- build_block(size)\n`;
      logic += `  for (trt in block) {\n`;
      logic += `    seq_count <- seq_count + 1\n`;
      logic += taskLogic;
      logic += `    count <- count + 1\n`;
      logic += `    if (count >= ${task.cap}) break\n`;
      logic += `  }\n`;
      logic += `  block_num <- block_num + 1\n`;
      logic += `}\n`;
      return logic;
    }
  }
};
