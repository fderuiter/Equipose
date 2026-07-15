import { SubjectIdToken } from './ir.model';
import { FormattingUtil } from '../formatting.util';

export interface SubjectIdLanguageAdapters {
  concat(a: string, b: string): string;
  assign(varName: string, value: string): string;
  toStringWithZeroPadding(seqVar: string, length: number): string;
  randomCharIndexStr(length: number): string;
  replace(str: string, search: string, replace: string): string;
  regexRemoveNonDigits(sourceVar: string, targetVar: string): string;
  luhnLoop(digitsVar: string, sumVar: string, isEvenVar: string): string;
  luhnResult(sumVar: string): string;
}

export class SubjectIdBuilder {
  static build(
    tokens: SubjectIdToken[],
    siteVar: string,
    stratumVar: string,
    seqVar: string,
    adapters: SubjectIdLanguageAdapters
  ): string {
    const result = '';
    // Implement centralized logic builder...
    return result;
  }
}
