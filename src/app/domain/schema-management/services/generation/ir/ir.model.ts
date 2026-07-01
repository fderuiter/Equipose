export type SubjectIdToken =
  | { type: 'literal'; value: string }
  | { type: 'site' }
  | { type: 'stratum' }
  | { type: 'seq'; length: number }
  | { type: 'rnd'; length: number }
  | { type: 'checksum' };

export interface LogicIRTask {
  site: string;
  stratumCode: string;
  stratumDetails: Record<string, string>;
  cap: number;
}

export interface LogicIR {
  seedHash: number;
  totalRatio: number;
  arms: { id: string, name: string, ratio: number }[];
  blockSizes: number[];
  tasks: LogicIRTask[];
  method: 'BLOCK' | 'MINIMIZATION';
  minimizationP: number;
  subjectIdTokens: SubjectIdToken[];
}
