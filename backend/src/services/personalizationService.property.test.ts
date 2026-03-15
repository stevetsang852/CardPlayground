import { PersonalizationService } from './personalizationService';
import { Firestore } from 'firebase-admin/firestore';
import { Card } from '../../../shared/src/types/card';
import { PackConfiguration } from '../../../shared/src/types/pack';
import fc from 'fast-check';

/**
 * Property-based tests for PersonalizationService
 *
 * Feature: card-mystery-realm
 */

// ---------------------------------------------------------------------------
// Minimal MockFirestore (same pattern as other property tests in this project)
// ---------------------------------------------------------------------------
class MockFirestore {
  private data: Map<string, any> = new Map();
  private currentCollection: string = '';

  collection(name: string) {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = name;
    return inst;
  }

  doc(id?: string) {
    const docId = id || Math.random().toString(36).substring(2, 15);
    const collectionName = this.currentCollection;
    const dataStore = this.data;

    return {
      id: docId,
      get: async () => {
        const docData = dataStore.get(`${collectionName}/${docId}`);
        return { exists: !!docData, data: () => docData };
      },
      update: async (updates: any) => {
        const key = `${collectionName}/${docId}`;
        const existing = dataStore.get(key) || {};
        dataStore.set(key, { ...existing, ...updates });
      },
      set: async (docData: any, _opts?: any) => {
        const key = `${collectionName}/${docId}`;
        const existing = dataStore.get(key) || {};
        dataStore.set(key, { ...existing, ...docData });
      },
    };
  }

  // Test helpers
  addData(collection: string, id: string, docData: any) {
    this.data.set(`${collection}/${id}`, docData);
  }

  getData(collection: string, id: string): any {
    return this.data.get(`${collection}/${id}`);
  }

  clear() {
    this.data.clear();
  }
}

function buildDb(): MockFirestore {
  return new MockFirestore();
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const themeArb = fc.constantFrom(
  'dragon', 'ocean', 'forest', 'fire', 'ice', 'shadow', 'light', 'storm', 'earth', 'void'
);

const rarityArb = fc.constantFrom('common' as const, 'rare' as const, 'epic' as const, 'legendary' as const);

const cardArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  templateId: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 1, maxLength: 50 }),
  rarity: rarityArb,
  theme: themeArb,
  imageUrl: fc.constant('https://example.com/card.png'),
  score: fc.integer({ min: 0, max: 1000 }),
  isLimitedEdition: fc.boolean(),
  obtainedAt: fc.constant(new Date().toISOString()),
  obtainedFrom: fc.constantFrom('draw' as const, 'synthesis' as const, 'trade' as const),
});

const nonEmptyId = fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

const packArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  type: fc.constantFrom('basic' as const, 'premium' as const, 'legendary' as const),
  cost: fc.integer({ min: 100, max: 5000 }),
  currencyType: fc.constantFrom('soft' as const, 'hard' as const),
  probabilities: fc.constant({
    legendary: 0.01,
    epic: 0.05,
    rare: 0.14,
    common: 0.80,
  }),
});

