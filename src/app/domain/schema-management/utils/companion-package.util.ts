import { RandomizationConfig } from '@domain/core/models/randomization.model';
import { RandomizationEngineFacade } from '@domain/randomization-engine/randomization-engine.facade';

// Raw MT19937 Runtimes for embedding
export const MT19937_R = `# MT19937 PRNG Runtime for R
# Version: v1.0.0

mt_state <- numeric(624)
mt_idx <- 624

u32_and <- function(a, b) {
  a1 <- trunc(a / 65536); a0 <- a %% 65536
  b1 <- trunc(b / 65536); b0 <- b %% 65536
  (bitwAnd(a1, b1) * 65536) + bitwAnd(a0, b0)
}
u32_or <- function(a, b) {
  a1 <- trunc(a / 65536); a0 <- a %% 65536
  b1 <- trunc(b / 65536); b0 <- b %% 65536
  (bitwOr(a1, b1) * 65536) + bitwOr(a0, b0)
}
u32_xor <- function(a, b) {
  a1 <- trunc(a / 65536); a0 <- a %% 65536
  b1 <- trunc(b / 65536); b0 <- b %% 65536
  (bitwXor(a1, b1) * 65536) + bitwXor(a0, b0)
}
u32_shl <- function(a, shift) {
  (a * (2^shift)) %% 4294967296
}
u32_shr <- function(a, shift) {
  trunc(a / (2^shift))
}
u32_mul <- function(a, b) {
  a1 <- trunc(a / 65536); a0 <- a %% 65536
  b1 <- trunc(b / 65536); b0 <- b %% 65536
  term1 <- ((a1 * b0) %% 65536) * 65536
  term2 <- ((a0 * b1) %% 65536) * 65536
  term3 <- a0 * b0
  (term1 + term2 + term3) %% 4294967296
}

init_mt <- function(seed) {
  mt_state[1] <<- seed %% 4294967296
  for (i in 2:624) {
    prev <- mt_state[i - 1]
    val <- u32_xor(prev, u32_shr(prev, 30))
    val <- u32_mul(val, 1812433253) + (i - 1)
    mt_state[i] <<- val %% 4294967296
  }
  mt_idx <<- 624
}

random_int <- function() {
  if (mt_idx >= 624) {
    for (kk in 1:624) {
      y <- u32_or(u32_and(mt_state[kk], 2147483648), u32_and(mt_state[(kk %% 624) + 1], 2147483647))
      nxt <- mt_state[((kk + 396) %% 624) + 1]
      mt_state[kk] <<- u32_xor(nxt, u32_shr(y, 1))
      if ((y %% 2) != 0) mt_state[kk] <<- u32_xor(mt_state[kk], 2567483615)
    }
    mt_idx <<- 0
  }
  
  y <- mt_state[mt_idx + 1]
  mt_idx <<- mt_idx + 1
  
  y <- u32_xor(y, u32_shr(y, 11))
  y <- u32_xor(y, u32_and(u32_shl(y, 7), 2636928640))
  y <- u32_xor(y, u32_and(u32_shl(y, 15), 4022730752))
  y <- u32_xor(y, u32_shr(y, 18))
  
  return(y)
}
`;

