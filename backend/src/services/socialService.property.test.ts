import { SocialService } from './socialService';
import { Firestore } from 'firebase-admin/firestore';
import { GalleryInteraction } from '../../../shared/src/types/gallery';
import fc from 'fast-check';

/**
 * Property-based tests for SocialService
 *
 * Feature: card-mystery-realm
 */

// Minimal MockFirestore reused from socialService.test.ts
class MockFirestore {
  private data: Map<string, any> = new Map();
  private currentCollection: string = '';
  private queryFilters: Array<{ field: string; op: string; value: any }> = [];
  private queryLimit: number = Infinity;
  private queryOrderBy: { field: string; direction: string } | null = null;

  collection(name: string) {
    const newInstance = new MockFirestore();
    newInstance.data = this.data;
    newInstance.currentCollection = name;
    return newInstance;
  }

  doc(id?: string) {
    const docId = id || this.generateId();
    const collectionName = this.currentCollection;
    const dataStore = this.data;

    return {
      id: docId,
      set: async (data: any) => {
        dataStore.set(`${collectionName}/${docId}`, data);
      },
      get: async () => {
        const data = dataStore.get(`${collectionName}/${docId}`);
        return { exists: !!data, data: () => data };
      },
      update: async (updates: any) => {
        const key = `${collectionName}/${docId}`;
        const existingData = dataStore.get(key) || {};
        dataStore.set(key, { ...existingData, ...updates });
      },
    };
  }

  async runTransaction(updateFunction: (transaction: any) => Promise<void>) {
    const dataStore = this.data;
    const transaction = {
      get: async (docRef: any) => {
        let foundData = null;
        for (const [key, value] of dataStore.entries()) {
          if (key.endsWith(`/${docRef.id}`)) {
            foundData = value;
            break;
          }
        }
        return { exists: !!foundData, data: () => foundData, id: docRef.id };
      },
      update: (docRef: any, updates: any) => {
        for (const [key, value] of dataStore.entries()) {
          if (key.endsWith(`/${docRef.id}`)) {
            dataStore.set(key, { ...value, ...updates });
            return;
          }
        }
      },
    };
    await updateFunction(transaction);
  }

  where(field: string, op: string, value: any) {
    this.queryFilters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, direction: string) {
    this.queryOrderBy = { field, direction };
    return this;
  }

  limit(count: number) {
    this.queryLimit = count;
    return this;
  }

  async get() {
    const results: any[] = [];
    this.data.forEach((value, key) => {
      if (key.startsWith(this.currentCollection + '/')) {
        let matches = true;
        for (const filter of this.queryFilters) {
          const fieldValue = value[filter.field];
          switch (filter.op) {
            case '==': if (fieldValue !== filter.value) matches = false; break;
            case '>':  if (!(fieldValue > filter.value)) matches = false; break;
            case '<':  if (!(fieldValue < filter.value)) matches = false; break;
            case '>=': if (!(fieldValue >= filter.value)) matches = false; break;
            case '<=': if (!(fieldValue <= filter.value)) matches = false; break;
          }
          if (!matches) break;
        }
        if (matches) results.push({ data: () => value });
      }
    });

    if (this.queryOrderBy) {
      const { field, direction } = this.queryOrderBy;
      results.sort((a, b) => {
        const aVal = a.data()[field];
        const bVal = b.data()[field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'desc' ? -comparison : comparison;
      });
    }

    const limitedResults = results.slice(0, this.queryLimit);
    return { empty: limitedResults.length === 0, docs: limitedResults };
  }

  count() {
    return {
      get: async () => {
        const result = await this.get();
        return { data: () => ({ count: result.docs.length }) };
      },
    };
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

// Feature: card-mystery-realm, Property 19: Social interaction rewards
// **Validates: Requirements 4.5, 4.6**
describe('Property 19: Social interaction rewards', () => {
  /**
   * For any gallery that receives a like, the gallery owner should receive
   * exactly 10 soft currency; for any comment, the owner should receive
   * exactly 5 soft currency.
   *
   * Validates: Requirements 4.5, 4.6
   */
  it('like always grants exactly 10 soft currency to the gallery owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          likerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          ownerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          ownerInitialCurrency: fc.integer({ min: 0, max: 100_000 }),
        }).filter(({ likerId, ownerId }) => likerId !== ownerId),
        async ({ likerId, ownerId, ownerInitialCurrency }) => {
          const db = new MockFirestore();
          const service = new SocialService(db as any as Firestore);

          db.addData('players', likerId, { id: likerId, softCurrency: 0 });
          db.addData('players', ownerId, { id: ownerId, softCurrency: ownerInitialCurrency });

          await service.recordLike(likerId, ownerId);

          const ownerAfter = db.getData('players', ownerId);
          return ownerAfter.softCurrency === ownerInitialCurrency + 10;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('comment always grants exactly 5 soft currency to the gallery owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          commenterId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          ownerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          ownerInitialCurrency: fc.integer({ min: 0, max: 100_000 }),
          commentText: fc.string({ minLength: 1, maxLength: 200 }),
        }).filter(({ commenterId, ownerId }) => commenterId !== ownerId),
        async ({ commenterId, ownerId, ownerInitialCurrency, commentText }) => {
          const db = new MockFirestore();
          const service = new SocialService(db as any as Firestore);

          db.addData('players', commenterId, { id: commenterId, softCurrency: 0 });
          db.addData('players', ownerId, { id: ownerId, softCurrency: ownerInitialCurrency });

          await service.recordComment(commenterId, ownerId, commentText);

          const ownerAfter = db.getData('players', ownerId);
          return ownerAfter.softCurrency === ownerInitialCurrency + 5;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('multiple likes and comments accumulate rewards correctly for the gallery owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ownerId: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          ownerInitialCurrency: fc.integer({ min: 0, max: 100_000 }),
          // Generate distinct liker IDs (different from owner and each other)
          likerIds: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 5 }
          ),
          commenterIds: fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async ({ ownerId, ownerInitialCurrency, likerIds, commenterIds }) => {
          // Ensure all IDs are distinct from owner
          const uniqueLikers = [...new Set(likerIds)].filter(id => id !== ownerId);
          const uniqueCommenters = [...new Set(commenterIds)].filter(id => id !== ownerId);

          if (uniqueLikers.length === 0 && uniqueCommenters.length === 0) return true;

          const db = new MockFirestore();
          const service = new SocialService(db as any as Firestore);

          db.addData('players', ownerId, { id: ownerId, softCurrency: ownerInitialCurrency });
          for (const id of [...uniqueLikers, ...uniqueCommenters]) {
            db.addData('players', id, { id, softCurrency: 0 });
          }

          for (const likerId of uniqueLikers) {
            await service.recordLike(likerId, ownerId);
          }
          for (const commenterId of uniqueCommenters) {
            await service.recordComment(commenterId, ownerId, 'Nice gallery!');
          }

          const expectedCurrency =
            ownerInitialCurrency +
            uniqueLikers.length * 10 +
            uniqueCommenters.length * 5;

          const ownerAfter = db.getData('players', ownerId);
          return ownerAfter.softCurrency === expectedCurrency;
        }
      ),
      { numRuns: 100 }
    );
  });
});
