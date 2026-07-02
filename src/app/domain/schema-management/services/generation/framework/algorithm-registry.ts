import { RandomizationConfig } from '../../../../core/models/randomization.model';
import { LogicIR } from '../ir/ir.model';
import { LanguageConfig } from './language-config';

export class AlgorithmRegistry {
  static buildDynamicLogic(configObj: LanguageConfig, config: RandomizationConfig, ir: LogicIR): string {
    let logic = '';
    
    // 1. Initialization logic
    logic += configObj.components.initialization(ir, config);
    
    // 2. Fisher-Yates Component
    if (configObj.components.fisherYates) {
       logic += configObj.components.fisherYates + '\n';
    }
    
    // 3. Round-Robin Loop logic
    logic += configObj.components.roundRobinLoop(ir, config);

    // 4. Post Loop logic (e.g., Stata Mata export)
    if (configObj.components.postLoop) {
      logic += configObj.components.postLoop(ir, config);
    }
    
    return logic;
  }
}
