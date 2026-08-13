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

# --- Secondary MT19937 PRNG for Subject ID ---
mt_state_id <- numeric(624)
mt_idx_id <- 624

init_mt_id <- function(seed) {
  mt_state_id[1] <<- seed %% 4294967296
  for (i in 2:624) {
    prev <- mt_state_id[i - 1]
    val <- u32_xor(prev, u32_shr(prev, 30))
    val <- u32_mul(val, 1812433253) + (i - 1)
    mt_state_id[i] <<- val %% 4294967296
  }
  mt_idx_id <<- 624
}

random_int_id <- function() {
  if (mt_idx_id >= 624) {
    for (kk in 1:624) {
      y <- u32_or(u32_and(mt_state_id[kk], 2147483648), u32_and(mt_state_id[(kk %% 624) + 1], 2147483647))
      nxt <- mt_state_id[((kk + 396) %% 624) + 1]
      mt_state_id[kk] <<- u32_xor(nxt, u32_shr(y, 1))
      if ((y %% 2) != 0) mt_state_id[kk] <<- u32_xor(mt_state_id[kk], 2567483615)
    }
    mt_idx_id <<- 0
  }
  
  y <- mt_state_id[mt_idx_id + 1]
  mt_idx_id <<- mt_idx_id + 1
  
  y <- u32_xor(y, u32_shr(y, 11))
  y <- u32_xor(y, u32_and(u32_shl(y, 7), 2636928640))
  y <- u32_xor(y, u32_and(u32_shl(y, 15), 4022730752))
  y <- u32_xor(y, u32_shr(y, 18))
  
  return(y)
}

init_mt_id({{seedHashSecondary}})

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
%let seed_id = {{seedHashSecondary}};
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

  array mt_id[0:623] _temporary_;
  mti_id = 624;

  mt_id[0] = &seed_id;
  do i = 1 to 623;
    prev_id = mt_id[i-1];
    val_id = mod(bxor(prev_id, brshift(prev_id, 30)), 4294967296);
    if val_id < 0 then val_id = val_id + 4294967296;
    a = 1812433253;
    a_hi = int(a / 65536); a_lo = mod(a, 65536);
    b_hi = int(val_id / 65536); b_lo = mod(val_id, 65536);
    prod_id = mod(mod(a_hi * b_lo + a_lo * b_hi, 65536) * 65536 + a_lo * b_lo, 4294967296);
    mt_id[i] = mod(prod_id + i, 4294967296);
  end;

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

  get_rand_int_id:
    if mti_id >= 624 then do;
      do kk = 0 to 226;
        y_id = mod(bor(band(mt_id[kk], 2147483648), band(mt_id[kk+1], 2147483647)), 4294967296);
        if y_id < 0 then y_id = y_id + 4294967296;
        mt_id[kk] = mod(bxor(bxor(mt_id[kk+397], brshift(y_id, 1)), ifn(band(y_id, 1), 2567483615, 0)), 4294967296);
        if mt_id[kk] < 0 then mt_id[kk] = mt_id[kk] + 4294967296;
      end;
      do kk = 227 to 622;
        y_id = mod(bor(band(mt_id[kk], 2147483648), band(mt_id[kk+1], 2147483647)), 4294967296);
        if y_id < 0 then y_id = y_id + 4294967296;
        mt_id[kk] = mod(bxor(bxor(mt_id[kk-227], brshift(y_id, 1)), ifn(band(y_id, 1), 2567483615, 0)), 4294967296);
        if mt_id[kk] < 0 then mt_id[kk] = mt_id[kk] + 4294967296;
      end;
      y_id = mod(bor(band(mt_id[623], 2147483648), band(mt_id[0], 2147483647)), 4294967296);
      if y_id < 0 then y_id = y_id + 4294967296;
      mt_id[623] = mod(bxor(bxor(mt_id[396], brshift(y_id, 1)), ifn(band(y_id, 1), 2567483615, 0)), 4294967296);
      if mt_id[623] < 0 then mt_id[623] = mt_id[623] + 4294967296;
      mti_id = 0;
    end;
    
    y_id = mt_id[mti_id];
    mti_id = mti_id + 1;
    
    y_id = mod(bxor(y_id, brshift(y_id, 11)), 4294967296);
    if y_id < 0 then y_id = y_id + 4294967296;
    y_id = mod(bxor(y_id, band(blshift(y_id, 7), 2636928640)), 4294967296);
    if y_id < 0 then y_id = y_id + 4294967296;
    y_id = mod(bxor(y_id, band(blshift(y_id, 15), 4022730752)), 4294967296);
    if y_id < 0 then y_id = y_id + 4294967296;
    y_id = mod(bxor(y_id, brshift(y_id, 18)), 4294967296);
    if y_id < 0 then y_id = y_id + 4294967296;
    
    rand_int_id = y_id;
  return;
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
rng_id = MT19937({{seedHashSecondary}})

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
    if isinstance(schema, dict):
        headers = ["SubjectID", "Site", "Treatment", "BlockNumber", "BlockSize", "StratumCode"]
        for k in schema.keys():
            if k not in headers:
                headers.append(k)
        writer = csv.DictWriter(sys.stdout, fieldnames=headers, lineterminator='\\n')
        writer.writeheader()
        num_rows = len(schema[headers[0]]) if headers else 0
        for i in range(num_rows):
            row = {k: schema[k][i] for k in headers if i < len(schema[k])}
            writer.writerow(row)
    else:
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

