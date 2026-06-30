export const R_TEMPLATE = `
# Randomization Schema Configuration
# Protocol: {{protocolId}}
# App Version: {{appVersion}}
# Generated At: {{dateStr}}
# Algorithm: {{algorithm}}
# Arms: {{arms}}
# Ratios: {{ratios}}
{{strataComments}}

# --- PRECISION CONSTANTS ---
PRECISION_SCALE <- {{precisionScale}}
PRECISION_EPSILON <- {{precisionEpsilon}}

# --- MT19937 PRNG ---
mt_state <- integer(624)
mt_idx <- 624

init_mt <- function(seed) {
  mt_state[1] <<- as.integer(seed)
  for (i in 2:624) {
    prev <- mt_state[i - 1]
    # Simulate unsigned 32-bit arithmetic safely
    val <- bitwXor(prev, bitwShiftR(prev, 30))
    # Multiply by 1812433253 and add i-1
    val <- (val * 1812433253) + (i - 1)
    mt_state[i] <<- as.integer(val %% 4294967296)
  }
  mt_idx <<- 624
}

random_int <- function() {
  if (mt_idx >= 624) {
    for (kk in 1:227) {
      y <- bitwOr(bitwAnd(mt_state[kk], 2147483648), bitwAnd(mt_state[kk + 1], 2147483647))
      mt_state[kk] <<- bitwXor(mt_state[kk + 397], bitwShiftR(y, 1))
      if (bitwAnd(y, 1) != 0) mt_state[kk] <<- bitwXor(mt_state[kk], 2567483615)
    }
    for (kk in 228:623) {
      y <- bitwOr(bitwAnd(mt_state[kk], 2147483648), bitwAnd(mt_state[kk + 1], 2147483647))
      mt_state[kk] <<- bitwXor(mt_state[kk - 227], bitwShiftR(y, 1))
      if (bitwAnd(y, 1) != 0) mt_state[kk] <<- bitwXor(mt_state[kk], 2567483615)
    }
    y <- bitwOr(bitwAnd(mt_state[624], 2147483648), bitwAnd(mt_state[1], 2147483647))
    mt_state[624] <<- bitwXor(mt_state[397], bitwShiftR(y, 1))
    if (bitwAnd(y, 1) != 0) mt_state[624] <<- bitwXor(mt_state[624], 2567483615)
    mt_idx <<- 0
  }
  
  y <- mt_state[mt_idx + 1]
  mt_idx <<- mt_idx + 1
  
  y <- bitwXor(y, bitwShiftR(y, 11))
  y <- bitwXor(y, bitwAnd(bitwShiftL(y, 7), 2636928640))
  y <- bitwXor(y, bitwAnd(bitwShiftL(y, 15), 4022730752))
  y <- bitwXor(y, bitwShiftR(y, 18))
  
  return(as.numeric(y) %% 4294967296) # Force unsigned cast
}

init_mt({{seedHash}})

# --- SINGLE-SOURCE TRANSPILED LOGIC ---
{{minimizationParam}}
schema_list <- list()
{{algorithmicLogic}}
schema <- do.call(rbind, schema_list)
if (is.null(schema)) schema <- data.frame()
print(head(schema))
`;

