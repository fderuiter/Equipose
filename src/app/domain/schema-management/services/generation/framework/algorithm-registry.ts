import { RandomizationConfig } from '../../../../core/models/randomization.model';
import { LogicIR } from '../ir/ir.model';
import { LanguageConfig } from './language-config';
import { IrIterationHelper } from '../ir/iteration.helper';

export class AlgorithmRegistry {
  static buildDynamicLogic(configObj: LanguageConfig, config: RandomizationConfig, ir: LogicIR): string {
    let logic = '';
    
    // 1. Initialization logic
    logic += configObj.components.initialization(ir, config);
    
    // 2. Fisher-Yates and Build Block Components
    if (configObj.components.fisherYates) {
       logic += configObj.components.fisherYates(ir) + '\n';
    }
    if (configObj.components.buildBlock) {
       logic += configObj.components.buildBlock(ir) + '\n';
    }
    
    // 3. Task Iteration logic
    logic += IrIterationHelper.generateForTasksAndStrata(
      config,
      ir.tasks,
      () => '', // We handle formatting in recordAppend / taskLoop
      (task) => {
        let loopBody = '';
        
        // Subject ID Logic
        const hasChecksum = ir.subjectIdTokens.some(t => t.type === 'checksum');
        loopBody += configObj.components.subjectIdBuilder(ir.subjectIdTokens, task) + '\n';
        
        if (hasChecksum) {
          loopBody += configObj.components.luhn + '\n';
        }
        
        // Record Append Logic
        loopBody += configObj.components.recordAppend(task, config) + '\n';
        
        return configObj.components.taskLoop(task, loopBody, config);
      }
    );

    // 4. Post Loop logic (e.g., Stata Mata export)
    if (configObj.components.postLoop) {
      logic += configObj.components.postLoop(ir, config);
    }
    
    return logic;
  }
}
