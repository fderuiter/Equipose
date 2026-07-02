import { RandomizationConfig } from '../../../../core/models/randomization.model';
import { LogicIRTask } from './ir.model';

export interface RoundRobinCallbacks {
  declareTasks: (tasks: LogicIRTask[]) => string;
  loopStart: () => string;
  taskCheck: (taskIndex: number) => string;
  blockGeneration: (taskIndex: number, task: LogicIRTask) => string;
  loopEnd: () => string;
}

export class IrIterationHelper {
  static generateRoundRobin(
    tasks: LogicIRTask[],
    callbacks: RoundRobinCallbacks
  ): string {
    let result = '';
    result += callbacks.declareTasks(tasks);
    result += callbacks.loopStart();
    for (let i = 0; i < tasks.length; i++) {
      result += callbacks.taskCheck(i);
      result += callbacks.blockGeneration(i, tasks[i]);
      result += callbacks.loopEnd(); // close task check
    }
    result += callbacks.loopEnd(); // close while
    return result;
  }
}