real rowvector mt_state_id
real scalar mt_idx_id

void init_mt_id(real scalar seed) {
    mt_state_id = J(1, 624, 0)
    mt_state_id[1] = seed
    for (i=2; i<=624; i++) {
        prev = mt_state_id[i-1]
        val = mod(bitxor(prev, bitrshift(prev, 30)), 4294967296)
        if (val < 0) val = val + 4294967296
        
        a = 1812433253
        a_hi = trunc(a / 65536)
        a_lo = mod(a, 65536)
        b_hi = trunc(val / 65536)
        b_lo = mod(val, 65536)
        prod = mod(mod(a_hi * b_lo + a_lo * b_hi, 65536) * 65536 + a_lo * b_lo, 4294967296)
        
        mt_state_id[i] = mod(prod + (i-1), 4294967296)
    }
    mt_idx_id = 624
}

real scalar random_int_id() {
    if (mt_idx_id >= 624) {
        for (kk=1; kk<=227; kk++) {
            y = mod(bitor(bitand(mt_state_id[kk], 2147483648), bitand(mt_state_id[kk+1], 2147483647)), 4294967296)
            if (y < 0) y = y + 4294967296
            mt_state_id[kk] = mod(bitxor(mt_state_id[kk+397], bitrshift(y, 1)), 4294967296)
            if (mt_state_id[kk] < 0) mt_state_id[kk] = mt_state_id[kk] + 4294967296
            if (bitand(y, 1) != 0) mt_state_id[kk] = mod(bitxor(mt_state_id[kk], 2567483615), 4294967296)
            if (mt_state_id[kk] < 0) mt_state_id[kk] = mt_state_id[kk] + 4294967296
        }
        for (kk=228; kk<=623; kk++) {
            y = mod(bitor(bitand(mt_state_id[kk], 2147483648), bitand(mt_state_id[kk+1], 2147483647)), 4294967296)
            if (y < 0) y = y + 4294967296
            mt_state_id[kk] = mod(bitxor(mt_state_id[kk-227], bitrshift(y, 1)), 4294967296)
            if (mt_state_id[kk] < 0) mt_state_id[kk] = mt_state_id[kk] + 4294967296
            if (bitand(y, 1) != 0) mt_state_id[kk] = mod(bitxor(mt_state_id[kk], 2567483615), 4294967296)
            if (mt_state_id[kk] < 0) mt_state_id[kk] = mt_state_id[kk] + 4294967296
        }
        y = mod(bitor(bitand(mt_state_id[624], 2147483648), bitand(mt_state_id[1], 2147483647)), 4294967296)
        if (y < 0) y = y + 4294967296
        mt_state_id[624] = mod(bitxor(mt_state_id[397], bitrshift(y, 1)), 4294967296)
        if (mt_state_id[624] < 0) mt_state_id[624] = mt_state_id[624] + 4294967296
        if (bitand(y, 1) != 0) mt_state_id[624] = mod(bitxor(mt_state_id[624], 2567483615), 4294967296)
        if (mt_state_id[624] < 0) mt_state_id[624] = mt_state_id[624] + 4294967296
        mt_idx_id = 0
    }
    
    y = mt_state_id[mt_idx_id+1]
    mt_idx_id = mt_idx_id + 1
    
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

init_mt({{seedHash}})
init_mt_id({{seedHashSecondary}})

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
