export const MANIFEST_TEMPLATE = `
{{cStart}} --- SCIENTIFIC INTEGRITY MANIFEST ---{{cEnd}}
{{cStart}} Protocol: {{protocolId}}{{cEnd}}
{{cStart}} App Version: {{appVersion}}{{cEnd}}
{{cStart}} Runtime Version: v1.0.0{{cEnd}}
{{cStart}} Generated At: {{dateStr}}{{cEnd}}
{{cStart}} Algorithm: {{algorithm}}{{cEnd}}
{{cStart}} Seed Hash: {{seedHash}}{{cEnd}}
{{cStart}} Arms: {{arms}}{{cEnd}}
{{cStart}} Ratios: {{ratios}}{{cEnd}}
{{strataComments}}
{{cStart}} -------------------------------------{{cEnd}}
`;

export const FISHER_YATES_TEMPLATE: Record<string, string> = {
  Python: `    for i in range(len(block) - 1, 0, -1):
        rand_int = int(rng.bit_generator.random_raw())
        j = rand_int % (i + {{indexOffset}})
        block[i], block[j] = block[j], block[i]`,
  R: `    for (i in length(block):2) {
      j <- (random_int() %% i) + {{indexOffset}}
      temp <- block[i]; block[i] <- block[j]; block[j] <- temp
    }`,
  SAS: `     do i = size to 2 by -1;
        link get_rand_int; j = mod(rand_int, i) + {{indexOffset}};
        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;
     end;`,
  STATA: `    for (i=cols(block); i>=2; i--) {
        j = mod(random_int(), i) + {{indexOffset}}
        temp = block[i]; block[i] = block[j]; block[j] = temp
    }`
};

export const LUHN_TEMPLATE: Record<string, string> = {
  Python: `        base_for_luhn = subj_id.replace("{CHECKSUM}", "")
        digits = re.sub(r'\\D', '', base_for_luhn)
        chk = "0"
        if digits:
            s = 0
            is_even = False
            for i in range(len(digits) - 1, -1, -1):
                d = int(digits[i])
                if is_even:
                    d *= 2
                    if d > 9: d -= 9
                s += d
                is_even = not is_even
            chk = str((10 - (s % 10)) % 10)
        subj_id = subj_id.replace("{CHECKSUM}", chk)`,
  R: `    if (grepl("{CHECKSUM}", subj_id, fixed=TRUE)) {
      base_for_luhn <- gsub("{CHECKSUM}", "", subj_id, fixed=TRUE)
      digits <- gsub("\\\\D", "", base_for_luhn)
      chk <- "0"
      if (nchar(digits) > 0) {
        s <- 0
        is_even <- FALSE
        chars <- strsplit(digits, "")[[1]]
        for (i in length(chars):1) {
          d <- as.integer(chars[i])
          if (is_even) {
            d <- d * 2
            if (d > 9) d <- d - 9
          }
          s <- s + d
          is_even <- !is_even
        }
        chk <- as.character((10 - (s %% 10)) %% 10)
      }
      subj_id <- sub("{CHECKSUM}", chk, subj_id, fixed=TRUE)
    }`,
  SAS: `        if index(SubjectID, "{CHECKSUM}") > 0 then do;
          base_for_luhn = tranwrd(SubjectID, "{CHECKSUM}", "");
          digits = prxchange('s/\\D//', -1, trim(base_for_luhn));
          chk = "0";
          if length(trim(digits)) > 0 then do;
            s = 0;
            is_even = 0;
            do _i = length(trim(digits)) to 1 by -1;
              d = input(substr(trim(digits), _i, 1), 1.);
              if is_even then do;
                d = d * 2;
                if d > 9 then d = d - 9;
              end;
              s = s + d;
              if is_even = 1 then is_even = 0; else is_even = 1;
            end;
            chk = put(mod(10 - mod(s, 10), 10), 1.);
          end;
          SubjectID = tranwrd(SubjectID, "{CHECKSUM}", trim(left(chk)));
        end;`,
  STATA: `        base_for_luhn = subinstr(subj_id, "{CHECKSUM}", "")
        digits = ""
        c_codes = ascii(base_for_luhn)
        for (_i=1; _i<=cols(c_codes); _i++) {
            if (c_codes[_i] >= 48 & c_codes[_i] <= 57) digits = digits + char(c_codes[_i])
        }
        chk = "0"
        if (strlen(digits) > 0) {
            s = 0
            is_even = 0
            for (_i=strlen(digits); _i>=1; _i--) {
                d = strtoreal(substr(digits, _i, 1))
                if (is_even) {
                    d = d * 2
                    if (d > 9) d = d - 9
                }
                s = s + d
                is_even = !is_even
            }
            chk = strofreal(mod(10 - mod(s, 10), 10))
        }
        subj_id = subinstr(subj_id, "{CHECKSUM}", chk)`
};

export const R_TEMPLATE = `
{{manifest}}
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
{{manifest}}
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
{{manifest}}
import numpy as np
import pandas as pd
mt19937 = np.random.MT19937({{seedHash}})
rng = np.random.Generator(mt19937)

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
{{manifest}}
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
