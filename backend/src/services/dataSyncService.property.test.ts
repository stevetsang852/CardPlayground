import { DataSyncService } from './dataSyncService';
import { Firestore } from 'firebase-admin/firestore';
import { Player } from '../../../shared/src/types/player';
import { Card } from '../../../shared/src/types/card';
import fc from 'fast-check';

/**
 * Property-based tests for DataSyncService
 *
 * Feature: card-mystery-realm
 */

// ---------------------------------------------------------------------------
// MockFirestore (same pattern as other property tests in this project)
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
    const col = this.currentCollection;
    const store = this.data;
    return {
      id: docId,
      get: async () => {
        const d = store.get(`${col}/${docId}`);
        return { exists: !!d, data: () => d, id: docId };
      },
      update: async (updates: any) => {
        const key = `${col}/${docId}`;
        store.set(key, { ...(store.get(key) || {}), ...updates });
      },
      set: async (d: any, opts?: any) => {
        const key = `${col}/${docId}`;
        if (opts?.merge) {
          store.set(key, { ...(store.get(key) || {}), ...d });
        } else {
          store.set(key, d);
        }
      },
    };
  }

  addData(collection: string, id: string, data: any) {
    this.data.set(`${collection}/${id}`, data);
  }

  getData(collection: string, id: string): any {
    return this.data.get(`${collection}/${id}`);
  }

  clear() {
    this.data.clear();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDb(): MockFirestore {
  return new MockFirestore();
}

const nonEmptyId = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

function makeCard(id: string): Card {
  return {
    id,
    templateId: `tmpl-${id}`,
    name: `Card ${id}`,
    description: 'A test card',
    rarity: 'common',
    theme: 'nature',
    imageUrl: 'https://example.com/card.png',
    score: 100,
    isLimitedEdition: false,
    obtainedAt: new Date().toISOString(),
    obtainedFrom: 'draw',
  };
}

function makePlayer(id: string, cardIds: string[] = []): Player {
  return {
    id,
    username: `user-${id}`,
    email: `${id}@example.com`,
    softCurrency: 1000,
    hardCurrency: 100,
    cards: cardIds,
    galleryCardIds: [],
    level: 1,
    experience: 0,
    battlePassLevel: 1,
    battlePassXP: 0,
    hasPaidBattlePass: false,
    luckValue: 0,
    drawsSinceLastLegendary: 0,
    consecutiveSynthesisFailures: 0,
    consecutiveLoginDays: 1,
    lastLoginDate: new Date().toISOString(),
    totalPlayTime: 0,
    preferredThemes: [],
    collectionFocus: [],
    friends: [],
    legendaryPacksThisWeek: 0,
    weekResetDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Property 38: Server-first draw synchronization
// **Validates: Requirements 12.1**
// ---------------------------------------------------------------------------
describe('Property 38: Server-first draw synchronization', () => {
  /**
   * For any draw operation, createDrawTransaction should create a record with
   * status 'confirmed' before returning, and the transactionId should be a
   * non-empty string.
   *
   * Validates: Requirements 12.1
   */
  it('createDrawTransaction returns a non-empty transactionId and persists a confirmed record', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          packType: fc.constantFrom('basic', 'premium', 'legendary'),
          luckValue: fc.float({ min: 0, max: 1, noNaN: true }),
          drawsSinceLastLegendary: fc.integer({ min: 0, max: 100 }),
          currencyDeducted: fc.integer({ min: 100, max: 2000 }),
          currencyType: fc.constantFrom('soft' as const, 'hard' as const),
          numCards: fc.integer({ min: 1, max: 5 }),
        }),
        async ({ playerId, packType, luckValue, drawsSinceLastLegendary, currencyDeducted, currencyType, numCards }) => {
          const db = buildDb();
          const service = new DataSyncService(db as any as Firestore);

          const cards = Array.from({ length: numCards }, (_, i) => makeCard(`card-${i}`));

          const transactionId = await service.createDrawTransaction(
            playerId,
            packType,
            cards,
            luckValue,
            drawsSinceLastLegendary,
            currencyDeducted,
            currencyType
          );

          // transactionId must be a non-empty string
          if (typeof transactionId !== 'string' || transactionId.length === 0) return false;

          // The record must be persisted with status 'confirmed'
          const record = db.getData('draw_transactions', transactionId);
          if (!record) return false;
          if (record.status !== 'confirmed') return false;
          if (record.playerId !== playerId) return false;
          if (record.packType !== packType) return false;

          return true;
        }
      ),
      { numRuns: 150 }
    );
  });

  it('each call produces a unique transactionId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          packType: fc.constantFrom('basic', 'premium', 'legendary'),
        }),
        async ({ playerId, packType }) => {
          const db = buildDb();
          const service = new DataSyncService(db as any as Firestore);
          const cards = [makeCard('card-1')];

          const id1 = await service.createDrawTransaction(playerId, packType, cards, 0, 0, 100, 'soft');
          const id2 = await service.createDrawTransaction(playerId, packType, cards, 0, 0, 100, 'soft');

          return id1 !== id2;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 39: Server-side synthesis validation
// **Validates: Requirements 12.2**
// ---------------------------------------------------------------------------
describe('Property 39: Server-side synthesis validation', () => {
  /**
   * For any player with cards [A, B, C], validateSynthesisRequest with [A, B]
   * should return valid: true.
   * For any player with cards [A, B, C], validateSynthesisRequest with [D]
   * (not owned) should return valid: false with errors.
   *
   * Validates: Requirements 12.2
   */
  it('returns valid: true when all input cards are in player inventory', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          ownedCardIds: fc.array(nonEmptyId, { minLength: 2, maxLength: 10 }).map(ids => [...new Set(ids)]),
          recipeType: fc.constantFrom('basic', 'advanced', 'legendary', 'special'),
        }).filter(({ ownedCardIds }) => ownedCardIds.length >= 2),
        async ({ playerId, ownedCardIds, recipeType }) => {
          const db = buildDb();
          const service = new DataSyncService(db as any as Firestore);

          const player = makePlayer(playerId, ownedCardIds);
          db.addData('players', playerId, player);

          // Use a subset of owned cards as input
          const inputCardIds = ownedCardIds.slice(0, 2);
          const result = await service.validateSynthesisRequest(playerId, inputCardIds, recipeType);

          return result.valid === true && result.errors.length === 0;
        }
      ),
      { numRuns: 150 }
    );
  });

  it('returns valid: false with errors when input card is not in player inventory', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          ownedCardIds: fc.array(nonEmptyId, { minLength: 1, maxLength: 5 }).map(ids => [...new Set(ids)]),
          unownedCardId: nonEmptyId,
          recipeType: fc.constantFrom('basic', 'advanced', 'legendary', 'special'),
        }).filter(({ ownedCardIds, unownedCardId }) => !ownedCardIds.includes(unownedCardId)),
        async ({ playerId, ownedCardIds, unownedCardId, recipeType }) => {
          const db = buildDb();
          const service = new DataSyncService(db as any as Firestore);

          const player = makePlayer(playerId, ownedCardIds);
          db.addData('players', playerId, player);

          const result = await service.validateSynthesisRequest(playerId, [unownedCardId], recipeType);

          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 150 }
    );
  });

  it('returns valid: false with errors for an invalid recipe type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          ownedCardIds: fc.array(nonEmptyId, { minLength: 1, maxLength: 5 }).map(ids => [...new Set(ids)]),
          invalidRecipe: fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !['basic', 'advanced', 'legendary', 'special'].includes(s) && /^[a-zA-Z0-9_-]+$/.test(s)
          ),
        }),
        async ({ playerId, ownedCardIds, invalidRecipe }) => {
          const db = buildDb();
          const service = new DataSyncService(db as any as Firestore);

          const player = makePlayer(playerId, ownedCardIds);
          db.addData('players', playerId, player);

          const result = await service.validateSynthesisRequest(playerId, ownedCardIds.slice(0, 1), invalidRecipe);

          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 150 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 42: Data persistence completeness
// **Validates: Requirements 12.7**
// ---------------------------------------------------------------------------
describe('Property 42: Data persistence completeness', () => {
  /**
   * For any player state, persistPlayerState followed by loadPlayerState should
   * return the same state. All fields should be preserved exactly.
   *
   * Validates: Requirements 12.7
   */

  const playerStateArb = fc.record({
    id: nonEmptyId,
    username: fc.string({ minLength: 1, maxLength: 30 }),
    email: fc.string({ minLength: 5, maxLength: 50 }),
    softCurrency: fc.integer({ min: 0, max: 100000 }),
    hardCurrency: fc.integer({ min: 0, max: 10000 }),
    cards: fc.array(nonEmptyId, { minLength: 0, maxLength: 20 }),
    galleryCardIds: fc.array(nonEmptyId, { minLength: 0, maxLength: 10 }),
    level: fc.integer({ min: 1, max: 100 }),
    experience: fc.integer({ min: 0, max: 100000 }),
    battlePassLevel: fc.integer({ min: 1, max: 100 }),
    battlePassXP: fc.integer({ min: 0, max: 10000 }),
    hasPaidBattlePass: fc.boolean(),
    luckValue: fc.float({ min: 0, max: 1, noNaN: true }),
    drawsSinceLastLegendary: fc.integer({ min: 0, max: 200 }),
    consecutiveSynthesisFailures: fc.integer({ min: 0, max: 50 }),
    consecutiveLoginDays: fc.integer({ min: 0, max: 365 }),
    lastLoginDate: fc.constant(new Date().toISOString()),
    totalPlayTime: fc.integer({ min: 0, max: 1000000 }),
    preferredThemes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
    collectionFocus: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
    friends: fc.array(nonEmptyId, { minLength: 0, maxLength: 20 }),
    legendaryPacksThisWeek: fc.integer({ min: 0, max: 3 }),
    weekResetDate: fc.constant(new Date().toISOString()),
    createdAt: fc.constant(new Date().toISOString()),
    lastActiveAt: fc.constant(new Date().toISOString()),
  });

  it('persistPlayerState then loadPlayerState returns the same state', async () => {
    await fc.assert(
      fc.asyncProperty(
        playerStateArb,
        async (state) => {
          const db = buildDb();
          const service = new DataSyncService(db as any as Firestore);

          await service.persistPlayerState(state.id, state);
          const loaded = await service.loadPlayerState(state.id);

          if (!loaded) return false;

          // Verify all key fields are preserved
          return (
            loaded.id === state.id &&
            loaded.username === state.username &&
            loaded.softCurrency === state.softCurrency &&
            loaded.hardCurrency === state.hardCurrency &&
            loaded.level === state.level &&
            loaded.experience === state.experience &&
            loaded.battlePassLevel === state.battlePassLevel &&
            loaded.battlePassXP === state.battlePassXP &&
            loaded.hasPaidBattlePass === state.hasPaidBattlePass &&
            loaded.luckValue === state.luckValue &&
            loaded.drawsSinceLastLegendary === state.drawsSinceLastLegendary &&
            loaded.consecutiveSynthesisFailures === state.consecutiveSynthesisFailures &&
            loaded.consecutiveLoginDays === state.consecutiveLoginDays &&
            loaded.totalPlayTime === state.totalPlayTime &&
            loaded.legendaryPacksThisWeek === state.legendaryPacksThisWeek &&
            JSON.stringify(loaded.cards) === JSON.stringify(state.cards) &&
            JSON.stringify(loaded.friends) === JSON.stringify(state.friends)
          );
        }
      ),
      { numRuns: 150 }
    );
  });

  it('loadPlayerState returns null for a non-existent player', async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyId,
        async (playerId) => {
          const db = buildDb();
          const service = new DataSyncService(db as any as Firestore);

          const result = await service.loadPlayerState(playerId);
          return result === null;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('persistPlayerState with partial state merges without losing existing fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          initialSoft: fc.integer({ min: 0, max: 10000 }),
          initialHard: fc.integer({ min: 0, max: 1000 }),
          newLevel: fc.integer({ min: 1, max: 100 }),
        }),
        async ({ playerId, initialSoft, initialHard, newLevel }) => {
          const db = buildDb();
          const service = new DataSyncService(db as any as Firestore);

          const initial = makePlayer(playerId);
          initial.softCurrency = initialSoft;
          initial.hardCurrency = initialHard;

          await service.persistPlayerState(playerId, initial);

          // Partial update: only update level
          await service.persistPlayerState(playerId, { level: newLevel });

          const loaded = await service.loadPlayerState(playerId);
          if (!loaded) return false;

          // Level should be updated, currencies should be preserved
          return (
            loaded.level === newLevel &&
            loaded.softCurrency === initialSoft &&
            loaded.hardCurrency === initialHard
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
