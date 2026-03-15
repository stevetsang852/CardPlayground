import { MarketService } from './marketService';
import { Firestore } from 'firebase-admin/firestore';
import { Card } from '../../../shared/src/types/card';
import { MarketListing, MarketTransaction } from '../../../shared/src/types/market';
import fc from 'fast-check';

/**
 * Property-based tests for MarketService
 *
 * Feature: card-mystery-realm
 */

// ---------------------------------------------------------------------------
// Minimal MockFirestore (mirrors the pattern from socialService tests)
// ---------------------------------------------------------------------------
class MockFirestore {
  private data: Map<string, any> = new Map();
  private currentCollection: string = '';
  private queryFilters: Array<{ field: string; op: string; value: any }> = [];
  private queryLimit: number = Infinity;
  private queryOrderBy: { field: string; direction: string } | null = null;

  collection(name: string) {
    const inst = new MockFirestore();
    inst.data = this.data;
    inst.currentCollection = name;
    return inst;
  }

  doc(id?: string) {
    const docId = id || this.generateId();
    const col = this.currentCollection;
    const store = this.data;
    return {
      id: docId,
      set: async (d: any) => { store.set(`${col}/${docId}`, d); },
      get: async () => {
        const d = store.get(`${col}/${docId}`);
        return { exists: !!d, data: () => d };
      },
      update: async (updates: any) => {
        const key = `${col}/${docId}`;
        store.set(key, { ...(store.get(key) || {}), ...updates });
      },
    };
  }

  async runTransaction(fn: (tx: any) => Promise<void>) {
    const store = this.data;
    const tx = {
      get: async (ref: any) => {
        // ref has an id; find it in the store
        let found: any = null;
        for (const [k, v] of store.entries()) {
          if (k.endsWith(`/${ref.id}`)) { found = v; break; }
        }
        return { exists: !!found, data: () => found, id: ref.id };
      },
      set: (ref: any, data: any) => {
        // Find the collection prefix from existing keys or use ref's collection
        // We store by ref.id; find the right key
        for (const k of store.keys()) {
          if (k.endsWith(`/${ref.id}`)) { store.set(k, data); return; }
        }
        // Not found — use the ref's parent collection name if available
        const col = (ref as any)._col || 'unknown';
        store.set(`${col}/${ref.id}`, data);
      },
      update: (ref: any, updates: any) => {
        for (const [k, v] of store.entries()) {
          if (k.endsWith(`/${ref.id}`)) { store.set(k, { ...v, ...updates }); return; }
        }
      },
    };
    await fn(tx);
  }

  where(field: string, op: string, value: any) {
    this.queryFilters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, direction: string) {
    this.queryOrderBy = { field, direction };
    return this;
  }

