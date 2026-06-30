# ─────────────────────────────────────────────────────────────────
# RANDOMIZATION PLAN & SPECIFICATIONS
# ─────────────────────────────────────────────────────────────────
# SCIENTIFIC INTEGRITY MANIFEST
# =============================
# Trial Metadata
# Protocol ID: Simulation
# Study Name: Standard Stratified Trial
# Phase: Phase II
# App Version: v1.32.0
# Generated At (ISO 8601): 2026-06-30T22:37:09.284Z
#
# PRNG & Audit
# PRNG Algorithm: Mersenne Twister (MT19937)
# PRNG Seed: 94edf7c935fab51671eb9c06c4141acb
# SHA-256 Audit Hash: 0963ef107d1220b889300faa5286452df18f6a10f0a9a46c2af8f1d6ef462dc9
#
# Randomization Methodology
# This RTSM (Randomization and Trial Supply Management) randomization plan employs stratified block randomization utilizing a seeded pseudo-random number generator (PRNG) to ensure reproducibility for IRT/IWRS implementation systems. A Fisher-Yates shuffle algorithm is applied within each block to produce an unpredictable treatment allocation sequence suitable for regulatory submission.
#
# Block Size Strategy: Block sizes are randomly selected from the pool [4, 6] at the start of each block (Block Selection Mode: RANDOM_POOL). This variable-block approach means the next treatment assignment cannot be predicted from the preceding sequence, providing an additional layer of protection against selection bias.
#
# Stratification Factors (1): Age Group [<65, >=65]. Randomization is performed independently within each unique combination of these stratification factor levels, ensuring balanced allocation across all strata.
#
# Enrollment Cap Strategy: MANUAL_MATRIX. Enrollment caps are defined explicitly for each stratum combination (2 intersection caps configured). Each cap specifies the maximum number of subjects to be enrolled within that exact combination of stratification factor levels.
#
# Reproducibility: The PRNG seed "94edf7c935fab51671eb9c06c4141acb" is used to initialize the random number generator. Executing the provided analysis scripts with this identical seed value will reproduce this exact RTSM randomization plan.
# ─────────────────────────────────────────────────────────────────

# Randomization Schema Configuration
# Protocol: Simulation
# App Version: v1.32.0
# Generated At: 2026-06-30T22:37:13.039Z
# Algorithm: PRNG Algorithm: MT19937
# Arms: Active, Placebo
# Ratios: 1, 1
# Stratum: age, Levels: <65, >=65

# --- PRECISION CONSTANTS ---
PRECISION_SCALE <- 1000000000000
PRECISION_EPSILON <- 1e-9

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

init_mt(1430249445)

# --- SINGLE-SOURCE TRANSPILED LOGIC ---

schema_list <- list()
block_sizes <- c(4, 6)
total_ratio <- 2
arms <- list(list(name="Active", ratio=1), list(name="Placebo", ratio=1))

build_block <- function(size) {
  block <- character(0)
  multiplier <- size / total_ratio
  for (arm in arms) {
    block <- c(block, rep(arm$name, as.integer(arm$ratio * multiplier)))
  }
  if (length(block) > 1) {
    for (i in length(block):2) {
      j <- (random_int() %% i) + 1
      temp <- block[i]; block[i] <- block[j]; block[j] <- temp
    }
  }
  return(block)
}

