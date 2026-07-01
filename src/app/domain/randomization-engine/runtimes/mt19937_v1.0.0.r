# MT19937 PRNG Runtime for R
# Version: v1.0.0

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
