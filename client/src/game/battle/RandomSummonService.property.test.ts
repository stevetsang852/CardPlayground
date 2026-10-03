/**
 * Property-based tests for RandomSummonService
 *
 * **Validates: Requirements 13.1, 13.2, 14.1, 14.2**
 */
import * as fc from 'fast-check';
import { RandomSummonService } from './RandomSummonService';
import type { Deck, GridCell, Guardian } from './BattleTypes';

const service = new RandomSummonService();

// Arbitraries
const cardIdArb = fc.integer({ min: 1, max: 206 }).map(String);

const deckArb = fc
  .array(cardIdArb, { minLength: 1, maxLength: 8 })
  .map((cards) => ({ cards } as Deck));

function makeEmptyGrid(rows: number, cols: number): GridCell[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({ x, y, guardian: null })),
  );
}

const gridArb = fc
  .tuple(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 1, max: 8 }))
  .map(([rows, cols]) => makeEmptyGrid(rows, cols));

/**
 * Property 14: Random summon result cardId is always within the deck
 * **Validates: Requirements 13.1, 13.2**
 */
describe('Property 14: randomSummon result cardId is always in deck', () => {
  it('holds for all valid decks and grids with sufficient SP', () => {
    fc.assert(
      fc.property(deckArb, gridArb, fc.integer({ min: 1, max: 20 }), (deck, grid, cost) => {
        const sp = cost; // exactly enough SP
        const result = service.randomSummon(deck, grid, sp, cost);
        if (result === null) {
          // null is only valid when grid is empty (no empty cells)
          const hasEmpty = grid.some((row) => row.some((cell) => !cell.guardian));
          return !hasEmpty;
        }
        return deck.cards.includes(result.guardian.cardId);
      }),
    );
  });

  it('returns null when grid has no empty cells regardless of SP', () => {
    fc.assert(
      fc.property(deckArb, fc.integer({ min: 1, max: 20 }), (deck, cost) => {
        // Build a fully occupied 2×2 grid
        const grid = makeEmptyGrid(2, 2);
        const dummyGuardian: Guardian = {
          id: 'x', cardId: '1', level: 1, rarity: 'common', element: 'fire',
          attack: 10, hp: 100, maxHp: 100, range: 2, attackSpeed: 1000,
          skillType: 'single', gridX: 0, gridY: 0,
        };
        for (const row of grid) {
          for (const cell of row) {
            cell.guardian = { ...dummyGuardian, gridX: cell.x, gridY: cell.y };
          }
        }
        const result = service.randomSummon(deck, grid, cost * 10, cost);
        return result === null;
      }),
    );
  });
});

/**
 * Property 15: randomSynthesis result level = original level + 1, cardId in deck
 * **Validates: Requirements 14.1, 14.2**
 */
describe('Property 15: randomSynthesis level = original + 1 and cardId in deck', () => {
  const guardianArb = fc
    .tuple(
      fc.integer({ min: 1, max: 4 }), // level 1–4 (so +1 stays ≤ 5)
      cardIdArb,
      fc.integer({ min: 0, max: 4 }),
      fc.integer({ min: 0, max: 2 }),
    )
    .map(([level, cardId, gx, gy]): Guardian => ({
      id: `g-${cardId}-${gx}-${gy}`,
      cardId,
      level,
      rarity: 'common',
      element: 'fire',
      attack: 10,
      hp: 100,
      maxHp: 100,
      range: 2,
      attackSpeed: 1000,
      skillType: 'single',
      gridX: gx,
      gridY: gy,
    }));

  it('result level is always original level + 1', () => {
    fc.assert(
      fc.property(guardianArb, deckArb, (g1, deck) => {
        const g2 = { ...g1, id: 'g2', gridX: g1.gridX + 1 };
        const result = service.randomSynthesis(g1, g2, deck);
        return result.level === g1.level + 1;
      }),
    );
  });

  it('result cardId is always in the deck', () => {
    fc.assert(
      fc.property(guardianArb, deckArb, (g1, deck) => {
        const g2 = { ...g1, id: 'g2', gridX: g1.gridX + 1 };
        const result = service.randomSynthesis(g1, g2, deck);
        return deck.cards.includes(result.cardId);
      }),
    );
  });

  it('result is placed at guardian1 position', () => {
    fc.assert(
      fc.property(guardianArb, deckArb, (g1, deck) => {
        const g2 = { ...g1, id: 'g2', gridX: g1.gridX + 1 };
        const result = service.randomSynthesis(g1, g2, deck);
        return result.gridX === g1.gridX && result.gridY === g1.gridY;
      }),
    );
  });
});
