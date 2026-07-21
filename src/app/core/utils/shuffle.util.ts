/**
 * Implements a deterministic Fisher-Yates shuffle using a provided PRNG.
 * Ensures that blocks generated across the application utilize a single,
 * verified shuffle algorithm.
 */
export class ShuffleUtil {
  /**
   * Shuffles an array in place using the provided random number generator.
   *
   * @param array The array to shuffle.
   * @param rng A function returning a random number in the range [0, 1).
   * @returns The shuffled array.
   */
  static fisherYates<T>(array: T[], rng: () => number): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
