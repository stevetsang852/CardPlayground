import { validate } from './DeckValidator';

// Helper: build a collection of n common cards with ids 'c1', 'c2', ...
function makeCollection(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, rarity: 'common' }));
}

// Helper: card ids for the first n cards in the collection
function cardIds(n: number) {
  return Array.from({ length: n }, (_, i) => `c${i + 1}`);
}

describe('DeckValidator – boundary values (Req 1.2, 1.3)', () => {
  const collection = makeCollection(10);

  test('4 cards → invalid, error contains "套牌至少需要 5 張"', () => {
    const result = validate(cardIds(4), collection);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('套牌至少需要 5 張');
  });

  test('5 cards → valid', () => {
    const result = validate(cardIds(5), collection);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('8 cards → valid', () => {
    const result = validate(cardIds(8), collection);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('9 cards → invalid, error contains "套牌上限為 8 張"', () => {
    const result = validate(cardIds(9), collection);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('套牌上限為 8 張');
  });

  test('empty deck → invalid, error contains "套牌至少需要 5 張"', () => {
    const result = validate([], collection);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('套牌至少需要 5 張');
  });
});

describe('DeckValidator – mythic card limit (Req 1.4, 1.5)', () => {
  // collection: 8 common + 2 mythic
  const collection = [
    ...makeCollection(8),
    { id: 'm1', rarity: 'mythic' },
    { id: 'm2', rarity: 'mythic' },
  ];

  test('1 mythic card in a valid-size deck → valid', () => {
    const ids = [...cardIds(4), 'm1']; // 5 cards, 1 mythic
    const result = validate(ids, collection);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('2 mythic cards → invalid, error contains "每場限帶 1 張神話卡"', () => {
    const ids = [...cardIds(3), 'm1', 'm2']; // 5 cards, 2 mythic
    const result = validate(ids, collection);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('每場限帶 1 張神話卡');
  });
});

describe('DeckValidator – collection membership', () => {
  const collection = makeCollection(5);

  test('card not in collection → invalid', () => {
    const ids = [...cardIds(4), 'unknown-card'];
    const result = validate(ids, collection);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('unknown-card'))).toBe(true);
  });
});
