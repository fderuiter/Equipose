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
# Generated At: 2026-06-30T22:37:12.674Z
# Algorithm: PRNG Algorithm: MT19937
import numpy as np
import pandas as pd
mt19937 = np.random.MT19937(1430249445)
rng = np.random.Generator(mt19937)
# Arms: Active, Placebo
# Ratios: 1, 1
# Stratum: age, Levels: <65, >=65

# --- PRECISION CONSTANTS ---
PRECISION_SCALE = 1000000000000
PRECISION_EPSILON = 1e-9

# --- SINGLE-SOURCE TRANSPILED LOGIC ---

import re
schema = []
seq_count = 0
block_sizes = [4, 6]
total_ratio = 2
arms = [{"name": "Active", "ratio": 1}, {"name": "Placebo", "ratio": 1}]

def build_block(size):
    block = []
    multiplier = size / total_ratio
    for arm in arms:
        block.extend([arm["name"]] * int(arm["ratio"] * multiplier))
    for i in range(len(block) - 1, 0, -1):
        rand_int = int(rng.bit_generator.random_raw())
        j = rand_int % (i + 1)
        block[i], block[j] = block[j], block[i]
    return block

count = 0
block_num = 1
while count < 20:
    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]
    block = build_block(size)
    for trt in block:
        seq_count += 1
        subj_id = "SIM-{SITE}-{STRATUM}-{SEQ:3}".replace("{SITE}", "101").replace("{STRATUM}", "<65")
        subj_id = re.sub(r'\{SEQ:(\d+)\}', lambda m: str(seq_count).zfill(int(m.group(1))), subj_id)
        schema.append({"SubjectID": subj_id, "Site": "101", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": "<65", "age": "<65"})
        count += 1
        if count >= 20: break
    block_num += 1
count = 0
block_num = 1
while count < 20:
    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]
    block = build_block(size)
    for trt in block:
        seq_count += 1
        subj_id = "SIM-{SITE}-{STRATUM}-{SEQ:3}".replace("{SITE}", "101").replace("{STRATUM}", ">=6")
        subj_id = re.sub(r'\{SEQ:(\d+)\}', lambda m: str(seq_count).zfill(int(m.group(1))), subj_id)
        schema.append({"SubjectID": subj_id, "Site": "101", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": ">=6", "age": ">=65"})
        count += 1
        if count >= 20: break
    block_num += 1
count = 0
block_num = 1
while count < 20:
    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]
    block = build_block(size)
    for trt in block:
        seq_count += 1
        subj_id = "SIM-{SITE}-{STRATUM}-{SEQ:3}".replace("{SITE}", "102").replace("{STRATUM}", "<65")
        subj_id = re.sub(r'\{SEQ:(\d+)\}', lambda m: str(seq_count).zfill(int(m.group(1))), subj_id)
        schema.append({"SubjectID": subj_id, "Site": "102", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": "<65", "age": "<65"})
        count += 1
        if count >= 20: break
    block_num += 1
count = 0
block_num = 1
while count < 20:
    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]
    block = build_block(size)
    for trt in block:
        seq_count += 1
        subj_id = "SIM-{SITE}-{STRATUM}-{SEQ:3}".replace("{SITE}", "102").replace("{STRATUM}", ">=6")
        subj_id = re.sub(r'\{SEQ:(\d+)\}', lambda m: str(seq_count).zfill(int(m.group(1))), subj_id)
        schema.append({"SubjectID": subj_id, "Site": "102", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": ">=6", "age": ">=65"})
        count += 1
        if count >= 20: break
    block_num += 1
count = 0
block_num = 1
while count < 20:
    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]
    block = build_block(size)
    for trt in block:
        seq_count += 1
        subj_id = "SIM-{SITE}-{STRATUM}-{SEQ:3}".replace("{SITE}", "103").replace("{STRATUM}", "<65")
        subj_id = re.sub(r'\{SEQ:(\d+)\}', lambda m: str(seq_count).zfill(int(m.group(1))), subj_id)
        schema.append({"SubjectID": subj_id, "Site": "103", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": "<65", "age": "<65"})
        count += 1
        if count >= 20: break
    block_num += 1
count = 0
block_num = 1
while count < 20:
    size = block_sizes[int(rng.bit_generator.random_raw()) % len(block_sizes)]
    block = build_block(size)
    for trt in block:
        seq_count += 1
        subj_id = "SIM-{SITE}-{STRATUM}-{SEQ:3}".replace("{SITE}", "103").replace("{STRATUM}", ">=6")
        subj_id = re.sub(r'\{SEQ:(\d+)\}', lambda m: str(seq_count).zfill(int(m.group(1))), subj_id)
        schema.append({"SubjectID": subj_id, "Site": "103", "Treatment": trt, "BlockNumber": block_num, "BlockSize": size, "StratumCode": ">=6", "age": ">=65"})
        count += 1
        if count >= 20: break
    block_num += 1

df = pd.DataFrame(schema)
print(df.head())
