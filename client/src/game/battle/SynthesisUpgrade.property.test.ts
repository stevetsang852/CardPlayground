/**
 * Property-based tests for Synthesis Upgrade
 *
 * **Validates: Requirements 4.2, 4.3**
 */
import * as fc from 'fast-check';
import { BattleEngine } from './BattleEngine';
import { createGuardian } from './GuardianFactory';
import type { Deck, Rarity } from './BattleTypes';

const TEST_DECK: Deck = { cards: ['c1', 'c2', 'c3', 'c4', 'c5'] };
const ALL_RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

// Grid dimensions: 3 rows × 8 cols
const GRID_COLS = 8;
const GRID_ROWS = 3;

function makeEngine(): BattleEngine {
  // galleryScore=500 → initialSP = 10 + 5*10 = 60, enough for any synthesis
  return new BattleEngine('endless', TEST_DECK, 500);
}

/**
 * Property 9: 合成後等級 = 原等級 + 1，且不超過 5
 *
 * For any valid synthesis (two adjacent same-card same-level guardians at
 * levels 1–4), the resulting level equals original level + 1.
 * For level-5 guardians, synthesis is always rejected (level never exceeds 5).
 *
 * **Validates: Requirements 4.2, 4.3**
 */
describe('SynthesisUpgrade property tests', () => {
  /**
   * Property 9a: Valid synthesis (levels 1–4) produces level = original + 1
   */
  it('Property 9a: synthesized guardian level = original level + 1', () => {
    // Arbitraries for a valid adjacent pair within the grid
    const rarityArb = fc.constantFrom(...ALL_RARITIES);
    const levelArb = fc.integer({ min: 1, max: 4 });
    // x1 in [0, GRID_COLS-1], direction: 0=right, 1=down
    const x1Arb = fc.integer({ min: 0, max: GRID_COLS - 2 });
    const y1Arb = fc.integer({ min: 0, max: GRID_ROWS - 1 });
    const dirArb = fc.integer({ min: 0, max: 1 }); // 0=horizontal, 1=vertical

    fc.assert(
      fc.property(
        rarityArb,
        levelArb,
        x1Arb,
        y1Arb,
        dirArb,
        (rarity, level, x1, y1, dir) => {
          // Compute second cell position
          let x2 = x1;
          let y2 = y1;
          if (dir === 0) {
            x2 = x1 + 1; // horizontal neighbour
          } else {
            if (y1 >= GRID_ROWS - 1) return; // no room below, skip
            y2 = y1 + 1; // vertical neighbour
          }

          const engine = makeEngine();
          // Ensure enough SP for any rarity cost
          engine.state.sp = 100;

          const g1 = createGuardian('card-test', rarity, '原始火山', level, x1, y1);
          const g2 = createGuardian('card-test', rarity, '原始火山', level, x2, y2);
          engine.state.grid[y1][x1].guardian = g1;
          engine.state.grid[y2][x2].guardian = g2;

          const result = engine.synthesize(x1, y1, x2, y2);

          expect(result.success).toBe(true);
          const newGuardian = engine.state.grid[y1][x1].guardian;
          expect(newGuardian).not.toBeNull();
          expect(newGuardian!.level).toBe(level + 1);
        }
      ),
      { numRuns: 300 }
    );
  });

  /**
   * Property 9b: Level-5 guardians are always rejected — level never exceeds 5
   */
  it('Property 9b: synthesis of level-5 guardians is always rejected', () => {
    const rarityArb = fc.constantFrom(...ALL_RARITIES);
    const x1Arb = fc.integer({ min: 0, max: GRID_COLS - 2 });
    const y1Arb = fc.integer({ min: 0, max: GRID_ROWS - 1 });
    const dirArb = fc.integer({ min: 0, max: 1 });

    fc.assert(
      fc.property(
        rarityArb,
        x1Arb,
        y1Arb,
        dirArb,
        (rarity, x1, y1, dir) => {
          let x2 = x1;
          let y2 = y1;
          if (dir === 0) {
            x2 = x1 + 1;
          } else {
            if (y1 >= GRID_ROWS - 1) return;
            y2 = y1 + 1;
          }

          const engine = makeEngine();
          engine.state.sp = 100;

          const g1 = createGuardian('card-test', rarity, '原始火山', 5, x1, y1);
          const g2 = createGuardian('card-test', rarity, '原始火山', 5, x2, y2);
          engine.state.grid[y1][x1].guardian = g1;
          engine.state.grid[y2][x2].guardian = g2;

          const result = engine.synthesize(x1, y1, x2, y2);

          expect(result.success).toBe(false);
          // Guardian at cell1 must remain at level 5 (not upgraded beyond cap)
          expect(engine.state.grid[y1][x1].guardian!.level).toBe(5);
        }
      ),
      { numRuns: 300 }
    );
  });
});
