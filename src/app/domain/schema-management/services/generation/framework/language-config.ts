import { RandomizationConfig, GeneratedSchema } from '../../../../core/models/randomization.model';
import { LogicIR, LogicIRTask, SubjectIdToken } from '../ir/ir.model';

export interface LanguageConfig {
  language: 'R' | 'SAS' | 'Python' | 'STATA';
  indexStart: number;
  template: string;
  components: {
    fisherYates: string;
    luhn: string;
    initialization: (ir: LogicIR, config: RandomizationConfig) => string;
    taskLoop: (task: LogicIRTask, taskLogic: string, config: RandomizationConfig) => string;
    subjectIdBuilder: (tokens: SubjectIdToken[], task: LogicIRTask) => string;
    recordAppend: (task: LogicIRTask, config: RandomizationConfig) => string;
    postLoop?: (ir: LogicIR, config: RandomizationConfig) => string;
  };
  customizeDataSetup?: (data: Record<string, string | number>, config: RandomizationConfig, ir: LogicIR, method: 'BLOCK' | 'MINIMIZATION', schema: GeneratedSchema[]) => void;
}
