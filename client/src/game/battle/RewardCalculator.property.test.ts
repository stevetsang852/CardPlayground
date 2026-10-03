/**
 * Property-based tests for RewardCalculator
 *
 * **Validates: Requirements 9.1**
 */
import * as fc from 'fast-check';
import { RewardCalculator } from './RewardCalculator';

// Mock dataService to avoid real persistence (Dexie/IndexedDB)
jest.mock('../../services', () => ({
  dataService: {
    saveSetting: jest.fn(),
  },
}));

const calculator = new RewardCalculator();

/**
 * Property 11: 波數越高金幣獎勵越多（單調遞增）
 *
 * For any wave N >= 1, calculateWaveReward(N+1).amount > calculateWaveReward(N).amount
 * This follows from coins = wave × 10, which is strictly monotonically increasing.
 *
 * **Validates: Requirements 9.1**
 */
describe('RewardCalculator property tests', () => {
  it('Property 11: wave reward is strictly monotonically increasing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999 }),
        (wave) => {
          const rewardN = calculator.calculateWaveReward(wave);
          const rewardNPlus1 = calculator.calculateWaveReward(wave + 1);

          expect(rewardNPlus1.amount).toBeGreaterThan(rewardN.amount);
        }
      ),
      { numRuns: 500 }
    );
  });
});
