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

/* Randomization Schema Generation in SAS */
/* Protocol: Simulation */
/* App Version: v1.32.0 */
/* Generated At: 2026-06-30T22:37:13.975Z */
/* Algorithm: PRNG Algorithm: MT19937 */
%let seed = 1430249445;
%let arms = "Active" "Placebo";
%let arms_names = "Active" "Placebo";
%let strata_factors = "age";
/* Ratios: 1, 1 */
/* Levels for age: <65, >=65 */

/* --- PRECISION CONSTANTS --- */
%let PRECISION_SCALE = 1000000000000;
%let PRECISION_EPSILON = 1e-9;

/* --- SINGLE-SOURCE TRANSPILED LOGIC --- */
%let MAX_SITES = 1000; /* SAS site-limit constraint workaround */

%let block_sizes = 4 6;

data RandomizationSchema;
  length SubjectID $20 Site $20 Treatment $50 StratumCode $50  age $50;

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

  array blk[1000] $50 _temporary_;
  seq_count = 0;
  /* Task: 101 <65 */
  Site = "101"; StratumCode = "<65";
  age="<65";
  cap = 20;
  count = 0; block_num = 1;
  do while(count < cap);
     link get_rand_int; size_idx = mod(rand_int, 2);
     if size_idx=0 then size=4;
     else if size_idx=1 then size=6;
     idx = 1;
     do i = 1 to (size / 2) * 1; blk[idx] = "Active"; idx=idx+1; end;
     do i = 1 to (size / 2) * 1; blk[idx] = "Placebo"; idx=idx+1; end;
     do i = size to 2 by -1;
        link get_rand_int; j = mod(rand_int, i) + 1;
        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;
     end;
     do i = 1 to size;
        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;
        seq_count = seq_count + 1;
        SubjectID = "SIM-{SITE}-{STRATUM}-{SEQ:3}";
        SubjectID = tranwrd(SubjectID, "{SITE}", "101");
        SubjectID = tranwrd(SubjectID, "{STRATUM}", "<65");
        SubjectID = prxchange('s/{SEQ:(d+)}/' || put(seq_count, z3.) || '/', -1, SubjectID);
        output;
        count = count + 1;
        if count >= cap then leave;
     end;
     block_num = block_num + 1;
  end;
  /* Task: 101 >=6 */
  Site = "101"; StratumCode = ">=6";
  age=">=65";
  cap = 20;
  count = 0; block_num = 1;
  do while(count < cap);
     link get_rand_int; size_idx = mod(rand_int, 2);
     if size_idx=0 then size=4;
     else if size_idx=1 then size=6;
     idx = 1;
     do i = 1 to (size / 2) * 1; blk[idx] = "Active"; idx=idx+1; end;
     do i = 1 to (size / 2) * 1; blk[idx] = "Placebo"; idx=idx+1; end;
     do i = size to 2 by -1;
        link get_rand_int; j = mod(rand_int, i) + 1;
        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;
     end;
     do i = 1 to size;
        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;
        seq_count = seq_count + 1;
        SubjectID = "SIM-{SITE}-{STRATUM}-{SEQ:3}";
        SubjectID = tranwrd(SubjectID, "{SITE}", "101");
        SubjectID = tranwrd(SubjectID, "{STRATUM}", ">=6");
        SubjectID = prxchange('s/{SEQ:(d+)}/' || put(seq_count, z3.) || '/', -1, SubjectID);
        output;
        count = count + 1;
        if count >= cap then leave;
     end;
     block_num = block_num + 1;
  end;
  /* Task: 102 <65 */
  Site = "102"; StratumCode = "<65";
  age="<65";
  cap = 20;
  count = 0; block_num = 1;
  do while(count < cap);
     link get_rand_int; size_idx = mod(rand_int, 2);
     if size_idx=0 then size=4;
     else if size_idx=1 then size=6;
     idx = 1;
     do i = 1 to (size / 2) * 1; blk[idx] = "Active"; idx=idx+1; end;
     do i = 1 to (size / 2) * 1; blk[idx] = "Placebo"; idx=idx+1; end;
     do i = size to 2 by -1;
        link get_rand_int; j = mod(rand_int, i) + 1;
        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;
     end;
     do i = 1 to size;
        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;
        seq_count = seq_count + 1;
        SubjectID = "SIM-{SITE}-{STRATUM}-{SEQ:3}";
        SubjectID = tranwrd(SubjectID, "{SITE}", "102");
        SubjectID = tranwrd(SubjectID, "{STRATUM}", "<65");
        SubjectID = prxchange('s/{SEQ:(d+)}/' || put(seq_count, z3.) || '/', -1, SubjectID);
        output;
        count = count + 1;
        if count >= cap then leave;
     end;
     block_num = block_num + 1;
  end;
  /* Task: 102 >=6 */
  Site = "102"; StratumCode = ">=6";
  age=">=65";
  cap = 20;
  count = 0; block_num = 1;
  do while(count < cap);
     link get_rand_int; size_idx = mod(rand_int, 2);
     if size_idx=0 then size=4;
     else if size_idx=1 then size=6;
     idx = 1;
     do i = 1 to (size / 2) * 1; blk[idx] = "Active"; idx=idx+1; end;
     do i = 1 to (size / 2) * 1; blk[idx] = "Placebo"; idx=idx+1; end;
     do i = size to 2 by -1;
        link get_rand_int; j = mod(rand_int, i) + 1;
        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;
     end;
     do i = 1 to size;
        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;
        seq_count = seq_count + 1;
        SubjectID = "SIM-{SITE}-{STRATUM}-{SEQ:3}";
        SubjectID = tranwrd(SubjectID, "{SITE}", "102");
        SubjectID = tranwrd(SubjectID, "{STRATUM}", ">=6");
        SubjectID = prxchange('s/{SEQ:(d+)}/' || put(seq_count, z3.) || '/', -1, SubjectID);
        output;
        count = count + 1;
        if count >= cap then leave;
     end;
     block_num = block_num + 1;
  end;
  /* Task: 103 <65 */
  Site = "103"; StratumCode = "<65";
  age="<65";
  cap = 20;
  count = 0; block_num = 1;
  do while(count < cap);
     link get_rand_int; size_idx = mod(rand_int, 2);
     if size_idx=0 then size=4;
     else if size_idx=1 then size=6;
     idx = 1;
     do i = 1 to (size / 2) * 1; blk[idx] = "Active"; idx=idx+1; end;
     do i = 1 to (size / 2) * 1; blk[idx] = "Placebo"; idx=idx+1; end;
     do i = size to 2 by -1;
        link get_rand_int; j = mod(rand_int, i) + 1;
        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;
     end;
     do i = 1 to size;
        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;
        seq_count = seq_count + 1;
        SubjectID = "SIM-{SITE}-{STRATUM}-{SEQ:3}";
        SubjectID = tranwrd(SubjectID, "{SITE}", "103");
        SubjectID = tranwrd(SubjectID, "{STRATUM}", "<65");
        SubjectID = prxchange('s/{SEQ:(d+)}/' || put(seq_count, z3.) || '/', -1, SubjectID);
        output;
        count = count + 1;
        if count >= cap then leave;
     end;
     block_num = block_num + 1;
  end;
  /* Task: 103 >=6 */
  Site = "103"; StratumCode = ">=6";
  age=">=65";
  cap = 20;
  count = 0; block_num = 1;
  do while(count < cap);
     link get_rand_int; size_idx = mod(rand_int, 2);
     if size_idx=0 then size=4;
     else if size_idx=1 then size=6;
     idx = 1;
     do i = 1 to (size / 2) * 1; blk[idx] = "Active"; idx=idx+1; end;
     do i = 1 to (size / 2) * 1; blk[idx] = "Placebo"; idx=idx+1; end;
     do i = size to 2 by -1;
        link get_rand_int; j = mod(rand_int, i) + 1;
        temp = blk[i]; blk[i] = blk[j]; blk[j] = temp;
     end;
     do i = 1 to size;
        Treatment = blk[i]; BlockNumber = block_num; BlockSize = size;
        seq_count = seq_count + 1;
        SubjectID = "SIM-{SITE}-{STRATUM}-{SEQ:3}";
        SubjectID = tranwrd(SubjectID, "{SITE}", "103");
        SubjectID = tranwrd(SubjectID, "{STRATUM}", ">=6");
        SubjectID = prxchange('s/{SEQ:(d+)}/' || put(seq_count, z3.) || '/', -1, SubjectID);
        output;
        count = count + 1;
        if count >= cap then leave;
     end;
     block_num = block_num + 1;
  end;


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