// ---------------------------------------------------------------------------
// Property 33: Collection preference tracking
// **Validates: Requirements 9.1**
// ---------------------------------------------------------------------------
describe('Property 33: Collection preference tracking', () => {
  /**
   * For any set of cards with themes, after calling updateCollectionPreferences,
   * the player's preferredThemes should contain the most frequently occurring themes.
   *
   * Validates: Requirements 9.1
   */
  it('preferredThemes contains the most frequent themes from drawn cards', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          cards: fc.array(cardArb, { minLength: 1, maxLength: 30 }),
        }),
        async ({ playerId, cards }) => {
          const db = buildDb();
          const service = new PersonalizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            preferredThemes: [],
            collectionFocus: [],
            friends: [],
          });

          await service.updateCollectionPreferences(playerId, cards);

          const updated = db.getData('players', playerId);
          const preferredThemes: string[] = updated.preferredThemes ?? [];

          // Count theme frequencies in the drawn cards
          const themeCounts = new Map<string, number>();
          for (const card of cards) {
            themeCounts.set(card.theme, (themeCounts.get(card.theme) ?? 0) + 1);
          }

          // Sort themes by frequency descending
          const sortedThemes = Array.from(themeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([theme]) => theme);

          const expectedTop = sortedThemes.slice(0, 5);

          // preferredThemes must be a subset of the top-5 expected themes
          // and must contain all themes that appear in the top-5
          const allExpectedPresent = expectedTop.every(t => preferredThemes.includes(t));
          const noUnexpected = preferredThemes.every(t => expectedTop.includes(t));
          const maxFive = preferredThemes.length <= 5;

          return allExpectedPresent && noUnexpected && maxFive;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('preferredThemes never exceeds 5 entries regardless of card variety', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          cards: fc.array(cardArb, { minLength: 10, maxLength: 50 }),
        }),
        async ({ playerId, cards }) => {
          const db = buildDb();
          const service = new PersonalizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            preferredThemes: [],
            collectionFocus: [],
            friends: [],
          });

          await service.updateCollectionPreferences(playerId, cards);

          const updated = db.getData('players', playerId);
          return (updated.preferredThemes ?? []).length <= 5;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('calling updateCollectionPreferences with empty cards makes no changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          initialThemes: fc.array(themeArb, { minLength: 0, maxLength: 5 }),
        }),
        async ({ playerId, initialThemes }) => {
          const db = buildDb();
          const service = new PersonalizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            preferredThemes: initialThemes,
            collectionFocus: [],
            friends: [],
          });

          await service.updateCollectionPreferences(playerId, []);

          const updated = db.getData('players', playerId);
          // preferredThemes should be unchanged
          const unchanged = JSON.stringify(updated.preferredThemes) === JSON.stringify(initialThemes);
          return unchanged;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('theme counts accumulate correctly across multiple calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          batch1: fc.array(cardArb, { minLength: 1, maxLength: 15 }),
          batch2: fc.array(cardArb, { minLength: 1, maxLength: 15 }),
        }),
        async ({ playerId, batch1, batch2 }) => {
          const db = buildDb();
          const service = new PersonalizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            preferredThemes: [],
            collectionFocus: [],
            friends: [],
          });

          await service.updateCollectionPreferences(playerId, batch1);
          await service.updateCollectionPreferences(playerId, batch2);

          const updated = db.getData('players', playerId);
          const preferredThemes: string[] = updated.preferredThemes ?? [];

          // Combined theme counts
          const allCards = [...batch1, ...batch2];
          const themeCounts = new Map<string, number>();
          for (const card of allCards) {
            themeCounts.set(card.theme, (themeCounts.get(card.theme) ?? 0) + 1);
          }

          const expectedTop = Array.from(themeCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([theme]) => theme);

          const allExpectedPresent = expectedTop.every(t => preferredThemes.includes(t));
          const noUnexpected = preferredThemes.every(t => expectedTop.includes(t));

          return allExpectedPresent && noUnexpected && preferredThemes.length <= 5;
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 34: Personalized pack recommendations
// **Validates: Requirements 9.2**
// ---------------------------------------------------------------------------
describe('Property 34: Personalized pack recommendations', () => {
  /**
   * For any player with preferredThemes, getPackRecommendations should return
   * packs in an order where packs matching preferred themes appear before
   * non-matching packs.
   *
   * Validates: Requirements 9.2
   */
  it('packs matching preferred themes rank before non-matching packs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          preferredTheme: themeArb,
          otherTheme: themeArb,
        }).filter(({ preferredTheme, otherTheme }) => preferredTheme !== otherTheme),
        async ({ playerId, preferredTheme, otherTheme }) => {
          const db = buildDb();
          const service = new PersonalizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            preferredThemes: [preferredTheme],
            collectionFocus: [],
            friends: [],
          });

          // Create one matching pack and one non-matching pack
          const matchingPack: PackConfiguration = {
            id: `pack-${preferredTheme}-001`,
            name: `${preferredTheme} Pack`,
            type: 'basic',
            cost: 100,
            currencyType: 'soft',
            probabilities: { legendary: 0.005, epic: 0.05, rare: 0.145, common: 0.80 },
          };

          const nonMatchingPack: PackConfiguration = {
            id: `pack-${otherTheme}-001`,
            name: `${otherTheme} Pack`,
            type: 'basic',
            cost: 100,
            currencyType: 'soft',
            probabilities: { legendary: 0.005, epic: 0.05, rare: 0.145, common: 0.80 },
          };

          // Test both orderings of input to ensure sorting is stable
          const result1 = await service.getPackRecommendations(playerId, [nonMatchingPack, matchingPack]);
          const result2 = await service.getPackRecommendations(playerId, [matchingPack, nonMatchingPack]);

          // Matching pack should always come first
          const order1Ok = result1[0].id === matchingPack.id;
          const order2Ok = result2[0].id === matchingPack.id;

          return order1Ok && order2Ok;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns all packs regardless of match count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          packs: fc.array(packArb, { minLength: 1, maxLength: 10 }),
          preferredThemes: fc.array(themeArb, { minLength: 0, maxLength: 5 }),
        }),
        async ({ playerId, packs, preferredThemes }) => {
          const db = buildDb();
          const service = new PersonalizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            preferredThemes,
            collectionFocus: [],
            friends: [],
          });

          const result = await service.getPackRecommendations(playerId, packs);

          // All packs must be returned
          return result.length === packs.length;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('player with no preferences receives packs in original order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          packs: fc.array(packArb, { minLength: 2, maxLength: 8 }),
        }),
        async ({ playerId, packs }) => {
          const db = buildDb();
          const service = new PersonalizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            preferredThemes: [],
            collectionFocus: [],
            friends: [],
          });

          const result = await service.getPackRecommendations(playerId, packs);

          // With no preferences, order should be preserved
          return result.every((pack, i) => pack.id === packs[i].id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('packs with more theme matches rank higher than packs with fewer matches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          theme1: themeArb,
          theme2: themeArb,
        }).filter(({ theme1, theme2 }) => theme1 !== theme2),
        async ({ playerId, theme1, theme2 }) => {
          const db = buildDb();
          const service = new PersonalizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            preferredThemes: [theme1, theme2],
            collectionFocus: [],
            friends: [],
          });

          // Pack matching both themes
          const doubleMatchPack: PackConfiguration = {
            id: `pack-${theme1}-${theme2}`,
            name: `${theme1} ${theme2} Pack`,
            type: 'premium',
            cost: 500,
            currencyType: 'soft',
            probabilities: { legendary: 0.02, epic: 0.15, rare: 0.33, common: 0.50 },
          };

          // Pack matching only one theme
          const singleMatchPack: PackConfiguration = {
            id: `pack-${theme1}-only`,
            name: `${theme1} Pack`,
            type: 'basic',
            cost: 100,
            currencyType: 'soft',
            probabilities: { legendary: 0.005, epic: 0.05, rare: 0.145, common: 0.80 },
          };

          // Pack matching no themes
          const noMatchPack: PackConfiguration = {
            id: 'pack-generic-001',
            name: 'Generic Pack',
            type: 'basic',
            cost: 100,
            currencyType: 'soft',
            probabilities: { legendary: 0.005, epic: 0.05, rare: 0.145, common: 0.80 },
          };

          const result = await service.getPackRecommendations(playerId, [
            noMatchPack,
            singleMatchPack,
            doubleMatchPack,
          ]);

          // doubleMatch > singleMatch > noMatch
          return (
            result[0].id === doubleMatchPack.id &&
            result[1].id === singleMatchPack.id &&
            result[2].id === noMatchPack.id
          );
        }
      ),
      { numRuns: 200 }
    );
  });
});