export const SAS_TEMPLATE = `
/* Randomization Schema Generation in SAS */
/* Protocol: {{protocolId}} */
/* App Version: {{appVersion}} */
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

data RandomizationSchema;
  length SubjectID $20 Site $20 Treatment $50 StratumCode $50 {{strataLength}};

  /* --- MT19937 PRNG --- */
  array mt[0:623] _temporary_;
  mti = 624;

  mt[0] = &seed;
  do i = 1 to 623;
    prev = mt[i-1];
    val = bxor(prev, brshift(prev, 30));
    a = 1812433253;
    a_hi = int(a / 65536); a_lo = mod(a, 65536);
    b_hi = int(val / 65536); b_lo = mod(val, 65536);
    prod = mod(mod(a_hi * b_lo + a_lo * b_hi, 65536) * 65536 + a_lo * b_lo, 4294967296);
    mt[i] = mod(prod + i, 4294967296);
  end;

{{algorithmicLogic}}

  return;

  /* MT19937 Generator Macro-Equivalent */
  get_rand_int:
    if mti >= 624 then do;
      do kk = 0 to 226;
        y = bor(band(mt[kk], 2147483648), band(mt[kk+1], 2147483647));
        mt[kk] = bxor(bxor(mt[kk+397], brshift(y, 1)), ifn(band(y, 1), 2567483615, 0));
      end;
      do kk = 227 to 622;
        y = bor(band(mt[kk], 2147483648), band(mt[kk+1], 2147483647));
        mt[kk] = bxor(bxor(mt[kk-227], brshift(y, 1)), ifn(band(y, 1), 2567483615, 0));
      end;
      y = bor(band(mt[623], 2147483648), band(mt[0], 2147483647));
      mt[623] = bxor(bxor(mt[396], brshift(y, 1)), ifn(band(y, 1), 2567483615, 0));
      mti = 0;
    end;
    
    y = mt[mti];
    mti = mti + 1;
    
    y = bxor(y, brshift(y, 11));
    y = bxor(y, band(blshift(y, 7), 2636928640));
    y = bxor(y, band(blshift(y, 15), 4022730752));
    y = bxor(y, brshift(y, 18));
    
    rand_int = y;
  return;
run;
`;

export const PYTHON_TEMPLATE = `
# Randomization Schema Configuration
# Protocol: {{protocolId}}
# App Version: {{appVersion}}
# Generated At: {{dateStr}}
# Algorithm: {{algorithm}}
import numpy as np
import pandas as pd
mt19937 = np.random.MT19937({{seedHash}})
rng = np.random.Generator(mt19937)
# Arms: {{arms}}
# Ratios: {{ratios}}
{{strataComments}}

# --- PRECISION CONSTANTS ---
PRECISION_SCALE = {{precisionScale}}
PRECISION_EPSILON = {{precisionEpsilon}}

# --- SINGLE-SOURCE TRANSPILED LOGIC ---
{{minimizationParam}}
{{algorithmicLogic}}
df = pd.DataFrame(schema)
print(df.head())
`;

export const STATA_TEMPLATE = `
* Randomization Schema Configuration
* Protocol: {{protocolId}}
* App Version: {{appVersion}}
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

mata:
mata clear
real rowvector mt_state
real scalar mt_idx

void init_mt(real scalar seed) {
    mt_state = J(1, 624, 0)
    mt_state[1] = seed
    for (i=2; i<=624; i++) {
        prev = mt_state[i-1]
        val = bitxor(prev, bitrshift(prev, 30))
        
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
            y = bitor(bitand(mt_state[kk], 2147483648), bitand(mt_state[kk+1], 2147483647))
            mt_state[kk] = bitxor(mt_state[kk+397], bitrshift(y, 1))
            if (bitand(y, 1) != 0) mt_state[kk] = bitxor(mt_state[kk], 2567483615)
        }
        for (kk=228; kk<=623; kk++) {
            y = bitor(bitand(mt_state[kk], 2147483648), bitand(mt_state[kk+1], 2147483647))
            mt_state[kk] = bitxor(mt_state[kk-227], bitrshift(y, 1))
            if (bitand(y, 1) != 0) mt_state[kk] = bitxor(mt_state[kk], 2567483615)
        }
        y = bitor(bitand(mt_state[624], 2147483648), bitand(mt_state[1], 2147483647))
        mt_state[624] = bitxor(mt_state[397], bitrshift(y, 1))
        if (bitand(y, 1) != 0) mt_state[624] = bitxor(mt_state[624], 2567483615)
        mt_idx = 0
    }
    
    y = mt_state[mt_idx+1]
    mt_idx = mt_idx + 1
    
    y = bitxor(y, bitrshift(y, 11))
    y = bitxor(y, bitand(bitlshift(y, 7), 2636928640))
    y = bitxor(y, bitand(bitlshift(y, 15), 4022730752))
    y = bitxor(y, bitrshift(y, 18))
    
    return(mod(y, 4294967296))
}

init_mt({{seedHash}})

// Stata arrays and logic will be placed here
{{algorithmicLogic}}

end
`;
