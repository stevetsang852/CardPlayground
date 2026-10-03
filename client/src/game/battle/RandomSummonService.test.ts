// RandomSummonService.test.ts — Unit tests for RandomSummonService
// Requirements 13.1, 13.2, 13.3, 14.1, 14.2, 14.3, 14.5

import { RandomSummonService } from './RandomSummonService';
import type { Deck, GridCell } from './BattleTypes';

// Helper: build a 3×3 grid (all empty by default)
function makeGrid(rows = 3, cols = 3): GridCell[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({ x, y, guardian: null })),
  );
}

// Helper: fill all cells with a dummy guardian
function fillGrid(grid: GridCell[][]): void {
  for (const row of grid) {
    for (const cell of row) {
      cell.guardian = {
        id: 'dummy',
        cardId: '1',
        level: 1,
        rarity: 'common',
        element: 'fire',
        attack: 10,
        hp: 100,
        maxHp: 100,
        range: 2,
        attackSpeed: 1000,
        skillType: 'single',
        gridX: cell.x,
        gridY: cell.y,
      };
    }
  }
}

const deck: Deck = { cards: ['1', '2', '3'] };
const service = new RandomSummonService();

describe('RandomSummonService.randomSummon', () => {
  it('returns null when SP is insufficient', () => {
    const grid = makeGrid();
    const result = service.randomSummon(deck, grid, 1, 5);
    expect(result).toBeNull();
  });

  it('returns null when grid has no empty cells', () => {
    const grid = makeGrid();
    fillGrid(grid);
    const result = service.randomSummon(deck, grid, 10, 2);
    expect(result).toBeNull();
  });

  it('returns a SummonResult with guardian and position when SP is sufficient and grid has empty cells', () => {
    const grid = makeGrid();
    const result = service.randomSummon(deck, grid, 10, 2);
    expect(result).not.toBeNull();
    expect(result!.guardian).toBeDefined();
    expect(result!.position).toBeDefined();
  });

  it('places guardian at the returned position', () => {
    const grid = makeGrid();
    const result = service.randomSummon(deck, grid, 10, 2);
    expect(result).not.toBeNull();
    const { guardian, position } = result!;
    expect(guardian.gridX).toBe(position.x);
    expect(guardian.gridY).toBe(position.y);
  });

  it('summons a guardian whose cardId is in the deck', () => {
    const grid = makeGrid();
    const result = service.randomSummon(deck, grid, 10, 2);
    expect(result).not.toBeNull();
    expect(deck.cards).toContain(result!.guardian.cardId);
  });

  it('summons at level 1', () => {
    const grid = makeGrid();
    const result = service.randomSummon(deck, grid, 10, 2);
    expect(result!.guardian.level).toBe(1);
  });

  it('returns null when SP exactly equals cost (edge: sp === cost passes)', () => {
    const grid = makeGrid();
    const result = service.randomSummon(deck, grid, 2, 2);
    expect(result).not.toBeNull();
  });

  it('returns null when SP is one less than cost', () => {
    const grid = makeGrid();
    const result = service.randomSummon(deck, grid, 1, 2);
    expect(result).toBeNull();
  });
});

describe('RandomSummonService.randomSynthesis', () => {
  const g1 = {
    id: 'g1',
    cardId: '1',
    level: 2,
    rarity: 'common' as const,
    element: 'fire' as const,
    attack: 15,
    hp: 150,
    maxHp: 150,
    range: 2,
    attackSpeed: 1000,
    skillType: 'single' as const,
    gridX: 0,
    gridY: 0,
  };

  const g2 = { ...g1, id: 'g2', gridX: 1, gridY: 0 };

  it('returns a guardian with level = original level + 1', () => {
    const result = service.randomSynthesis(g1, g2, deck);
    expect(result.level).toBe(g1.level + 1);
  });

  it('returns a guardian whose cardId is in the deck', () => {
    const result = service.randomSynthesis(g1, g2, deck);
    expect(deck.cards).toContain(result.cardId);
  });

  it('places the new guardian at guardian1 position', () => {
    const result = service.randomSynthesis(g1, g2, deck);
    expect(result.gridX).toBe(g1.gridX);
    expect(result.gridY).toBe(g1.gridY);
  });

  it('throws when guardians have different levels', () => {
    const g2DiffLevel = { ...g2, level: 3 };
    expect(() => service.randomSynthesis(g1, g2DiffLevel, deck)).toThrow('守衛等級不同');
  });

  it('throws when resulting level would exceed 5', () => {
    const g1Max = { ...g1, level: 5 };
    const g2Max = { ...g2, level: 5 };
    expect(() => service.randomSynthesis(g1Max, g2Max, deck)).toThrow('已達最高等級');
  });

  it('with synthesisLuckChance=1 always keeps guardian1 cardId', () => {
    // With 100% luck, always preserves original cardId
    for (let i = 0; i < 20; i++) {
      const result = service.randomSynthesis(g1, g2, deck, 1.0);
      expect(result.cardId).toBe(g1.cardId);
    }
  });

  it('with synthesisLuckChance=0 never applies luck (picks from deck randomly)', () => {
    // With 0% luck, always picks from deck (which may still be same card — that's valid)
    const result = service.randomSynthesis(g1, g2, deck, 0);
    expect(deck.cards).toContain(result.cardId);
  });

  it('same-type result is valid (Requirement 14.3)', () => {
    // A single-card deck always produces the same type — that's valid
    const singleCardDeck: Deck = { cards: ['1'] };
    const result = service.randomSynthesis(g1, g2, singleCardDeck);
    expect(result.cardId).toBe('1');
    expect(result.level).toBe(g1.level + 1);
  });
});
