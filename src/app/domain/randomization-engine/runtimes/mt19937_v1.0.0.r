# MT19937 PRNG Runtime for R
# Version: v1.0.0

mt_state <- numeric(624)
mt_idx <- 624

# Unsigned 32-bit bitwise operations for R numeric
u32_and <- function(a, b) {
  a1 <- trunc(a / 65536); a0 <- a %% 65536
  b1 <- trunc(b / 65536); b0 <- b %% 65536
  (bitwAnd(a1, b1) * 65536) + bitwAnd(a0, b0)
}
u32_or <- function(a, b) {
  a1 <- trunc(a / 65536); a0 <- a %% 65536
  b1 <- trunc(b / 65536); b0 <- b %% 65536
  (bitwOr(a1, b1) * 65536) + bitwOr(a0, b0)
}
u32_xor <- function(a, b) {
  a1 <- trunc(a / 65536); a0 <- a %% 65536
  b1 <- trunc(b / 65536); b0 <- b %% 65536
  (bitwXor(a1, b1) * 65536) + bitwXor(a0, b0)
}
u32_shl <- function(a, shift) {
  (a * (2^shift)) %% 4294967296
}
u32_shr <- function(a, shift) {
  trunc(a / (2^shift))
}
u32_mul <- function(a, b) {
  a1 <- trunc(a / 65536); a0 <- a %% 65536
  b1 <- trunc(b / 65536); b0 <- b %% 65536
  term1 <- ((a1 * b0) %% 65536) * 65536
  term2 <- ((a0 * b1) %% 65536) * 65536
  term3 <- a0 * b0
  (term1 + term2 + term3) %% 4294967296
}

init_mt <- function(seed) {
  mt_state[1] <<- seed %% 4294967296
  for (i in 2:624) {
    prev <- mt_state[i - 1]
    val <- u32_xor(prev, u32_shr(prev, 30))
    val <- u32_mul(val, 1812433253) + (i - 1)
    mt_state[i] <<- val %% 4294967296
  }
  mt_idx <<- 624
}

random_int <- function() {
  if (mt_idx >= 624) {
    for (kk in 1:624) {
      y <- u32_or(u32_and(mt_state[kk], 2147483648), u32_and(mt_state[(kk %% 624) + 1], 2147483647))
      nxt <- mt_state[((kk + 396) %% 624) + 1]
      mt_state[kk] <<- u32_xor(nxt, u32_shr(y, 1))
      if ((y %% 2) != 0) mt_state[kk] <<- u32_xor(mt_state[kk], 2567483615)
    }
    mt_idx <<- 0
  }
  
  y <- mt_state[mt_idx + 1]
  mt_idx <<- mt_idx + 1
  
  y <- u32_xor(y, u32_shr(y, 11))
  y <- u32_xor(y, u32_and(u32_shl(y, 7), 2636928640))
  y <- u32_xor(y, u32_and(u32_shl(y, 15), 4022730752))
  y <- u32_xor(y, u32_shr(y, 18))
  
  return(y)
}
