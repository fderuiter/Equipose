* MT19937 PRNG Runtime for STATA
* Version: v1.0.0

mata:
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
end