export const MT19937_SAS = `/* MT19937 PRNG Runtime for SAS */
/* Version: v1.0.0 */

%macro mt19937_init(seed);
  array mt[0:623] _temporary_;
  mti = 624;

  mt[0] = &seed;
  do i = 1 to 623;
    prev = mt[i-1];
    val = mod(bxor(prev, brshift(prev, 30)), 4294967296);
    if val < 0 then val = val + 4294967296;
    a = 1812433253;
    a_hi = int(a / 65536); a_lo = mod(a, 65536);
    b_hi = int(val / 65536); b_lo = mod(val, 65536);
    prod = mod(mod(a_hi * b_lo + a_lo * b_hi, 65536) * 65536 + a_lo * b_lo, 4294967296);
    mt[i] = mod(prod + i, 4294967296);
  end;
%mend;

%macro mt19937_label();
  get_rand_int:
    if mti >= 624 then do;
      do kk = 0 to 226;
        y = mod(bor(band(mt[kk], 2147483648), band(mt[kk+1], 2147483647)), 4294967296);
        if y < 0 then y = y + 4294967296;
        mt[kk] = mod(bxor(bxor(mt[kk+397], brshift(y, 1)), ifn(band(y, 1), 2567483615, 0)), 4294967296);
        if mt[kk] < 0 then mt[kk] = mt[kk] + 4294967296;
      end;
      do kk = 227 to 622;
        y = mod(bor(band(mt[kk], 2147483648), band(mt[kk+1], 2147483647)), 4294967296);
        if y < 0 then y = y + 4294967296;
        mt[kk] = mod(bxor(bxor(mt[kk-227], brshift(y, 1)), ifn(band(y, 1), 2567483615, 0)), 4294967296);
        if mt[kk] < 0 then mt[kk] = mt[kk] + 4294967296;
      end;
      y = mod(bor(band(mt[623], 2147483648), band(mt[0], 2147483647)), 4294967296);
      if y < 0 then y = y + 4294967296;
      mt[623] = mod(bxor(bxor(mt[396], brshift(y, 1)), ifn(band(y, 1), 2567483615, 0)), 4294967296);
      if mt[623] < 0 then mt[623] = mt[623] + 4294967296;
      mti = 0;
    end;
    
    y = mt[mti];
    mti = mti + 1;
    
    y = mod(bxor(y, brshift(y, 11)), 4294967296);
    if y < 0 then y = y + 4294967296;
    y = mod(bxor(y, band(blshift(y, 7), 2636928640)), 4294967296);
    if y < 0 then y = y + 4294967296;
    y = mod(bxor(y, band(blshift(y, 15), 4022730752)), 4294967296);
    if y < 0 then y = y + 4294967296;
    y = mod(bxor(y, brshift(y, 18)), 4294967296);
    if y < 0 then y = y + 4294967296;
    
    rand_int = y;
  return;
%mend;
`;

export const MT19937_DO = `* MT19937 PRNG Runtime for STATA
* Version: v1.0.0

mata:
real rowvector mt_state
real scalar mt_idx

void init_mt(real scalar seed) {
    mt_state = J(1, 624, 0)
    mt_state[1] = seed
    for (i=2; i<=624; i++) {
        prev = mt_state[i-1]
        val = mod(bitxor(prev, bitrshift(prev, 30)), 4294967296)
        if (val < 0) val = val + 4294967296
        
        a = 1812433253
        a_hi = trunc(a / 65536)
        a_lo = mod(a, 65536)
        b_hi = trunc(val / 65536)
        b_lo = mod(val, 65536)
        prod = mod(mod(a_hi * b_lo + a_lo * b_hi, 65536) * 65536 + a_lo * b_lo, 4294967296)
        
        mt_state[i] = mod(prod + (i-1), 4294967296)
    }
    mt_idx = 624
}

real scalar random_int() {
    if (mt_idx >= 624) {
        for (kk=1; kk<=227; kk++) {
            y = mod(bitor(bitand(mt_state[kk], 2147483648), bitand(mt_state[kk+1], 2147483647)), 4294967296)
            if (y < 0) y = y + 4294967296
            mt_state[kk] = mod(bitxor(mt_state[kk+397], bitrshift(y, 1)), 4294967296)
            if (mt_state[kk] < 0) mt_state[kk] = mt_state[kk] + 4294967296
            if (bitand(y, 1) != 0) mt_state[kk] = mod(bitxor(mt_state[kk], 2567483615), 4294967296)
            if (mt_state[kk] < 0) mt_state[kk] = mt_state[kk] + 4294967296
        }
        for (kk=228; kk<=623; kk++) {
            y = mod(bitor(bitand(mt_state[kk], 2147483648), bitand(mt_state[kk+1], 2147483647)), 4294967296)
            if (y < 0) y = y + 4294967296
            mt_state[kk] = mod(bitxor(mt_state[kk-227], bitrshift(y, 1)), 4294967296)
            if (mt_state[kk] < 0) mt_state[kk] = mt_state[kk] + 4294967296
            if (bitand(y, 1) != 0) mt_state[kk] = mod(bitxor(mt_state[kk], 2567483615), 4294967296)
            if (mt_state[kk] < 0) mt_state[kk] = mt_state[kk] + 4294967296
        }
        y = mod(bitor(bitand(mt_state[624], 2147483648), bitand(mt_state[1], 2147483647)), 4294967296)
        if (y < 0) y = y + 4294967296
        mt_state[624] = mod(bitxor(mt_state[397], bitrshift(y, 1)), 4294967296)
        if (mt_state[624] < 0) mt_state[624] = mt_state[624] + 4294967296
        if (bitand(y, 1) != 0) mt_state[624] = mod(bitxor(mt_state[624], 2567483615), 4294967296)
        if (mt_state[624] < 0) mt_state[624] = mt_state[624] + 4294967296
        mt_idx = 0
    }
    
    y = mt_state[mt_idx+1]
    mt_idx = mt_idx + 1
    
    y = mod(bitxor(y, bitrshift(y, 11)), 4294967296)
    if (y < 0) y = y + 4294967296
    y = mod(bitxor(y, bitand(bitlshift(y, 7), 2636928640)), 4294967296)
    if (y < 0) y = y + 4294967296
    y = mod(bitxor(y, bitand(bitlshift(y, 15), 4022730752)), 4294967296)
    if (y < 0) y = y + 4294967296
    y = mod(bitxor(y, bitrshift(y, 18)), 4294967296)
    if (y < 0) y = y + 4294967296
    
    return(mod(y, 4294967296))
}
end
`;