  limit(n: number) { this.queryLimit = n; return this; }

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
      if (matches) results.push({ data: () => value });
    });

    if (this.queryOrderBy) {
      const { field, direction } = this.queryOrderBy;
      results.sort((a, b) => {
        const av = a.data()[field], bv = b.data()[field];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return direction === 'desc' ? -cmp : cmp;
      });
    }

    const limited = results.slice(0, this.queryLimit);
    return { empty: limited.length === 0, docs: limited };
  }

  count() {
    return { get: async () => {
      const r = await this.get();
      return { data: () => ({ count: r.docs.length }) };
    }};
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  clear() { this.data.clear(); }

  addData(collection: string, id: string, data: any) {
    this.data.set(`${collection}/${id}`, data);
  }

  getData(collection: string, id: string): any {
    return this.data.get(`${collection}/${id}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function setupPurchaseScenario(
  db: MockFirestore,
  opts: {
    buyerId: string;
    sellerId: string;
    buyerCurrency: number;
    sellerCurrency: number;
    price: number;
    currencyType?: 'soft' | 'hard';
    card?: Partial<Card>;
  }
) {
  const currencyType = opts.currencyType ?? 'soft';
  const card = makeCard({ id: 'card-1', ...opts.card });
  const listingId = 'listing-1';

  db.addData('players', opts.buyerId, {
    id: opts.buyerId,
    username: `buyer-${opts.buyerId}`,
    softCurrency: currencyType === 'soft' ? opts.buyerCurrency : 0,
    hardCurrency: currencyType === 'hard' ? opts.buyerCurrency : 0,
  });
  db.addData('players', opts.sellerId, {
    id: opts.sellerId,
    username: `seller-${opts.sellerId}`,
    softCurrency: currencyType === 'soft' ? opts.sellerCurrency : 0,
    hardCurrency: currencyType === 'hard' ? opts.sellerCurrency : 0,
  });
  db.addData('cards', card.id, card);

  const listing: MarketListing = {
    id: listingId,
    sellerId: opts.sellerId,
    sellerName: `seller-${opts.sellerId}`,
    card,
    price: opts.price,
    currencyType,
    views: 0,
    listedAt: new Date().toISOString(),
  };
  db.addData('market_listings', listingId, listing);

  return { listingId, card };
}

// ---------------------------------------------------------------------------
// Property 21: Trade transaction atomicity
// **Validates: Requirements 5.3, 12.3**
// ---------------------------------------------------------------------------
describe('Property 21: Trade transaction atomicity', () => {
  /**
   * For any card purchase, either both the card transfer to the buyer AND the
   * payment transfer to the seller occur, or neither occurs.
   *
   * Validates: Requirements 5.3, 12.3
   */
  it('successful purchase transfers both card and currency atomically', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          sellerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          price: fc.integer({ min: 1, max: 5000 }),
          buyerCurrency: fc.integer({ min: 5000, max: 10000 }), // always enough
          sellerCurrency: fc.integer({ min: 0, max: 10000 }),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, price, buyerCurrency, sellerCurrency }) => {
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          setupPurchaseScenario(db, { buyerId, sellerId, buyerCurrency, sellerCurrency, price });

          const buyerBefore = db.getData('players', buyerId);
          const sellerBefore = db.getData('players', sellerId);

          const { card, transactionFee } = await service.purchaseCard(buyerId, 'listing-1');

          const buyerAfter = db.getData('players', buyerId);
          const sellerAfter = db.getData('players', sellerId);
          const listingAfter = db.getData('market_listings', 'listing-1');

          // Buyer paid the full price
          const buyerPaid = buyerBefore.softCurrency - buyerAfter.softCurrency === price;
          // Seller received price minus fee
          const sellerReceived = sellerAfter.softCurrency - sellerBefore.softCurrency;
          const expectedSellerReceived = service.calculateSellerReceived(price);
          const sellerGotCorrectAmount = sellerReceived === expectedSellerReceived;
          // Listing is marked sold
          const listingSold = !!listingAfter.soldAt && listingAfter.buyerId === buyerId;
          // Card returned
          const cardReturned = card !== null;

          return buyerPaid && sellerGotCorrectAmount && listingSold && cardReturned;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('purchase with insufficient funds leaves all state unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          sellerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          price: fc.integer({ min: 100, max: 5000 }),
          // Buyer always has less than the price
          buyerShortfall: fc.integer({ min: 1, max: 99 }),
          sellerCurrency: fc.integer({ min: 0, max: 10000 }),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, price, buyerShortfall, sellerCurrency }) => {
          const buyerCurrency = Math.max(0, price - buyerShortfall);
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          setupPurchaseScenario(db, { buyerId, sellerId, buyerCurrency, sellerCurrency, price });

          const buyerBefore = db.getData('players', buyerId);
          const sellerBefore = db.getData('players', sellerId);

          let threw = false;
          try {
            await service.purchaseCard(buyerId, 'listing-1');
          } catch {
            threw = true;
          }

          const buyerAfter = db.getData('players', buyerId);
          const sellerAfter = db.getData('players', sellerId);
          const listingAfter = db.getData('market_listings', 'listing-1');

          // Must have thrown
          if (!threw) return false;
          // Buyer currency unchanged
          if (buyerAfter.softCurrency !== buyerBefore.softCurrency) return false;
          // Seller currency unchanged
          if (sellerAfter.softCurrency !== sellerBefore.softCurrency) return false;
          // Listing not marked sold
          if (listingAfter.soldAt) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 22: Transaction fee calculation
// **Validates: Requirements 5.8**
// ---------------------------------------------------------------------------
describe('Property 22: Transaction fee calculation', () => {
  /**
   * For any completed sale, the seller should receive exactly 95% of the
   * listing price, with 5% deducted as a transaction fee.
   *
   * fee = floor(price * 0.05)
   * sellerReceived = price - fee
   *
   * Validates: Requirements 5.8
   */
  it('fee is always floor(price * 0.05) for any price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        (price) => {
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          const fee = service.calculateFee(price);
          const expected = Math.floor(price * 0.05);
          return fee === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sellerReceived is always price - fee for any price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        (price) => {
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          const fee = service.calculateFee(price);
          const sellerReceived = service.calculateSellerReceived(price);
          return sellerReceived === price - fee;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('fee + sellerReceived always equals price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        (price) => {
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          const fee = service.calculateFee(price);
          const sellerReceived = service.calculateSellerReceived(price);
          return fee + sellerReceived === price;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('actual purchase applies correct fee and seller amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          sellerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          price: fc.integer({ min: 1, max: 5000 }),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, price }) => {
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          setupPurchaseScenario(db, {
            buyerId,
            sellerId,
            buyerCurrency: 10000,
            sellerCurrency: 0,
            price,
          });

          const sellerBefore = db.getData('players', sellerId);
          const { transactionFee } = await service.purchaseCard(buyerId, 'listing-1');
          const sellerAfter = db.getData('players', sellerId);

          const expectedFee = service.calculateFee(price);
          const expectedSellerReceived = service.calculateSellerReceived(price);

          return (
            transactionFee === expectedFee &&
            sellerAfter.softCurrency - sellerBefore.softCurrency === expectedSellerReceived
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 23: Limited edition metadata preservation
// **Validates: Requirements 5.7**
// ---------------------------------------------------------------------------
describe('Property 23: Limited edition metadata preservation', () => {
  /**
   * For any limited edition card, its edition number and original owner
   * attribution should remain unchanged through any number of trades.
   *
   * Validates: Requirements 5.7
   */
  it('editionNumber and originalOwner are preserved after a trade', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          sellerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          editionNumber: fc.integer({ min: 1, max: 10000 }),
          originalOwner: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          price: fc.integer({ min: 1, max: 5000 }),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, editionNumber, originalOwner, price }) => {
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          setupPurchaseScenario(db, {
            buyerId,
            sellerId,
            buyerCurrency: 10000,
            sellerCurrency: 0,
            price,
            card: {
              isLimitedEdition: true,
              editionNumber,
              originalOwner,
            },
          });

          const { card } = await service.purchaseCard(buyerId, 'listing-1');

          return (
            card.isLimitedEdition === true &&
            card.editionNumber === editionNumber &&
            card.originalOwner === originalOwner
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ownershipHistory grows by one record after each trade', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          sellerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          initialHistoryLength: fc.integer({ min: 0, max: 5 }),
          price: fc.integer({ min: 1, max: 5000 }),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, initialHistoryLength, price }) => {
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          const existingHistory = Array.from({ length: initialHistoryLength }, (_, i) => ({
            playerId: `prev-owner-${i}`,
            playerName: `Prev Owner ${i}`,
            acquiredAt: new Date().toISOString(),
            acquiredFrom: 'trade' as const,
          }));

          setupPurchaseScenario(db, {
            buyerId,
            sellerId,
            buyerCurrency: 10000,
            sellerCurrency: 0,
            price,
            card: {
              isLimitedEdition: true,
              editionNumber: 42,
              originalOwner: 'original-player',
              ownershipHistory: existingHistory,
            },
          });

          const { card } = await service.purchaseCard(buyerId, 'listing-1');

          return (card.ownershipHistory?.length ?? 0) === initialHistoryLength + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-limited-edition cards have metadata preserved as-is', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          buyerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          sellerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          price: fc.integer({ min: 1, max: 5000 }),
        }).filter(({ buyerId, sellerId }) => buyerId !== sellerId),
        async ({ buyerId, sellerId, price }) => {
          const db = new MockFirestore();
          const service = new MarketService(db as any as Firestore);

          setupPurchaseScenario(db, {
            buyerId,
            sellerId,
            buyerCurrency: 10000,
            sellerCurrency: 0,
            price,
            card: { isLimitedEdition: false },
          });

          const { card } = await service.purchaseCard(buyerId, 'listing-1');

          return card.isLimitedEdition === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
