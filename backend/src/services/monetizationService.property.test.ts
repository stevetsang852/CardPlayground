import { MonetizationService } from './monetizationService';
import { MarketService } from './marketService';
import { Firestore } from 'firebase-admin/firestore';
import { PackConfiguration } from '../../../shared/src/types/pack';
import { MarketListing } from '../../../shared/src/types/market';
import { Card } from '../../../shared/src/types/card';
import fc from 'fast-check';

/**
 * Property-based tests for MonetizationService
 *
 * Feature: card-mystery-realm
 */

// ---------------------------------------------------------------------------
// MockFirestore (same pattern as other property tests in this project)
// ---------------------------------------------------------------------------
class MockFirestore {
  private data: Map<string, any> = new Map();
  private currentCollection: string = '';
  private queryFilters: Array<{ field: string; op: string; value: any }> = [];
  private queryOrderField: string | null = null;
  private queryOrderDir: string = 'asc';
  private queryLimitVal: number = Infinity;

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
      set: async (d: any, _opts?: any) => {
        const key = `${col}/${docId}`;
        store.set(key, { ...(store.get(key) || {}), ...d });
      },
    };
  }

  where(field: string, op: string, value: any) {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = this.currentCollection;
    inst.queryFilters = [...this.queryFilters, { field, op, value }];
    inst.queryOrderField = this.queryOrderField;
    inst.queryOrderDir = this.queryOrderDir;
    inst.queryLimitVal = this.queryLimitVal;
    return inst;
  }

  orderBy(field: string, dir: string = 'asc') {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = this.currentCollection;
    inst.queryFilters = [...this.queryFilters];
    inst.queryOrderField = field;
    inst.queryOrderDir = dir;
    inst.queryLimitVal = this.queryLimitVal;
    return inst;
  }

  limit(n: number) {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = this.currentCollection;
    inst.queryFilters = [...this.queryFilters];
    inst.queryOrderField = this.queryOrderField;
    inst.queryOrderDir = this.queryOrderDir;
    inst.queryLimitVal = n;
    return inst;
  }

  async get() {
    const results: any[] = [];
    this.data.forEach((value, key) => {
      if (!key.startsWith(this.currentCollection + '/')) return;
      let matches = true;
      for (const f of this.queryFilters) {
        const fv = value[f.field];
        switch (f.op) {
          case '==': if (fv !== f.value) matches = false; break;
          case '>':  if (!(fv > f.value)) matches = false; break;
          case '<':  if (!(fv < f.value)) matches = false; break;
          case '>=': if (!(fv >= f.value)) matches = false; break;
          case '<=': if (!(fv <= f.value)) matches = false; break;
        }
        if (!matches) break;
      }
      if (matches) results.push({ data: () => value, id: key.split('/')[1] });
    });

    if (this.queryOrderField) {
      const field = this.queryOrderField;
      const dir = this.queryOrderDir;
      results.sort((a, b) => {
        const av = a.data()[field], bv = b.data()[field];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return dir === 'desc' ? -cmp : cmp;
      });
    }

    const limited = results.slice(0, this.queryLimitVal);
    return { empty: limited.length === 0, docs: limited };
  }

  async runTransaction(fn: (tx: any) => Promise<void>) {
    const store = this.data;
    const tx = {
      get: async (ref: any) => {
        let found: any = null;
        let foundKey = '';
        for (const [k, v] of store.entries()) {
          if (k.endsWith(`/${ref.id}`)) { found = v; foundKey = k; break; }
        }
        return { exists: !!found, data: () => found, id: ref.id, _key: foundKey };
      },
      set: (ref: any, d: any) => {
        for (const k of store.keys()) {
          if (k.endsWith(`/${ref.id}`)) { store.set(k, d); return; }
        }
        store.set(`unknown/${ref.id}`, d);
      },
      update: (ref: any, updates: any) => {
        for (const [k, v] of store.entries()) {
          if (k.endsWith(`/${ref.id}`)) { store.set(k, { ...v, ...updates }); return; }
        }
      },
    };
    await fn(tx);
  }

  addData(collection: string, id: string, data: any) {
    this.data.set(`${collection}/${id}`, data);
  }

  getData(collection: string, id: string): any {
    return this.data.get(`${collection}/${id}`);
  }

  clear() { this.data.clear(); }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDb(): MockFirestore {
  return new MockFirestore();
}