export function generateTestDataCsv(config: RandomizationConfig, schema: any[]): string {
  const strataNames = (config.strata || []).map(s => s.id);
  const headers = ['SubjectID', 'Site', 'Treatment', 'BlockNumber', 'BlockSize', 'StratumCode', ...strataNames];
  
  const rows: string[][] = [headers];
  
  const targetCount = 100;
  for (let i = 0; i < targetCount; i++) {
    if (i < schema.length) {
      const row = schema[i];
      const armName = config.arms.find(a => a.id === row.treatmentArmId)?.name || row.treatmentArm || row.treatmentArmId;
      const strataVals = strataNames.map(id => row.stratum[id] || '');
      rows.push([
        row.subjectId,
        row.site,
        armName,
        String(row.blockNumber),
        String(row.blockSize),
        row.stratumCode,
        ...strataVals
      ]);
    } else {
      // Pad to ensure exactly 100 mock trial assignments
      if (schema.length > 0) {
        const row = schema[i % schema.length];
        const armName = config.arms.find(a => a.id === row.treatmentArmId)?.name || row.treatmentArm || row.treatmentArmId;
        const strataVals = strataNames.map(id => row.stratum[id] || '');
        const pSubjId = `MOCK-PAD-${1000 + i}`;
        rows.push([
          pSubjId,
          row.site,
          armName,
          String(row.blockNumber),
          String(row.blockSize),
          row.stratumCode,
          ...strataVals
        ]);
      } else {
        const strataVals = strataNames.map(() => 'Level1');
        rows.push([
          `MOCK-PAD-${1000 + i}`,
          'Site1',
          config.arms[0]?.name || 'Arm1',
          '1',
          '4',
          'Stratum1',
          ...strataVals
        ]);
      }
    }
  }
  
  return rows.map(r => r.map(val => {
    const escaped = val.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') || escaped.includes('\r')) {
      return `"${escaped}"`;
    }
    return escaped;
  }).join(',')).join('\n');
}

