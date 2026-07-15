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
    let result = adapters.assign('subjectId', "''");

    for (const token of tokens) {
      let value = "''";
      switch (token.type) {
        case 'static':
          value = `'${token.value}'`;
          break;
        case 'site_id':
          value = siteVar;
          break;
        case 'stratum_id':
          value = stratumVar;
          break;
        case 'sequence':
          value = adapters.toStringWithZeroPadding(seqVar, token.padding || 0);
          break;
        case 'random_char':
          value = adapters.randomCharIndexStr(token.length || 1);
          break;
      }
      result = adapters.concat(result, value);
    }

    // Process post-generation logic if needed (e.g. Luhn check digit)
    const hasLuhn = tokens.some(t => t.type === 'checksum_luhn');
    if (hasLuhn) {
      result += '\n' + adapters.regexRemoveNonDigits('subjectId', 'tempDigits');
      result += '\n' + adapters.luhnLoop('tempDigits', 'luhnSum', 'luhnIsEven');
      result = adapters.concat('subjectId', adapters.luhnResult('luhnSum'));
    }

    return result;
  }
}