const nonEmptyId = fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    templateId: 'tmpl-1',
    name: 'Test Card',
    description: 'A test card',
    rarity: 'rare',
    theme: 'nature',
    imageUrl: 'https://example.com/card.png',
    score: 100,
    isLimitedEdition: false,
    obtainedAt: new Date().toISOString(),
    obtainedFrom: 'draw',
    ...overrides,
  };
}

function setupMarketPurchaseScenario(
  db: MockFirestore,
  opts: {
    buyerId: string;
    sellerId: string;
    buyerSoft: number;
    buyerHard: number;
    sellerSoft: number;
    sellerHard: number;
    price: number;
    currencyType: 'soft' | 'hard';
  }
) {
  const card = makeCard({ id: 'card-1' });
  const listingId = 'listing-1';

  db.addData('players', opts.buyerId, {
    id: opts.buyerId,
    username: `buyer-${opts.buyerId}`,
    softCurrency: opts.buyerSoft,
    hardCurrency: opts.buyerHard,
  });
  db.addData('players', opts.sellerId, {
    id: opts.sellerId,
    username: `seller-${opts.sellerId}`,
    softCurrency: opts.sellerSoft,
    hardCurrency: opts.sellerHard,
  });
  db.addData('cards', card.id, card);

  const listing: MarketListing = {
    id: listingId,
    sellerId: opts.sellerId,
    sellerName: `seller-${opts.sellerId}`,
    card,
    price: opts.price,
    currencyType: opts.currencyType,
    views: 0,
    listedAt: new Date().toISOString(),
  };
  db.addData('market_listings', listingId, listing);

  return { listingId, card };
}