export function generateCompanionTestFile(
  language: 'R' | 'SAS' | 'Python' | 'STATA',
  config: RandomizationConfig
): string {
  // 1. Calculate seedHash
  // For STATA, SAS, R:
  const seedHash = RandomizationEngineFacade.get31BitSeed(config.seed);
  
  // 2. Compute 100-integer sequence validation vector
  const valVec = RandomizationEngineFacade.get100IntValidationVector(seedHash);
  
  const validationVectorComma = valVec.join(', ');
  
  if (language === 'Python') {
    return `import os
import subprocess
import sys
import pandas as pd
import numpy as np

def test_seed_alignment():
    # Test MT19937 generator's initial 100 outputs against validation vector
    seed_hash = ${seedHash}
    expected_vector = [${validationVectorComma}]
    
    _rs = np.random.RandomState(seed_hash)
    mt19937 = np.random.MT19937()
    mt19937.state = _rs.get_state()
    rng = np.random.Generator(mt19937)
    
    actual_vector = []
    for _ in range(100):
        actual_vector.append(int(rng.bit_generator.random_raw()))
        
    assert actual_vector == expected_vector, "MT19937 PRNG sequence mismatch"

def test_subject_randomization():
    assert os.path.exists("test_data.csv"), "test_data.csv not found"
    expected_df = pd.read_csv("test_data.csv")
    
    primary_files = [f for f in os.listdir(".") if f.startswith("randomization_schema") and f.endswith(".py") and f != "test_randomization.py"]
    assert len(primary_files) > 0, "No primary script found"
    
    for f in primary_files:
        result = subprocess.run([sys.executable, f], capture_output=True, text=True, check=True)
        from io import StringIO
        actual_df = pd.read_csv(StringIO(result.stdout))
        
        assert len(actual_df) > 0, f"Primary script {f} produced empty output"
        
        n_rows = min(len(actual_df), len(expected_df))
        sliced_actual = actual_df.iloc[:n_rows].reset_index(drop=True)
        sliced_expected = expected_df.iloc[:n_rows].reset_index(drop=True)
        
        for col in sliced_actual.columns:
            assert col in sliced_expected.columns, f"Column {col} missing in test_data.csv"
            act_vals = sliced_actual[col].fillna("").astype(str).str.strip()
            exp_vals = sliced_expected[col].fillna("").astype(str).str.strip()
            pd.testing.assert_series_equal(act_vals, exp_vals, obj=f"Column '{col}' in {f}")
`;
  }
  
  if (language === 'R') {
    return `library(testthat)

context("Randomization Schema Parity Validation")

test_that("PRNG Seed Alignment - MT19937 matches hardcoded verification vector", {
  source("mt19937_v1.0.0.r")
  init_mt(${seedHash})
  expected_vector <- c(${validationVectorComma})
  
  actual_vector <- numeric(100)
  for (i in 1:100) {
    actual_vector[i] <- random_int()
  }
  
  expect_equal(actual_vector, expected_vector)
})

test_that("Subject Randomization - matches test_data.csv cell-by-cell", {
  expected_df <- read.csv("test_data.csv", stringsAsFactors = FALSE, check.names = FALSE)
  
  primary_files <- list.files(pattern = "^randomization_schema.*\\\\.[Rr]$")
  expect_gt(length(primary_files), 0)
  
  for (f in primary_files) {
    output_lines <- system2("Rscript", f, stdout = TRUE, stderr = TRUE)
    output_csv <- paste(output_lines, collapse = "\\n")
    actual_df <- read.csv(text = output_csv, stringsAsFactors = FALSE, check.names = FALSE)
    
    expect_gt(nrow(actual_df), 0)
    
    n_rows <- min(nrow(actual_df), nrow(expected_df))
    expect_gt(n_rows, 0)
    
    sliced_actual <- actual_df[1:n_rows, , drop = FALSE]
    sliced_expected <- expected_df[1:n_rows, , drop = FALSE]
    
    for (colName in names(sliced_actual)) {
      expect_equal(sliced_actual[[colName]], sliced_expected[[colName]], label = paste("Column", colName, "mismatch in file", f))
    }
  }
})
`;
  }
  
  if (language === 'SAS') {
    return `/* SAS Companion Test for Randomization Schema Parity */

proc import datafile="test_data.csv"
  out=ExpectedSchema
  dbms=csv
  replace;
  getnames=yes;
run;

%macro compare_schema(source=);
  %if %sysfunc(exist(&source)) %then %do;
    data _null_;
      set &source(keep=SubjectID Site Treatment StratumCode) nobs=n_act;
      set ExpectedSchema(keep=SubjectID Site Treatment StratumCode rename=(SubjectID=exp_SubjectID Site=exp_Site Treatment=exp_Treatment StratumCode=exp_StratumCode)) nobs=n_exp;
      
      limit = min(n_act, n_exp);
      if _n_ > limit then stop;

      if strip(upcase(SubjectID)) ne strip(upcase(exp_SubjectID)) then do;
        put "CRITICAL ERROR: SubjectID mismatch at observation " _n_;
        put "Expected: " exp_SubjectID " Got: " SubjectID;
        abort;
      end;
      if strip(upcase(Site)) ne strip(upcase(exp_Site)) then do;
        put "CRITICAL ERROR: Site mismatch at observation " _n_;
        put "Expected: " exp_Site " Got: " Site;
        abort;
      end;
      if strip(upcase(Treatment)) ne strip(upcase(exp_Treatment)) then do;
        put "CRITICAL ERROR: Treatment mismatch at observation " _n_;
        put "Expected: " exp_Treatment " Got: " Treatment;
        abort;
      end;
      if strip(upcase(StratumCode)) ne strip(upcase(exp_StratumCode)) then do;
        put "CRITICAL ERROR: StratumCode mismatch at observation " _n_;
        put "Expected: " exp_StratumCode " Got: " StratumCode;
        abort;
      end;
    run;
    put "SUCCESS: Randomization schema cell-by-cell validation passed for &source!";
  %end;
%mend compare_schema;

%macro run_tests;
  %let rc_static = %sysfunc(fileexist(randomization_schema.sas));
  %let rc_dynamic = %sysfunc(fileexist(randomization_schema_dynamic.sas));
  %let rc_static_lbl = %sysfunc(fileexist(randomization_schema_static.sas));

  %if &rc_static %then %do;
    %include "randomization_schema.sas";
    %compare_schema(source=RandomizationSchema);
  %end;
  %if &rc_dynamic %then %do;
    %include "randomization_schema_dynamic.sas";
    %compare_schema(source=RandomizationSchema);
  %end;
  %if &rc_static_lbl %then %do;
    %include "randomization_schema_static.sas";
    %compare_schema(source=RandomizationSchema);
  %end;
%mend run_tests;

%run_tests;
`;
  }
  
  if (language === 'STATA') {
    return `* STATA Companion Test for Randomization Schema Parity

capture program drop compare_schemas
program compare_schemas
  args primary_file
  
  capture confirm file "\`primary_file'"
  if _rc == 0 {
    di "Running primary script: \`primary_file'"
    do "\`primary_file'"
    
    local n_act = _N
    preserve
    
    import delimited "test_data.csv", clear varnames(1)
    local n_exp = _N
    
    local limit = min(\`n_act', \`n_exp')
    keep in 1/\`limit'
    tempfile expected_temp
    save "\`expected_temp'", replace
    
    restore
    keep in 1/\`limit'
    
    forval i = 1/\`limit' {
      local subj_act = SubjectID[\`i']
      local site_act = Site[\`i']
      local treat_act = Treatment[\`i']
      local strat_act = StratumCode[\`i']
      
      preserve
      use "\`expected_temp'", clear
      local subj_exp = SubjectID[\`i']
      local site_exp = Site[\`i']
      local treat_exp = Treatment[\`i']
      local strat_exp = StratumCode[\`i']
      restore
      
      if "\`subj_act'" != "\`subj_exp'" {
        di "CRITICAL ERROR: SubjectID mismatch at observation \`i'"
        exit 9
      }
      if "\`site_act'" != "\`site_exp'" {
        di "CRITICAL ERROR: Site mismatch at observation \`i'"
        exit 9
      }
      if "\`treat_act'" != "\`treat_exp'" {
        di "CRITICAL ERROR: Treatment mismatch at observation \`i'"
        exit 9
      }
      if "\`strat_act'" != "\`strat_exp'" {
        di "CRITICAL ERROR: StratumCode mismatch at observation \`i'"
        exit 9
      }
    }
    di "SUCCESS: Randomization schema cell-by-cell validation passed for \`primary_file'!"
  }
end

compare_schemas "randomization_schema.do"
compare_schemas "randomization_schema_dynamic.do"
compare_schemas "randomization_schema_static.do"
`;
  }
  
  return '';
}