seq_count <- 0
count <- 0
block_num <- 1
while (count < 20) {
  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]
  block <- build_block(size)
  for (trt in block) {
    seq_count <- seq_count + 1
    subj_id <- "SIM-{SITE}-{STRATUM}-{SEQ:3}"
    subj_id <- gsub("{SITE}", "101", subj_id, fixed=TRUE)
    subj_id <- gsub("{STRATUM}", "<65", subj_id, fixed=TRUE)
    subj_id <- sub("\\{SEQ:[0-9]+\\}", sprintf("%03d", seq_count), subj_id)
    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="101", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode="<65", "age"="<65", stringsAsFactors=FALSE)
    count <- count + 1
    if (count >= 20) break
  }
  block_num <- block_num + 1
}
count <- 0
block_num <- 1
while (count < 20) {
  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]
  block <- build_block(size)
  for (trt in block) {
    seq_count <- seq_count + 1
    subj_id <- "SIM-{SITE}-{STRATUM}-{SEQ:3}"
    subj_id <- gsub("{SITE}", "101", subj_id, fixed=TRUE)
    subj_id <- gsub("{STRATUM}", ">=6", subj_id, fixed=TRUE)
    subj_id <- sub("\\{SEQ:[0-9]+\\}", sprintf("%03d", seq_count), subj_id)
    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="101", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode=">=6", "age"=">=65", stringsAsFactors=FALSE)
    count <- count + 1
    if (count >= 20) break
  }
  block_num <- block_num + 1
}
count <- 0
block_num <- 1
while (count < 20) {
  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]
  block <- build_block(size)
  for (trt in block) {
    seq_count <- seq_count + 1
    subj_id <- "SIM-{SITE}-{STRATUM}-{SEQ:3}"
    subj_id <- gsub("{SITE}", "102", subj_id, fixed=TRUE)
    subj_id <- gsub("{STRATUM}", "<65", subj_id, fixed=TRUE)
    subj_id <- sub("\\{SEQ:[0-9]+\\}", sprintf("%03d", seq_count), subj_id)
    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="102", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode="<65", "age"="<65", stringsAsFactors=FALSE)
    count <- count + 1
    if (count >= 20) break
  }
  block_num <- block_num + 1
}
count <- 0
block_num <- 1
while (count < 20) {
  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]
  block <- build_block(size)
  for (trt in block) {
    seq_count <- seq_count + 1
    subj_id <- "SIM-{SITE}-{STRATUM}-{SEQ:3}"
    subj_id <- gsub("{SITE}", "102", subj_id, fixed=TRUE)
    subj_id <- gsub("{STRATUM}", ">=6", subj_id, fixed=TRUE)
    subj_id <- sub("\\{SEQ:[0-9]+\\}", sprintf("%03d", seq_count), subj_id)
    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="102", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode=">=6", "age"=">=65", stringsAsFactors=FALSE)
    count <- count + 1
    if (count >= 20) break
  }
  block_num <- block_num + 1
}
count <- 0
block_num <- 1
while (count < 20) {
  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]
  block <- build_block(size)
  for (trt in block) {
    seq_count <- seq_count + 1
    subj_id <- "SIM-{SITE}-{STRATUM}-{SEQ:3}"
    subj_id <- gsub("{SITE}", "103", subj_id, fixed=TRUE)
    subj_id <- gsub("{STRATUM}", "<65", subj_id, fixed=TRUE)
    subj_id <- sub("\\{SEQ:[0-9]+\\}", sprintf("%03d", seq_count), subj_id)
    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="103", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode="<65", "age"="<65", stringsAsFactors=FALSE)
    count <- count + 1
    if (count >= 20) break
  }
  block_num <- block_num + 1
}
count <- 0
block_num <- 1
while (count < 20) {
  size <- block_sizes[(random_int() %% length(block_sizes)) + 1]
  block <- build_block(size)
  for (trt in block) {
    seq_count <- seq_count + 1
    subj_id <- "SIM-{SITE}-{STRATUM}-{SEQ:3}"
    subj_id <- gsub("{SITE}", "103", subj_id, fixed=TRUE)
    subj_id <- gsub("{STRATUM}", ">=6", subj_id, fixed=TRUE)
    subj_id <- sub("\\{SEQ:[0-9]+\\}", sprintf("%03d", seq_count), subj_id)
    schema_list[[length(schema_list)+1]] <- data.frame(SubjectID=subj_id, Site="103", Treatment=trt, BlockNumber=block_num, BlockSize=size, StratumCode=">=6", "age"=">=65", stringsAsFactors=FALSE)
    count <- count + 1
    if (count >= 20) break
  }
  block_num <- block_num + 1
}

schema <- do.call(rbind, schema_list)
if (is.null(schema)) schema <- data.frame()
print(head(schema))
