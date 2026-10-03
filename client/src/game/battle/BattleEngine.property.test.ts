/**
 * Property-based tests for BattleEngine wave scaling
 *
 * **Validates: Requirements 6.3**
 */
import * as fc from 'fast-check';
import { BattleEngine } from './BattleEngine';

const deck = { cards: ['c1', 'c2', 'c3', 'c4', 'c5'] };

describe('BattleEngine property tests', () => {
  /**
   * Property 8: Wave difficulty scales monotonically
   * **Validates: Requirements 6.3**
   *
   * For any wave N >= 1, enemyCount(N+1) >= enemyCount(N)
   * AND enemyHp(N+1) > enemyHp(N).
   */
  it('Property 8: enemy count and HP increase monotonically with wave number', () => {
    const engine = new BattleEngine('endless', deck, 0);

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (n) => {
        const countN = engine.enemyCount(n);
        const countN1 = engine.enemyCount(n + 1);
        const hpN = engine.enemyHp(n);
        const hpN1 = engine.enemyHp(n + 1);

        expect(countN1).toBeGreaterThanOrEqual(countN);
        expect(hpN1).toBeGreaterThan(hpN);
      }),
      { numRuns: 200 }
    );
  });
});
