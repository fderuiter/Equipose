import { FormattingUtil } from './formatting.util';
import { R_TEMPLATE } from './ir/templates';
import { LanguageConfig } from './framework/language-config';
import { CodeTranspiler } from './ir/transpiler';

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
    fisherYates: (ir) => ir.templates['R'].fisherYates,
    buildBlock: (ir) => ir.templates['R'].buildBlock,
    roundRobinLoop: (ir, config) => {
      let algorithmicLogic = `tasks <- list()\n`;
      for (const t of ir.tasks) {
         let strataStr = '';
         for (const s of config.strata || []) {
             strataStr += `, "${FormattingUtil.escapeString(s.id)}"="${FormattingUtil.escapeString(t.stratumDetails[s.id])}"`;
         }
         algorithmicLogic += `tasks[[length(tasks)+1]] <- list(site="${FormattingUtil.escapeString(t.site)}", stratumCode="${FormattingUtil.escapeString(t.stratumCode)}", cap=${t.cap}, count=0, block_num=1, strata='${strataStr}')\n`;
      }
      algorithmicLogic += `\n`;

      algorithmicLogic += `site_counts <- new.env(hash=TRUE)\n`;
      algorithmicLogic += `added_in_pass <- TRUE\n`;
      algorithmicLogic += `while (added_in_pass) {\n`;
      algorithmicLogic += `  added_in_pass <- FALSE\n`;
      algorithmicLogic += `  for (t_idx in seq_along(tasks)) {\n`;
      algorithmicLogic += `    if (tasks[[t_idx]]$count < tasks[[t_idx]]$cap) {\n`;
      algorithmicLogic += `      added_in_pass <- TRUE\n`;
      algorithmicLogic += `      size <- block_sizes[floor((mt19937_int() / 4294967296) * length(block_sizes)) + 1]\n`;
      algorithmicLogic += `      block <- build_block(size, total_ratio, arms)\n`;
      algorithmicLogic += `      for (trt in block) {\n`;
      algorithmicLogic += `        site <- tasks[[t_idx]]$site\n`;
      algorithmicLogic += `        if (is.null(site_counts[[site]])) site_counts[[site]] <- 0\n`;
      algorithmicLogic += `        site_counts[[site]] <- site_counts[[site]] + 1\n`;
      algorithmicLogic += `        seq_count <- site_counts[[site]]\n`;
      
      algorithmicLogic += CodeTranspiler.generateSubjectIdAndChecksumLogic('R', ir.subjectIdTokens, 'tasks[[t_idx]]$site', 'tasks[[t_idx]]$stratumCode', 'seq_count');
      
      algorithmicLogic += `        strata_eval <- eval(parse(text=paste0("list(", substr(tasks[[t_idx]]$strata, 3, nchar(tasks[[t_idx]]$strata)), ")")))\n`;
      algorithmicLogic += `        row_df <- data.frame(SubjectID=subj_id, Site=tasks[[t_idx]]$site, Treatment=trt, BlockNumber=tasks[[t_idx]]$block_num, BlockSize=size, StratumCode=tasks[[t_idx]]$stratumCode, stringsAsFactors=FALSE)\n`;
      algorithmicLogic += `        if (length(strata_eval) > 0) row_df <- cbind(row_df, as.data.frame(strata_eval, stringsAsFactors=FALSE))\n`;
      algorithmicLogic += `        schema_list[[length(schema_list)+1]] <- row_df\n`;
      algorithmicLogic += `        tasks[[t_idx]]$count <- tasks[[t_idx]]$count + 1\n`;
      algorithmicLogic += `        if (tasks[[t_idx]]$count >= tasks[[t_idx]]$cap) break\n`;
      algorithmicLogic += `      }\n`;
      algorithmicLogic += `      tasks[[t_idx]]$block_num <- tasks[[t_idx]]$block_num + 1\n`;
      algorithmicLogic += `    }\n`;
      algorithmicLogic += `  }\n`;
      algorithmicLogic += `}\n`;
      return algorithmicLogic;
    }
  }
};
