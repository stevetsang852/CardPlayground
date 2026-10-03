/**
 * Property-based tests for GameModeManager
 *
 * **Validates: Requirements 7.2**
 */
import * as fc from 'fast-check';
import { GameModeManager } from './GameModeManager';

describe('GameModeManager property tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * Property 10: Second entry to Daily_Challenge on the same day is always rejected
   * and returns remainingMs > 0.
   *
   * **Validates: Requirements 7.2**
   *
   * For any time T on any day, after completeDailyChallenge(T),
   * any subsequent checkDailyChallenge(T2) where T2 is on the same day
   * must return { allowed: false, remainingMs: > 0 }.
   */
  it('Property 10: second Daily_Challenge attempt on same day is always rejected with remainingMs > 0', () => {
    // Arbitrary: a year in [2020..2029], month [0..11], day [1..28]
    const dateArb = fc.record({
      year:  fc.integer({ min: 2020, max: 2029 }),
      month: fc.integer({ min: 0, max: 11 }),
      day:   fc.integer({ min: 1, max: 28 }),
    });

    // Arbitrary: hour [0..23], minute [0..59], second [0..59]
    const timeArb = fc.record({
      hour:   fc.integer({ min: 0, max: 23 }),
      minute: fc.integer({ min: 0, max: 59 }),
      second: fc.integer({ min: 0, max: 59 }),
    });

    fc.assert(
      fc.property(dateArb, timeArb, timeArb, (date, time1, time2) => {
        localStorage.clear();

        const manager = new GameModeManager();

        // Build T1 (completion time) on the given day
        const t1 = new Date(date.year, date.month, date.day,
                            time1.hour, time1.minute, time1.second);

        // Build T2 (check time) on the SAME calendar day
        const t2 = new Date(date.year, date.month, date.day,
                            time2.hour, time2.minute, time2.second);

        // Complete the daily challenge at T1
        manager.completeDailyChallenge(t1);

        // Check at T2 (same day) — must be rejected
        const result = manager.checkDailyChallenge(t2);

        expect(result.allowed).toBe(false);
        expect(result.remainingMs).toBeGreaterThan(0);
      }),
      { numRuns: 500 }
    );
  });
});