// ---------------------------------------------------------------------------
// Property 35: Currency type support
// **Validates: Requirements 11.1**
// ---------------------------------------------------------------------------
describe('Property 35: Currency type support', () => {
  /**
   * For any market listing with currencyType 'soft' or 'hard', the purchase
   * should deduct from the correct currency field.
   *
   * Validates: Requirements 11.1
   */
  it('soft currency listings deduct from softCurrency only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: nonEmptyId,
          sellerId: nonEmptyId,
          price: fc.integer({ min: 1, max: 1000 }),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, price }) => {
          const db = buildDb();
          const service = new MarketService(db as any as Firestore);

          setupMarketPurchaseScenario(db, {
            buyerId,
            sellerId,
            buyerSoft: price + 1000,
            buyerHard: 5000,
            sellerSoft: 0,
            sellerHard: 0,
            price,
            currencyType: 'soft',
          });

          const buyerBefore = db.getData('players', buyerId);
          const hardBefore = buyerBefore.hardCurrency;

          await service.purchaseCard(buyerId, 'listing-1');

          const buyerAfter = db.getData('players', buyerId);

          // softCurrency decreased by price
          const softDecreased = buyerBefore.softCurrency - buyerAfter.softCurrency === price;
          // hardCurrency unchanged
          const hardUnchanged = buyerAfter.hardCurrency === hardBefore;

          return softDecreased && hardUnchanged;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hard currency listings deduct from hardCurrency only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: nonEmptyId,
          sellerId: nonEmptyId,
          price: fc.integer({ min: 1, max: 1000 }),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, price }) => {
          const db = buildDb();
          const service = new MarketService(db as any as Firestore);

          setupMarketPurchaseScenario(db, {
            buyerId,
            sellerId,
            buyerSoft: 5000,
            buyerHard: price + 1000,
            sellerSoft: 0,
            sellerHard: 0,
            price,
            currencyType: 'hard',
          });

          const buyerBefore = db.getData('players', buyerId);
          const softBefore = buyerBefore.softCurrency;

          await service.purchaseCard(buyerId, 'listing-1');

          const buyerAfter = db.getData('players', buyerId);

          // hardCurrency decreased by price
          const hardDecreased = buyerBefore.hardCurrency - buyerAfter.hardCurrency === price;
          // softCurrency unchanged
          const softUnchanged = buyerAfter.softCurrency === softBefore;

          return hardDecreased && softUnchanged;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('seller receives credit in the correct currency type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: nonEmptyId,
          sellerId: nonEmptyId,
          price: fc.integer({ min: 1, max: 1000 }),
          currencyType: fc.constantFrom('soft' as const, 'hard' as const),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, price, currencyType }) => {
          const db = buildDb();
          const service = new MarketService(db as any as Firestore);

          setupMarketPurchaseScenario(db, {
            buyerId,
            sellerId,
            buyerSoft: currencyType === 'soft' ? price + 1000 : 0,
            buyerHard: currencyType === 'hard' ? price + 1000 : 0,
            sellerSoft: 0,
            sellerHard: 0,
            price,
            currencyType,
          });

          const sellerBefore = db.getData('players', sellerId);

          await service.purchaseCard(buyerId, 'listing-1');

          const sellerAfter = db.getData('players', sellerId);
          const expectedReceived = service.calculateSellerReceived(price);

          if (currencyType === 'soft') {
            return sellerAfter.softCurrency - sellerBefore.softCurrency === expectedReceived;
          } else {
            return sellerAfter.hardCurrency - sellerBefore.hardCurrency === expectedReceived;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 36: Monthly Card daily rewards
// **Validates: Requirements 11.2**
// ---------------------------------------------------------------------------
describe('Property 36: Monthly Card daily rewards', () => {
  /**
   * For any player with an active Monthly Card, claimMonthlyCardReward should
   * grant exactly 30 hard currency per day.
   * For any player without an active Monthly Card, it should return reward: 0.
   *
   * Validates: Requirements 11.2
   */
  it('active Monthly Card grants exactly 30 hard currency per day', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          initialHard: fc.integer({ min: 0, max: 10000 }),
        }),
        async ({ playerId, initialHard }) => {
          const db = buildDb();
          const service = new MonetizationService(db as any as Firestore);

          // Set up player with active Monthly Card (expires in the future)
          const futureExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
          db.addData('players', playerId, {
            id: playerId,
            hardCurrency: initialHard,
            monthlyCardExpiresAt: futureExpiry,
            monthlyCardLastClaimed: undefined,
          });

          const result = await service.claimMonthlyCardReward(playerId);

          const playerAfter = db.getData('players', playerId);

          return (
            result.reward === 30 &&
            result.alreadyClaimed === false &&
            playerAfter.hardCurrency === initialHard + 30
          );
        }
      ),
      { numRuns: 150 }
    );
  });

  it('claiming twice on the same day returns alreadyClaimed: true with reward 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          initialHard: fc.integer({ min: 0, max: 10000 }),
        }),
        async ({ playerId, initialHard }) => {
          const db = buildDb();
          const service = new MonetizationService(db as any as Firestore);

          const futureExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
          const todayStr = new Date().toISOString().split('T')[0];

          db.addData('players', playerId, {
            id: playerId,
            hardCurrency: initialHard,
            monthlyCardExpiresAt: futureExpiry,
            monthlyCardLastClaimed: todayStr, // already claimed today
          });

          const result = await service.claimMonthlyCardReward(playerId);

          return result.reward === 0 && result.alreadyClaimed === true;
        }
      ),
      { numRuns: 150 }
    );
  });

  it('expired Monthly Card returns reward 0 and alreadyClaimed: true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          initialHard: fc.integer({ min: 0, max: 10000 }),
          daysExpiredAgo: fc.integer({ min: 1, max: 30 }),
        }),
        async ({ playerId, initialHard, daysExpiredAgo }) => {
          const db = buildDb();
          const service = new MonetizationService(db as any as Firestore);

          const pastExpiry = new Date(Date.now() - daysExpiredAgo * 24 * 60 * 60 * 1000).toISOString();

          db.addData('players', playerId, {
            id: playerId,
            hardCurrency: initialHard,
            monthlyCardExpiresAt: pastExpiry,
            monthlyCardLastClaimed: undefined,
          });

          const result = await service.claimMonthlyCardReward(playerId);
          const playerAfter = db.getData('players', playerId);

          return (
            result.reward === 0 &&
            result.alreadyClaimed === true &&
            playerAfter.hardCurrency === initialHard // no change
          );
        }
      ),
      { numRuns: 150 }
    );
  });

  it('player with no Monthly Card gets reward 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          playerId: nonEmptyId,
          initialHard: fc.integer({ min: 0, max: 10000 }),
        }),
        async ({ playerId, initialHard }) => {
          const db = buildDb();
          const service = new MonetizationService(db as any as Firestore);

          db.addData('players', playerId, {
            id: playerId,
            hardCurrency: initialHard,
            // no monthlyCardExpiresAt
          });

          const result = await service.claimMonthlyCardReward(playerId);

          return result.reward === 0 && result.alreadyClaimed === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 37: Gameplay card obtainability
// **Validates: Requirements 11.7**
// ---------------------------------------------------------------------------
describe('Property 37: Gameplay card obtainability', () => {
  /**
   * For any set of pack configurations:
   * - If at least one pack has currencyType 'soft', validateGameplayCardObtainability
   *   should return valid: true (when all pack types have a soft option)
   * - If no packs have currencyType 'soft', it should return valid: false
   *
   * Validates: Requirements 11.7
   */

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

  it('returns valid: false when no packs have soft currency', () => {
    fc.assert(
      fc.property(
        fc.array(packArb, { minLength: 0, maxLength: 10 }).map(packs =>
          packs.map(p => ({ ...p, currencyType: 'hard' as const }))
        ),
        (hardOnlyPacks) => {
          const db = buildDb();
          const service = new MonetizationService(db as any as Firestore);

          const result = service.validateGameplayCardObtainability(hardOnlyPacks);

          return result.valid === false && result.issues.length > 0;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns valid: true when all pack types have at least one soft currency option', () => {
    fc.assert(
      fc.property(
        fc.record({
          extraPacks: fc.array(packArb, { minLength: 0, maxLength: 8 }),
        }),
        ({ extraPacks }) => {
          const db = buildDb();
          const service = new MonetizationService(db as any as Firestore);

          // Guarantee one soft basic and one soft premium
          const softBasic: PackConfiguration = {
            id: 'soft-basic-001',
            name: 'Soft Basic Pack',
            type: 'basic',
            cost: 100,
            currencyType: 'soft',
            probabilities: { legendary: 0.01, epic: 0.05, rare: 0.14, common: 0.80 },
          };
          const softPremium: PackConfiguration = {
            id: 'soft-premium-001',
            name: 'Soft Premium Pack',
            type: 'premium',
            cost: 500,
            currencyType: 'soft',
            probabilities: { legendary: 0.02, epic: 0.10, rare: 0.28, common: 0.60 },
          };

          const allPacks = [softBasic, softPremium, ...extraPacks];
          const result = service.validateGameplayCardObtainability(allPacks);

          return result.valid === true && result.issues.length === 0;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns valid: false when soft packs exist but not for all required pack types', () => {
    fc.assert(
      fc.property(
        fc.array(packArb, { minLength: 0, maxLength: 5 }).map(packs =>
          packs.map(p => ({ ...p, currencyType: 'hard' as const }))
        ),
        (hardPacks) => {
          const db = buildDb();
          const service = new MonetizationService(db as any as Firestore);

          // Only soft legendary — no soft basic or premium
          const softLegendary: PackConfiguration = {
            id: 'soft-legendary-001',
            name: 'Soft Legendary Pack',
            type: 'legendary',
            cost: 1000,
            currencyType: 'soft',
            probabilities: { legendary: 0.05, epic: 0.20, rare: 0.35, common: 0.40 },
          };

          const result = service.validateGameplayCardObtainability([softLegendary, ...hardPacks]);

          // Should be invalid because basic and premium have no soft option
          return result.valid === false && result.issues.length >= 2;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('empty pack list returns valid: false', () => {
    const db = buildDb();
    const service = new MonetizationService(db as any as Firestore);

    const result = service.validateGameplayCardObtainability([]);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
