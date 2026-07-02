export const ALGORITHM_TEMPLATES: Record<string, { fisherYates: string; buildBlock: string }> = {
  Python: {
    fisherYates: `def fisher_yates_shuffle(array):
    for i in range(len(array) - 1, 0, -1):
        rand_int = int(rng.bit_generator.random_raw())
        j = rand_int % (i + 1)
        array[i], array[j] = array[j], array[i]
    return array`,
    buildBlock: `def build_block(size, total_ratio, arms):
    block = []
    multiplier = size / total_ratio
    for arm in arms:
        block.extend([arm["name"]] * int(arm["ratio"] * multiplier))
    return fisher_yates_shuffle(block)`
  },
  R: {
    fisherYates: `fisher_yates_shuffle <- function(array) {
  if (length(array) > 1) {
    for (i in length(array):2) {
      j <- (random_int() %% i) + 1
      temp <- array[i]; array[i] <- array[j]; array[j] <- temp
    }
  }
  return(array)
}`,
    buildBlock: `build_block <- function(size, total_ratio, arms) {
  block <- character(0)
  multiplier <- size / total_ratio
  for (arm in arms) {
    block <- c(block, rep(arm$name, as.integer(arm$ratio * multiplier)))
  }
  return(fisher_yates_shuffle(block))
}`
  }
};
