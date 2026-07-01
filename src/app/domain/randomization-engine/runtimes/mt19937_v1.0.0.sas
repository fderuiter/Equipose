/* MT19937 PRNG Runtime for SAS */
/* Version: v1.0.0 */

%macro mt19937_init(seed);
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
%mend;

%macro mt19937_label();
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
%mend;
