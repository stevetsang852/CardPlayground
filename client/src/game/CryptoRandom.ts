/**
 * CryptoRandom — wraps crypto.getRandomValues for fair client-side randomness.
 * Uses a 32-bit unsigned integer buffer for efficiency.
 */
export class CryptoRandom {
  private static readonly BUFFER_SIZE = 256;
  private buffer = new Uint32Array(CryptoRandom.BUFFER_SIZE);
  private bufferIndex = CryptoRandom.BUFFER_SIZE; // force refill on first use

  private refillBuffer(): void {
    crypto.getRandomValues(this.buffer);
    this.bufferIndex = 0;
  }

  /** Returns a random float in [0, 1) */
  nextFloat(): number {
    if (this.bufferIndex >= CryptoRandom.BUFFER_SIZE) {
      this.refillBuffer();
    }
    // Divide by 2^32 to get [0, 1)
    return this.buffer[this.bufferIndex++]! / 0x100000000;
  }

  /** Returns a random integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  /** Fisher-Yates shuffle — returns a new shuffled array */
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}

// Singleton instance for game use
export const cryptoRandom = new CryptoRandom();
