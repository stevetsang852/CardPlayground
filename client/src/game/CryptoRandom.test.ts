import { CryptoRandom } from './CryptoRandom';

// Polyfill crypto.getRandomValues for Jest (Node environment)
// Node 18+ has globalThis.crypto built-in; this handles older versions
if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = eval('require')('crypto') as { webcrypto: Crypto };
  Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto.webcrypto });
}

describe('CryptoRandom', () => {
  let rng: CryptoRandom;

  beforeEach(() => {
    rng = new CryptoRandom();
  });

  describe('nextFloat', () => {
    it('returns values in [0, 1)', () => {
      for (let i = 0; i < 1000; i++) {
        const v = rng.nextFloat();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('produces varied output (not all the same)', () => {
      const values = Array.from({ length: 100 }, () => rng.nextFloat());
      const unique = new Set(values);
      expect(unique.size).toBeGreaterThan(90);
    });

    it('distributes roughly uniformly across 10 buckets', () => {
      const buckets = new Array(10).fill(0);
      const N = 10000;
      for (let i = 0; i < N; i++) {
        const bucket = Math.floor(rng.nextFloat() * 10);
        buckets[bucket]++;
      }
      // Each bucket should have roughly N/10 = 1000 samples
      // Allow ±30% deviation
      for (const count of buckets) {
        expect(count).toBeGreaterThan(700);
        expect(count).toBeLessThan(1300);
      }
    });
  });

  describe('nextInt', () => {
    it('returns integers in [min, max] inclusive', () => {
      for (let i = 0; i < 500; i++) {
        const v = rng.nextInt(1, 6);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(6);
        expect(Number.isInteger(v)).toBe(true);
      }
    });

    it('covers all values in range', () => {
      const seen = new Set<number>();
      for (let i = 0; i < 1000; i++) {
        seen.add(rng.nextInt(1, 6));
      }
      expect(seen.size).toBe(6);
    });
  });

  describe('shuffle', () => {
    it('returns array of same length', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(rng.shuffle(arr)).toHaveLength(5);
    });

    it('contains same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(arr);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('does not mutate original array', () => {
      const arr = [1, 2, 3, 4, 5];
      rng.shuffle(arr);
      expect(arr).toEqual([1, 2, 3, 4, 5]);
    });

    it('produces different orderings over many runs', () => {
      const arr = [1, 2, 3, 4, 5];
      const results = new Set(
        Array.from({ length: 50 }, () => rng.shuffle(arr).join(','))
      );
      expect(results.size).toBeGreaterThan(10);
    });
  });
});
