export class MathUtil {
  /**
   * Calculates the Greatest Common Divisor (GCD) of two numbers.
   */
  static gcd(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    return b === 0 ? a : MathUtil.gcd(b, a % b);
  }

  /**
   * Calculates the Least Common Multiple (LCM) of two numbers.
   */
  static lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / MathUtil.gcd(a, b);
  }

  /**
   * Calculates the GCD of an array of numbers.
   * If any number is not an integer, it returns 1 (no simplification applied).
   */
  static gcdArray(numbers: number[]): number {
    if (numbers.length === 0) return 1;
    if (!numbers.every(n => Number.isInteger(n))) {
      return 1;
    }
    let result = Math.abs(numbers[0]);
    for (let i = 1; i < numbers.length; i++) {
      result = MathUtil.gcd(result, Math.abs(numbers[i]));
      if (result === 1) return 1;
    }
    return result || 1; // If all were 0, return 1 to avoid division by zero later, though usually ratios > 0.
  }
}
