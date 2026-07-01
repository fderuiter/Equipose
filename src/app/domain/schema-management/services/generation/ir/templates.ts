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
print(head(schema))
`;

export const SAS_TEMPLATE = `
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

// Stata arrays and logic will be placed here
{{algorithmicLogic}}

end
`;
