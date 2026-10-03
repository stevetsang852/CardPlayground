// TalentSystem.property.test.ts — Property-based tests for TalentSystem
// Property 17: 抽取的 N 個天賦互不重複（N ≤ TALENT_POOL.length）
// Validates: Requirements 17.7

import * as fc from 'fast-check';
import { TalentSystem, TALENT_POOL } from './TalentSystem';

describe('TalentSystem property tests', () => {
  const system = new TalentSystem();

  /**
   * Property 17: For any count from 1 to TALENT_POOL.length,
   * drawTalents(count) returns exactly `count` unique talents.
   *
   * Validates: Requirement 17.7
   */
  it('Property 17: drawTalents(N) returns N unique talents for any N in [1, pool size]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: TALENT_POOL.length }),
        (count) => {
          const drawn = system.drawTalents(count);

          // Must return exactly `count` talents
          if (drawn.length !== count) return false;

          // All drawn talent IDs must be unique
          const ids = drawn.map((t) => t.id);
          const uniqueIds = new Set(ids);
          if (uniqueIds.size !== count) return false;

          // All drawn talents must come from the pool
          const poolIds = new Set(TALENT_POOL.map((t) => t.id));
          for (const id of ids) {
            if (!poolIds.has(id)) return false;
          }

          return true;
        },
      ),
    );
  });
});
