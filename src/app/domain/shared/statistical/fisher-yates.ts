export function fisherYatesShuffle<T>(array: T[], rng_int: (() => number) | undefined, rng: () => number): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = rng_int ? (rng_int() % (i + 1)) : Math.floor(rng() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}
