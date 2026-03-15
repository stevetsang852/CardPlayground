/**
 * SeededRandom - Deterministic random number generator using Linear Congruential Generator (LCG)
 * 
 * This class provides deterministic random number generation that can be synchronized
 * between client and server. The same seed will always produce the same sequence of
 * random numbers, enabling client-side prediction while maintaining server verification.
 * 
 * Uses the LCG algorithm with parameters from Numerical Recipes:
 * - Multiplier: 1103515245
 * - Increment: 12345
 * - Modulus: 2^31 (0x7fffffff)
 */
export class SeededRandom {
  private seed: number;

  /**
   * Creates a new SeededRandom instance with the given seed
   * @param seed - The initial seed value for the random number generator
   */
  constructor(seed: number) {
    this.seed = seed;
  }

  /**
   * Generates the next random number in the sequence
   * @returns A random number between 0 (inclusive) and 1 (exclusive)
   */
  next(): number {
    // Linear congruential generator
    // Formula: seed = (a * seed + c) mod m
    // where a = 1103515245, c = 12345, m = 2^31
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  /**
   * Generates a random number within a specified range
   * @param min - The minimum value (inclusive)
   * @param max - The maximum value (exclusive)
   * @returns A random number between min (inclusive) and max (exclusive)
   */
  nextInRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
