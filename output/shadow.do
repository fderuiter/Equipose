/* ─────────────────────────────────────────────────────────────── */
/* RANDOMIZATION PLAN & SPECIFICATIONS */
/* ─────────────────────────────────────────────────────────────── */
/* SCIENTIFIC INTEGRITY MANIFEST */
/* ============================= */
/* Trial Metadata */
/* Protocol ID: Simulation */
/* Study Name: Standard Stratified Trial */
/* Phase: Phase II */
/* App Version: v1.32.0 */
/* Generated At (ISO 8601): 2026-06-30T22:37:09.284Z */
/*                                                               */
/* PRNG & Audit */
/* PRNG Algorithm: Mersenne Twister (MT19937) */
/* PRNG Seed: 94edf7c935fab51671eb9c06c4141acb */
/* SHA-256 Audit Hash: 0963ef107d1220b889300faa5286452df18f6a10f0a9a46c2af8f1d6ef462dc9 */
/*                                                               */
/* Randomization Methodology */
/* This RTSM (Randomization and Trial Supply Management) randomization plan employs stratified block randomization utilizing a seeded pseudo-random number generator (PRNG) to ensure reproducibility for IRT/IWRS implementation systems. A Fisher-Yates shuffle algorithm is applied within each block to produce an unpredictable treatment allocation sequence suitable for regulatory submission. */
/*                                                               */
/* Block Size Strategy: Block sizes are randomly selected from the pool [4, 6] at the start of each block (Block Selection Mode: RANDOM_POOL). This variable-block approach means the next treatment assignment cannot be predicted from the preceding sequence, providing an additional layer of protection against selection bias. */
/*                                                               */
/* Stratification Factors (1): Age Group [<65, >=65]. Randomization is performed independently within each unique combination of these stratification factor levels, ensuring balanced allocation across all strata. */
/*                                                               */
/* Enrollment Cap Strategy: MANUAL_MATRIX. Enrollment caps are defined explicitly for each stratum combination (2 intersection caps configured). Each cap specifies the maximum number of subjects to be enrolled within that exact combination of stratification factor levels. */
/*                                                               */
/* Reproducibility: The PRNG seed "94edf7c935fab51671eb9c06c4141acb" is used to initialize the random number generator. Executing the provided analysis scripts with this identical seed value will reproduce this exact RTSM randomization plan. */
/* ─────────────────────────────────────────────────────────────── */

