export const R_TEMPLATE = `
# Randomization Schema Configuration
# Protocol: {{protocolId}}
# App Version: {{appVersion}}
# Runtime Version: v1.0.0
# Generated At: {{dateStr}}
# Algorithm: {{algorithm}}
# Arms: {{arms}}
# Ratios: {{ratios}}
{{strataComments}}

# --- PRECISION CONSTANTS ---
PRECISION_SCALE <- {{precisionScale}}
PRECISION_EPSILON <- {{precisionEpsilon}}

# --- MT19937 PRNG ---
source("mt19937_v1.0.0.r")

init_mt({{seedHash}})

# --- SINGLE-SOURCE TRANSPILED LOGIC ---
{{minimizationParam}}
schema_list <- list()
{{algorithmicLogic}}
schema <- do.call(rbind, schema_list)
if (is.null(schema)) schema <- data.frame()
write.csv(schema, stdout(), row.names = FALSE)
`;

export const SAS_TEMPLATE = `
/* WARNING: This generated SAS script does not guarantee bit-for-bit sequence parity with the client-side JavaScript engine. Please perform sequence parity verification before clinical trial validation. */
/* Randomization Schema Generation in SAS */
/* Protocol: {{protocolId}} */
/* App Version: {{appVersion}} */
/* Runtime Version: v1.0.0 */
/* Generated At: {{dateStr}} */
/* Algorithm: {{algorithm}} */
%let seed = {{seedHash}};
%let arms = {{arms}};
%let arms_names = {{armsNames}};
%let strata_factors = {{strataFactors}};
/* Ratios: {{ratios}} */
{{strataComments}}

/* --- PRECISION CONSTANTS --- */
%let PRECISION_SCALE = {{precisionScale}};
%let PRECISION_EPSILON = {{precisionEpsilon}};

/* --- SINGLE-SOURCE TRANSPILED LOGIC --- */
%let MAX_SITES = 1000; /* SAS site-limit constraint workaround */
{{minimizationParam}}
{{blockSizesParam}}

%include "mt19937_v1.0.0.sas";

data RandomizationSchema;
  length SubjectID $20 Site $20 Treatment $50 StratumCode $50 {{strataLength}};

  /* --- MT19937 PRNG --- */
  %mt19937_init(&seed);

  /* --- RUNTIME PARITY VALIDATION --- */
  array val_vec[100] _temporary_ ({{validationVectorSpace}});
  do v_idx = 1 to 100;
    link get_rand_int;
    if rand_int ne val_vec[v_idx] then do;
      put "CRITICAL ERROR: PRNG Sequence Mismatch at index " v_idx;
      put "Expected: " val_vec[v_idx] " Got: " rand_int;
      abort;
    end;
  end;

{{algorithmicLogic}}

  return;

  /* MT19937 Generator Macro-Equivalent */
  %mt19937_label();
run;
`;

export const PYTHON_TEMPLATE = `
# Randomization Schema Configuration
# Protocol: {{protocolId}}
# App Version: {{appVersion}}
# Generated At: {{dateStr}}
# Algorithm: {{algorithm}}
import csv
import sys
import re

class MT19937:
    def __init__(self, seed):
        self.mt = [0] * 624
        self.mt[0] = seed & 0xffffffff
        for i in range(1, 624):
            prev = self.mt[i - 1]
            val = (1812433253 * (prev ^ (prev >> 30)) + i) & 0xffffffff
            self.mt[i] = val
        self.mti = 624

    def random_int(self):
        mag01 = [0x0, 0x9908b0df]
        if self.mti >= 624:
            kk = 0
            while kk < 227:
                y = (self.mt[kk] & 0x80000000) | (self.mt[kk + 1] & 0x7fffffff)
                self.mt[kk] = (self.mt[kk + 397] ^ (y >> 1) ^ mag01[y & 0x1]) & 0xffffffff
                kk += 1
            while kk < 623:
                y = (self.mt[kk] & 0x80000000) | (self.mt[kk + 1] & 0x7fffffff)
                self.mt[kk] = (self.mt[kk - 227] ^ (y >> 1) ^ mag01[y & 0x1]) & 0xffffffff
                kk += 1
            y = (self.mt[623] & 0x80000000) | (self.mt[0] & 0x7fffffff)
            self.mt[623] = (self.mt[396] ^ (y >> 1) ^ mag01[y & 0x1]) & 0xffffffff
            self.mti = 0

        y = self.mt[self.mti]
        self.mti += 1

        y ^= (y >> 11)
        y ^= (y << 7) & 0x9d2c5680
        y ^= (y << 15) & 0xefc60000
        y ^= (y >> 18)

        return y & 0xffffffff

rng = MT19937({{seedHash}})

# Arms: {{arms}}
# Ratios: {{ratios}}
{{strataComments}}

# --- PRECISION CONSTANTS ---
PRECISION_SCALE = {{precisionScale}}
PRECISION_EPSILON = {{precisionEpsilon}}

# --- SINGLE-SOURCE TRANSPILED LOGIC ---
{{minimizationParam}}
{{algorithmicLogic}}

if schema:
    first_row = schema[0]
    headers = ["SubjectID", "Site", "Treatment", "BlockNumber", "BlockSize", "StratumCode"]
    for k in first_row.keys():
        if k not in headers:
            headers.append(k)
    writer = csv.DictWriter(sys.stdout, fieldnames=headers, lineterminator='\\n')
    writer.writeheader()
    for row in schema:
        writer.writerow(row)
`;

export const STATA_TEMPLATE = `
* WARNING: This generated Stata script does not guarantee bit-for-bit sequence parity with the client-side JavaScript engine. Please perform sequence parity verification before clinical trial validation.
* Randomization Schema Configuration
* Protocol: {{protocolId}}
* App Version: {{appVersion}}
* Runtime Version: v1.0.0
* Generated At: {{dateStr}}
* Algorithm: {{algorithm}}
{{armsVars}}
{{strataComments}}
* Ratios: {{ratios}}

* --- PRECISION CONSTANTS ---
local PRECISION_SCALE = {{precisionScale}}
local PRECISION_EPSILON = {{precisionEpsilon}}

* --- SINGLE-SOURCE TRANSPILED LOGIC ---
local missing_val = . /* Stata missing value constant workaround */
{{minimizationParam}}
{{blockSizesParam}}

clear

* --- MT19937 PRNG ---
do "mt19937_v1.0.0.do"

mata:

init_mt({{seedHash}})

// --- RUNTIME PARITY VALIDATION ---
real rowvector val_vec
val_vec = ({{validationVector}})
for (v_idx=1; v_idx<=100; v_idx++) {
    r_val = random_int()
    if (r_val != val_vec[v_idx]) {
        errprintf("CRITICAL ERROR: PRNG Sequence Mismatch at index %g\n", v_idx)
        errprintf("Expected: %g Got: %g\n", val_vec[v_idx], r_val)
        exit(9)
    }
}

// Stata arrays and logic will be placed here
{{algorithmicLogic}}

end
`;
