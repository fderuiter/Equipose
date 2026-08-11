import { describe, expect, it } from 'vitest';
import { ASTValidator } from './ast-validator';

describe('ASTValidator - SAS', () => {
  it('should successfully parse and validate clean SAS code', () => {
    const code = `
      /* Randomization Schema Generation in SAS */
      %macro run_alloc;
        %let center_levels = "site1" "site2";
        do i = 1 to 10;
          x = i * 2;
        end;
      %mend run_alloc;
    `;
    const errors = ASTValidator.validateSAS(code, ['center']);
    expect(errors).toEqual([]);
  });

  it('should flag unbalanced block comments in SAS', () => {
    const code = `
      /* Unbalanced block comment
    `;
    const errors = ASTValidator.validateSAS(code);
    expect(errors).toContain('Block comments are unbalanced: unclosed comment blocks.');
  });

  it('should detect uninitialized stratification levels in SAS macro', () => {
    const code = `
      %macro run_alloc;
        %let center_levels = ;
      %mend run_alloc;
    `;
    const errors = ASTValidator.validateSAS(code, ['center']);
    expect(errors).toContain('Line 3: SAS macro variable "center_levels" for stratification levels is uninitialized (assigned empty value).');
  });

  it('should detect uninitialized macro variable reference inside SAS assignment', () => {
    const code = `
      %macro run_alloc;
        %let val = &uninit_var;
      %mend run_alloc;
    `;
    const errors = ASTValidator.validateSAS(code);
    expect(errors).toContain('Line 3: Reference to uninitialized macro variable "&uninit_var" in expression.');
  });

  it('should flag uninitialized loop limit variable inside SAS loop', () => {
    const code = `
      %macro run_alloc;
        do i = 1 to uninit_limit;
          x = i;
        end;
      %mend run_alloc;
    `;
    const errors = ASTValidator.validateSAS(code);
    expect(errors).toContain('Line 3: SAS loop limit variable "uninit_limit" is uninitialized.');
  });

  it('should flag uninitialized array index access in SAS', () => {
    const code = `
      Treatment = blk[uninit_idx];
    `;
    const errors = ASTValidator.validateSAS(code);
    expect(errors).toContain('Line 2: SAS array block index "uninit_idx" is uninitialized.');
  });
});

describe('ASTValidator - Stata', () => {
  it('should successfully parse and validate clean Stata code', () => {
    const code = `
      local seed 12345
      gen str50 center = ""
      if age > 18 & !missing(age) {
        replace center = "site_ok"
      }
    `;
    const errors = ASTValidator.validateStata(code);
    expect(errors).toEqual([]);
  });

  it('should flag Stata local macro names exceeding 32 characters', () => {
    const code = `
      local this_local_macro_name_is_way_too_long_for_stata 123
    `;
    const errors = ASTValidator.validateStata(code);
    expect(errors[0]).toContain('exceeds the 32-character limit.');
  });

  it('should flag Stata generated variable names exceeding 32 characters', () => {
    const code = `
      gen str50 variable_identifier_exceeding_the_thirty_two_char_limit = ""
    `;
    const errors = ASTValidator.validateStata(code);
    expect(errors[0]).toContain('exceeds the 32-character limit.');
  });

  it('should flag Mata variables exceeding 32 characters', () => {
    const code = `
      mata:
        string scalar mata_variable_name_is_definitely_exceeding_the_limit = ""
      end
    `;
    const errors = ASTValidator.validateStata(code);
    expect(errors[0]).toContain('exceeds the 32-character limit.');
  });

  it('should flag variables inside st_addvar exceeding 32 characters', () => {
    const code = `
      mata:
        st_addvar("str50", "stata_variable_name_exceeding_limit_in_st_addvar")
      end
    `;
    const errors = ASTValidator.validateStata(code);
    expect(errors[0]).toContain('exceeds the 32-character limit.');
  });

  it('should flag Stata conditions without missing value checks', () => {
    const code = `
      if age > 18 {
        replace age = 19
      }
    `;
    const errors = ASTValidator.validateStata(code, ['age']);
    expect(errors[0]).toContain('compares variable "age" without checking for missing value boundary.');
  });

  it('should accept Stata conditions with explicit missing value checks', () => {
    const codes = [
      `if age > 18 & !missing(age) { replace age = 19 }`,
      `if age > 18 & age < . { replace age = 19 }`,
      `if age > 18 & missing(age) == 0 { replace age = 19 }`,
      `if age > 18 & age != . { replace age = 19 }`
    ];
    for (const code of codes) {
      const errors = ASTValidator.validateStata(code, ['age']);
      expect(errors).toEqual([]);
    }
  });

  it('should ignore missing value checks for loop indices and counters', () => {
    const code = `
      forval i = 1/10 {
        if i > 5 {
          display i
        }
      }
    `;
    const errors = ASTValidator.validateStata(code);
    expect(errors).toEqual([]);
  });
});