* Randomization Schema Configuration
* Protocol: Simulation
* App Version: v1.32.0
* Generated At: 2026-06-30T22:37:14.916Z
* Algorithm: PRNG Algorithm: MT19937
local arm_name_1 `"Active"'
local arm_name_2 `"Placebo"'
local strata_1 `"age"'
* Level: `"<65"'
* Level: `">=65"'
* Ratios: 1, 1

* --- PRECISION CONSTANTS ---
local PRECISION_SCALE = 1000000000000
local PRECISION_EPSILON = 1e-9

* --- SINGLE-SOURCE TRANSPILED LOGIC ---
local missing_val = . /* Stata missing value constant workaround */

local block_1 4
local block_2 6
local cap = 0

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

init_mt(1430249445)

// Stata arrays and logic will be placed here
block_sizes = (4,6)
total_ratio = 2
arms = ("Active","Placebo")
arm_ratios = (1,1)

string rowvector build_block(real scalar size) {
    string rowvector block
    real scalar multiplier, i, j, arm_idx, k
    string scalar temp
    block = J(1, 0, "")
    multiplier = size / total_ratio
    for (arm_idx=1; arm_idx<=cols(arms); arm_idx++) {
        for (k=1; k<=arm_ratios[arm_idx] * multiplier; k++) {
            block = block, arms[arm_idx]
        }
    }
    for (i=cols(block); i>=2; i--) {
        j = mod(random_int(), i) + 1
        temp = block[i]; block[i] = block[j]; block[j] = temp
    }
    return(block)
}

schema_out = J(0, 7, "")
seq_count = 0
count = 0
block_num = 1
while (count < 20) {
    size = block_sizes[mod(random_int(), cols(block_sizes)) + 1]
    block = build_block(size)
    for (i=1; i<=cols(block); i++) {
        seq_count = seq_count + 1
        subj_id = "101-<65-" + strofreal(seq_count, "%03.0f")
        schema_out = schema_out \ (subj_id, "101", block[i], strofreal(block_num), strofreal(size), "<65", "<65")
        count = count + 1
        if (count >= 20) break
    }
    block_num = block_num + 1
}
count = 0
block_num = 1
while (count < 20) {
    size = block_sizes[mod(random_int(), cols(block_sizes)) + 1]
    block = build_block(size)
    for (i=1; i<=cols(block); i++) {
        seq_count = seq_count + 1
        subj_id = "101->=6-" + strofreal(seq_count, "%03.0f")
        schema_out = schema_out \ (subj_id, "101", block[i], strofreal(block_num), strofreal(size), ">=6", ">=65")
        count = count + 1
        if (count >= 20) break
    }
    block_num = block_num + 1
}
count = 0
block_num = 1
while (count < 20) {
    size = block_sizes[mod(random_int(), cols(block_sizes)) + 1]
    block = build_block(size)
    for (i=1; i<=cols(block); i++) {
        seq_count = seq_count + 1
        subj_id = "102-<65-" + strofreal(seq_count, "%03.0f")
        schema_out = schema_out \ (subj_id, "102", block[i], strofreal(block_num), strofreal(size), "<65", "<65")
        count = count + 1
        if (count >= 20) break
    }
    block_num = block_num + 1
}
count = 0
block_num = 1
while (count < 20) {
    size = block_sizes[mod(random_int(), cols(block_sizes)) + 1]
    block = build_block(size)
    for (i=1; i<=cols(block); i++) {
        seq_count = seq_count + 1
        subj_id = "102->=6-" + strofreal(seq_count, "%03.0f")
        schema_out = schema_out \ (subj_id, "102", block[i], strofreal(block_num), strofreal(size), ">=6", ">=65")
        count = count + 1
        if (count >= 20) break
    }
    block_num = block_num + 1
}
count = 0
block_num = 1
while (count < 20) {
    size = block_sizes[mod(random_int(), cols(block_sizes)) + 1]
    block = build_block(size)
    for (i=1; i<=cols(block); i++) {
        seq_count = seq_count + 1
        subj_id = "103-<65-" + strofreal(seq_count, "%03.0f")
        schema_out = schema_out \ (subj_id, "103", block[i], strofreal(block_num), strofreal(size), "<65", "<65")
        count = count + 1
        if (count >= 20) break
    }
    block_num = block_num + 1
}
count = 0
block_num = 1
while (count < 20) {
    size = block_sizes[mod(random_int(), cols(block_sizes)) + 1]
    block = build_block(size)
    for (i=1; i<=cols(block); i++) {
        seq_count = seq_count + 1
        subj_id = "103->=6-" + strofreal(seq_count, "%03.0f")
        schema_out = schema_out \ (subj_id, "103", block[i], strofreal(block_num), strofreal(size), ">=6", ">=65")
        count = count + 1
        if (count >= 20) break
    }
    block_num = block_num + 1
}
st_addobs(rows(schema_out))
st_addvar("str20", "SubjectID"); st_sstore(., "SubjectID", schema_out[., 1])
st_addvar("str20", "Site"); st_sstore(., "Site", schema_out[., 2])
st_addvar("str50", "Treatment"); st_sstore(., "Treatment", schema_out[., 3])
st_addvar("double", "BlockNumber"); st_store(., "BlockNumber", strtoreal(schema_out[., 4]))
st_addvar("double", "BlockSize"); st_store(., "BlockSize", strtoreal(schema_out[., 5]))
st_addvar("str50", "StratumCode"); st_sstore(., "StratumCode", schema_out[., 6])
st_addvar("str50", "age"); st_sstore(., "age", schema_out[., 7])


end
