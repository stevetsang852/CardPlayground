/**
 * Property-based tests for DeckValidator
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */
import * as fc from 'fast-check';
import { validate } from './DeckValidator';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** A single non-mythic card entry */
const commonCardArb = (index: number) =>
  fc.constant({ id: `card-${index}`, rarity: 'common' as const });

/** Build a collection of `size` common cards */
const collectionArb = (size: number) =>
  fc.constant(
    Array.from({ length: size }, (_, i) => ({ id: `card-${i}`, rarity: 'common' as const }))
  );

/** A collection that always contains at least 8 common cards + 2 mythic cards */
const richCollectionArb = fc.constant([
  ...Array.from({ length: 8 }, (_, i) => ({ id: `card-${i}`, rarity: 'common' as const })),
  { id: 'mythic-0', rarity: 'mythic' as const },
  { id: 'mythic-1', rarity: 'mythic' as const },
]);

type Card = { id: string; rarity: string };

/**
 * Arbitrary for a VALID deck:
 *  - 5–8 cards drawn from the collection
 *  - 0 or 1 mythic card
 */
const validDeckArb = richCollectionArb.chain((collection) => {
  const commonIds = collection.filter(c => c.rarity !== 'mythic').map(c => c.id);
  const mythicIds = collection.filter(c => c.rarity === 'mythic').map(c => c.id);

  return fc.integer({ min: 5, max: 8 }).chain((deckSize) =>
    fc.integer({ min: 0, max: 1 }).chain((mythicCount) => {
      const nonMythicCount = deckSize - mythicCount;
      // pick nonMythicCount distinct common cards
      const commonSample = fc
        .shuffledSubarray(commonIds, { minLength: nonMythicCount, maxLength: nonMythicCount });
      const mythicSample = fc
        .shuffledSubarray(mythicIds, { minLength: mythicCount, maxLength: mythicCount });

      return fc.tuple(commonSample, mythicSample).map(([commons, mythics]) => ({
        cardIds: [...commons, ...mythics],
        collection,
      }));
    })
  );
});

/**
 * Arbitrary for an INVALID deck due to size (< 5 or > 8 cards).
 * All cards are from the collection so only the size rule fires.
 */
const invalidSizeDeckArb = richCollectionArb.chain((collection) => {
  const commonIds = collection.filter(c => c.rarity !== 'mythic').map(c => c.id);

  const tooFewArb = fc.integer({ min: 0, max: 4 }).chain((n) =>
    fc.shuffledSubarray(commonIds, { minLength: n, maxLength: n }).map((ids) => ({
      cardIds: ids,
      collection,
    }))
  );

  const tooManyArb = fc.integer({ min: 9, max: 20 }).chain((n) => {
    // repeat ids if needed to reach n
    return fc.constant(
      Array.from({ length: n }, (_, i) => commonIds[i % commonIds.length])
    ).map((ids) => ({ cardIds: ids, collection }));
  });

  return fc.oneof(tooFewArb, tooManyArb);
});

/**
 * Arbitrary for an INVALID deck due to too many mythics (≥ 2).
 * Deck size is kept in 5–8 so only the mythic rule fires.
 */
const invalidMythicDeckArb = richCollectionArb.chain((collection) => {
  const commonIds = collection.filter(c => c.rarity !== 'mythic').map(c => c.id);
  const mythicIds = collection.filter(c => c.rarity === 'mythic').map(c => c.id); // exactly 2

  // deck size 5–8, always 2 mythics
  return fc.integer({ min: 5, max: 8 }).chain((deckSize) => {
    const nonMythicCount = deckSize - 2;
    return fc
      .shuffledSubarray(commonIds, { minLength: nonMythicCount, maxLength: nonMythicCount })
      .map((commons) => ({
        cardIds: [...commons, ...mythicIds],
        collection,
      }));
  });
});

// ---------------------------------------------------------------------------
// Property 7
// ---------------------------------------------------------------------------

describe('DeckValidator property tests', () => {
  /**
   * Property 7a: valid deck (5–8 cards, ≤1 mythic, all in collection) → valid=true, errors=[]
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   */
  it('Property 7a: valid deck produces valid=true and empty errors', () => {
    fc.assert(
      fc.property(validDeckArb, ({ cardIds, collection }) => {
        const result = validate(cardIds, collection);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Property 7b: deck with wrong size (< 5 or > 8) → valid=false, errors non-empty
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  it('Property 7b: deck with invalid size produces valid=false and non-empty errors', () => {
    fc.assert(
      fc.property(invalidSizeDeckArb, ({ cardIds, collection }) => {
        const result = validate(cardIds, collection);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Property 7c: deck with ≥2 mythic cards → valid=false, errors non-empty
   * **Validates: Requirements 1.4**
   */
  it('Property 7c: deck with 2+ mythic cards produces valid=false and non-empty errors', () => {
    fc.assert(
      fc.property(invalidMythicDeckArb, ({ cardIds, collection }) => {
        const result = validate(cardIds, collection);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 300 }
    );
  });
});
