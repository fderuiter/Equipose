import { RandomizationConfig } from '../../../../core/models/randomization.model';
import { LogicIRTask } from './ir.model';

export class IrIterationHelper {
  /**
   * Centralized helper to iterate over tasks and strata, eliminating duplicated structural loops.
   */
  static generateForTasksAndStrata(
    config: RandomizationConfig,
    tasks: LogicIRTask[],
    strataFormatter: (stratumId: string, stratumValue: string) => string,
    taskFormatter: (task: LogicIRTask, formattedStrata: string) => string
  ): string {
    let result = '';
    for (const task of tasks) {
      let strataResult = '';
      for (const s of config.strata || []) {
        strataResult += strataFormatter(s.id, task.stratumDetails[s.id]);
      }
      result += taskFormatter(task, strataResult);
    }
    return result;
  }
}
