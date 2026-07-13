import { RandomizationConfig } from '../../../../core/models/randomization.model';
import { LogicIR } from '../ir/ir.model';
import { LanguageConfig } from './language-config';

export class AlgorithmRegistry {
  static buildDynamicLogic(configObj: LanguageConfig, config: RandomizationConfig, ir: LogicIR): string {
    let logic = '';
    
    // 1. Initialization logic
    logic += configObj.components.initialization(ir, config);
    
    // 2. Utility Section (Fisher-Yates, Build Block, Checksum, etc.)
    const utilComment = configObj.language === 'SAS' ? '/* === UTILITY SECTION === */\n' : 
                        configObj.language === 'STATA' ? '// === UTILITY SECTION ===\n' : 
                        '# === UTILITY SECTION ===\n';
    logic += '\n' + utilComment;
    
    if (configObj.components.utilityBlocks) {
       logic += configObj.components.utilityBlocks(ir) + '\n';
    } else {
       if (configObj.components.fisherYates) {
          logic += configObj.components.fisherYates(ir) + '\n';
       }
       if (configObj.components.buildBlock) {
          logic += configObj.components.buildBlock(ir) + '\n';
       }
    }
    
    logic += '\n';

    // 3. Round-Robin Loop logic
    logic += configObj.components.roundRobinLoop(ir, config);

    // 4. Post Loop logic (e.g., Stata Mata export)
    if (configObj.components.postLoop) {
      logic += configObj.components.postLoop(ir, config);
    }
    
    return logic;
  }
}
